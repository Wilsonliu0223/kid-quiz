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
    // 靜音短句：讓後續 await 之後的 speak 仍可用
    const warm = new SpeechSynthesisUtterance(" ");
    warm.volume = 0;
    warm.rate = 5;
    warm.lang = "en-US";
    window.speechSynthesis?.speak(warm);
  } catch (e) {
    console.warn("unlock speechSynthesis", e);
  }

  try {
    const audio = ensureSharedAudio();
    audio.muted = true;
    // 極短無聲 wav，在手勢內 play 以解鎖後續 MP3
    audio.src =
      "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
    const p = audio.play();
    if (p && typeof p.then === "function") {
      p.then(() => {
        audio.pause();
        audio.muted = false;
        audioUnlocked = true;
      }).catch(() => {
        audio.muted = false;
        audioUnlocked = true;
      });
    } else {
      audio.muted = false;
      audioUnlocked = true;
    }
  } catch (e) {
    console.warn("unlock Audio", e);
  }
}

function playAudioUrl(url) {
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
      let settled = false;
      const done = (ok) => {
        if (settled) return;
        settled = true;
        resolve(ok);
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

function pickEnglishVoice() {
  const voices = window.speechSynthesis?.getVoices() || [];
  const en = voices.filter((v) => v.lang?.toLowerCase().startsWith("en"));
  return (
    en.find((v) => /google.*english.*united states/i.test(v.name)) ||
    en.find((v) => /google/i.test(v.name) && v.lang === "en-US") ||
    en.find((v) => v.lang === "en-US" && !v.localService) ||
    en.find((v) => v.lang === "en-US") ||
    en[0] ||
    null
  );
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
        u.rate = 0.82;
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
    setTimeout(() => {
      window.speechSynthesis.removeEventListener("voiceschanged", onVoices);
      start();
    }, 400);
  });
}

/**
 * 播放英文：優先詞典真人發音 MP3，其次手機內建語音
 * 點擊時請先呼叫 unlockSpeechFromGesture()（或由本函式開頭解鎖）
 * @returns {Promise<boolean>}
 */
export async function speakEnglish(text) {
  const w = String(text || "").trim();
  if (!w) return false;

  // 若呼叫端已在 click 同步解鎖更好；此處再保險一次
  if (!audioUnlocked) unlockSpeechFromGesture();
  else primeSpeech();

  const dictOk = await speakWithDictionary(w);
  if (dictOk) return true;

  if (/\s/.test(w)) {
    const phraseOk = await speakPhraseWithDictionary(w);
    if (phraseOk) return true;
  }

  return speakWithSynth(w);
}

if (typeof window !== "undefined" && window.speechSynthesis) {
  window.speechSynthesis.addEventListener("voiceschanged", pickEnglishVoice);
  pickEnglishVoice();
}
