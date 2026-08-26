/**
 * 本機確認中文 Edge 雲希 TTS 可用
 * node tools/smoke-zh-tts.mjs
 */
import { CONFIG } from "../js/config.site.js";

const EDGE =
  CONFIG.EDGE_TTS_URL || "https://tts.wangwangit.com/v1/audio/speech";
const VOICE = CONFIG.ZH_TTS_VOICE || "zh-CN-YunxiNeural";

async function edgeSpeak(text, voice) {
  const res = await fetch(EDGE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input: text, voice, speed: 1 }),
  });
  const buf = Buffer.from(await res.arrayBuffer());
  const head = buf.slice(0, 8).toString("utf8");
  return {
    status: res.status,
    bytes: buf.length,
    isMpeg: buf[0] === 0xff || head.startsWith("ID3"),
  };
}

const zh = "两支足球队星期三要进行一场重要比赛。球迷很期待谁会赢。";
console.log("CONFIG", {
  version: CONFIG.APP_VERSION,
  EDGE,
  VOICE,
});

const r = await edgeSpeak(zh, VOICE);
console.log("edge result:", r);

if (r.status !== 200 || !r.isMpeg || r.bytes < 200) {
  console.error("FAIL: Edge TTS not usable");
  process.exit(1);
}

// 確認硬編碼備援路徑（模擬舊 config 無 EDGE_TTS_URL）
const fallbackEdge = "https://tts.wangwangit.com/v1/audio/speech";
const r2 = await edgeSpeak(zh, "zh-CN-YunxiNeural");
console.log("fallback path:", r2.status, r2.bytes, r2.isMpeg);

console.log("OK: Edge Yunxi path works");
