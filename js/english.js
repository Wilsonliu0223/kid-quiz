/** 英文答案比對（忽略大小寫、前後空白） */
import { CONFIG } from "./config.site.js?v=config-v45.7";

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
    try {
      sharedAudio.referrerPolicy = "no-referrer";
    } catch (_) {}
    sharedAudio.setAttribute("referrerpolicy", "no-referrer");
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

function currentPlaybackRate() {
  const userSpeed = Number(activeSpeakSpeed) > 0 ? Number(activeSpeakSpeed) : 1;
  const base = activeSoften ? 0.86 : 1;
  return base * userSpeed;
}

/** 換 src 後瀏覽器常把 playbackRate 打回 1，要重套 */
function applyPlaybackRate(audio) {
  if (!audio) return;
  const rate = currentPlaybackRate();
  try {
    audio.defaultPlaybackRate = rate;
    audio.playbackRate = rate;
  } catch (_) {}
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
      audio.onloadedmetadata = null;
      audio.oncanplay = null;

      const soften = Boolean(opts.soften);
      const userSpeed =
        Number(opts.speed) > 0 ? Number(opts.speed) : activeSpeakSpeed || 1;
      activeSoften = soften;
      activeSpeakSpeed = userSpeed;
      try {
        audio.preservesPitch = !soften;
        if ("mozPreservesPitch" in audio) audio.mozPreservesPitch = !soften;
        if ("webkitPreservesPitch" in audio) audio.webkitPreservesPitch = !soften;
      } catch (_) {}

      let settled = false;
      let started = false;
      let endFailsafe = 0;
      let rateWatch = 0;
      const done = (ok) => {
        if (settled) return;
        settled = true;
        clearTimeout(startTimer);
        if (endFailsafe) clearTimeout(endFailsafe);
        if (rateWatch) clearInterval(rateWatch);
        audio.onloadedmetadata = null;
        audio.oncanplay = null;
        resolve(ok);
      };
      const startTimer = setTimeout(() => {
        if (!started) done(false);
      }, opts.startTimeoutMs ?? (soften || userSpeed < 1 ? 5000 : 3500));

      const armDurationFailsafe = () => {
        if (endFailsafe) clearTimeout(endFailsafe);
        const dur = audio.duration;
        if (!Number.isFinite(dur) || dur <= 0) return;
        // 依實際長度 + 語速，避免 onended 沒觸發一直卡住；多留 0.8s
        applyPlaybackRate(audio);
        const ms = Math.ceil((dur / (audio.playbackRate || 1)) * 1000) + 800;
        endFailsafe = setTimeout(() => done(true), ms);
      };

      audio.onplaying = () => {
        started = true;
        clearTimeout(startTimer);
        applyPlaybackRate(audio);
        armDurationFailsafe();
      };
      audio.onloadedmetadata = () => {
        applyPlaybackRate(audio);
        if (started) armDurationFailsafe();
      };
      audio.oncanplay = () => applyPlaybackRate(audio);
      audio.onended = () => {
        // 忽略「幾乎沒播就 ended」的假結束（換 src／載入中常見）
        const dur = audio.duration;
        const t = audio.currentTime;
        if (
          Number.isFinite(dur) &&
          dur > 0.45 &&
          Number.isFinite(t) &&
          t < Math.min(0.2, dur * 0.2)
        ) {
          try {
            if (audio.paused) {
              audio.play().catch(() => done(true));
            }
          } catch (_) {
            done(true);
          }
          return;
        }
        done(true);
      };
      audio.onerror = () => done(false);
      audio.src = src;
      applyPlaybackRate(audio);
      rateWatch = setInterval(() => {
        if (!settled) applyPlaybackRate(audio);
      }, 200);
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
  applyPlaybackRate(sharedAudio);
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

/** @type {Map<string, { word: string, gloss: string, example: string, phonetic: string, senses?: object[], source?: string } | null>} */
const glossDefCache = new Map();

function glossWordCandidates(word) {
  const w = String(word || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z'-]/g, "");
  if (!w) return [];
  const out = [w];
  if (w.endsWith("ies") && w.length > 4) out.push(`${w.slice(0, -3)}y`);
  if (w.endsWith("ves") && w.length > 4) out.push(`${w.slice(0, -3)}f`);
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
  if (w.endsWith("er") && w.length > 4) out.push(w.slice(0, -2));
  if (w.endsWith("est") && w.length > 5) out.push(w.slice(0, -3));
  if (w.endsWith("ly") && w.length > 4) out.push(w.slice(0, -2));
  return [...new Set(out)];
}

function simplifyKidDefinition(def) {
  let s = String(def || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\\t/g, "\t")
    .trim();
  if (!s) return "";
  // Datamuse: 先去掉 "n\t"／"v\t"（不可先把 tab 收成空白）
  s = s.replace(/^[nvadj]\s*[\t:|]\s*/, "");
  s = s.replace(/^[nvadj]\s+(?=[A-Za-z(])/, "");
  s = s.replace(/\s+/g, " ").trim();
  s = s.replace(/^\([^)]*\)\s*/g, "");
  s = s.replace(/^\([^)]*\)\s*/g, "");
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
  if (s.length > 150) {
    s = `${s.slice(0, 147).replace(/\s+\S*$/, "")}…`;
  }
  return s;
}

/** 循環定義／過短／幾乎只重複原字 → 當弱結果，改試其他來源 */
function isWeakGloss(gloss, word) {
  const g = String(gloss || "").trim().toLowerCase();
  const w = String(word || "").trim().toLowerCase();
  if (!g || g.length < 8) return true;
  if (/^(a |an )?surname\b/.test(g) || /\bgiven name\b/.test(g)) return true;
  if (!w) return false;
  const words = g.split(/[^a-z]+/).filter(Boolean);
  if (words.length <= 4 && words.includes(w)) return true;
  if (new RegExp(`^(a |an |the )?${w}\\b`, "i").test(g) && words.length <= 5) {
    return true;
  }
  return false;
}

function dictionaryPosLabel(pos) {
  const labels = {
    noun: "n.",
    verb: "v.",
    adjective: "adj.",
    adverb: "adv.",
    pronoun: "pron.",
    preposition: "prep.",
    conjunction: "conj.",
    interjection: "interj.",
    determiner: "det.",
    article: "article.",
    abbreviation: "abbr.",
  };
  return labels[String(pos || "").toLowerCase()] || String(pos || "").trim();
}

function pickUsIpa(pronunciations) {
  const list = Array.isArray(pronunciations) ? pronunciations : [];
  const raw =
    list.find(
      (p) =>
        Array.isArray(p?.tags) &&
        p.tags.some((tag) => /^us$/i.test(String(tag || "")))
    )?.text ||
    list.find((p) => String(p?.type || "").toLowerCase() === "ipa")?.text ||
    "";
  return String(raw)
    .replace(/^\//, "")
    .replace(/\/$/, "")
    .replace(/^\[/, "")
    .replace(/\]$/, "");
}

function pickChineseTranslation(translations) {
  const list = Array.isArray(translations) ? translations : [];
  const hit = list.find((t) => {
    const code = String(t?.language?.code || "").toLowerCase();
    const name = String(t?.language?.name || "").toLowerCase();
    return code === "cmn" || code === "zh" || name.includes("chinese");
  });
  if (!hit?.word) return "";
  // Wiktionary 有時同時提供繁簡，用斜線分隔；第一項通常是繁體。
  return String(hit.word).split("/")[0].trim();
}

function isUncommonDictionarySense(sense) {
  const tags = Array.isArray(sense?.tags) ? sense.tags.join(" ") : "";
  const definition = String(sense?.definition || "");
  return /\b(?:obsolete|archaic|rare|dated|dialect(?:al)?|poetic|literary|nonstandard|offensive|vulgar|slang|euphemistic|humorous)\b/i.test(
    `${tags} ${definition}`
  );
}

/**
 * FreeDictionaryAPI：Wiktionary 結構化資料，免費、免 key、支援 CORS。
 * 這裡優先保留詞性與多個 sense，讓畫面能做英英／英繁對照。
 * @returns {Promise<{ word: string, gloss: string, example: string, phonetic: string, senses?: object[], source?: string } | null>}
 */
async function glossFromFreeDictionaryApi(q, displayWord) {
  const data = await fetchJson(
    `https://freedictionaryapi.com/api/v1/entries/en/${encodeURIComponent(
      q
    )}?translations=true`,
    8000
  );
  if (!data || !Array.isArray(data.entries)) return null;

  const entries = data.entries.filter(
    (entry) => String(entry?.language?.code || "").toLowerCase() === "en"
  );
  const posTotals = new Map();
  for (const entry of entries) {
    const pos = dictionaryPosLabel(entry.partOfSpeech);
    const total = Array.isArray(entry.senses) ? entry.senses.length : 0;
    posTotals.set(pos, (posTotals.get(pos) || 0) + total);
  }
  const primaryPos = dictionaryPosLabel(entries[0]?.partOfSpeech);
  const commonPos = new Set([primaryPos]);
  for (const [pos, total] of posTotals) {
    // Wiktionary 未必標出「少見」；義項數太少的次要詞性先收起。
    if (total >= 5) commonPos.add(pos);
  }
  const senses = [];
  const posCounts = new Map();
  for (const entry of entries) {
    const pos = dictionaryPosLabel(entry.partOfSpeech);
    if (!commonPos.has(pos)) continue;
    for (const sense of Array.isArray(entry.senses) ? entry.senses : []) {
      if ((posCounts.get(pos) || 0) >= 3) break;
      if (isUncommonDictionarySense(sense)) continue;
      const definition = simplifyKidDefinition(sense?.definition);
      if (!definition || isWeakGloss(definition, q)) continue;
      senses.push({
        pos,
        definition,
        zh: pickChineseTranslation(sense?.translations),
        example: String(sense?.examples?.[0] || "").trim(),
      });
      posCounts.set(pos, (posCounts.get(pos) || 0) + 1);
    }
    if (senses.length >= 8) break;
  }
  if (!senses.length) return null;

  // 只補前幾個沒有詞典中文的義項，避免一次產生大量翻譯請求。
  const missing = senses.filter((s) => !s.zh).slice(0, 4);
  await Promise.all(
    missing.map(async (sense) => {
      sense.zh =
        (await translateEnToZh(sense.definition, "TW")) ||
        (await translateEnToZh(sense.definition, "CN")) ||
        "";
      sense.zhSource = sense.zh ? "machine" : "";
    })
  );

  const first = senses[0];
  return {
    word: data.word || displayWord || q,
    gloss: first.definition,
    example: first.example,
    phonetic: pickUsIpa(entries[0]?.pronunciations),
    senses,
    source: "Wiktionary",
    sourceUrl: String(data.source?.url || "https://en.wiktionary.org/"),
  };
}

function scoreGlossQuality(gloss, word) {
  if (!gloss) return -1;
  if (isWeakGloss(gloss, word)) return 0;
  let score = 40;
  const len = gloss.length;
  if (len >= 20 && len <= 120) score += 25;
  else if (len > 120) score += 10;
  if (/^to\s+/i.test(gloss)) score += 8;
  if (/surname|given name|obsolete|archaic/i.test(gloss)) score -= 30;
  const w = String(word || "").replace(/[^a-z]/gi, "");
  if (w && !new RegExp(`\\b${w}\\b`, "i").test(gloss)) score += 12;
  return score;
}

async function fetchJson(url, timeoutMs = 7000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * @returns {Promise<{ word: string, gloss: string, example: string, phonetic: string } | null>}
 */
async function glossFromFreeDictionary(q, displayWord) {
  try {
    const data = await fetchJson(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(q)}`
    );
    if (!Array.isArray(data) || !data.length) return null;
    const entry = data[0];
    const meanings = entry.meanings || [];
    if (!meanings.length) return null;

    const nounM = meanings.find((m) => m.partOfSpeech === "noun");
    const verbM = meanings.find((m) => m.partOfSpeech === "verb");
    const adjM = meanings.find((m) => m.partOfSpeech === "adjective");
    let preferred = meanings[0];
    if (nounM && verbM) {
      const nd = String(nounM.definitions?.[0]?.definition || "");
      preferred = /physique|bodily constitution|body type|frame of (a |the )?body/i.test(
        nd
      )
        ? verbM
        : nounM;
    } else {
      preferred = nounM || verbM || adjM || meanings[0];
    }
    const defs = preferred.definitions || [];
    if (!defs.length) return null;
    const primary = simplifyKidDefinition(defs[0].definition);
    if (!primary) return null;
    let gloss = primary;
    const second = defs[1] ? simplifyKidDefinition(defs[1].definition) : "";
    if (second && primary.length > 90 && second.length < 80 && second !== primary) {
      gloss = `${primary} · ${second}`;
    }
    const phonetic =
      String(entry.phonetic || "").replace(/^\/|\/$/g, "") ||
      (entry.phonetics || [])
        .map((p) => String(p.text || "").replace(/^\/|\/$/g, ""))
        .find(Boolean) ||
      "";
    return {
      word: entry.word || displayWord || q,
      gloss,
      example: String(defs[0].example || defs[1]?.example || "").trim(),
      phonetic,
    };
  } catch (e) {
    console.warn("glossFromFreeDictionary", q, e);
    return null;
  }
}

/**
 * Datamuse 字義（覆蓋專有名詞／運動用語常比 Free Dictionary 好）
 * @returns {Promise<{ word: string, gloss: string, example: string, phonetic: string } | null>}
 */
async function glossFromDatamuse(q, displayWord) {
  try {
    const data = await fetchJson(
      `https://api.datamuse.com/words?sp=${encodeURIComponent(q)}&md=d&max=8`
    );
    if (!Array.isArray(data) || !data.length) return null;
    const hit =
      data.find((row) => String(row.word || "").toLowerCase() === q.toLowerCase()) ||
      null;
    if (!hit?.defs?.length) return null;

    const cleaned = hit.defs
      .map((d) => ({
        raw: String(d),
        gloss: simplifyKidDefinition(d),
        isVerb: /^v[\t ]/i.test(String(d)),
      }))
      .filter((d) => d.gloss && !isWeakGloss(d.gloss, q));
    if (!cleaned.length) return null;

    const verbs = cleaned.filter((d) => d.isVerb);
    const others = cleaned.filter((d) => !d.isVerb);
    let ordered = cleaned;
    if (verbs.length && others.length) {
      const topNoun = others[0];
      const topVerb = verbs[0];
      if (
        /physique|bodily constitution|body type|brand or kind|activity for amusement/i.test(
          topNoun.gloss
        )
      ) {
        ordered = [topVerb, ...others, ...verbs.slice(1)];
      } else {
        ordered = [topNoun, topVerb, ...others.slice(1), ...verbs.slice(1)];
      }
    }
    const pick = ordered[0];
    const alt = ordered.find((d) => d.gloss !== pick.gloss);
    let gloss = pick.gloss;
    if (alt && pick.gloss.length > 90 && alt.gloss.length < 80) {
      gloss = `${pick.gloss} · ${alt.gloss}`;
    }
    return {
      word: hit.word || displayWord || q,
      gloss,
      example: "",
      phonetic: "",
    };
  } catch (e) {
    console.warn("glossFromDatamuse", q, e);
    return null;
  }
}

/**
 * Simple English Wikipedia 一句話（地名／公司／專有名詞很有用）
 * @returns {Promise<{ word: string, gloss: string, example: string, phonetic: string } | null>}
 */
async function glossFromSimpleWiki(q, displayWord) {
  const title = String(q || "").trim();
  if (!title || title.length < 2) return null;
  try {
    const data = await fetchJson(
      `https://simple.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      6000
    );
    if (!data || data.type !== "standard") return null;
    const pageTitle = String(data.title || "").trim();
    const qNorm = title.toLowerCase().replace(/[^a-z0-9]/g, "");
    const tNorm = pageTitle.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (qNorm && tNorm && qNorm !== tNorm && !tNorm.startsWith(qNorm) && !qNorm.startsWith(tNorm)) {
      return null;
    }
    const extract = String(data.extract || "").trim();
    if (!extract) return null;
    const first = extract.split(/(?<=\.)\s+/)[0] || extract;
    const gloss = simplifyKidDefinition(first);
    if (!gloss || isWeakGloss(gloss, title)) return null;
    return {
      word: pageTitle || displayWord || title,
      gloss,
      example: "",
      phonetic: "",
    };
  } catch (e) {
    console.warn("glossFromSimpleWiki", title, e);
    return null;
  }
}

function pickBestGloss(candidates, word) {
  let best = null;
  let bestScore = -1;
  for (const c of candidates) {
    if (!c?.gloss) continue;
    const score = scoreGlossQuality(c.gloss, word);
    if (score > bestScore) {
      best = c;
      bestScore = score;
    }
  }
  return bestScore > 0 ? best : null;
}

/**
 * 線上英英（多來源）：Free Dictionary → Datamuse → Simple Wikipedia
 * 文章 vocab 沒有的字用這個補；專有名詞／運動用語覆蓋較完整。
 * @returns {Promise<{ word: string, gloss: string, example: string, phonetic: string, senses?: object[], source?: string } | null>}
 */
export async function lookupEnglishGloss(word) {
  const raw = String(word || "").trim();
  if (!raw) return null;
  const cacheKey = raw.toLowerCase();
  if (glossDefCache.has(cacheKey)) return glossDefCache.get(cacheKey);

  const forms = glossWordCandidates(raw);
  /** @type {{ word: string, gloss: string, example: string, phonetic: string, senses?: object[], source?: string }[]} */
  const found = [];

  // 優先使用有詞性／多義項／翻譯欄位的新免費來源。
  const structured = await glossFromFreeDictionaryApi(forms[0] || raw, raw);
  if (structured) {
    glossDefCache.set(cacheKey, structured);
    return structured;
  }

  // 並行查前兩個詞形（原形 + 第一個變形），再補其餘
  const primaryForms = forms.slice(0, 2);
  const restForms = forms.slice(2);
  for (const batch of [primaryForms, restForms]) {
    if (!batch.length) continue;
    const results = await Promise.all(
      batch.flatMap((q) => [
        glossFromFreeDictionary(q, raw),
        glossFromDatamuse(q, raw),
      ])
    );
    for (const r of results) {
      if (r?.gloss) found.push(r);
    }
    const bestSoFar = pickBestGloss(found, raw);
    if (bestSoFar && scoreGlossQuality(bestSoFar.gloss, raw) >= 50) {
      const withExtras = {
        ...bestSoFar,
        example: bestSoFar.example || found.find((f) => f.example)?.example || "",
        phonetic:
          bestSoFar.phonetic || found.find((f) => f.phonetic)?.phonetic || "",
      };
      glossDefCache.set(cacheKey, withExtras);
      return withExtras;
    }
  }

  const wikiTries = [
    ...new Set(
      [raw, raw.charAt(0).toUpperCase() + raw.slice(1), forms[0]].filter(Boolean)
    ),
  ];
  const wikiHits = await Promise.all(
    wikiTries.map((t) => glossFromSimpleWiki(t, raw))
  );
  for (const w of wikiHits) {
    if (w?.gloss) found.push(w);
  }

  const best = pickBestGloss(found, raw);
  if (best) {
    const withExtras = {
      ...best,
      example: best.example || found.find((f) => f.example)?.example || "",
      phonetic: best.phonetic || found.find((f) => f.phonetic)?.phonetic || "",
    };
    glossDefCache.set(cacheKey, withExtras);
    return withExtras;
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
  // 英文超過 ~100 字元常被靜默截斷，音檔提早 ended → 反亮會搶跑
  const max = lang === "zh" || lang === "zh-TW" ? 100 : 100;
  const q = encodeURIComponent(String(text || "").trim().slice(0, max));
  if (!q) return "";
  // client=tw-ob 中文較常比 gtx 順耳
  const client = "tw-ob";
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

const edgeSpeechCache = new Map();
const zhNeuralUrlCache = new Map();
/** @type {string} 最近一次實際用到的引擎（給播放條提示） */
let lastSpeakEngine = "";

export function getLastSpeakEngine() {
  return lastSpeakEngine;
}

function zhVoiceCandidates(preferred) {
  const first = String(preferred || CONFIG.ZH_TTS_VOICE || "zh-CN-YunxiNeural").trim();
  const list = [
    first,
    "zh-CN-YunxiNeural",
    "zh-TW-HsiaoChenNeural",
    "zh-CN-YunyangNeural",
    "zh-CN-XiaoxiaoNeural",
  ];
  return [...new Set(list.filter(Boolean))];
}

function enVoiceCandidates(preferred) {
  const first = String(preferred || CONFIG.EN_TTS_VOICE || "en-US-JennyNeural").trim();
  const list = [
    first,
    "en-US-JennyNeural",
    "en-US-GuyNeural",
    "en-US-AriaNeural",
    "en-GB-SoniaNeural",
  ];
  return [...new Set(list.filter(Boolean))];
}

let edgeTtsBlocked = false;

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
async function resolveEdgeSpeechUrl(chunk, voices) {
  const text = String(chunk || "")
    .trim()
    .slice(0, 280);
  if (!text) return "";
  if (edgeTtsBlocked) return "";

  const endpoint = edgeTtsEndpoint();
  if (!endpoint) return "";
  const voiceList = (voices || []).filter(Boolean);
  if (!voiceList.length) return "";

  for (const voice of voiceList) {
    const cacheKey = `${voice}::${text}`;
    if (edgeSpeechCache.has(cacheKey)) {
      lastSpeakEngine = `edge:${voice}`;
      return edgeSpeechCache.get(cacheKey);
    }
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "tts-1",
          input: text,
          voice,
          speed: 1,
          response_format: "mp3",
        }),
      });
      if (res.status === 401 || res.status === 403) {
        edgeTtsBlocked = true;
        console.warn("Edge TTS blocked", res.status);
        return "";
      }
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
      edgeSpeechCache.set(cacheKey, url);
      lastSpeakEngine = `edge:${voice}`;
      return url;
    } catch (e) {
      console.warn("Edge TTS", voice, e);
    }
  }
  return "";
}

async function resolveEdgeZhBlobUrl(chunk, voice) {
  const voices = voice ? [voice] : zhVoiceCandidates();
  return resolveEdgeSpeechUrl(chunk, voices);
}

async function resolveEdgeEnBlobUrl(chunk, voice) {
  const voices = voice ? [voice] : enVoiceCandidates();
  return resolveEdgeSpeechUrl(chunk, voices);
}

/** 預熱中文神經語音（進閱讀頁／點中文前呼叫，縮短手機等待） */
export function prefetchChineseAudio(englishText, voice) {
  const raw = String(englishText || "").trim();
  if (!raw) return;
  void (async () => {
    try {
      const zh = /[\u4e00-\u9fff]/.test(raw)
        ? raw
        : (await translateEnToZh(raw, "CN")) ||
          (await translateEnToZh(raw, "TW")) ||
          "";
      if (zh) await resolveEdgeZhBlobUrl(zh, voice);
    } catch (e) {
      console.warn("prefetchChineseAudio", e);
    }
  })();
}

/** Apps Script 備援 */
async function resolveZhNeuralUrl(chunk, voice) {
  const key = String(chunk || "").trim();
  if (!key) return "";
  const useVoice = String(voice || CONFIG.ZH_TTS_VOICE || "zh-CN-YunxiNeural").trim();
  const cacheKey = `${useVoice}::${key}`;
  if (zhNeuralUrlCache.has(cacheKey)) return zhNeuralUrlCache.get(cacheKey);

  const endpoint = String(CONFIG.SCORE_LOG_URL || "").trim();
  if (!endpoint) return "";

  const action = /^en/i.test(useVoice) ? "synthesizeSpeech" : "synthesizeZh";

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action,
        text: key,
        voice: useVoice,
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
      zhNeuralUrlCache.set(cacheKey, url);
      lastSpeakEngine = `script:${data.speaker || "edge"}`;
      return url;
    }
    if (data && data.ok && data.url) {
      zhNeuralUrlCache.set(cacheKey, data.url);
      lastSpeakEngine = "zhiyu";
      return data.url;
    }
  } catch (e) {
    console.warn("resolveZhNeuralUrl", e);
  }
  return "";
}

async function playOnlineChunk(chunk, lang = "en", speed = 1, voice) {
  if (lang === "zh") {
    const edge = await resolveEdgeZhBlobUrl(chunk, voice);
    if (
      edge &&
      (await playAudioUrl(edge, { speed, soften: false, startTimeoutMs: 6000 }))
    ) {
      return true;
    }
    const neural = await resolveZhNeuralUrl(chunk, voice);
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
  const edgeEn = await resolveEdgeEnBlobUrl(chunk, voice);
  if (
    edgeEn &&
    (await playAudioUrl(edgeEn, { speed, soften: false, startTimeoutMs: 7000 }))
  ) {
    return true;
  }
  const g = googleTtsUrl(chunk, "en");
  if (g && (await playAudioUrl(g, { speed, startTimeoutMs: 5000 }))) {
    lastSpeakEngine = "en-google";
    return true;
  }
  const scriptEn = await resolveZhNeuralUrl(
    chunk,
    voice || CONFIG.EN_TTS_VOICE || "en-US-JennyNeural"
  );
  if (
    scriptEn &&
    (await playAudioUrl(scriptEn, { speed, soften: false, startTimeoutMs: 8000 }))
  ) {
    return true;
  }
  const y = youdaoTtsUrl(chunk);
  if (y && (await playAudioUrl(y, { speed, startTimeoutMs: 4000 }))) {
    lastSpeakEngine = "en-youdao";
    return true;
  }
  lastSpeakEngine = "en-synth";
  return false;
}

/** 線上自然音；長文分段連播 */
async function speakWithOnlineTts(text, lang = "en", speed = 1, voice) {
  // Edge 可吃較長；Google 備援仍用短段
  const chunks =
    lang === "zh" ? chunkZhForTts(text, 72) : chunkTextForTts(text, 180);
  if (!chunks.length) return false;
  for (const chunk of chunks) {
    const ok = await playOnlineChunk(chunk, lang, speed, voice);
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
            ? 0.95
            : String(text).trim().split(/\s+/).length <= 3
              ? 1
              : 0.98;
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
          clearTimeout(maxTimer);
          resolve(ok);
        };

        u.onstart = () => {
          spoke = true;
        };
        u.onend = () => done(spoke);
        u.onerror = () => done(false);
        // 依字數估最長等待，勿固定 8 秒（長句會還沒念完就當結束）
        const approxMs = /[\u4e00-\u9fff]/.test(text)
          ? String(text).length * 220
          : String(text).trim().split(/\s+/).filter(Boolean).length * 420;
        const maxTimer = setTimeout(
          () => done(spoke),
          Math.min(90000, Math.max(12000, approxMs / Math.max(0.5, Number(speed) || 1)))
        );

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
 * @param {{ fast?: boolean, instant?: boolean, lang?: 'en'|'zh', speed?: number, alreadyZh?: boolean, voice?: string }} [opts]
 *   fast/instant：跳過詞典 API，直接播線上自然音；lang=zh 先譯成中文再播（alreadyZh=true 則直接播中文）
 *   voice：Edge 神經音名稱（情境對話依說話人指定）
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
  const voice = String(opts.voice || "").trim() || undefined;

  let speakText = w;
  if (lang === "zh" && !opts.alreadyZh) {
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
    const onlineOk = await speakWithOnlineTts(speakText, lang, speed, voice);
    if (onlineOk) return true;
    return speakWithSynth(speakText, lang, speed);
  }

  if (lang === "en") {
    const dictOk = await speakWithDictionary(w);
    if (dictOk) return true;
  }

  const onlineOk = await speakWithOnlineTts(speakText, lang, speed, voice);
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
