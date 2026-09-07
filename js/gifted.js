/**
 * 魏氏風格推理練習（非正式鑑定）：年級分層、分域抽題、交卷評分
 */
import { CONFIG } from "./config.site.js?v=config-v45.15";
import { getSelectedChild } from "./store.js";
import {
  GIFTED_BANK,
  GIFTED_CAT_LABEL,
  GIFTED_GRADE_LABEL,
} from "./gifted-bank.js?v=gifted-bank-v3";

const CATS = ["fig", "lang", "math", "mem"];
const QUOTAS = {
  10: [3, 3, 2, 2],
  20: [5, 5, 5, 5],
  60: [15, 15, 15, 15],
};
const LIMIT_MS = {
  10: 8 * 60 * 1000,
  20: 18 * 60 * 1000,
  60: 45 * 60 * 1000,
};
const LOWER = { 56: 34, 34: 23, 23: 12 };
const $ = (sel) => document.querySelector(sel);

/** @type {{ showView: Function, showWarn?: Function, confirm?: Function } | null} */
let deps = null;
let tick = null;
let pickN = 10;
let pickGrade = 12;

function key() {
  return `kid-quiz-gifted-blind-${getSelectedChild()}`;
}

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(key()) || "null");
  } catch {
    return null;
  }
}

function saveState(st) {
  localStorage.setItem(key(), JSON.stringify(st));
}

function seedRng(seed) {
  let s = 0;
  for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function shuffle(list, rnd) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function limitMsOf(st) {
  return st.limitMs || LIMIT_MS[st.n] || LIMIT_MS[60];
}

function remainingMs(st) {
  return Math.max(0, st.startedAt + limitMsOf(st) - Date.now());
}

function formatMmSs(ms) {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function paintTimer(st) {
  const t = $("#gifted-timer");
  if (!t) return;
  const left = remainingMs(st);
  t.textContent = formatMmSs(left);
  t.classList.toggle("is-low", left <= 5 * 60 * 1000);
}

function stopTick() {
  if (tick) {
    clearInterval(tick);
    tick = null;
  }
}

function seenKey() {
  return `kid-quiz-gifted-seen-${getSelectedChild()}`;
}

function loadSeen() {
  try {
    const a = JSON.parse(localStorage.getItem(seenKey()) || "[]");
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

function rememberSeen(ids) {
  const prev = loadSeen();
  const next = [...ids, ...prev.filter((x) => !ids.includes(x))].slice(0, 160);
  localStorage.setItem(seenKey(), JSON.stringify(next));
}

function poolFor(cat, grade, need) {
  const same = GIFTED_BANK.filter((q) => q.cat === cat && q.grade === grade);
  if (same.length >= need) return same;
  const extra = [];
  let g = LOWER[grade];
  while (g && same.length + extra.length < need) {
    extra.push(...GIFTED_BANK.filter((q) => q.cat === cat && q.grade === g));
    g = LOWER[g];
  }
  return [...same, ...extra];
}

function takeCat(pool, n, rnd) {
  const seen = new Set(loadSeen());
  const fresh = shuffle(
    pool.filter((q) => !seen.has(q.id)),
    rnd
  );
  const rest = shuffle(
    pool.filter((q) => seen.has(q.id)),
    rnd
  );
  const picked = [];
  const used = new Set();
  for (const q of [...fresh, ...rest]) {
    if (used.has(q.id)) continue;
    used.add(q.id);
    picked.push(q);
    if (picked.length >= n) break;
  }
  return picked;
}

function buildPaper(n) {
  const rnd = seedRng(
    `${getSelectedChild()}|gifted-v4|${n}|${pickGrade}|${Date.now()}`
  );
  const quota = QUOTAS[n] || QUOTAS[10];
  const picked = [];
  CATS.forEach((cat, i) => {
    picked.push(...takeCat(poolFor(cat, pickGrade, quota[i]), quota[i], rnd));
  });
  return shuffle(picked, rnd).map((q) => {
    const order = shuffle(q.options.map((_, i) => i), rnd);
    const options = order.map((i) => q.options[i]);
    const answer = order.indexOf(q.answer);
    return {
      id: q.id,
      cat: q.cat,
      grade: q.grade,
      q: q.q,
      options,
      answer,
      explain: q.explain,
    };
  });
}

function scoreOf(st) {
  let ok = 0;
  const by = {
    fig: { ok: 0, n: 0 },
    lang: { ok: 0, n: 0 },
    math: { ok: 0, n: 0 },
    mem: { ok: 0, n: 0 },
  };
  st.items.forEach((q, i) => {
    if (!by[q.cat]) return;
    by[q.cat].n += 1;
    if (st.picks[i] === q.answer) {
      ok += 1;
      by[q.cat].ok += 1;
    }
  });
  const total = st.items.length;
  const pct = total ? Math.round((ok / total) * 100) : 0;
  return { ok, total, pct, by };
}

function bandOf(pct) {
  if (pct >= 90) return { title: "表現很好", hint: "這一檔大多都對。可以加長題數，或試下一個年級。" };
  if (pct >= 75) return { title: "不錯", hint: "四個向度裡，較低的那一塊可以再練。" };
  if (pct >= 60) return { title: "還可以", hint: "先把這一檔的 10 題練熟，再加長。" };
  return { title: "再練練", hint: "可改選較低年級，或先寫 10 題。" };
}

function catLine(sc) {
  return CATS.map(
    (c) => `${GIFTED_CAT_LABEL[c]} ${sc.by[c].ok}/${sc.by[c].n}`
  ).join("　");
}

function paintModeButtons() {
  document.querySelectorAll("[data-gifted-n]").forEach((btn) => {
    btn.classList.toggle("is-on", Number(btn.dataset.giftedN) === pickN);
  });
  document.querySelectorAll("[data-gifted-grade]").forEach((btn) => {
    btn.classList.toggle("is-on", Number(btn.dataset.giftedGrade) === pickGrade);
  });
}

function showIntro() {
  const st = loadState();
  const done = Boolean(st?.finishedAt);
  const mid = Boolean(st?.startedAt && !st.finishedAt);
  $("#gifted-intro-done")?.toggleAttribute("hidden", !done);
  $("#gifted-intro-mid")?.toggleAttribute("hidden", !mid);
  $("#gifted-intro-fresh")?.toggleAttribute("hidden", mid);
  $("#gifted-mode-box")?.toggleAttribute("hidden", mid);
  $("#btn-gifted-start")?.toggleAttribute("hidden", mid);
  $("#btn-gifted-resume")?.toggleAttribute("hidden", !mid);
  $("#btn-gifted-restart")?.toggleAttribute("hidden", !mid);
  $("#btn-gifted-parent")?.toggleAttribute("hidden", !done);
  paintModeButtons();
  deps.showView("giftedIntro");
}

function startNew() {
  const n = QUOTAS[pickN] ? pickN : 10;
  const items = buildPaper(n);
  saveState({
    startedAt: Date.now(),
    n,
    grade: pickGrade,
    limitMs: LIMIT_MS[n],
    items,
    picks: items.map(() => -1),
    idx: 0,
    finishedAt: 0,
  });
  openQuiz();
}

function renderDone(st) {
  const sc = scoreOf(st);
  const band = bandOf(sc.pct);
  const mins = Math.max(1, Math.round((st.finishedAt - st.startedAt) / 60000));
  const gName = GIFTED_GRADE_LABEL[st.grade] || GIFTED_GRADE_LABEL[12];
  $("#gifted-done-band").textContent = band.title;
  $("#gifted-done-score").textContent = `${sc.ok} / ${sc.total}　（${sc.pct} 分）`;
  $("#gifted-done-break").textContent = catLine(sc);
  $("#gifted-done-msg").textContent =
    `${st.n} 題 · ${gName} · 約 ${mins} 分鐘（限時 ${formatMmSs(limitMsOf(st))}）。${band.hint}　這不是魏氏正式測驗。`;
  deps.showView("giftedDone");
}

function finish(st) {
  st.finishedAt = Date.now();
  saveState(st);
  rememberSeen(st.items.map((q) => q.id));
  stopTick();
  renderDone(st);
}

function renderQ() {
  const st = loadState();
  if (!st?.items) return;
  if (!st.finishedAt && remainingMs(st) <= 0) {
    finish(st);
    return;
  }
  const q = st.items[st.idx];
  const n = st.items.length;
  $("#gifted-progress").textContent = `${GIFTED_CAT_LABEL[q.cat]} · ${st.idx + 1} / ${n}`;
  paintTimer(st);
  $("#gifted-q").textContent = q.q;
  const box = $("#gifted-choices");
  box.innerHTML = "";
  q.options.forEach((label, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "btn btn-secondary btn-block gifted-choice" +
      (st.picks[st.idx] === i ? " is-picked" : "");
    btn.textContent = `${["Ａ", "Ｂ", "Ｃ", "Ｄ"][i]}  ${label}`;
    btn.addEventListener("click", () => {
      st.picks[st.idx] = i;
      saveState(st);
      renderQ();
    });
    box.appendChild(btn);
  });
  $("#btn-gifted-prev").disabled = st.idx <= 0;
  const last = st.idx >= n - 1;
  $("#btn-gifted-next").hidden = last;
  $("#btn-gifted-submit").hidden = !last;
}

function openQuiz() {
  const st = loadState();
  if (!st?.items) {
    showIntro();
    return;
  }
  if (st.finishedAt) {
    renderDone(st);
    return;
  }
  deps.showView("giftedQuiz");
  renderQ();
  stopTick();
  tick = setInterval(() => {
    const cur = loadState();
    if (!cur || cur.finishedAt) {
      stopTick();
      return;
    }
    if (remainingMs(cur) <= 0) {
      finish(cur);
      return;
    }
    paintTimer(cur);
  }, 500);
}

function renderParent() {
  const st = loadState();
  if (!st?.finishedAt) {
    $("#gifted-parent-body").textContent = "還沒寫完。";
    deps.showView("giftedParent");
    return;
  }
  const sc = scoreOf(st);
  const mins = Math.round((st.finishedAt - st.startedAt) / 60000);
  const gName = GIFTED_GRADE_LABEL[st.grade] || "";
  const lines = [
    `總分 ${sc.ok} / ${sc.total}（${sc.pct} 分）　用時約 ${mins} 分鐘，限時 ${formatMmSs(limitMsOf(st))}`,
    `${st.n} 題 · ${gName}`,
    catLine(sc),
    "這不是官方魏氏／WISC、沒有 IQ、也沒有 PR。只給家裡觀察四個向度。",
    "",
  ];
  st.items.forEach((q, i) => {
    const pick = st.picks[i];
    const good = pick === q.answer;
    const got = pick >= 0 ? q.options[pick] : "（空白）";
    const gtag = GIFTED_GRADE_LABEL[q.grade] || "";
    lines.push(
      `${good ? "○" : "×"} ${i + 1}.【${GIFTED_CAT_LABEL[q.cat] || q.cat}·${gtag}】${q.q}`
    );
    lines.push(`　　選：${got}　答：${q.options[q.answer]}`);
    if (!good && q.explain) lines.push(`　　${q.explain}`);
  });
  $("#gifted-parent-body").textContent = lines.join("\n");
  deps.showView("giftedParent");
}

function askParentThen(fn) {
  const pin = prompt("家長密碼");
  if (pin == null) return;
  if (pin !== String(CONFIG.PARENT_PIN || "")) {
    deps.showWarn?.("密碼不對", "");
    return;
  }
  fn();
}

export function initGifted(d) {
  deps = d;

  $("#btn-start-gifted")?.addEventListener("click", () => showIntro());
  $("#btn-gifted-intro-back")?.addEventListener("click", () => {
    stopTick();
    deps.showView("home");
  });
  document.querySelectorAll("[data-gifted-n]").forEach((btn) => {
    btn.addEventListener("click", () => {
      pickN = Number(btn.dataset.giftedN);
      paintModeButtons();
    });
  });
  document.querySelectorAll("[data-gifted-grade]").forEach((btn) => {
    btn.addEventListener("click", () => {
      pickGrade = Number(btn.dataset.giftedGrade);
      paintModeButtons();
    });
  });
  $("#btn-gifted-start")?.addEventListener("click", () => {
    const st = loadState();
    if (st?.finishedAt && deps.showWarn) {
      deps.showWarn("再寫一次", "會蓋掉上次成績。", startNew);
      return;
    }
    startNew();
  });
  $("#btn-gifted-resume")?.addEventListener("click", () => openQuiz());
  $("#btn-gifted-restart")?.addEventListener("click", () => {
    const go = () => {
      stopTick();
      localStorage.removeItem(key());
      showIntro();
    };
    if (deps.confirm) {
      deps.confirm("重來", "這次寫到一半的會清掉，從頭選題數。", go);
      return;
    }
    go();
  });
  $("#btn-gifted-quiz-back")?.addEventListener("click", () => {
    stopTick();
    showIntro();
  });
  $("#btn-gifted-prev")?.addEventListener("click", () => {
    const st = loadState();
    if (!st || st.idx <= 0) return;
    st.idx -= 1;
    saveState(st);
    renderQ();
  });
  $("#btn-gifted-next")?.addEventListener("click", () => {
    const st = loadState();
    if (!st || st.idx >= st.items.length - 1) return;
    st.idx += 1;
    saveState(st);
    renderQ();
  });
  $("#btn-gifted-submit")?.addEventListener("click", () => {
    const st = loadState();
    if (!st) return;
    const blank = st.picks.filter((p) => p < 0).length;
    const go = () => finish(st);
    if (blank && deps.showWarn) {
      deps.showWarn("還有空白", `有 ${blank} 題沒選。按確定仍會交卷並計分。`, go);
      return;
    }
    go();
  });
  $("#btn-gifted-done-home")?.addEventListener("click", () => {
    stopTick();
    deps.showView("home");
  });
  $("#btn-gifted-done-parent")?.addEventListener("click", () => {
    askParentThen(() => renderParent());
  });
  $("#btn-gifted-done-again")?.addEventListener("click", () => {
    localStorage.removeItem(key());
    showIntro();
  });
  $("#btn-gifted-parent")?.addEventListener("click", () => {
    askParentThen(() => renderParent());
  });
  $("#btn-gifted-parent-back")?.addEventListener("click", () => {
    const st = loadState();
    if (st?.finishedAt) renderDone(st);
    else showIntro();
  });
  $("#btn-gifted-reset")?.addEventListener("click", () => {
    askParentThen(() => {
      localStorage.removeItem(key());
      showIntro();
    });
  });
}
