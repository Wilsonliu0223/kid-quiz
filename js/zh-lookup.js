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
/** 萌典常出現、小孩聽了會誤認成別的字的詞，例如「香茗」聽成「鄉民」。 */
const CUE_RARE = /[茗閨魂汗泉肌葉]/;
const CUE_AFTER = ["歡", "愛", "水", "氣", "味", "子", "天", "人", "心", "事", "頭", "兒"];
const cueCache = new Map();

function cueFromQuotes(text) {
  const out = [];
  for (const m of String(text || "").matchAll(/「([^」]{2,6})」/g)) {
    out.push(m[1]);
  }
  return out;
}

function cleanCueWord(raw, char) {
  const word = [...String(raw || "")].filter(isHan).join("");
  if ([...word].length !== 2) return "";
  if (!word.includes(char)) return "";
  if (CUE_SKIP.has(word) || CUE_BLOCK.test(word) || CUE_RARE.test(word)) return "";
  return word;
}

function pickCue(cands, char) {
  const uniq = [...new Set(cands.filter(Boolean))];
  return uniq.find((w) => w.startsWith(char)) || uniq[0] || "";
}

/** 課本例句「我喜歡…／身上香香的」直接取前後字。 */
const CUE_WEAK_NEXT = /[裡里的了著着過上下有得地]/;
function cueFromSentence(char, sentence) {
  const chars = [...String(sentence || "").replace(/[【】]/g, "")];
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] !== char) continue;
    const next = chars[i + 1];
    const prev = chars[i - 1];
    if (next && isHan(next) && !CUE_WEAK_NEXT.test(next)) {
      const word = cleanCueWord(char + next, char);
      if (word) return word;
    }
    if (prev && isHan(prev)) {
      const word = cleanCueWord(prev + char, char);
      if (word) return word;
    }
    if (next && isHan(next)) {
      const word = cleanCueWord(char + next, char);
      if (word) return word;
    }
  }
  return "";
}

function cueFromBank(char, items) {
  const hits = [];
  for (const it of items || []) {
    const word = String(it.word || "").trim();
    const two = cleanCueWord(word, char);
    if (two) hits.push(two);
    else if ([...word].length === 3 && word.includes(char) && !CUE_BLOCK.test(word) && !CUE_RARE.test(word)) {
      hits.push(word);
    }
    const fromSent = cueFromSentence(char, it.sentence);
    if (fromSent) hits.push(fromSent);
  }
  return pickCue(hits, char);
}

async function findCueWord(char, items, sentence = "") {
  const fromHere = cueFromSentence(char, sentence);
  if (fromHere) return fromHere;
  const fromBank = cueFromBank(char, items);
  if (fromBank) return fromBank;
  if (cueCache.has(char)) return cueCache.get(char);
  const cands = [];
  for (const aff of CUE_AFTER) {
    const hit = await lookupMoe(char + aff);
    const word = hit?.word ? cleanCueWord(hit.word, char) : "";
    if (word) {
      cands.push(word);
      break;
    }
  }
  const data = await fetchMoeRaw(char);
  const defs = (data?.heteronyms || []).flatMap((h) => h.definitions || []);
  for (const d of defs) {
    for (const raw of cueFromQuotes(d.example || "")) {
      const word = cleanCueWord(raw, char);
      if (word) cands.push(word);
    }
  }
  if (!cands.length) {
    for (const d of defs) {
      for (const raw of cueFromQuotes(d.def || "")) {
        const word = cleanCueWord(raw, char);
        if (word) cands.push(word);
      }
    }
  }
  const picked = pickCue(cands, char);
  cueCache.set(char, picked);
  return picked;
}

/** 單字聽寫念「喜歡的喜」；已經是詞就直接念該詞。 */
export async function dictationSpeakText(word, bankItems = [], sentence = "") {
  const n = [...String(word || "")].filter(isHan).join("");
  if (!n) return "";
  if ([...n].length >= 2) return n;
  const cue = await findCueWord(n, bankItems, sentence);
  return cue && cue.includes(n) ? `${cue}的${n}` : n;
}

export function initZhLookup() {
  $("#btn-zh-lookup-close")?.addEventListener("click", () => hideLookupCard());
}
