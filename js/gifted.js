/**
 * 小二升小三資優初選類似盲測（自編題，非正式鑑定）
 */
import { CONFIG } from "./config.site.js?v=config-v45.11";
import { getSelectedChild } from "./store.js";
import { GIFTED_BANK, GIFTED_CAT_LABEL } from "./gifted-bank.js?v=gifted-bank-v1";

const PER_CAT = 20;
const LIMIT_MS = 40 * 60 * 1000;
const $ = (sel) => document.querySelector(sel);

/** @type {{ showView: Function, showWarn?: Function } | null} */
let deps = null;
let tick = null;

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

function buildPaper() {
  const rnd = seedRng(`${getSelectedChild()}|gifted-v1`);
  const by = { fig: [], lang: [], math: [] };
  for (const q of GIFTED_BANK) {
    if (by[q.cat]) by[q.cat].push(q);
  }
  const picked = [];
  for (const cat of ["fig", "lang", "math"]) {
    picked.push(...shuffle(by[cat], rnd).slice(0, PER_CAT));
  }
  return picked.map((q) => {
    const order = shuffle(q.options.map((_, i) => i), rnd);
    const options = order.map((i) => q.options[i]);
    const answer = order.indexOf(q.answer);
    return { id: q.id, cat: q.cat, q: q.q, options, answer, explain: q.explain };
  });
}

function remainingMs(st) {
  const end = st.startedAt + LIMIT_MS;
  return Math.max(0, end - Date.now());
}

function formatMmSs(ms) {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function stopTick() {
  if (tick) {
    clearInterval(tick);
    tick = null;
  }
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
  return { ok, total: st.items.length, by };
}

function showIntro() {
  const st = loadState();
  const done = Boolean(st?.finishedAt);
  const mid = Boolean(st?.startedAt && !st.finishedAt);
  $("#gifted-intro-done")?.toggleAttribute("hidden", !done);
  $("#gifted-intro-mid")?.toggleAttribute("hidden", !mid);
  $("#gifted-intro-fresh")?.toggleAttribute("hidden", done || mid);
  $("#btn-gifted-start")?.toggleAttribute("hidden", done || mid);
  $("#btn-gifted-resume")?.toggleAttribute("hidden", !mid);
  $("#btn-gifted-parent")?.toggleAttribute("hidden", !done);
  deps.showView("giftedIntro");
}

function startNew() {
  const items = buildPaper();
  saveState({
    startedAt: Date.now(),
    items,
    picks: items.map(() => -1),
    idx: 0,
    finishedAt: 0,
  });
  openQuiz();
}

function finish(st) {
  st.finishedAt = Date.now();
  saveState(st);
  stopTick();
  $("#gifted-done-msg").textContent = "這次寫完了，謝謝。分數給爸爸媽媽看。";
  deps.showView("giftedDone");
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
  $("#gifted-timer").textContent = formatMmSs(remainingMs(st));
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
    deps.showView("giftedDone");
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
    const t = $("#gifted-timer");
    if (t) t.textContent = formatMmSs(remainingMs(cur));
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
  const lines = [
    `總分 ${sc.ok} / ${sc.total}（用時約 ${mins} 分鐘，限時 40 分鐘）`,
    `圖形 ${sc.by.fig.ok}/${sc.by.fig.n}　語文 ${sc.by.lang.ok}/${sc.by.lang.n}　數學 ${sc.by.math.ok}/${sc.by.math.n}`,
    "這不是市府鑑定、也沒有 PR。只給家裡觀察。",
    "",
  ];
  st.items.forEach((q, i) => {
    const pick = st.picks[i];
    const good = pick === q.answer;
    const got = pick >= 0 ? q.options[pick] : "（空白）";
    lines.push(
      `${good ? "○" : "×"} ${i + 1}.【${GIFTED_CAT_LABEL[q.cat]}】${q.q}`
    );
    lines.push(`　　選：${got}　答：${q.options[q.answer]}`);
    if (!good && q.explain) lines.push(`　　${q.explain}`);
  });
  $("#gifted-parent-body").textContent = lines.join("\n");
  deps.showView("giftedParent");
}

export function initGifted(d) {
  deps = d;

  $("#btn-start-gifted")?.addEventListener("click", () => showIntro());
  $("#btn-gifted-intro-back")?.addEventListener("click", () => {
    stopTick();
    deps.showView("home");
  });
  $("#btn-gifted-start")?.addEventListener("click", () => startNew());
  $("#btn-gifted-resume")?.addEventListener("click", () => openQuiz());
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
      deps.showWarn("還有空白", `有 ${blank} 題沒選。時間到或按確定仍會交卷。`, go);
      return;
    }
    go();
  });
  $("#btn-gifted-done-home")?.addEventListener("click", () => {
    stopTick();
    deps.showView("home");
  });
  $("#btn-gifted-parent")?.addEventListener("click", () => {
    const pin = prompt("家長密碼");
    if (pin == null) return;
    if (pin !== String(CONFIG.PARENT_PIN || "")) {
      deps.showWarn?.("密碼不對", "");
      return;
    }
    renderParent();
  });
  $("#btn-gifted-parent-back")?.addEventListener("click", () => showIntro());
  $("#btn-gifted-reset")?.addEventListener("click", () => {
    const pin = prompt("重測會清掉這次紀錄。再輸入家長密碼");
    if (pin == null) return;
    if (pin !== String(CONFIG.PARENT_PIN || "")) return;
    localStorage.removeItem(key());
    showIntro();
  });
}
