/** 英文答案比對（忽略大小寫、前後空白） */
import { CONFIG } from "./config.site.js?v=config-v44.4";

export function normalizeEnglish(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[''`]/g, "'")
    .replace(/[.,!?;:"]/g, "");
}

export function englishAnswersMatch(typed, expected) {
  const a = normalizeEnglish(typed);
  const b = normalizeEnglish(expected);
  if (!a || !b) return false;
  return a === b;
}

let speechPrimed = false;
let sharedAudio = null;
let audioUnlocked = false;
/** 使用者語速（播放中可即時改） */
let activeSpeakSpeed = 1;
let activeSoften = false;
const dictAudioCache = new Map();

function normalizeAudioUrl(url) {
  if (!url) return "";
  const u = String(url).trim();
  if (u.startsWith("//")) return `https:${u}`;
  return u;
}

function ensureSharedAudio() {
  if (!sharedAudio) {
    sharedAudio = new Audio();
    sharedAudio.setAttribute("playsinline", "true");
    sharedAudio.playsInline = true;
    sharedAudio.preload = "auto";
  }
  return sharedAudio;
}

function stopAudio() {
  if (sharedAudio) {
    try {
      sharedAudio.pause();
      sharedAudio.removeAttribute("src");
      sharedAudio.load();
    } catch (e) {
      console.warn("stopAudio", e);
    }
  }
  window.speechSynthesis?.cancel();
}

/**
 * 必須在 click／touch 同步呼叫，解除手機自動播放限制。
 * 若先 await 再 play／speak，iOS／Android 常會靜音失敗。
 */
export function unlockSpeechFromGesture() {
  speechPrimed = true;
  try {
    window.speechSynthesis?.resume();
    window.speechSynthesis?.getVoices();
  } catch (e) {
    console.warn("unlock speechSynthesis", e);
  }

  try {
    const audio = ensureSharedAudio();
    const unlockSrc =
      "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
    audioUnlocked = true;
    // 若正在播真正內容就不要打斷
    if (!audio.paused && audio.src && audio.src !== unlockSrc) {
      audio.muted = false;
      return;
    }
    audio.muted = true;
    audio.src = unlockSrc;
    const p = audio.play();
    if (p && typeof p.then === "function") {
      p.then(() => {
        // 只停解鎖用無聲檔；勿誤停 data:mpeg／blob 真正語音
        if (audio.src === unlockSrc) {
          try {
            audio.pause();
          } catch (_) {}
        }
        audio.muted = false;
      }).catch(() => {
        audio.muted = false;
      });
    } else {
      audio.muted = false;
    }
  } catch (e) {
    console.warn("unlock Audio", e);
    audioUnlocked = true;
  }
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
  }
  return btoa(binary);
}

function playAudioUrl(url, opts = {}) {
  return new Promise((resolve) => {
    const src = normalizeAudioUrl(url);
    if (!src) {
      resolve(false);
      return;
    }
    try {
      window.speechSynthesis?.cancel();
      const audio = ensureSharedAudio();
      audio.muted = false;
      audio.onended = null;
      audio.onerror = null;
      audio.onplaying = null;

      const soften = Boolean(opts.soften);
      const userSpeed =
        Number(opts.speed) > 0 ? Number(opts.speed) : activeSpeakSpeed || 1;
      const base = soften ? 0.86 : 1;
      const rate = base * userSpeed;
      activeSoften = soften;
      activeSpeakSpeed = userSpeed;
      try {
        audio.preservesPitch = !soften;
        if ("mozPreservesPitch" in audio) audio.mozPreservesPitch = !soften;
        if ("webkitPreservesPitch" in audio) audio.webkitPreservesPitch = !soften;
      } catch (_) {}
      audio.playbackRate = rate;

      let settled = false;
      let started = false;
      const done = (ok) => {
        if (settled) return;
        settled = true;
        clearTimeout(startTimer);
        try {
          audio.playbackRate = 1;
          audio.preservesPitch = true;
        } catch (_) {}
        resolve(ok);
      };
      const startTimer = setTimeout(() => {
        if (!started) done(false);
      }, opts.startTimeoutMs ?? (soften || userSpeed < 1 ? 5000 : 3500));
      audio.onplaying = () => {
        started = true;
        clearTimeout(startTimer);
      };
      audio.onended = () => done(true);
      audio.onerror = () => done(false);
      audio.src = src;
      const playP = audio.play();
      if (playP && typeof playP.then === "function") {
        playP.catch(() => {
          // iOS 偶發要再 resume／重試一次
          try {
            audio.muted = false;
            audio.play().then(() => {}).catch(() => done(false));
          } catch (_) {
            done(false);
          }
        });
      }
    } catch (e) {
      console.warn("playAudioUrl", e);
      resolve(false);
    }
  });
}

/** 播放中即時改語速（慢／中／快） */
export function setSpeakingSpeed(speed) {
  const s = Number(speed);
  if (!(s > 0)) return;
  activeSpeakSpeed = s;
  if (sharedAudio && !sharedAudio.paused) {
    const base = activeSoften ? 0.86 : 1;
    try {
      sharedAudio.playbackRate = base * s;
    } catch (_) {}
  }
}

export function getSpeakingSpeed() {
  return activeSpeakSpeed || 1;
}

function pickAudioFromEntry(entry) {
  const list = entry.phonetics || [];
  const withAudio = list
    .map((p) => normalizeAudioUrl(p.audio))
    .filter(Boolean);
  if (!withAudio.length) return "";

  const us =
    withAudio.find((u) => /-us\.|american|en-us/i.test(u)) ||
    withAudio.find((u) => /us\b/i.test(u));
  return us || withAudio[0];
}

async function fetchDictionaryAudioUrl(query) {
  const key = String(query || "").trim().toLowerCase();
  if (!key) return "";
  if (dictAudioCache.has(key)) return dictAudioCache.get(key);

  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(query)}`
    );
    if (!res.ok) {
      dictAudioCache.set(key, "");
      return "";
    }
    const data = await res.json();
    for (const entry of data) {
      const url = pickAudioFromEntry(entry);
      if (url) {
        dictAudioCache.set(key, url);
        return url;
      }
    }
    dictAudioCache.set(key, "");
  } catch (e) {
    console.warn("fetchDictionaryAudioUrl", query, e);
  }
  return "";
}

/** @type {Map<string, { word: string, gloss: string, example: string, phonetic: string } | null>} */
const glossDefCache = new Map();

function glossWordCandidates(word) {
  const w = String(word || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z'-]/g, "");
  if (!w) return [];
  const out = [w];
  if (w.endsWith("ies") && w.length > 4) out.push(`${w.slice(0, -3)}y`);
  if (w.endsWith("es") && w.length > 4) out.push(w.slice(0, -2));
  if (w.endsWith("s") && !w.endsWith("ss") && w.length > 3) out.push(w.slice(0, -1));
  if (w.endsWith("ing") && w.length > 5) {
    out.push(w.slice(0, -3));
    out.push(`${w.slice(0, -3)}e`);
  }
  if (w.endsWith("ed") && w.length > 4) {
    out.push(w.slice(0, -2));
    out.push(w.slice(0, -1));
  }
  return [...new Set(out)];
}

function simplifyKidDefinition(def) {
  let s = String(def || "").trim();
  if (!s) return "";
  const parts = s
    .split(/;\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length > 1) {
    const ranked = [...parts].sort((a, b) => a.length - b.length);
    s =
      ranked.find((p) => !/^used as\b/i.test(p) && p.length >= 12) ||
      ranked[0];
  }
  if (s.length > 140) {
    s = `${s.slice(0, 137).replace(/\s+\S*$/, "")}…`;
  }
  return s;
}

/**
 * 線上英英（Free Dictionary API）。文章 vocab 沒有的字用這個補。
 * @returns {Promise<{ word: string, gloss: string, example: string, phonetic: string } | null>}
 */
export async function lookupEnglishGloss(word) {
  const raw = String(word || "").trim();
  if (!raw) return null;
  const cacheKey = raw.toLowerCase();
  if (glossDefCache.has(cacheKey)) return glossDefCache.get(cacheKey);

  for (const q of glossWordCandidates(raw)) {
    try {
      const res = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(q)}`
      );
      if (!res.ok) continue;
      const data = await res.json();
      if (!Array.isArray(data) || !data.length) continue;
      const entry = data[0];
      const meanings = entry.meanings || [];
      if (!meanings.length) continue;

      const nounM = meanings.find((m) => m.partOfSpeech === "noun");
      const verbM = meanings.find((m) => m.partOfSpeech === "verb");
      const adjM = meanings.find((m) => m.partOfSpeech === "adjective");
      let preferred = meanings[0];
      if (nounM && verbM) {
        const nd = String(nounM.definitions?.[0]?.definition || "");
        // build 等字名詞常是「身材」罕見義 → 改用動詞
        preferred = /physique|bodily constitution|body type|frame of (a |the )?body/i.test(
          nd
        )
          ? verbM
          : nounM;
      } else {
        preferred = nounM || verbM || adjM || meanings[0];
      }
      const defs = preferred.definitions || [];
      if (!defs.length) continue;

      const primary = simplifyKidDefinition(defs[0].definition);
      if (!primary) continue;
      let gloss = primary;
      const second = defs[1] ? simplifyKidDefinition(defs[1].definition) : "";
      // 主義偏長時，補一句較短的第二義當幫助
      if (second && primary.length > 90 && second.length < 80 && second !== primary) {
        gloss = `${primary} · ${second}`;
      }

      const phonetic =
        String(entry.phonetic || "").replace(/^\/|\/$/g, "") ||
        (entry.phonetics || [])
          .map((p) => String(p.text || "").replace(/^\/|\/$/g, ""))
          .find(Boolean) ||
        "";
      const result = {
        word: entry.word || raw,
        gloss,
        example: String(defs[0].example || defs[1]?.example || "").trim(),
        phonetic,
      };
      glossDefCache.set(cacheKey, result);
      return result;
    } catch (e) {
      console.warn("lookupEnglishGloss", q, e);
    }
  }

  glossDefCache.set(cacheKey, null);
  return null;
}

async function speakWithDictionary(text) {
  const tries = [
    text,
    text.replace(/\s+/g, "-"),
    text.replace(/\s+/g, ""),
    text.replace(/-/g, " "),
  ];
  const seen = new Set();
  for (const q of tries) {
    const key = q.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const url = await fetchDictionaryAudioUrl(q);
    if (url) return playAudioUrl(url);
  }
  return false;
}

/** 詞組：逐字播詞典音；任一失敗則整段改語音合成 */
async function speakPhraseWithDictionary(text) {
  const parts = String(text)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length < 2) return false;

  for (const part of parts) {
    const url = await fetchDictionaryAudioUrl(part);
    if (!url) return false;
    const ok = await playAudioUrl(url);
    if (!ok) return false;
  }
  return true;
}

/** Google 翻譯 TTS（較像真人；非正式 API，失敗就換下一個） */
function googleTtsUrl(text, lang = "en") {
  const tl = lang === "zh" ? "zh-CN" : lang === "zh-TW" ? "zh-TW" : "en";
  const max = lang === "zh" || lang === "zh-TW" ? 100 : 180;
  const q = encodeURIComponent(String(text || "").trim().slice(0, max));
  if (!q) return "";
  // client=tw-ob 中文較常比 gtx 順耳
  const client = lang === "en" ? "gtx" : "tw-ob";
  return `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=${client}&tl=${tl}&q=${q}`;
}

/** 有道美式發音（英文） */
function youdaoTtsUrl(text) {
  const q = encodeURIComponent(String(text || "").trim().slice(0, 600));
  if (!q) return "";
  return `https://dict.youdao.com/dictvoice?audio=${q}&type=2`;
}

/** 百度翻譯中文 TTS（通常比 Google 中文自然） */
function baiduZhTtsUrl(text) {
  const q = encodeURIComponent(String(text || "").trim().slice(0, 180));
  if (!q) return "";
  return `https://fanyi.baidu.com/gettts?lan=zh&text=${q}&spd=4&source=web`;
}

/** 有道中文 TTS */
function youdaoZhTtsUrl(text) {
  const q = encodeURIComponent(String(text || "").trim().slice(0, 400));
  if (!q) return "";
  return `https://dict.youdao.com/dictvoice?le=zh&audio=${q}`;
}

/** 中文依句讀切段，語氣較自然 */
function chunkZhForTts(text, maxLen = 42) {
  const s = String(text || "")
    .trim()
    .replace(/\s+/g, "");
  if (!s) return [];
  if (s.length <= maxLen) return [s];

  const parts = [];
  const push = (t) => {
    const x = String(t || "").trim();
    if (x) parts.push(x);
  };

  for (const sent of s.split(/(?<=[。！？])/)) {
    if (!sent) continue;
    if (sent.length <= maxLen) {
      const last = parts[parts.length - 1];
      if (last && last.length + sent.length <= maxLen) {
        parts[parts.length - 1] = last + sent;
      } else {
        push(sent);
      }
      continue;
    }
    let buf = "";
    for (const ch of sent) {
      buf += ch;
      if (buf.length >= maxLen || /[，、；]/.test(ch)) {
        push(buf);
        buf = "";
      }
    }
    push(buf);
  }
  return parts;
}

/** 長文切段，避免 Google TTS 截斷 */
function chunkTextForTts(text, maxLen = 160) {
  const s = String(text || "")
    .trim()
    .replace(/\s+/g, " ");
  if (!s) return [];
  if (/[\u4e00-\u9fff]/.test(s)) return chunkZhForTts(s, Math.min(maxLen, 42));
  if (s.length <= maxLen) return [s];

  const parts = [];
  let buf = "";
  const pushBuf = () => {
    if (buf) parts.push(buf);
    buf = "";
  };

  for (const sentence of s.split(/(?<=[.!?])\s+/)) {
    if (!sentence) continue;
    if (sentence.length > maxLen) {
      pushBuf();
      const words = sentence.split(" ");
      for (const word of words) {
        const next = buf ? `${buf} ${word}` : word;
        if (next.length > maxLen) {
          pushBuf();
          buf = word.slice(0, maxLen);
        } else {
          buf = next;
        }
      }
      continue;
    }
    const next = buf ? `${buf} ${sentence}` : sentence;
    if (next.length > maxLen) {
      pushBuf();
      buf = sentence;
    } else {
      buf = next;
    }
  }
  pushBuf();
  return parts;
}

const zhTranslateCache = new Map();

/** 英→中（非正式 translate API；失敗回空字串）
 * @param {string} text
 * @param {'TW'|'CN'} [variant] 朗讀用 CN 搭配百度較自然；顯示可用 TW
 */
export async function translateEnToZh(text, variant = "CN") {
  const src = String(text || "").trim();
  if (!src) return "";
  const cacheKey = `${variant}:${src}`;
  if (zhTranslateCache.has(cacheKey)) return zhTranslateCache.get(cacheKey);

  const tl = variant === "TW" ? "zh-TW" : "zh-CN";
  try {
    const pieces = chunkTextForTts(src, 400);
    const out = [];
    for (const piece of pieces) {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${tl}&dt=t&q=${encodeURIComponent(piece)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`translate ${res.status}`);
      const data = await res.json();
      const part = (data?.[0] || []).map((row) => row?.[0] || "").join("");
      out.push(part);
    }
    const joined = out.join("");
    zhTranslateCache.set(cacheKey, joined);
    return joined;
  } catch (e) {
    console.warn("translateEnToZh", e);
    zhTranslateCache.set(cacheKey, "");
    return "";
  }
}

/** Google Speech API 中文（備援） */
function googleSpeechZhUrl(text) {
  const q = encodeURIComponent(String(text || "").trim().slice(0, 180));
  if (!q) return "";
  return `https://www.google.com/speech-api/v1/synthesize?enc=mpeg&lang=zh-cn&speed=0.42&client=lr-language-tts&use_google_only_voices=1&text=${q}`;
}

const edgeZhBlobCache = new Map();
const zhNeuralUrlCache = new Map();
/** @type {string} 最近一次實際用到的引擎（給播放條提示） */
let lastSpeakEngine = "";

export function getLastSpeakEngine() {
  return lastSpeakEngine;
}

function zhVoiceCandidates() {
  const preferred = String(
    CONFIG.ZH_TTS_VOICE || "zh-CN-YunxiNeural"
  ).trim();
  const list = [
    preferred,
    "zh-CN-YunxiNeural",
    "zh-TW-HsiaoChenNeural",
    "zh-CN-YunyangNeural",
    "zh-CN-XiaoxiaoNeural",
  ];
  return [...new Set(list.filter(Boolean))];
}

function edgeTtsEndpoint() {
  // 硬編碼備援：避免舊版 config.site.js 快取沒有 EDGE_TTS_URL 時整段跳過
  return String(
    CONFIG.EDGE_TTS_URL || "https://tts.wangwangit.com/v1/audio/speech"
  ).trim();
}

/**
 * Microsoft Edge 神經語音（經公開代理；CORS *）
 * 手機改用 data: URL，避免 blob: 在 iOS 不播而掉進機械音
 */
async function resolveEdgeZhBlobUrl(chunk) {
  const text = String(chunk || "")
    .trim()
    .slice(0, 280);
  if (!text) return "";

  const endpoint = edgeTtsEndpoint();
  if (!endpoint) return "";

  for (const voice of zhVoiceCandidates()) {
    const cacheKey = `${voice}::${text}`;
    if (edgeZhBlobCache.has(cacheKey)) {
      lastSpeakEngine = `edge:${voice}`;
      return edgeZhBlobCache.get(cacheKey);
    }
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: text,
          voice,
          speed: 1,
        }),
      });
      if (!res.ok) {
        console.warn("Edge TTS HTTP", voice, res.status);
        continue;
      }
      const buf = await res.arrayBuffer();
      if (!buf || buf.byteLength < 200) continue;
      const headTxt = new TextDecoder().decode(buf.slice(0, 48)).trim();
      if (headTxt.startsWith("{") || headTxt.startsWith("<")) {
        console.warn("Edge TTS not audio", voice, headTxt.slice(0, 80));
        continue;
      }
      const url = `data:audio/mpeg;base64,${arrayBufferToBase64(buf)}`;
      edgeZhBlobCache.set(cacheKey, url);
      lastSpeakEngine = `edge:${voice}`;
      return url;
    } catch (e) {
      console.warn("Edge TTS", voice, e);
    }
  }
  return "";
}

/** 預熱中文神經語音（進閱讀頁／點中文前呼叫，縮短手機等待） */
export function prefetchChineseAudio(englishText) {
  const raw = String(englishText || "").trim();
  if (!raw) return;
  void (async () => {
    try {
      const zh =
        (await translateEnToZh(raw, "CN")) ||
        (await translateEnToZh(raw, "TW")) ||
        "";
      if (zh) await resolveEdgeZhBlobUrl(zh);
    } catch (e) {
      console.warn("prefetchChineseAudio", e);
    }
  })();
}

/** Apps Script 備援 */
async function resolveZhNeuralUrl(chunk) {
  const key = String(chunk || "").trim();
  if (!key) return "";
  if (zhNeuralUrlCache.has(key)) return zhNeuralUrlCache.get(key);

  const endpoint = String(CONFIG.SCORE_LOG_URL || "").trim();
  if (!endpoint) return "";

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "synthesizeZh",
        text: key,
        voice: CONFIG.ZH_TTS_VOICE || "zh-CN-YunxiNeural",
      }),
      redirect: "follow",
    });
    const raw = await res.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return "";
    }
    if (data && data.ok && data.audioBase64) {
      const url = `data:${data.mime || "audio/mpeg"};base64,${data.audioBase64}`;
      zhNeuralUrlCache.set(key, url);
      lastSpeakEngine = `script:${data.speaker || "edge"}`;
      return url;
    }
    if (data && data.ok && data.url) {
      zhNeuralUrlCache.set(key, data.url);
      lastSpeakEngine = "zhiyu";
      return data.url;
    }
  } catch (e) {
    console.warn("resolveZhNeuralUrl", e);
  }
  return "";
}

async function playOnlineChunk(chunk, lang = "en", speed = 1) {
  if (lang === "zh") {
    const edge = await resolveEdgeZhBlobUrl(chunk);
    if (
      edge &&
      (await playAudioUrl(edge, { speed, soften: false, startTimeoutMs: 6000 }))
    ) {
      return true;
    }
    const neural = await resolveZhNeuralUrl(chunk);
    if (neural) {
      const isZhiyu = lastSpeakEngine === "zhiyu" || /ttsmp3/i.test(neural);
      if (
        await playAudioUrl(neural, {
          speed,
          soften: isZhiyu,
          startTimeoutMs: 6000,
        })
      ) {
        return true;
      }
    }
    lastSpeakEngine = "fallback";
    const soft = { soften: true, speed };
    const gSpeech = googleSpeechZhUrl(chunk);
    if (
      gSpeech &&
      (await playAudioUrl(gSpeech, { ...soft, startTimeoutMs: 3500 }))
    ) {
      return true;
    }
    const urls = [
      baiduZhTtsUrl(chunk),
      youdaoZhTtsUrl(chunk),
      googleTtsUrl(chunk, "zh"),
      googleTtsUrl(chunk, "zh-TW"),
    ];
    for (const url of urls) {
      if (url && (await playAudioUrl(url, { ...soft, startTimeoutMs: 3200 }))) {
        return true;
      }
    }
    lastSpeakEngine = "synth";
    return false;
  }

  lastSpeakEngine = "en-online";
  const g = googleTtsUrl(chunk, "en");
  if (g && (await playAudioUrl(g, { speed, startTimeoutMs: 2500 }))) return true;
  const y = youdaoTtsUrl(chunk);
  if (y && (await playAudioUrl(y, { speed, startTimeoutMs: 2500 }))) return true;
  lastSpeakEngine = "en-synth";
  return false;
}

/** 線上自然音；長文分段連播 */
async function speakWithOnlineTts(text, lang = "en", speed = 1) {
  const chunks =
    lang === "zh" ? chunkZhForTts(text, 72) : chunkTextForTts(text, 160);
  if (!chunks.length) return false;
  for (const chunk of chunks) {
    const ok = await playOnlineChunk(chunk, lang, speed);
    if (!ok) return false;
  }
  return true;
}

export function stopSpeaking() {
  stopAudio();
}

function pickEnglishVoice() {
  const voices = window.speechSynthesis?.getVoices() || [];
  const en = voices.filter((v) => v.lang?.toLowerCase().startsWith("en"));
  const score = (v) => {
    const n = `${v.name} ${v.lang}`.toLowerCase();
    let s = 0;
    if (/neural|natural|premium|enhanced|siri|samantha|karen|moira|daniel/.test(n)) s += 50;
    if (/google.*us|google us english/.test(n)) s += 40;
    if (/microsoft.*(aria|jenny|guy|sara)/.test(n)) s += 35;
    if (v.lang === "en-US") s += 10;
    if (!v.localService) s += 5;
    if (/compact|eloquence/.test(n)) s -= 20;
    return s;
  };
  en.sort((a, b) => score(b) - score(a));
  return en[0] || null;
}

export function primeSpeech() {
  speechPrimed = true;
  try {
    window.speechSynthesis?.resume();
    window.speechSynthesis?.getVoices();
  } catch (e) {
    console.warn("primeSpeech", e);
  }
}

function speakWithSynth(text, lang = "en", speed = 1) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      resolve(false);
      return;
    }

    const start = () => {
      try {
        window.speechSynthesis.cancel();
        window.speechSynthesis.resume();

        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang === "zh" ? "zh-TW" : "en-US";
        const baseRate =
          lang === "zh"
            ? 0.9
            : String(text).trim().split(/\s+/).length <= 3
              ? 0.95
              : 0.88;
        u.rate = Math.min(2, Math.max(0.5, baseRate * (Number(speed) || 1)));
        u.pitch = lang === "zh" ? 0.85 : 1;
        u.volume = 1;
        if (lang === "en") {
          const voice = pickEnglishVoice();
          if (voice) u.voice = voice;
        } else {
          const voices = window.speechSynthesis.getVoices() || [];
          const zh =
            voices.find((v) =>
              /yunxi|yunjian|yunye|yunjie|kangkang|male|男/i.test(
                `${v.name} ${v.voiceURI}`
              )
            ) ||
            voices.find((v) => /zh-TW|zh-HK|zh-CN/i.test(v.lang)) ||
            voices.find((v) => /^zh/i.test(v.lang));
          if (zh) u.voice = zh;
        }

        let settled = false;
        let spoke = false;
        const done = (ok) => {
          if (settled) return;
          settled = true;
          resolve(ok);
        };

        u.onstart = () => {
          spoke = true;
        };
        u.onend = () => done(spoke);
        u.onerror = () => done(false);
        setTimeout(() => done(spoke), 8000);

        window.speechSynthesis.speak(u);
        // iOS 有時會卡住 paused，點一下 resume
        setTimeout(() => {
          try {
            if (window.speechSynthesis.paused) window.speechSynthesis.resume();
          } catch (_) {}
        }, 50);
      } catch (e) {
        console.warn("speakWithSynth", e);
        resolve(false);
      }
    };

    if (window.speechSynthesis.getVoices().length) {
      start();
      return;
    }

    const onVoices = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", onVoices);
      start();
    };
    window.speechSynthesis.addEventListener("voiceschanged", onVoices);
    // 不等太久：多數裝置可直接用 lang 開播
    setTimeout(() => {
      window.speechSynthesis.removeEventListener("voiceschanged", onVoices);
      start();
    }, 80);
  });
}

/**
 * 播放英文
 * 點擊時請先呼叫 unlockSpeechFromGesture()
 * @param {string} text
 * @param {{ fast?: boolean, instant?: boolean, lang?: 'en'|'zh', speed?: number }} [opts]
 *   fast/instant：跳過詞典 API，直接播線上自然音；lang=zh 先譯成中文再播
 * @returns {Promise<boolean>}
 */
export async function speakEnglish(text, opts = {}) {
  const w = String(text || "").trim();
  if (!w) return false;

  if (!audioUnlocked) unlockSpeechFromGesture();
  else primeSpeech();

  const lang = opts.lang === "zh" ? "zh" : "en";
  const speed = Number(opts.speed) > 0 ? Number(opts.speed) : activeSpeakSpeed || 1;
  activeSpeakSpeed = speed;

  let speakText = w;
  if (lang === "zh") {
    speakText =
      (await translateEnToZh(w, "CN")) ||
      (await translateEnToZh(w, "TW")) ||
      w;
  }

  const wantFast = opts.fast || opts.instant;
  if (wantFast) {
    window.speechSynthesis?.cancel();
    try {
      sharedAudio?.pause();
    } catch (_) {}
    const onlineOk = await speakWithOnlineTts(speakText, lang, speed);
    if (onlineOk) return true;
    return speakWithSynth(speakText, lang, speed);
  }

  if (lang === "en") {
    const dictOk = await speakWithDictionary(w);
    if (dictOk) return true;
  }

  const onlineOk = await speakWithOnlineTts(speakText, lang, speed);
  if (onlineOk) return true;

  if (lang === "en" && /\s/.test(w)) {
    const phraseOk = await speakPhraseWithDictionary(w);
    if (phraseOk) return true;
  }

  return speakWithSynth(speakText, lang, speed);
}

/** 預載發音（分段暖機 Google TTS），縮短第一次點播放等待 */
export function prefetchEnglishAudio(text) {
  const chunks = chunkTextForTts(text, 160);
  for (const c of chunks) {
    try {
      const a = new Audio();
      a.preload = "auto";
      a.src = googleTtsUrl(c);
    } catch (_) {}
    const key = String(c || "")
      .trim()
      .toLowerCase();
    if (key && !/\s/.test(key) && key.length < 40) {
      void fetchDictionaryAudioUrl(key);
    }
  }
}

if (typeof window !== "undefined" && window.speechSynthesis) {
  window.speechSynthesis.addEventListener("voiceschanged", pickEnglishVoice);
  pickEnglishVoice();
}
