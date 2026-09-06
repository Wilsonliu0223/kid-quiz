#!/usr/bin/env python3
"""kid-quiz 家用 Microsoft Edge 神經語音。OpenAI 相容 POST /v1/audio/speech。"""

from __future__ import annotations

import asyncio
import json
import os
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

try:
    import edge_tts
except ImportError as exc:
    raise SystemExit("請先安裝：py -3 -m pip install edge-tts") from exc

HOST = os.environ.get("KID_QUIZ_TTS_HOST", "127.0.0.1")
PORT = int(os.environ.get("KID_QUIZ_TTS_PORT", "8765"))
TOKEN = os.environ.get("KID_QUIZ_TTS_TOKEN", "kq-home-tts")
MAX_CHARS = 280
RATE_WINDOW_SEC = 60
RATE_MAX = 120

ALLOWED_VOICES = {
    "zh-CN-YunxiNeural",
    "zh-TW-HsiaoChenNeural",
    "zh-CN-YunyangNeural",
    "en-US-JennyNeural",
    "en-US-GuyNeural",
    "en-US-AriaNeural",
    "en-GB-SoniaNeural",
}

_rate_lock = threading.Lock()
_rate_hits: dict[str, list[float]] = {}
_synth_sem = threading.Semaphore(2)


def _origin_ok(origin: str) -> bool:
    if not origin:
        return True
    try:
        parsed = urlparse(origin)
    except ValueError:
        return False
    host = (parsed.hostname or "").lower()
    if host in {"localhost", "127.0.0.1"}:
        return True
    if host.endswith(".github.io"):
        return True
    return False


def _cors_headers(origin: str) -> list[tuple[str, str]]:
    allow = origin if _origin_ok(origin) and origin else "*"
    return [
        ("Access-Control-Allow-Origin", allow),
        ("Access-Control-Allow-Methods", "POST, OPTIONS"),
        ("Access-Control-Allow-Headers", "Content-Type, X-Kid-Quiz-Tts"),
        ("Access-Control-Max-Age", "86400"),
        ("Vary", "Origin"),
    ]


def _client_ip(handler: BaseHTTPRequestHandler) -> str:
    return handler.client_address[0] if handler.client_address else "unknown"


def _rate_ok(ip: str) -> bool:
    now = time.time()
    with _rate_lock:
        hits = [t for t in _rate_hits.get(ip, []) if now - t < RATE_WINDOW_SEC]
        if len(hits) >= RATE_MAX:
            _rate_hits[ip] = hits
            return False
        hits.append(now)
        _rate_hits[ip] = hits
        return True


def _pick_voice(raw: str) -> str:
    voice = str(raw or "").strip()
    if voice in ALLOWED_VOICES:
        return voice
    if voice.lower().startswith("zh"):
        return "zh-CN-YunxiNeural"
    return "en-US-JennyNeural"


def _check_token(handler: BaseHTTPRequestHandler) -> bool:
    got = handler.headers.get("X-Kid-Quiz-Tts", "")
    if got == TOKEN:
        return True
    auth = handler.headers.get("Authorization", "")
    if auth == f"Bearer {TOKEN}":
        return True
    return False


async def _synth(text: str, voice: str) -> bytes:
    chunks: list[bytes] = []
    communicate = edge_tts.Communicate(text, voice)
    async for item in communicate.stream():
        if item["type"] == "audio":
            chunks.append(item["data"])
    return b"".join(chunks)


def synth_mp3(text: str, voice: str) -> bytes:
    with _synth_sem:
        return asyncio.run(_synth(text, voice))


class TtsHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt: str, *args) -> None:
        print("[tts]", self.address_string(), "-", fmt % args, flush=True)

    def _send(self, code: int, body: bytes, content_type: str) -> None:
        origin = self.headers.get("Origin", "")
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        for key, val in _cors_headers(origin):
            self.send_header(key, val)
        self.end_headers()
        self.wfile.write(body)

    def _json(self, code: int, obj: dict) -> None:
        self._send(code, json.dumps(obj).encode("utf-8"), "application/json")

    def do_OPTIONS(self) -> None:  # noqa: N802
        self._send(204, b"", "text/plain")

    def do_GET(self) -> None:  # noqa: N802
        if self.path.split("?", 1)[0] in {"/", "/health"}:
            self._json(200, {"ok": True, "service": "kid-quiz-edge-tts"})
            return
        self._json(404, {"ok": False, "error": "not found"})

    def do_POST(self) -> None:  # noqa: N802
        path = self.path.split("?", 1)[0]
        if path != "/v1/audio/speech":
            self._json(404, {"ok": False, "error": "not found"})
            return
        origin = self.headers.get("Origin", "")
        if origin and not _origin_ok(origin):
            self._json(403, {"ok": False, "error": "origin"})
            return
        if not _check_token(self):
            self._json(401, {"ok": False, "error": "unauthorized"})
            return
        ip = _client_ip(self)
        if not _rate_ok(ip):
            self._json(429, {"ok": False, "error": "rate"})
            return
        length = int(self.headers.get("Content-Length") or "0")
        if length <= 0 or length > 20000:
            self._json(400, {"ok": False, "error": "bad body"})
            return
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            self._json(400, {"ok": False, "error": "json"})
            return
        text = str(payload.get("input") or payload.get("text") or "").strip()
        text = " ".join(text.split())[:MAX_CHARS]
        if not text:
            self._json(400, {"ok": False, "error": "missing input"})
            return
        voice = _pick_voice(str(payload.get("voice") or ""))
        try:
            audio = synth_mp3(text, voice)
        except Exception as exc:
            self.log_message("synth failed: %s", exc)
            self._json(502, {"ok": False, "error": "synth"})
            return
        if not audio or len(audio) < 200:
            self._json(502, {"ok": False, "error": "empty audio"})
            return
        self._send(200, audio, "audio/mpeg")


def serve_forever() -> None:
    server = ThreadingHTTPServer((HOST, PORT), TtsHandler)
    server.allow_reuse_address = True
    print(f"[tts] listening http://{HOST}:{PORT}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    serve_forever()
