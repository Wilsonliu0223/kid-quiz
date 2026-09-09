/**
 * 點國字查萌典注音／意思，並存進生字卡。
 */
import { getSelectedChild } from "./store.js";

const HAN = /[\u3400-\u9fff]/;
const KEY = "kid-quiz-zh-lookup-cards";
const MAX = 80;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** @type {Map<string, { word: string, zhuyin: string, meaning: string } | null>} */
const dictCache = new Map();
/** @type {Map<string, object | null>} */
const rawCache = new Map();

const $ = (sel) => document.querySelector(sel);

export function isHan(ch) {
  return HAN.test(ch);
}

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function renderTappable(text) {
  const chars = [...String(text || "")];
  return chars
    .map((ch, i) => {
      if (ch === "\n") return "<br />";
      if (!isHan(ch)) return escapeHtml(ch);
      return `<button type="button" class="zh-char" data-i="${i}">${escapeHtml(ch)}</button>`;
    })
    .join("");
}

function cardsKey() {
  return `${KEY}-${getSelectedChild() || "A"}`;
}

export function loadLookupCards() {
  try {
    const raw = JSON.parse(localStorage.getItem(cardsKey()) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function weekLookupCards() {
  const now = Date.now();
  return loadLookupCards().filter((c) => now - Number(c.at || 0) < WEEK_MS);
}

export function saveLookupCard(info) {
  if (!info?.word) return;
  const list = loadLookupCards().filter((c) => c.word !== info.word);
  list.unshift({
    word: info.word,
    zhuyin: info.zhuyin || "",
    meaning: info.meaning || "",
    at: Date.now(),
  });
  localStorage.setItem(cardsKey(), JSON.stringify(list.slice(0, MAX)));
}

export function clearLookupCards() {
  localStorage.removeItem(cardsKey());
}

export function hideLookupCard() {
  const card = $("#zh-lookup-card");
  if (card) card.hidden = true;
  document.querySelectorAll(".zh-char.is-on").forEach((el) => el.classList.remove("is-on"));
}

export function showLookupCard(state) {
  const card = $("#zh-lookup-card");
  if (!card) return;
  card.hidden = false;
  $("#zh-lookup-glyph").textContent = state.word || "";
  $("#zh-lookup-zhuyin").textContent = state.zhuyin || "";
  $("#zh-lookup-meaning").textContent = state.meaning || "";
}

function pickDefs(heteronyms) {
  const readings = [];
  for (const h of heteronyms || []) {
    const zhuyin = String(h.bopomofo || "").trim();
    const defs = [];
    for (const d of h.definitions || []) {
      let t = String(d.def || "").replace(/<[^>]+>/g, "").trim();
      if (!t || t.includes("《")) continue;
      if (t.length > 48) t = t.slice(0, 47) + "…";
      defs.push(t);
      if (defs.length >= 2) break;
    }
    if (!zhuyin && !defs.length) continue;
    readings.push({ zhuyin, meaning: defs.join("；") || "這個用法請看例句。" });
    if (readings.length >= 2) break;
  }
  return readings;
}

export async function fetchMoeRaw(word) {
  if (rawCache.has(word)) return rawCache.get(word);
  try {
    const url = `https://www.moedict.tw/uni/${encodeURIComponent(word)}.json`;
    const res = await fetch(url);
    if (res.status === 404) {
      rawCache.set(word, null);
      return null;
    }
    if (!res.ok) return null;
    const data = await res.json();
    rawCache.set(word, data);
    return data;
  } catch {
    return null;
  }
}

export async function lookupMoe(word) {
  if (dictCache.has(word)) return dictCache.get(word);
  const data = await fetchMoeRaw(word);
  if (!data) {
    dictCache.set(word, null);
    return null;
  }
  const readings = pickDefs(data.heteronyms);
  if (!readings.length) {
    dictCache.set(word, null);
    return null;
  }
  const info = {
    word,
    zhuyin: readings.map((r) => r.zhuyin).filter(Boolean).join("　"),
    meaning: readings
      .map((r) => (readings.length > 1 && r.zhuyin ? `${r.zhuyin} ${r.meaning}` : r.meaning))
      .join("／"),
  };
  dictCache.set(word, info);
  return info;
}

export async function lookupWord(paraText, index) {
  const chars = [...paraText];
  const one = chars[index] || "";
  if (!isHan(one)) return null;
  const next = chars[index + 1];
  const prev = chars[index - 1];
  const two = next && isHan(next) ? one + next : "";
  const back = prev && isHan(prev) ? prev + one : "";
  if (two) {
    const hit = await lookupMoe(two);
    if (hit) return hit;
  }
  if (back) {
    const hit = await lookupMoe(back);
    if (hit) return hit;
  }
  return lookupMoe(one);
}

export async function onLookupTap(btn, paraText) {
  const i = parseInt(btn.dataset.i, 10);
  document.querySelectorAll(".zh-char.is-on").forEach((el) => el.classList.remove("is-on"));
  btn.classList.add("is-on");
  showLookupCard({ word: btn.textContent || "", zhuyin: "查詢中…", meaning: "" });
  const info = await lookupWord(paraText, i);
  if (!info) {
    showLookupCard({
      word: btn.textContent || "",
      zhuyin: "",
      meaning: "這個字暫時查不到，再點一次或問大人。",
    });
    return;
  }
  saveLookupCard(info);
  showLookupCard(info);
}

export function bindLookupClicks(root, getParaText) {
  if (!root) return;
  root.addEventListener("click", (e) => {
    const btn = e.target instanceof Element ? e.target.closest(".zh-char") : null;
    if (!btn || !root.contains(btn)) return;
    const text = getParaText(btn);
    if (text) void onLookupTap(btn, text);
  });
}

const CUE_SKIP = new Set(["有喜", "害喜"]);
const CUE_BLOCK = /[死屍骨罪押捕妖兵稅瘡傷棺葬賭毒殺血妓娼淫孕]/;
const CUE_RARE = /[茗閨魂汗泉肌葉]/;
const CUE_WEAK = /[裡里的了著着過上下有得地一是就再把被與和及呢嗎呀啊]/;
const CUE_AFTER = ["子", "果", "見", "話", "氣", "味", "水", "口", "手", "頭", "心", "歡", "愛", "力", "光"];
const CUE_BEFORE = ["不", "小", "大", "好", "花", "白", "開", "老", "外", "家"];
const CUE_ZI_OK = /[鞋種院桌椅帽弟子房梳刷刀杯盤碗筷娃]/;
const CUE_BU_OK = /[要是好對用]/;
const cueCache = new Map();

function hanOnly(s) {
  return [...String(s || "")].filter(isHan).join("");
}

function cleanCueWord(raw, char) {
  const word = hanOnly(raw);
  if ([...word].length !== 2) return "";
  if (!word.includes(char)) return "";
  if (CUE_SKIP.has(word) || CUE_BLOCK.test(word) || CUE_RARE.test(word)) return "";
  return word;
}

function rankWords(words, char) {
  const uniq = [...new Set((words || []).filter(Boolean))];
  const two = uniq.filter((w) => [...w].length === 2);
  const rest = uniq.filter((w) => [...w].length !== 2);
  return [
    ...two.filter((w) => w.startsWith(char)),
    ...two.filter((w) => !w.startsWith(char)),
    ...rest,
  ];
}

function curriculumWords(char, items) {
  const hits = [];
  for (const it of items || []) {
    const w = hanOnly(it.word);
    const n = [...w].length;
    if (n < 2 || n > 3 || !w.includes(char)) continue;
    if (CUE_SKIP.has(w) || CUE_BLOCK.test(w) || CUE_RARE.test(w)) continue;
    hits.push(w);
  }
  return rankWords(hits, char);
}

function cueRedup(char, sentence) {
  const text = String(sentence || "").replace(/[【】]/g, "");
  return text.includes(char + char) ? char + char : "";
}

function sentencePairs(char, sentence) {
  const chars = [...String(sentence || "").replace(/[【】]/g, "")];
  const hits = [];
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] !== char) continue;
    const next = chars[i + 1];
    const prev = chars[i - 1];
    if (next && isHan(next) && !CUE_WEAK.test(next)) {
      const word = cleanCueWord(char + next, char);
      if (word) hits.push(word);
    }
    if (prev && isHan(prev) && !CUE_WEAK.test(prev)) {
      const word = cleanCueWord(prev + char, char);
      if (word) hits.push(word);
    }
  }
  return rankWords(hits, char);
}

function affixCandidates(char) {
  const hits = [];
  for (const aff of CUE_AFTER) {
    const word = cleanCueWord(char + aff, char);
    if (word) hits.push(word);
  }
  for (const aff of CUE_BEFORE) {
    const word = cleanCueWord(aff + char, char);
    if (word) hits.push(word);
  }
  return hits;
}

async function isDictWord(word) {
  const info = await lookupMoe(word);
  return Boolean(info?.zhuyin);
}

function scoreCue(word, char) {
  const chars = [...word];
  if (chars.length !== 2) return chars.includes(char) ? 1 : -9;
  const [a, b] = chars;
  let s = 3;
  if (a === char) s += 2;
  if (b === "子") s += CUE_ZI_OK.test(char) ? 8 : -6;
  if (a === "不") s += CUE_BU_OK.test(char) ? 10 : -4;
  if (a === char && /[果氣味水手心歡愛光]/.test(b)) s += 6;
  if (b === "見" && /[聽看]/.test(char)) s += 8;
  if (b === "話" && /[聽說]/.test(char)) s += 8;
  if (b === "口" && /[港門窗]/.test(char)) s += 8;
  if (b === "手" && /[把拉推]/.test(char)) s += 6;
  if (b === char && /[小大好花白開老外家]/.test(a)) s += 4;
  return s;
}

async function pickBestVerified(cands, char) {
  const uniq = [...new Set((cands || []).filter(Boolean))];
  if (!uniq.length) return "";
  const ok = await Promise.all(uniq.map(isDictWord));
  let best = "";
  let bestScore = 0;
  uniq.forEach((word, i) => {
    if (!ok[i]) return;
    const s = scoreCue(word, char);
    if (s > bestScore) {
      bestScore = s;
      best = word;
    }
  });
  return best;
}

async function findCueWord(char, lessonItems, sentence = "", allItems = []) {
  const fromLesson = curriculumWords(char, lessonItems);
  if (fromLesson[0]) return fromLesson[0];
  const redup = cueRedup(char, sentence);
  if (redup) return redup;
  const fromAll = curriculumWords(char, allItems);
  if (fromAll[0]) return fromAll[0];

  const cacheKey = char;
  if (cueCache.has(cacheKey)) return cueCache.get(cacheKey);

  const fromSent = await pickBestVerified(sentencePairs(char, sentence), char);
  if (fromSent) {
    cueCache.set(cacheKey, fromSent);
    return fromSent;
  }
  const fromAffix = await pickBestVerified(affixCandidates(char), char);
  cueCache.set(cacheKey, fromAffix);
  return fromAffix;
}

/** 單字先找出真正的詞，再念「喜歡的喜」；已經是詞就直接念該詞。 */
export async function dictationSpeakText(word, bankItems = [], sentence = "", allItems = []) {
  const n = hanOnly(word);
  if (!n) return "";
  if ([...n].length >= 2) return n;
  const cue = await findCueWord(n, bankItems, sentence, allItems);
  return cue && cue.includes(n) ? `${cue}的${n}` : n;
}

/** 聽寫開始前先為每題準備詞語，避免邊聽邊抓到不成詞的音。 */
export async function prepareDictationCues(questions, zhBank = []) {
  const items = questions || [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const q = items[i++];
      if (!q || q.dictationCue) continue;
      const lessonItems = (zhBank || []).filter((it) => !q.lesson || it.lesson === q.lesson);
      q.dictationCue = await dictationSpeakText(q.word, lessonItems, q.sentence, zhBank);
    }
  }
  const n = Math.min(4, items.length);
  if (!n) return;
  await Promise.all(Array.from({ length: n }, () => worker()));
}

export function initZhLookup() {
  $("#btn-zh-lookup-close")?.addEventListener("click", () => hideLookupCard());
}
