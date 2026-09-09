/**
 * 國語寫作教學：二～六年級常見題，點開看範文與寫法。
 */
import { WRITING_BANK, WRITING_GRADES, writingByGrade } from "./writing-bank.js";

const KEY_GRADE = "kid-quiz-writing-grade";
const WORD_GOAL = {
  2: [150, 250],
  3: [250, 350],
  4: [250, 350],
  5: [400, 600],
  6: [400, 600],
};

/** @type {{ showView: (name: string) => void } | null} */
let deps = null;
let grade = 2;
let currentId = null;

const HAN = /[\u3400-\u9fff]/;
/** @type {Map<string, { word: string, zhuyin: string, meaning: string } | null>} */
const dictCache = new Map();

const $ = (sel) => document.querySelector(sel);

function loadGrade() {
  const n = parseInt(localStorage.getItem(KEY_GRADE) || "", 10);
  if (WRITING_GRADES.includes(n)) return n;
  return 2;
}

function setGrade(n) {
  grade = n;
  localStorage.setItem(KEY_GRADE, String(n));
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function isHan(ch) {
  return HAN.test(ch);
}

function renderTappable(text) {
  const chars = [...String(text || "")];
  return chars
    .map((ch, i) => {
      if (ch === "\n") return "<br />";
      if (!isHan(ch)) return escapeHtml(ch);
      return `<button type="button" class="writing-char" data-i="${i}">${escapeHtml(ch)}</button>`;
    })
    .join("");
}

function hideCharCard() {
  const card = $("#writing-char-card");
  if (card) card.hidden = true;
  document.querySelectorAll(".writing-char.is-on").forEach((el) => el.classList.remove("is-on"));
}

function showCharCard(state) {
  const card = $("#writing-char-card");
  if (!card) return;
  card.hidden = false;
  $("#writing-char-glyph").textContent = state.word || "";
  $("#writing-char-zhuyin").textContent = state.zhuyin || "";
  $("#writing-char-meaning").textContent = state.meaning || "";
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

async function lookupMoe(word) {
  if (dictCache.has(word)) return dictCache.get(word);
  try {
    const url = `https://www.moedict.tw/uni/${encodeURIComponent(word)}.json`;
    const res = await fetch(url);
    if (res.status === 404) {
      dictCache.set(word, null);
      return null;
    }
    if (!res.ok) return null;
    const data = await res.json();
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
  } catch {
    return null;
  }
}

async function lookupWord(paraText, index) {
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

async function onCharTap(btn) {
  const p = btn.closest(".writing-essay-p");
  if (!p) return;
  const item = WRITING_BANK.find((x) => x.id === currentId);
  if (!item) return;
  const paraIndex = [...$("#writing-read-body").querySelectorAll(".writing-essay-p")].indexOf(p);
  const paraText = item.body.split(/\n\n+/)[paraIndex] || "";
  const i = parseInt(btn.dataset.i, 10);
  document.querySelectorAll(".writing-char.is-on").forEach((el) => el.classList.remove("is-on"));
  btn.classList.add("is-on");
  showCharCard({ word: btn.textContent || "", zhuyin: "查詢中…", meaning: "" });
  const info = await lookupWord(paraText, i);
  if (!info) {
    showCharCard({
      word: btn.textContent || "",
      zhuyin: "",
      meaning: "這個字暫時查不到，再點一次或問大人。",
    });
    return;
  }
  showCharCard(info);
}

function syncGradeChips() {
  document.querySelectorAll("[data-writing-grade]").forEach((btn) => {
    btn.classList.toggle("chip-active", Number(btn.dataset.writingGrade) === grade);
  });
}

function renderList() {
  const box = $("#writing-list");
  if (!box) return;
  const items = writingByGrade(grade);
  const [lo, hi] = WORD_GOAL[grade] || [150, 250];
  const hint = $("#writing-hub-hint");
  if (hint) {
    hint.textContent = `二年級起才開始寫短文。${grade} 年級常見作業／比賽約 ${lo}～${hi} 字；先看結構，再學怎麼加長。`;
  }
  box.innerHTML = "";
  items.forEach((item) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "writing-list-item";
    btn.innerHTML =
      `<span class="writing-list-title">${escapeHtml(item.title)}</span>` +
      `<span class="writing-list-meta">${escapeHtml(item.kind)} · ${item.words} 字</span>`;
    btn.addEventListener("click", () => openRead(item.id));
    box.appendChild(btn);
  });
}

function openRead(id) {
  const item = WRITING_BANK.find((x) => x.id === id);
  if (!item) return;
  currentId = item.id;
  grade = item.grade;
  setGrade(grade);
  syncGradeChips();

  const [lo, hi] = WORD_GOAL[item.grade] || [150, 250];
  $("#writing-read-title").textContent = item.title;
  $("#writing-read-meta").textContent =
    `${item.grade} 年級 · ${item.kind} · 本篇 ${item.words} 字 · 常見目標 ${lo}～${hi} 字`;
  $("#writing-read-body").innerHTML = item.body
    .split(/\n\n+/)
    .map((p) => `<p class="writing-essay-p">${renderTappable(p)}</p>`)
    .join("");
  hideCharCard();

  const steps = $("#writing-read-steps");
  steps.innerHTML = item.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("");
  const tips = $("#writing-read-tips");
  tips.innerHTML = item.tips.map((s) => `<li>${escapeHtml(s)}</li>`).join("");

  const grow = $("#writing-read-grow");
  if (grow) {
    grow.hidden = item.words >= lo;
    grow.textContent = `本篇先把結構寫完整。寫作業時，請在「經過」再加兩個看得到、聽得到的細節，字數就會靠近 ${lo}～${hi}。`;
  }

  deps.showView("writingRead");
}

export function openWritingHub() {
  grade = loadGrade();
  syncGradeChips();
  renderList();
  deps.showView("writingHub");
}

function bindEvents() {
  $("#btn-setup-zh-writing")?.addEventListener("click", () => openWritingHub());
  $("#btn-writing-hub-back")?.addEventListener("click", () => deps.showView("setupZh"));
  $("#btn-writing-read-back")?.addEventListener("click", () => {
    currentId = null;
    openWritingHub();
  });
  document.querySelectorAll("[data-writing-grade]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setGrade(Number(btn.dataset.writingGrade));
      syncGradeChips();
      renderList();
    });
  });
  $("#writing-read-body")?.addEventListener("click", (e) => {
    const btn = e.target instanceof Element ? e.target.closest(".writing-char") : null;
    if (!btn) return;
    onCharTap(btn);
  });
  $("#btn-writing-char-close")?.addEventListener("click", () => hideCharCard());
}

/**
 * @param {{ showView: (name: string) => void }} d
 */
export function initWriting(d) {
  deps = d;
  grade = loadGrade();
  bindEvents();
}
