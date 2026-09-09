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
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br />")}</p>`)
    .join("");

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
}

/**
 * @param {{ showView: (name: string) => void }} d
 */
export function initWriting(d) {
  deps = d;
  grade = loadGrade();
  bindEvents();
}
