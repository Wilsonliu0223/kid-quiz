/** 英文答案比對（忽略大小寫、前後空白） */
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
function googleTtsUrl(text) {
  const q = encodeURIComponent(String(text || "").trim().slice(0, 180));
  if (!q) return "";
  return `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=gtx&tl=en&q=${q}`;
}

/** 有道美式發音（常有真人感） */
function youdaoTtsUrl(text) {
  const q = encodeURIComponent(String(text || "").trim().slice(0, 600));
  if (!q) return "";
  return `https://dict.youdao.com/dictvoice?audio=${q}&type=2`;
}

/** 長文切段，避免 Google TTS 截斷 */
function chunkTextForTts(text, maxLen = 160) {
  const s = String(text || "")
    .trim()
    .replace(/\s+/g, " ");
  if (!s) return [];
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

async function playOnlineChunk(chunk) {
  const g = googleTtsUrl(chunk);
  if (g && (await playAudioUrl(g, { startTimeoutMs: 2500 }))) return true;
  const y = youdaoTtsUrl(chunk);
  if (y && (await playAudioUrl(y, { startTimeoutMs: 2500 }))) return true;
  return false;
}

/** 線上自然音：Google → 有道；長文分段連播 */
async function speakWithOnlineTts(text) {
  const chunks = chunkTextForTts(text, 160);
  if (!chunks.length) return false;
  for (const chunk of chunks) {
    const ok = await playOnlineChunk(chunk);
    if (!ok) return false;
  }
  return true;
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

function speakWithSynth(text) {
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
        u.lang = "en-US";
        // 短字稍快、長文稍慢
        u.rate = String(text).trim().split(/\s+/).length <= 3 ? 0.95 : 0.88;
        u.pitch = 1;
        u.volume = 1;
        const voice = pickEnglishVoice();
        if (voice) u.voice = voice;

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
 * @param {{ fast?: boolean, instant?: boolean }} [opts]
 *   fast/instant：跳過詞典 API，直接播線上自然音（跟手）；失敗才系統語音
 * @returns {Promise<boolean>}
 */
export async function speakEnglish(text, opts = {}) {
  const w = String(text || "").trim();
  if (!w) return false;

  if (!audioUnlocked) unlockSpeechFromGesture();
  else primeSpeech();

  const wantFast = opts.fast || opts.instant;
  if (wantFast) {
    // 勿 sharedAudio.load() 重設，以免剛解鎖又被清掉
    window.speechSynthesis?.cancel();
    try {
      sharedAudio?.pause();
    } catch (_) {}
    const onlineOk = await speakWithOnlineTts(w);
    if (onlineOk) return true;
    return speakWithSynth(w);
  }

  // 1) 單字詞典真人錄音（有則最自然）
  const dictOk = await speakWithDictionary(w);
  if (dictOk) return true;

  // 2) 線上 TTS
  const onlineOk = await speakWithOnlineTts(w);
  if (onlineOk) return true;

  // 3) 詞組拆字播詞典
  if (/\s/.test(w)) {
    const phraseOk = await speakPhraseWithDictionary(w);
    if (phraseOk) return true;
  }

  // 4) 系統語音（備援）
  return speakWithSynth(w);
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
