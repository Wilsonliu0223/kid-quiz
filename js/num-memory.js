/**
 * 數字記憶：格子上閃 1～N，時間到蓋住，依序點回來（黑猩猩 Ayumu 測法）。
 */
const $ = (sel) => document.querySelector(sel);

const KEY_N = "kid-quiz-num-mem-n";
const KEY_SEC = "kid-quiz-num-mem-sec";
const GRID = 25;
const N_MIN = 4;
const N_MAX = 9;
const SEC_MIN = 0.2;
const SEC_MAX = 15;

/** @type {{ showView: (name: string) => void } | null} */
let deps = null;
let hideTimer = 0;
/** @type {number[]} */
let cells = [];
let expect = 1;
let nCount = 5;
let revealSec = 2;
/** @type {'idle'|'show'|'guess'|'done'} */
let phase = "idle";

function clampN(v) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return 5;
  return Math.min(N_MAX, Math.max(N_MIN, n));
}

function clampSec(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 2;
  return Math.min(SEC_MAX, Math.max(SEC_MIN, Math.round(n * 10) / 10));
}

function loadSettings() {
  nCount = clampN(localStorage.getItem(KEY_N) || 5);
  revealSec = clampSec(localStorage.getItem(KEY_SEC) || 2);
}

function saveSettings() {
  localStorage.setItem(KEY_N, String(nCount));
  localStorage.setItem(KEY_SEC, String(revealSec));
}

function shufflePick(count) {
  const idx = [...Array(GRID).keys()];
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  const map = Array(GRID).fill(0);
  idx.slice(0, count).forEach((cell, i) => {
    map[cell] = i + 1;
  });
  return map;
}

function setStatus(text) {
  const el = $("#num-mem-status");
  if (el) el.textContent = text;
}

function syncSetupUi() {
  document.querySelectorAll("[data-num-mem-n]").forEach((btn) => {
    btn.classList.toggle("chip-active", Number(btn.dataset.numMemN) === nCount);
  });
  const sec = $("#num-mem-sec");
  if (sec && document.activeElement !== sec) sec.value = String(revealSec);
  document.querySelectorAll("[data-num-mem-sec]").forEach((btn) => {
    btn.classList.toggle(
      "chip-active",
      Math.abs(Number(btn.dataset.numMemSec) - revealSec) < 0.05
    );
  });
}

function renderBoard(opts = {}) {
  const board = $("#num-mem-board");
  if (!board) return;
  const showNum = Boolean(opts.showNum);
  board.innerHTML = "";
  cells.forEach((num, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "num-mem-cell";
    btn.dataset.i = String(i);
    if (!num) {
      btn.classList.add("is-empty");
      btn.disabled = true;
    } else {
      btn.disabled = phase !== "guess";
      if (showNum) {
        btn.textContent = String(num);
        btn.classList.add("is-open");
      } else if (phase === "guess") {
        btn.classList.add("is-hidden");
        btn.setAttribute("aria-label", "蓋住的數字");
      } else {
        btn.textContent = String(num);
        btn.classList.add("is-open");
      }
      if (opts.mark === "ok" && num < expect) btn.classList.add("is-ok");
      if (opts.wrong === num) btn.classList.add("is-no");
      if (opts.need === num) btn.classList.add("is-need");
    }
    btn.addEventListener("click", () => onCell(i));
    board.appendChild(btn);
  });
}

function clearHideTimer() {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = 0;
  }
}

function startRound() {
  readSecFromInput();
  saveSettings();
  clearHideTimer();
  cells = shufflePick(nCount);
  expect = 1;
  phase = "show";
  setStatus(`看 ${revealSec} 秒，記住 1 到 ${nCount} 在哪`);
  renderBoard({ showNum: true });
  hideTimer = window.setTimeout(() => {
    hideTimer = 0;
    if (phase !== "show") return;
    phase = "guess";
    setStatus("依序點：1 → 2 → …");
    renderBoard({ showNum: false });
  }, Math.round(revealSec * 1000));
}

function onCell(i) {
  if (phase !== "guess") return;
  const num = cells[i];
  if (!num) return;
  if (num === expect) {
    expect += 1;
    if (expect > nCount) {
      phase = "done";
      setStatus(`全對！${nCount} 個都記住了`);
      renderBoard({ showNum: true, mark: "ok" });
      return;
    }
    setStatus(`對，下一個 ${expect}`);
    const btn = document.querySelector(`.num-mem-cell[data-i="${i}"]`);
    if (btn) {
      btn.classList.remove("is-hidden");
      btn.classList.add("is-ok", "is-open");
      btn.textContent = String(num);
      btn.disabled = true;
    }
    return;
  }
  phase = "done";
  setStatus(`錯了，應該點 ${expect}`);
  renderBoard({ showNum: true, wrong: num, need: expect, mark: "ok" });
}

function readSecFromInput() {
  const sec = $("#num-mem-sec");
  if (!sec) return;
  revealSec = clampSec(sec.value);
  sec.value = String(revealSec);
}

export function openNumMemory() {
  loadSettings();
  clearHideTimer();
  phase = "idle";
  cells = Array(GRID).fill(0);
  setStatus("選個數和開牌秒數，按開始");
  syncSetupUi();
  renderBoard({ showNum: false });
  deps?.showView("numMem");
}

export function initNumMemory(d) {
  deps = d;
  loadSettings();
  $("#btn-num-mem-back")?.addEventListener("click", () => {
    clearHideTimer();
    phase = "idle";
    deps?.showView("mathHub");
  });
  document.querySelectorAll("[data-num-mem-n]").forEach((btn) => {
    btn.addEventListener("click", () => {
      nCount = clampN(btn.dataset.numMemN);
      saveSettings();
      syncSetupUi();
    });
  });
  document.querySelectorAll("[data-num-mem-sec]").forEach((btn) => {
    btn.addEventListener("click", () => {
      revealSec = clampSec(btn.dataset.numMemSec);
      saveSettings();
      syncSetupUi();
    });
  });
  $("#num-mem-sec")?.addEventListener("change", () => {
    readSecFromInput();
    saveSettings();
    syncSetupUi();
  });
  $("#btn-num-mem-start")?.addEventListener("click", () => startRound());
}
