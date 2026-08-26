/** 英文答案比對（忽略大小寫、前後空白） */
import { CONFIG } from "./config.site.js";

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
    audio.muted = true;
    const unlockSrc =
      "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
    // 手勢當下即視為已解鎖，避免等 Promise 才標記
    audioUnlocked = true;
    // 若正在播真正內容就不要打斷
    if (!audio.paused && audio.src && !audio.src.startsWith("data:")) {
      audio.muted = false;
      return;
    }
    audio.src = unlockSrc;
    const p = audio.play();
    if (p && typeof p.then === "function") {
      p.then(() => {
        // 勿 pause：可能已換成 Google TTS，pause 會把剛開始的朗讀掐掉
        if (audio.src.startsWith("data:")) {
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
      let settled = false;
      let started = false;
      const done = (ok) => {
        if (settled) return;
        settled = true;
        clearTimeout(startTimer);
        resolve(ok);
      };
      // 逾時仍未開始播放 → 失敗換下一個來源
      const startTimer = setTimeout(() => {
        if (!started) done(false);
      }, opts.startTimeoutMs ?? 2800);
      audio.onplaying = () => {
        started = true;
        clearTimeout(startTimer);
      };
      audio.onended = () => done(true);
      audio.onerror = () => done(false);
      audio.src = src;
      audio.play().then(() => {}).catch(() => done(false));
    } catch (e) {
      console.warn("playAudioUrl", e);
      resolve(false);
    }
  });
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

/** Google Speech API 中文（比 translate_tts 清楚；可直接當 audio.src） */
function googleSpeechZhUrl(text) {
  const q = encodeURIComponent(String(text || "").trim().slice(0, 180));
  if (!q) return "";
  return `https://www.google.com/speech-api/v1/synthesize?enc=mpeg&lang=zh-cn&speed=0.42&client=lr-language-tts&use_google_only_voices=1&text=${q}`;
}

const zhNeuralUrlCache = new Map();

/** 經 Apps Script 轉 Amazon Polly Zhiyu（需部署最新 google-apps-script.gs） */
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
      body: JSON.stringify({ action: "synthesizeZh", text: key }),
      redirect: "follow",
    });
    const raw = await res.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      // Apps Script 偶發回整包國語 JSON（部署未更新／導向變 GET）
      return "";
    }
    if (data && data.ok && data.url) {
      zhNeuralUrlCache.set(key, data.url);
      return data.url;
    }
  } catch (e) {
    console.warn("resolveZhNeuralUrl", e);
  }
  return "";
}

async function playOnlineChunk(chunk, lang = "en") {
  if (lang === "zh") {
    // 1) Polly 神經網路（Apps Script 代理）→ 2) Google Speech → 3) 舊備援
    const neural = await resolveZhNeuralUrl(chunk);
    if (neural && (await playAudioUrl(neural, { startTimeoutMs: 5000 }))) {
      return true;
    }
    const gSpeech = googleSpeechZhUrl(chunk);
    if (gSpeech && (await playAudioUrl(gSpeech, { startTimeoutMs: 3500 }))) {
      return true;
    }
    const urls = [
      baiduZhTtsUrl(chunk),
      youdaoZhTtsUrl(chunk),
      googleTtsUrl(chunk, "zh"),
      googleTtsUrl(chunk, "zh-TW"),
    ];
    for (const url of urls) {
      if (url && (await playAudioUrl(url, { startTimeoutMs: 3200 }))) return true;
    }
    return false;
  }

  const g = googleTtsUrl(chunk, "en");
  if (g && (await playAudioUrl(g, { startTimeoutMs: 2500 }))) return true;
  const y = youdaoTtsUrl(chunk);
  if (y && (await playAudioUrl(y, { startTimeoutMs: 2500 }))) return true;
  return false;
}

/** 線上自然音；長文分段連播 */
async function speakWithOnlineTts(text, lang = "en") {
  const chunks =
    lang === "zh" ? chunkZhForTts(text, 72) : chunkTextForTts(text, 160);
  if (!chunks.length) return false;
  for (const chunk of chunks) {
    const ok = await playOnlineChunk(chunk, lang);
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

function speakWithSynth(text, lang = "en") {
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
        u.rate = lang === "zh" ? 0.95 : String(text).trim().split(/\s+/).length <= 3 ? 0.95 : 0.88;
        u.pitch = 1;
        u.volume = 1;
        if (lang === "en") {
          const voice = pickEnglishVoice();
          if (voice) u.voice = voice;
        } else {
          const voices = window.speechSynthesis.getVoices() || [];
          const zh =
            voices.find((v) => /zh-TW|zh-HK/i.test(v.lang)) ||
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
 * @param {{ fast?: boolean, instant?: boolean, lang?: 'en'|'zh' }} [opts]
 *   fast/instant：跳過詞典 API，直接播線上自然音；lang=zh 先譯成中文再播
 * @returns {Promise<boolean>}
 */
export async function speakEnglish(text, opts = {}) {
  const w = String(text || "").trim();
  if (!w) return false;

  if (!audioUnlocked) unlockSpeechFromGesture();
  else primeSpeech();

  const lang = opts.lang === "zh" ? "zh" : "en";
  let speakText = w;
  if (lang === "zh") {
    // 朗讀用簡中譯文，百度／有道中文 TTS 較自然
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
    const onlineOk = await speakWithOnlineTts(speakText, lang);
    if (onlineOk) return true;
    return speakWithSynth(speakText, lang);
  }

  if (lang === "en") {
    const dictOk = await speakWithDictionary(w);
    if (dictOk) return true;
  }

  const onlineOk = await speakWithOnlineTts(speakText, lang);
  if (onlineOk) return true;

  if (lang === "en" && /\s/.test(w)) {
    const phraseOk = await speakPhraseWithDictionary(w);
    if (phraseOk) return true;
  }

  return speakWithSynth(speakText, lang);
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
