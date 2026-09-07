/**
 * 資優練習：10／20／60 題，程度可選，交卷評分
 */
import { CONFIG } from "./config.site.js?v=config-v45.14";
import { getSelectedChild } from "./store.js";
import {
  GIFTED_BANK,
  GIFTED_CAT_LABEL,
  GIFTED_LV_LABEL,
} from "./gifted-bank.js?v=gifted-bank-v2";

const QUOTAS = {
  10: [4, 3, 3],
  20: [7, 7, 6],
  60: [20, 20, 20],
};
const LIMIT_MS = {
  10: 8 * 60 * 1000,
  20: 16 * 60 * 1000,
  60: 40 * 60 * 1000,
};
const CATS = ["fig", "lang", "math"];
const $ = (sel) => document.querySelector(sel);

/** @type {{ showView: Function, showWarn?: Function } | null} */
let deps = null;
let tick = null;
let pickN = 10;
let pickLv = 1;

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

function takeCat(pool, n, rnd) {
  const easy = shuffle(
    pool.filter((q) => q.lv !== 2),
    rnd
  );
  const hard = shuffle(
    pool.filter((q) => q.lv === 2),
    rnd
  );
  if (pickLv === 1) return [...easy, ...hard].slice(0, n);
  return shuffle([...easy, ...hard], rnd).slice(0, n);
}

function buildPaper(n) {
  const rnd = seedRng(`${getSelectedChild()}|gifted-v3|${n}|${pickLv}|${Date.now()}`);
  const by = { fig: [], lang: [], math: [] };
  for (const q of GIFTED_BANK) {
    if (by[q.cat]) by[q.cat].push(q);
  }
  const quota = QUOTAS[n] || QUOTAS[10];
  const picked = [];
  CATS.forEach((cat, i) => {
    picked.push(...takeCat(by[cat], quota[i], rnd));
  });
  return shuffle(picked, rnd).map((q) => {
    const order = shuffle(q.options.map((_, i) => i), rnd);
    const options = order.map((i) => q.options[i]);
    const answer = order.indexOf(q.answer);
    return {
      id: q.id,
      cat: q.cat,
      lv: q.lv,
      q: q.q,
      options,
      answer,
      explain: q.explain,
    };
  });
}

function scoreOf(st) {
  let ok = 0;
  const by = { fig: { ok: 0, n: 0 }, lang: { ok: 0, n: 0 }, math: { ok: 0, n: 0 } };
  st.items.forEach((q, i) => {
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
  if (pct >= 90) return { title: "表現很好", hint: "答對很多，再挑戰更長或較難也可以。" };
  if (pct >= 75) return { title: "不錯", hint: "大部分都對，錯的可以跟爸爸媽媽一起看。" };
  if (pct >= 60) return { title: "還可以", hint: "有基礎了，再練幾回會更熟。" };
  return { title: "再練練", hint: "先選 10 題、小一升小二可做，慢慢加長。" };
}

function paintModeButtons() {
  document.querySelectorAll("[data-gifted-n]").forEach((btn) => {
    btn.classList.toggle("is-on", Number(btn.dataset.giftedN) === pickN);
  });
  document.querySelectorAll("[data-gifted-lv]").forEach((btn) => {
    btn.classList.toggle("is-on", Number(btn.dataset.giftedLv) === pickLv);
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
    lv: pickLv,
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
  const lvName = GIFTED_LV_LABEL[st.lv] || GIFTED_LV_LABEL[1];
  $("#gifted-done-band").textContent = band.title;
  $("#gifted-done-score").textContent = `${sc.ok} / ${sc.total}　（${sc.pct} 分）`;
  $("#gifted-done-break").textContent =
    `圖形 ${sc.by.fig.ok}/${sc.by.fig.n}　語文 ${sc.by.lang.ok}/${sc.by.lang.n}　數學 ${sc.by.math.ok}/${sc.by.math.n}`;
  $("#gifted-done-msg").textContent =
    `${st.n} 題 · ${lvName} · 約 ${mins} 分鐘（限時 ${formatMmSs(limitMsOf(st))}）。${band.hint}`;
  deps.showView("giftedDone");
}

function finish(st) {
  st.finishedAt = Date.now();
  saveState(st);
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
  const lvName = GIFTED_LV_LABEL[st.lv] || "";
  const lines = [
    `總分 ${sc.ok} / ${sc.total}（${sc.pct} 分）　用時約 ${mins} 分鐘，限時 ${formatMmSs(limitMsOf(st))}`,
    `${st.n} 題 · ${lvName}`,
    `圖形 ${sc.by.fig.ok}/${sc.by.fig.n}　語文 ${sc.by.lang.ok}/${sc.by.lang.n}　數學 ${sc.by.math.ok}/${sc.by.math.n}`,
    "這不是市府鑑定、也沒有 PR。只給家裡觀察。",
    "",
  ];
  st.items.forEach((q, i) => {
    const pick = st.picks[i];
    const good = pick === q.answer;
    const got = pick >= 0 ? q.options[pick] : "（空白）";
    const tag = q.lv === 2 ? "較難" : "小一升小二";
    lines.push(
      `${good ? "○" : "×"} ${i + 1}.【${GIFTED_CAT_LABEL[q.cat]}·${tag}】${q.q}`
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
  document.querySelectorAll("[data-gifted-lv]").forEach((btn) => {
    btn.addEventListener("click", () => {
      pickLv = Number(btn.dataset.giftedLv);
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
