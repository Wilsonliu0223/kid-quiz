/**
 * 家用遠方視力篩檢。距離 3 公尺，E 的實際公分數固定，再依螢幕寬高換算像素。
 * 每一級四個方向各一次，答對 3 個才進更小的一級。
 */
import { getSelectedChild } from "./store.js";
import { getChildName } from "./children.js";
import { startArmCamera } from "./vision-camera.js?v=vision-cam-v2";

const DISTANCE_M = 3;
const KEY_SCREEN = "kid-quiz-vision-screen";
const LEVELS = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.2];
const DIRS = ["up", "left", "right", "upRight", "upLeft", "downRight", "downLeft"];
const GAP_DEG = {
  up: -90,
  left: 180,
  right: 0,
  upRight: -45,
  upLeft: -135,
  downRight: 45,
  downLeft: 135,
};
const PASS_NEED = 3;
const PER_LEVEL = 4;
const KEY_LOG = "kid-quiz-vision-log";
const KEY_CAMERA = "kid-quiz-vision-camera";
const ARC_MIN = Math.PI / (180 * 60);

const $ = (sel) => document.querySelector(sel);

/** @type {{ showView: (name: string) => void } | null} */
let deps = null;
/** @type {WakeLockSentinel | null} */
let wakeLock = null;

/** @type {'bare' | 'glasses'} */
let wear = "bare";
/** @type {'practice' | 'both' | 'right' | 'left'} */
let phase = "both";
/** @type {'both' | 'right' | 'left'} */
let eye = "both";
let levelIndex = 0;
/** @type {string[]} */
let queue = [];
let asked = 0;
let correct = 0;
let accepting = false;
/** @type {string | null} */
let lastDir = null;
/** @type {number | null} */
let bothScore = null;
/** @type {number | null} */
let rightScore = null;
/** @type {number | null} */
let leftScore = null;
let childId = "A";
let childName = "";
let useCamera = false;
/** @type {(() => void) | null} */
let stopCamera = null;
let advanceTimer = 0;
let roundToken = 0;

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
  const picked = dirs.slice(0, PER_LEVEL);
  if (avoidFirst && picked[0] === avoidFirst && picked.length > 1) {
    [picked[0], picked[1]] = [picked[1], picked[0]];
  }
  return picked;
}

function cPath(deg) {
  const cx = 2.5;
  const cy = 2.5;
  const r = 2;
  const gap = 1 / r;
  const mid = (deg * Math.PI) / 180;
  const start = mid + gap / 2;
  const end = mid + Math.PI * 2 - gap / 2;
  const x = (a) => cx + r * Math.cos(a);
  const y = (a) => cy + r * Math.sin(a);
  return `M ${x(start).toFixed(3)} ${y(start).toFixed(3)} A ${r} ${r} 0 1 1 ${x(end).toFixed(3)} ${y(end).toFixed(3)}`;
}

function parseCm(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const cm = Math.round(n * 10) / 10;
  if (cm < 3 || cm > 50) return null;
  return cm;
}

function readScreen() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY_SCREEN) || "");
    const widthCm = parseCm(raw?.widthCm);
    const heightCm = parseCm(raw?.heightCm);
    if ((widthCm === 7.5 && heightCm === 16) || (widthCm === 6.9 && heightCm === 14.7)) {
      return { widthCm: 7, heightCm: 16 };
    }
    if (widthCm && heightCm) return { widthCm, heightCm };
  } catch {
    /* 用手機預設 */
  }
  return { widthCm: 7, heightCm: 16 };
}

function saveScreen(widthCm, heightCm) {
  localStorage.setItem(KEY_SCREEN, JSON.stringify({ widthCm, heightCm }));
}

function horizontalCm(screen) {
  const viewportWide = window.innerWidth >= window.innerHeight;
  const enteredWide = screen.widthCm >= screen.heightCm;
  return viewportWide === enteredWide ? screen.widthCm : screen.heightCm;
}

function pxPerMm() {
  const screen = readScreen();
  return window.innerWidth / (horizontalCm(screen) * 10);
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
  document.querySelectorAll("[data-vision-camera]").forEach((btn) => {
    btn.classList.toggle("chip-active", (btn.dataset.visionCamera === "on") === useCamera);
  });
  const who = $("#vision-who");
  if (who) who.textContent = childName;
  const screen = readScreen();
  const widthInput = $("#vision-width");
  const heightInput = $("#vision-height");
  if (widthInput && document.activeElement !== widthInput) widthInput.value = String(screen.widthCm);
  if (heightInput && document.activeElement !== heightInput) heightInput.value = String(screen.heightCm);
  const hint = $("#vision-size-hint");
  if (hint) {
    const eCm = (eSizeMm(0.2) / 10).toFixed(1);
    hint.textContent = `預設寬 7、高 16。站 3 公尺時，0.2 的 C 外徑是 ${eCm} 公分。改用平板再改。`;
  }
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
      const both = last.both === undefined ? "" : `　雙 ${formatAcuity(last.both)}`;
      prev.textContent = `上次 ${day} ${mode}${both}　右 ${formatAcuity(last.right)}　左 ${formatAcuity(last.left)}`;
    }
  }
  showPanel("vision-setup");
}

function eyeLabel(which) {
  if (which === "both") return "雙眼";
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
  host.style.transform = "none";
  const deg = GAP_DEG[dir] ?? 0;
  host.innerHTML = `<svg viewBox="0 0 5 5" width="100%" height="100%" aria-hidden="true">
    <path d="${cPath(deg)}" fill="none" stroke="#000" stroke-width="1" stroke-linecap="butt"/>
  </svg>`;
}

function renderProgress() {
  const el = $("#vision-progress");
  if (!el) return;
  if (phase === "practice") {
    el.textContent = "練習　不計分";
    return;
  }
  const acuity = LEVELS[levelIndex].toFixed(1);
  el.textContent = `${eyeLabel(eye)}　${acuity}　${asked + 1}/${PER_LEVEL}`;
}

const HOLD_RING = 2 * Math.PI * 52;

function setHoldRing(ms) {
  const ring = $("#vision-hold");
  const arc = $("#vision-hold-arc");
  if (!ring || !arc) return;
  const p = useCamera ? Math.min(1, Math.max(0, ms / 2000)) : 0;
  ring.hidden = p <= 0;
  arc.style.strokeDashoffset = String(HOLD_RING * (1 - p));
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

function setCameraStatus(text) {
  const el = $("#vision-camera-status");
  if (!el) return;
  el.hidden = !useCamera;
  el.textContent = text;
}

function releaseCamera() {
  stopCamera?.();
  stopCamera = null;
  const video = $("#vision-camera");
  if (video) video.hidden = true;
  const status = $("#vision-camera-status");
  if (status) status.hidden = true;
}

function ensureCamera() {
  if (!useCamera || stopCamera) return;
  const video = $("#vision-camera");
  if (!video) return;
  video.hidden = false;
  stopCamera = startArmCamera(video, {
    onStatus: setCameraStatus,
    onProgress: setHoldRing,
    onDirection: (dir) => {
      if (!accepting) return;
      const expect = queue[asked];
      if (!expect) return;
      mark(dir === expect);
    },
  });
}

function beginPractice() {
  cancelRound();
  phase = "practice";
  eye = "both";
  levelIndex = LEVELS.indexOf(0.5);
  lastDir = null;
  asked = 0;
  correct = 0;
  queue = shuffleDirs(null).slice(0, 1);
  showPanel("vision-play");
  showQuestion();
  holdAwake();
  ensureCamera();
}

function beginEye(which) {
  cancelRound();
  phase = which;
  eye = which;
  levelIndex = 0;
  lastDir = null;
  showPanel("vision-play");
  startLevel();
  holdAwake();
  ensureCamera();
}

function showSwitch(title, lead, button) {
  const titleEl = $("#vision-switch-title");
  const leadEl = $("#vision-switch-lead");
  const btn = $("#btn-vision-next");
  if (titleEl) titleEl.textContent = title;
  if (leadEl) leadEl.textContent = lead;
  if (btn) btn.textContent = button;
  showPanel("vision-switch");
}

function finishEye(score) {
  accepting = false;
  lastDir = null;
  if (eye === "both") {
    bothScore = score;
    showSwitch(
      `雙眼 ${formatAcuity(score)}`,
      "接著遮住左眼，測右眼。不要壓到眼睛，也不要瞇眼。",
      "開始測右眼"
    );
    return;
  }
  if (eye === "right") {
    rightScore = score;
    showSwitch(
      `右眼 ${formatAcuity(score)}`,
      "接著遮住右眼，測左眼。兩眼自然張開，不要偷看。",
      "開始測左眼"
    );
    return;
  }
  leftScore = score;
  finishTest();
}

function finishTest() {
  releaseAwake();
  releaseCamera();
  accepting = false;
  const entry = {
    at: Date.now(),
    childId,
    childName,
    wear,
    distanceM: DISTANCE_M,
    both: bothScore,
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
    score.textContent = `${childName}　${mode}　雙眼 ${formatAcuity(bothScore)}　右眼 ${formatAcuity(rightScore)}　左眼 ${formatAcuity(leftScore)}`;
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

function hideFlash() {
  const flash = $("#vision-flash");
  if (flash) flash.hidden = true;
}

function showFlash(ok) {
  setHoldRing(0);
  const flash = $("#vision-flash");
  const markEl = $("#vision-flash-mark");
  if (!flash || !markEl) return;
  flash.hidden = false;
  markEl.className = ok ? "vision-flash-ok" : "vision-flash-bad";
  markEl.textContent = ok ? "" : "✕";
}

function cancelRound() {
  roundToken += 1;
  clearTimeout(advanceTimer);
  hideFlash();
  setHoldRing(0);
}

function mark(ok) {
  if (!accepting) return;
  const expect = queue[asked];
  if (!expect) return;
  accepting = false;
  lastDir = queue[asked];
  showFlash(ok);
  const ticket = ++roundToken;
  clearTimeout(advanceTimer);
  if (phase === "practice") {
    advanceTimer = setTimeout(() => {
      if (ticket !== roundToken) return;
      hideFlash();
      showSwitch("練習好了", "這一題不計分。兩眼張開，開始正式測。", "開始測雙眼");
    }, 900);
    return;
  }
  if (ok) correct += 1;
  asked += 1;
  advanceTimer = setTimeout(() => {
    if (ticket !== roundToken) return;
    hideFlash();
    if (asked < PER_LEVEL) {
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
  }, 1200);
}

export function openVision() {
  wear = "bare";
  useCamera = localStorage.getItem(KEY_CAMERA) === "on";
  accepting = false;
  releaseAwake();
  releaseCamera();
  cancelRound();
  renderSetup();
  deps?.showView("vision");
}

export function initVision(d) {
  deps = d;
  $("#btn-vision-back")?.addEventListener("click", () => {
    releaseAwake();
    releaseCamera();
    cancelRound();
    accepting = false;
    deps?.showView("home");
  });
  document.querySelectorAll("[data-vision-wear]").forEach((btn) => {
    btn.addEventListener("click", () => {
      wear = btn.dataset.visionWear === "glasses" ? "glasses" : "bare";
      renderSetup();
    });
  });
  document.querySelectorAll("[data-vision-camera]").forEach((btn) => {
    btn.addEventListener("click", () => {
      useCamera = btn.dataset.visionCamera === "on";
      localStorage.setItem(KEY_CAMERA, useCamera ? "on" : "off");
      renderSetup();
    });
  });
  const onScreenInput = () => {
    const widthCm = parseCm($("#vision-width")?.value);
    const heightCm = parseCm($("#vision-height")?.value);
    if (widthCm && heightCm) saveScreen(widthCm, heightCm);
    renderSetup();
  };
  $("#vision-width")?.addEventListener("change", onScreenInput);
  $("#vision-height")?.addEventListener("change", onScreenInput);
  $("#btn-vision-start")?.addEventListener("click", () => {
    const widthCm = parseCm($("#vision-width")?.value);
    const heightCm = parseCm($("#vision-height")?.value);
    if (!widthCm || !heightCm) {
      const hint = $("#vision-size-hint");
      if (hint) hint.textContent = "先填這台手機或平板的寬和高，再開始。";
      $("#vision-width")?.focus();
      return;
    }
    saveScreen(widthCm, heightCm);
    childId = getSelectedChild();
    childName = getChildName(childId);
    bothScore = null;
    rightScore = null;
    leftScore = null;
    beginPractice();
  });
  $("#vision-mark")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-vision-mark]");
    if (!btn) return;
    mark(btn.dataset.visionMark === "ok");
  });
  $("#btn-vision-abort")?.addEventListener("click", () => {
    releaseAwake();
    releaseCamera();
    cancelRound();
    accepting = false;
    renderSetup();
  });
  $("#btn-vision-next")?.addEventListener("click", () => {
    if (phase === "practice") beginEye("both");
    else if (phase === "both") beginEye("right");
    else beginEye("left");
  });
  $("#btn-vision-again")?.addEventListener("click", () => {
    releaseCamera();
    cancelRound();
    renderSetup();
  });
  $("#btn-vision-home")?.addEventListener("click", () => {
    releaseCamera();
    cancelRound();
    deps?.showView("home");
  });
}
