/**
 * 國語寫作教學：二～六年級常見題，點開看範文與寫法。
 */
import { WRITING_BANK, WRITING_GRADES, writingByGrade } from "./writing-bank.js";
import {
  escapeHtml,
  hideLookupCard,
  onLookupTap,
  renderTappable,
} from "./zh-lookup.js";

const KEY_GRADE = "kid-quiz-writing-grade";
const WORD_GOAL = {
  2: [150, 250],
  3: [250, 350],
  4: [250, 350],
  5: [400, 600],
  6: [400, 600],
};

const PARTS = [
  { id: 0, label: "開頭" },
  { id: 1, label: "經過" },
  { id: 2, label: "結尾" },
];

/** @type {{ showView: (name: string) => void } | null} */
let deps = null;
let grade = 2;
let currentId = null;
let tryPart = 1;

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

function splitEssayParts(body) {
  const paras = String(body || "")
    .split(/\n\n+/)
    .filter(Boolean);
  if (!paras.length) return ["", "", ""];
  if (paras.length === 1) return [paras[0], "", ""];
  if (paras.length === 2) return [paras[0], "", paras[1]];
  return [paras[0], paras.slice(1, -1).join("\n\n"), paras[paras.length - 1]];
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

function syncTryPartChips() {
  document.querySelectorAll("[data-writing-part]").forEach((btn) => {
    btn.classList.toggle("chip-active", Number(btn.dataset.writingPart) === tryPart);
  });
}

function resetTryBox(item) {
  tryPart = 1;
  const input = $("#writing-try-input");
  if (input) input.value = "";
  const model = $("#writing-try-model");
  if (model) {
    model.hidden = true;
    model.innerHTML = "";
  }
  const show = $("#btn-writing-try-show");
  if (show) show.textContent = "看範文這一段";
  const check = $("#writing-try-check");
  if (check) {
    const high = item.grade >= 5;
    check.hidden = !high;
    if (high) {
      check.innerHTML =
        "<li>有寫到看得到或聽得到的細節</li>" +
        "<li>有一件具體的事，不是只寫「很好／很棒」</li>" +
        "<li>這一段有清楚的開頭或收尾</li>";
    }
  }
  syncTryPartChips();
}

function toggleTryModel() {
  const item = WRITING_BANK.find((x) => x.id === currentId);
  const model = $("#writing-try-model");
  const show = $("#btn-writing-try-show");
  if (!item || !model) return;
  if (!model.hidden) {
    model.hidden = true;
    if (show) show.textContent = "看範文這一段";
    return;
  }
  const parts = splitEssayParts(item.body);
  const text = parts[tryPart] || "這一篇的這一段比較短，換寫其他段也可以。";
  model.innerHTML = renderTappable(text);
  model.hidden = false;
  if (show) show.textContent = "收起範文";
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
  hideLookupCard();

  const steps = $("#writing-read-steps");
  steps.innerHTML = item.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("");
  const tips = $("#writing-read-tips");
  tips.innerHTML = item.tips.map((s) => `<li>${escapeHtml(s)}</li>`).join("");

  const grow = $("#writing-read-grow");
  if (grow) {
    grow.hidden = item.words >= lo;
    grow.textContent = `本篇先把結構寫完整。寫作業時，請在「經過」再加兩個看得到、聽得到的細節，字數就會靠近 ${lo}～${hi}。`;
  }
  resetTryBox(item);

  deps.showView("writingRead");
}

export function openWritingHub() {
  grade = loadGrade();
  syncGradeChips();
  renderList();
  hideLookupCard();
  deps.showView("writingHub");
}

function bindEvents() {
  $("#btn-zh-hub-writing")?.addEventListener("click", () => openWritingHub());
  $("#btn-writing-hub-back")?.addEventListener("click", () => deps.showView("zhHub"));
  $("#btn-writing-read-back")?.addEventListener("click", () => {
    currentId = null;
    hideLookupCard();
    openWritingHub();
  });
  document.querySelectorAll("[data-writing-grade]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setGrade(Number(btn.dataset.writingGrade));
      syncGradeChips();
      renderList();
    });
  });
  document.querySelectorAll("[data-writing-part]").forEach((btn) => {
    btn.addEventListener("click", () => {
      tryPart = Number(btn.dataset.writingPart);
      syncTryPartChips();
      const model = $("#writing-try-model");
      if (model && !model.hidden) {
        model.hidden = true;
        toggleTryModel();
      }
    });
  });
  $("#writing-read-body")?.addEventListener("click", (e) => {
    const btn = e.target instanceof Element ? e.target.closest(".zh-char") : null;
    if (!btn) return;
    const p = btn.closest(".writing-essay-p");
    const item = WRITING_BANK.find((x) => x.id === currentId);
    if (!p || !item) return;
    const paraIndex = [...$("#writing-read-body").querySelectorAll(".writing-essay-p")].indexOf(p);
    const paraText = item.body.split(/\n\n+/)[paraIndex] || "";
    void onLookupTap(btn, paraText);
  });
  $("#writing-try-model")?.addEventListener("click", (e) => {
    const btn = e.target instanceof Element ? e.target.closest(".zh-char") : null;
    if (!btn) return;
    const item = WRITING_BANK.find((x) => x.id === currentId);
    if (!item) return;
    const parts = splitEssayParts(item.body);
    void onLookupTap(btn, parts[tryPart] || "");
  });
  $("#btn-writing-try-show")?.addEventListener("click", () => toggleTryModel());
}

/**
 * @param {{ showView: (name: string) => void }} d
 */
export function initWriting(d) {
  deps = d;
  grade = loadGrade();
  bindEvents();
}
