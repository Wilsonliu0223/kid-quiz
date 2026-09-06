#!/usr/bin/env python3
"""啟動家用 Edge TTS，並用 cloudflared 登記 HTTPS 網址到 Apps Script。"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOOLS = Path(__file__).resolve().parent
sys.path.insert(0, str(TOOLS))

from edge_tts_proxy import HOST, PORT, TOKEN, serve_forever  # noqa: E402

TUNNEL_RE = re.compile(r"https://[a-z0-9-]+\.trycloudflare\.com", re.I)

_state_lock = threading.Lock()
_current_url = ""


def log(msg: str) -> None:
    line = time.strftime("%Y-%m-%d %H:%M:%S") + " " + msg
    print(line, flush=True)


def load_env(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    if not path.is_file():
        return out
    text = path.read_text(encoding="utf-8-sig")
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        val = val.strip()
        if (val.startswith('"') and val.endswith('"')) or (
            val.startswith("'") and val.endswith("'")
        ):
            val = val[1:-1]
        out[key.strip().lstrip("\ufeff")] = val
    return out


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def post_apps_script(url: str, payload: dict) -> dict:
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "text/plain;charset=utf-8"},
        method="POST",
    )
    opener = urllib.request.build_opener(_NoRedirect)
    try:
        res = opener.open(req, timeout=45)
        text = res.read().decode("utf-8", errors="replace")
        code = getattr(res, "status", None) or res.getcode()
        loc = res.headers.get("Location") if res.headers else None
    except urllib.error.HTTPError as err:
        text = err.read().decode("utf-8", errors="replace")
        code = err.code
        loc = err.headers.get("Location") if err.headers else None
        if not (300 <= int(code) < 400 and loc):
            raise RuntimeError(f"Apps Script HTTP {code}: {text[:240]}") from err
    if 300 <= int(code) < 400:
        if not loc:
            raise RuntimeError("Apps Script 轉向但沒有 Location")
        with urllib.request.urlopen(loc, timeout=45) as res2:
            text = res2.read().decode("utf-8", errors="replace")
    try:
        return json.loads(text)
    except json.JSONDecodeError as err:
        raise RuntimeError(f"Apps Script 非 JSON: {text[:240]}") from err


def find_cloudflared() -> str:
    found = shutil.which("cloudflared")
    if found:
        return found
    winget = (
        Path(os.environ.get("LOCALAPPDATA", ""))
        / "Microsoft"
        / "WinGet"
        / "Packages"
    )
    if winget.is_dir():
        matches = sorted(winget.glob("Cloudflare.cloudflared*/cloudflared.exe"))
        if matches:
            return str(matches[-1])
    raise SystemExit("找不到 cloudflared。請先安裝：winget install Cloudflare.cloudflared")


def speech_url_from_origin(origin: str) -> str:
    base = origin.rstrip("/")
    if base.endswith("/v1/audio/speech"):
        return base
    return base + "/v1/audio/speech"


def register_proxy(script_url: str, write_token: str, public_url: str) -> None:
    data = post_apps_script(
        script_url,
        {
            "action": "setTtsProxy",
            "token": write_token,
            "url": public_url,
            "ttsToken": TOKEN,
        },
    )
    if not data.get("ok"):
        raise RuntimeError(str(data.get("error") or data))
    log("registered " + str(data.get("url") or public_url))


def set_current_url(url: str) -> None:
    global _current_url
    with _state_lock:
        if url != _current_url:
            _current_url = url
            if url:
                log("tunnel " + url)


def get_current_url() -> str:
    with _state_lock:
        return _current_url


def pump_stdout(proc: subprocess.Popen) -> None:
    assert proc.stdout is not None
    for line in proc.stdout:
        match = TUNNEL_RE.search(line)
        if match:
            set_current_url(speech_url_from_origin(match.group(0)))


def start_tunnel(cloudflared: str) -> subprocess.Popen:
    local = f"http://{HOST}:{PORT}"
    return subprocess.Popen(
        [cloudflared, "tunnel", "--url", local, "--no-autoupdate"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
    )


def main() -> int:
    secrets = load_env(ROOT / ".local" / "en-article-secrets.env")
    script_url = os.environ.get("SCORE_LOG_URL") or secrets.get("SCORE_LOG_URL", "")
    write_token = os.environ.get("EN_ARTICLE_WRITE_TOKEN") or secrets.get(
        "EN_ARTICLE_WRITE_TOKEN", ""
    )
    if not script_url or not write_token:
        log("缺少 .local/en-article-secrets.env 的 SCORE_LOG_URL / EN_ARTICLE_WRITE_TOKEN")
        return 1

    cloudflared = find_cloudflared()
    log("cloudflared " + cloudflared)

    threading.Thread(target=serve_forever, name="tts-http", daemon=True).start()
    time.sleep(0.8)

    last_register = 0.0
    last_ok_url = ""
    proc = start_tunnel(cloudflared)
    log("cloudflared pid " + str(proc.pid))
    threading.Thread(target=pump_stdout, args=(proc,), name="cf-log", daemon=True).start()

    while True:
        if proc.poll() is not None:
            log("cloudflared 結束，3 秒後重開")
            time.sleep(3)
            proc = start_tunnel(cloudflared)
            threading.Thread(
                target=pump_stdout, args=(proc,), name="cf-log", daemon=True
            ).start()
            set_current_url("")
            last_ok_url = ""
            last_register = 0.0
            continue

        url = get_current_url()
        now = time.time()
        if url:
            interval = 600 if last_ok_url == url else 45
            if last_register == 0 or now - last_register >= interval:
                try:
                    register_proxy(script_url, write_token, url)
                    last_ok_url = url
                    last_register = now
                except Exception as exc:
                    log("register failed: " + str(exc))
                    last_register = now
        time.sleep(2)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        raise SystemExit(0)
