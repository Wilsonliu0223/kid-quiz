/**
 * 家用遠方視力篩檢。手機直放 7.5×16 公分、人站 3 公尺。
 * 每一級四個方向各一次，答對 3 個才進更小的一級。
 */
import { getSelectedChild } from "./store.js";
import { getChildName } from "./children.js";

const SCREEN_SHORT_CM = 7.5;
const SCREEN_LONG_CM = 16;
const DISTANCE_M = 3;
const LEVELS = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
const DIRS = ["up", "right", "down", "left"];
const ROT = { right: 0, down: 90, left: 180, up: -90 };
const PASS_NEED = 3;
const KEY_LOG = "kid-quiz-vision-log";
const ARC_MIN = Math.PI / (180 * 60);

const $ = (sel) => document.querySelector(sel);

/** @type {{ showView: (name: string) => void } | null} */
let deps = null;
/** @type {WakeLockSentinel | null} */
let wakeLock = null;

/** @type {'bare' | 'glasses'} */
let wear = "bare";
/** @type {'right' | 'left'} */
let eye = "right";
let levelIndex = 0;
/** @type {string[]} */
let queue = [];
let asked = 0;
let correct = 0;
let accepting = false;
/** @type {string | null} */
let lastDir = null;
/** @type {number | null} */
let rightScore = null;
/** @type {number | null} */
let leftScore = null;
let childId = "A";
let childName = "";

export function eSizeMm(acuity, distanceM = DISTANCE_M) {
  const arcmin = 5 / acuity;
  return distanceM * 1000 * Math.tan(arcmin * ARC_MIN);
}

export function shuffleDirs(avoidFirst) {
  const dirs = DIRS.slice();
  for (let i = dirs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
  }
  if (avoidFirst && dirs[0] === avoidFirst) {
    [dirs[0], dirs[1]] = [dirs[1], dirs[0]];
  }
  return dirs;
}

function pxPerMm() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const widthCm = w <= h ? SCREEN_SHORT_CM : SCREEN_LONG_CM;
  return w / (widthCm * 10);
}

function formatAcuity(value) {
  if (value == null) return "低於 0.2";
  return value.toFixed(1);
}

function levelRank(value) {
  if (value == null) return -1;
  return LEVELS.indexOf(value);
}

function needsReferral(right, left) {
  const low = [right, left].some((v) => v == null || v < 0.9);
  const apart = Math.abs(levelRank(right) - levelRank(left)) >= 2;
  return low || apart;
}

function loadLog() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY_LOG) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function saveEntry(entry) {
  const list = loadLog();
  list.unshift(entry);
  localStorage.setItem(KEY_LOG, JSON.stringify(list.slice(0, 20)));
}

function latestForChild(id) {
  return loadLog().find((row) => row && row.childId === id) || null;
}

function showPanel(name) {
  for (const id of ["vision-setup", "vision-play", "vision-switch", "vision-result"]) {
    const el = document.getElementById(id);
    if (el) el.hidden = id !== name;
  }
}

function renderSetup() {
  childId = getSelectedChild();
  childName = getChildName(childId);
  document.querySelectorAll("[data-vision-wear]").forEach((btn) => {
    btn.classList.toggle("chip-active", btn.dataset.visionWear === wear);
  });
  const who = $("#vision-who");
  if (who) who.textContent = childName;
  const prev = $("#vision-prev");
  const last = latestForChild(childId);
  if (prev) {
    if (!last) {
      prev.hidden = true;
    } else {
      prev.hidden = false;
      const when = new Date(last.at);
      const day = `${when.getMonth() + 1}/${when.getDate()}`;
      const mode = last.wear === "glasses" ? "戴鏡" : "裸視";
      prev.textContent = `上次 ${day} ${mode}　右 ${formatAcuity(last.right)}　左 ${formatAcuity(last.left)}`;
    }
  }
  showPanel("vision-setup");
}

function eyeLabel(which) {
  return which === "right" ? "右眼" : "左眼";
}

function renderE(dir) {
  const host = $("#vision-e");
  if (!host) return;
  const acuity = LEVELS[levelIndex];
  const dpr = window.devicePixelRatio || 1;
  const px = Math.max(8, Math.round(eSizeMm(acuity) * pxPerMm() * dpr) / dpr);
  host.style.width = `${px}px`;
  host.style.height = `${px}px`;
  host.style.transform = `rotate(${ROT[dir]}deg)`;
  host.innerHTML = `<svg viewBox="0 0 5 5" width="100%" height="100%" aria-hidden="true">
    <rect width="5" height="1" fill="#000"/>
    <rect y="2" width="5" height="1" fill="#000"/>
    <rect y="4" width="5" height="1" fill="#000"/>
    <rect width="1" height="5" fill="#000"/>
  </svg>`;
}

function renderProgress() {
  const el = $("#vision-progress");
  if (!el) return;
  const acuity = LEVELS[levelIndex].toFixed(1);
  el.textContent = `${eyeLabel(eye)}　${acuity}　${asked + 1}/4`;
}

function showQuestion() {
  const dir = queue[asked];
  if (!dir) return;
  renderE(dir);
  renderProgress();
  accepting = true;
}

function startLevel() {
  queue = shuffleDirs(lastDir);
  asked = 0;
  correct = 0;
  showQuestion();
}

async function holdAwake() {
  try {
    wakeLock = await navigator.wakeLock?.request("screen");
  } catch {
    wakeLock = null;
  }
}

function releaseAwake() {
  wakeLock?.release?.().catch(() => {});
  wakeLock = null;
}

function beginEye(which) {
  eye = which;
  levelIndex = 0;
  lastDir = null;
  showPanel("vision-play");
  startLevel();
  holdAwake();
}

function finishEye(score) {
  accepting = false;
  lastDir = null;
  if (eye === "right") {
    rightScore = score;
    const title = $("#vision-switch-title");
    if (title) title.textContent = `右眼 ${formatAcuity(score)}`;
    showPanel("vision-switch");
    return;
  }
  leftScore = score;
  finishTest();
}

function finishTest() {
  releaseAwake();
  accepting = false;
  const entry = {
    at: Date.now(),
    childId,
    childName,
    wear,
    distanceM: DISTANCE_M,
    right: rightScore,
    left: leftScore,
  };
  saveEntry(entry);
  const approx = $("#vision-approx");
  if (approx) {
    const value = worseAcuity(rightScore, leftScore);
    approx.textContent =
      value == null ? "目前視力低於 0.2" : `目前視力約 ${formatAcuity(value)}`;
  }
  const score = $("#vision-result-score");
  if (score) {
    const mode = wear === "glasses" ? "戴鏡" : "裸視";
    score.textContent = `${childName}　${mode}　右眼 ${formatAcuity(rightScore)}　左眼 ${formatAcuity(leftScore)}`;
  }
  const note = $("#vision-result-note");
  if (note) {
    note.textContent = needsReferral(rightScore, leftScore)
      ? "有一眼低於 0.9，或兩眼相差兩級以上。建議給眼科看。這是家用篩檢，不能代替診斷。"
      : "兩眼都有 0.9。這仍是家用篩檢，不能代替診斷。";
  }
  showPanel("vision-result");
}

function worseAcuity(a, b) {
  return levelRank(a) <= levelRank(b) ? a : b;
}

function mark(ok) {
  if (!accepting) return;
  const expect = queue[asked];
  if (!expect) return;
  accepting = false;
  lastDir = expect;
  if (ok) correct += 1;
  asked += 1;
  if (asked < 4) {
    showQuestion();
    return;
  }
  const score = LEVELS[levelIndex];
  if (correct < PASS_NEED) {
    finishEye(levelIndex === 0 ? null : LEVELS[levelIndex - 1]);
    return;
  }
  if (levelIndex >= LEVELS.length - 1) {
    finishEye(score);
    return;
  }
  levelIndex += 1;
  startLevel();
}

export function openVision() {
  wear = "bare";
  accepting = false;
  releaseAwake();
  renderSetup();
  deps?.showView("vision");
}

export function initVision(d) {
  deps = d;
  $("#btn-vision-back")?.addEventListener("click", () => {
    releaseAwake();
    accepting = false;
    deps?.showView("home");
  });
  document.querySelectorAll("[data-vision-wear]").forEach((btn) => {
    btn.addEventListener("click", () => {
      wear = btn.dataset.visionWear === "glasses" ? "glasses" : "bare";
      renderSetup();
    });
  });
  $("#btn-vision-start")?.addEventListener("click", () => {
    childId = getSelectedChild();
    childName = getChildName(childId);
    rightScore = null;
    leftScore = null;
    beginEye("right");
  });
  $("#vision-mark")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-vision-mark]");
    if (!btn) return;
    mark(btn.dataset.visionMark === "ok");
  });
  $("#btn-vision-abort")?.addEventListener("click", () => {
    releaseAwake();
    accepting = false;
    renderSetup();
  });
  $("#btn-vision-left")?.addEventListener("click", () => beginEye("left"));
  $("#btn-vision-again")?.addEventListener("click", () => {
    renderSetup();
  });
  $("#btn-vision-home")?.addEventListener("click", () => {
    deps?.showView("home");
  });
}
