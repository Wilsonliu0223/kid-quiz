/**
 * 思考練習：對齊智力測驗常見作業的自編小遊戲（非正式鑑定）
 */
import { getSelectedChild } from "./store.js";
import {
  GIFTED_BANK,
  GIFTED_CAT_LABEL,
  GIFTED_GRADE_LABEL,
} from "./gifted-bank.js?v=gifted-bank-v11";
import {
  visPromptHtml,
  visChoiceHtml,
  cellSvg,
} from "./gifted-fig.js?v=gifted-fig-v4";
import { makeSpecials } from "./gifted-special.js?v=gifted-sp-v2";

const CATS = ["fig", "lang", "math", "mem"];
const GAMES = {
  lang: { title: "語文理解" },
  fig: { title: "圖形規律" },
  math: { title: "數量推理" },
  mem: { title: "記一串" },
  spd: { title: "快快找" },
  mix: { title: "綜合闖關" },
};
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
const SPD_MS = 50 * 1000;
const LOWER = { 56: 34, 34: 23, 23: 12 };
const $ = (sel) => document.querySelector(sel);

/** @type {{ showView: Function, showWarn?: Function, confirm?: Function } | null} */
let deps = null;
let tick = null;
let memTick = null;
let pickN = 10;
let pickGrade = 12;
let pickMode = "mix";

function keyFor(mode) {
  return `kid-quiz-gifted-blind-${getSelectedChild()}-${mode}`;
}

function key() {
  return keyFor(pickMode);
}

const PAPER_VER = 12;

function readStored(k) {
  try {
    const st = JSON.parse(localStorage.getItem(k) || "null");
    if (!st) return null;
    if (st.paperVer !== PAPER_VER && !st.finishedAt) {
      localStorage.removeItem(k);
      return null;
    }
    return st;
  } catch {
    return null;
  }
}

function migrateOldMix() {
  const oldK = `kid-quiz-gifted-blind-${getSelectedChild()}`;
  const mixK = keyFor("mix");
  if (localStorage.getItem(mixK) || !localStorage.getItem(oldK)) return;
  localStorage.setItem(mixK, localStorage.getItem(oldK));
  localStorage.removeItem(oldK);
}

function loadStateFor(mode) {
  migrateOldMix();
  const st = readStored(keyFor(mode));
  if (st && !st.mode) st.mode = mode;
  return st;
}

function loadState() {
  return loadStateFor(pickMode);
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
  if (st?.mode === "spd") {
    return Math.max(0, st.startedAt + (st.limitMs || SPD_MS) - Date.now());
  }
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

function stopMem() {
  if (memTick) {
    clearTimeout(memTick);
    memTick = null;
  }
}

function stopTick() {
  if (tick) {
    clearInterval(tick);
    tick = null;
  }
}

/** 工作記憶：先記一串再收起來。數字還印在題目上就不算記憶。 */
function splitMem(q) {
  if (q.cat !== "mem") return null;
  if (q.visMem) {
    return { seq: "圖", vis: q.visMem, ask: q.memAsk || "剛才看到哪一個？" };
  }
  if (q.memSeq) {
    return { seq: q.memSeq, ask: q.memAsk || "剛才那串是什麼？" };
  }
  const t = String(q.q || "");
  let m = t.match(/往回唸，順序是？\s*(.+)$/);
  if (m) {
    return { seq: m[1].trim(), ask: "剛才那串已經收起來了。從最後一個往回唸，順序是？" };
  }
  m = t.match(/^記住[\s\S]*?[：:]\s*(.+?)[。．]\s*(.+)$/);
  if (m) {
    return { seq: m[1].trim(), ask: `剛才那串已經收起來了。${m[2].trim()}` };
  }
  return null;
}

function memHoldMs(seq) {
  if (String(seq) === "圖") return 3800;
  const n = String(seq).split(/[、，,\s]+/).filter(Boolean).length;
  return Math.max(2800, Math.min(7000, 1200 + n * 800));
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

function poolFor(cat, grade, need, rnd) {
  const same = GIFTED_BANK.filter((q) => q.cat === cat && q.grade === grade);
  const extra = [];
  if (same.length < need) {
    let g = LOWER[grade];
    while (g && same.length + extra.length < need) {
      extra.push(...GIFTED_BANK.filter((q) => q.cat === cat && q.grade === g));
      g = LOWER[g];
    }
  }
  const specials = rnd ? makeSpecials(cat, grade, rnd, Math.max(8, need)) : [];
  return [...specials, ...same, ...extra];
}

/** 產生題（fr34-0）同一模板只算一種，手寫題（f001）各算各的。 */
function familyOf(id) {
  const m = String(id).match(/^([a-z]{2,})\d+-/i);
  return m ? m[1].toLowerCase() : id;
}

function takeCatBank(pool, n, rnd, famCap) {
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
  const famCount = {};
  const visFirst = (arr) => [
    ...arr.filter((q) => q.vis),
    ...arr.filter((q) => !q.vis),
  ];
  const consider = [...visFirst(fresh), ...visFirst(rest)];
  const push = (q, ignoreFam) => {
    if (used.has(q.id)) return false;
    const fam = familyOf(q.id);
    if (!ignoreFam && (famCount[fam] || 0) >= famCap) return false;
    used.add(q.id);
    famCount[fam] = (famCount[fam] || 0) + 1;
    picked.push(q);
    return true;
  };
  for (const q of consider) {
    push(q, false);
    if (picked.length >= n) break;
  }
  if (picked.length < n) {
    for (const q of consider) {
      push(q, true);
      if (picked.length >= n) break;
    }
  }
  return picked;
}

function takeCat(pool, n, rnd, famCap) {
  const specials = shuffle(
    pool.filter((q) => q.special),
    rnd
  );
  const bank = pool.filter((q) => !q.special);
  const figHeavy = specials[0]?.cat === "fig" || bank[0]?.cat === "fig";
  const ratio = figHeavy ? 0.7 : 0.45;
  const nSp = Math.min(specials.length, Math.max(1, Math.round(n * ratio)));
  const fromSp = specials.slice(0, nSp);
  const fromBank = takeCatBank(bank, n - fromSp.length, rnd, famCap);
  return shuffle([...fromSp, ...fromBank], rnd);
}

function buildPaper(n, mode) {
  const rnd = seedRng(
    `${getSelectedChild()}|gifted-v6|${mode}|${n}|${pickGrade}|${Date.now()}`
  );
  const cats = mode === "mix" ? CATS : [mode];
  const quota =
    mode === "mix"
      ? QUOTAS[n] || QUOTAS[10]
      : cats.map(() => n);
  const famCap = n >= 60 ? 2 : 1;
  const picked = [];
  cats.forEach((cat, i) => {
    picked.push(
      ...takeCat(poolFor(cat, pickGrade, quota[i], rnd), quota[i], rnd, famCap)
    );
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
      special: Boolean(q.special),
      memSeq: q.memSeq || null,
      memAsk: q.memAsk || null,
      visMem: q.visMem
        ? { kind: q.visMem.kind, cells: q.visMem.cells }
        : null,
      vis: q.vis
        ? {
            kind: q.vis.kind,
            cells: q.vis.cells,
            cell: q.vis.cell,
            choices: Array.isArray(q.vis.choices)
              ? order.map((i) => q.vis.choices[i])
              : undefined,
          }
        : null,
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

const PAPER_DIFF = { 12: 0.72, 23: 0.95, 34: 1.22, 56: 1.55 };
const TYPICAL_AGE = { 12: 7, 23: 8, 34: 9.5, 56: 11.5 };

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function ageKey() {
  return `kid-quiz-gifted-age-${getSelectedChild()}`;
}

function parseAge(raw) {
  const v = Number(raw);
  if (!Number.isFinite(v) || v < 5 || v > 13) return 0;
  return Math.round(v * 2) / 2;
}

function readAgeInput() {
  return parseAge($("#gifted-age")?.value);
}

function savedAge() {
  return parseAge(localStorage.getItem(ageKey()) || "");
}

function persistAge(age) {
  if (age) localStorage.setItem(ageKey(), String(age));
}

function fillAgeInput() {
  const el = $("#gifted-age");
  if (!el) return;
  const a = savedAge();
  if (a && !el.value) el.value = String(a);
}

function itemWeight(grade) {
  return PAPER_DIFF[grade] || 1;
}

function estimateIndex(st, sc) {
  const age = st.ageYears || savedAge() || 7;
  const typical = TYPICAL_AGE[st.grade] || 8;
  const ageGap = typical - age;
  const expectedP = clamp(0.62 + -ageGap * 0.04, 0.42, 0.78);
  let wOk = 0;
  let wN = 0;
  st.items.forEach((q, i) => {
    const w = itemWeight(q.grade);
    wN += w;
    if (st.picks[i] === q.answer) wOk += w;
  });
  const wp = wN ? wOk / wN : 0;
  const p = sc.total ? sc.ok / sc.total : 0;
  const zAcc = (wp - expectedP) / 0.16;
  const used = Math.max(1, (st.finishedAt || Date.now()) - st.startedAt);
  const ratio = used / limitMsOf(st);
  let zTime = 0;
  if (p >= 0.7 && ratio <= 0.35) zTime = 0.35;
  else if (p >= 0.6 && ratio <= 0.5) zTime = 0.15;
  else if (ratio >= 0.97 && p < 0.85) zTime = -0.12;
  const shrink = { 10: 0.55, 20: 0.78, 60: 0.92 }[st.n] || 0.7;
  const z = clamp((zAcc + zTime * 0.5) * shrink, -2.2, 3);
  const index = clamp(Math.round(100 + 15 * z), 70, 145);
  const subscales = {};
  CATS.forEach((c) => {
    const b = sc.by[c];
    const pp = b.n ? b.ok / b.n : 0;
    const zs = clamp(((pp - expectedP) / 0.2) * shrink, -2.2, 3);
    subscales[c] = clamp(Math.round(100 + 15 * zs), 70, 145);
  });
  let band = "中等附近";
  if (index >= 130) band = "很高（僅供參考）";
  else if (index >= 120) band = "偏高";
  else if (index >= 110) band = "中上";
  else if (index >= 90) band = "中等附近";
  else if (index >= 80) band = "中下";
  else band = "偏低（題可能太難，或還不熟）";
  const conf =
    st.n >= 60
      ? "60 題較穩，仍非正式智力測驗"
      : st.n >= 20
        ? "20 題誤差可能有 10 分上下"
        : "10 題誤差很大，當參考即可";
  return { index, subscales, band, conf, wp, expectedP, ratio, age };
}

function catLine(sc) {
  return CATS.filter((c) => sc.by[c]?.n)
    .map((c) => `${GIFTED_CAT_LABEL[c]} ${sc.by[c].ok}/${sc.by[c].n}`)
    .join("　");
}

function gameTitle(st) {
  return GAMES[st?.mode]?.title || "思考練習";
}

function paintHubTags() {
  Object.keys(GAMES).forEach((mode) => {
    const tag = document.querySelector(`[data-gifted-tag="${mode}"]`);
    const card = document.querySelector(`[data-gifted-game="${mode}"]`);
    const st = loadStateFor(mode);
    if (tag) {
      if (st && !st.finishedAt) tag.textContent = "還沒玩完，點這裡繼續";
      else if (st?.finishedAt) tag.textContent = "上次玩完了，點了會重來";
      else tag.textContent = "";
    }
    card?.classList.toggle("is-mid", Boolean(st && !st.finishedAt));
  });
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
  stopTick();
  stopMem();
  paintModeButtons();
  fillAgeInput();
  paintHubTags();
  deps.showView("giftedIntro");
}

function needAge() {
  const age = readAgeInput() || savedAge();
  if (!age) {
    deps.showWarn?.("先填年齡", "填小朋友幾歲（5～13）。");
    return 0;
  }
  persistAge(age);
  return age;
}

function paperN(mode) {
  if (mode === "mix") return QUOTAS[pickN] ? pickN : 10;
  if (pickN >= 20) return 20;
  return 10;
}

function startNew() {
  const age = needAge();
  if (!age) return;
  if (pickMode === "spd") {
    startSpd(age);
    return;
  }
  const n = paperN(pickMode);
  const items = buildPaper(n, pickMode);
  saveState({
    mode: pickMode,
    startedAt: Date.now(),
    n,
    grade: pickGrade,
    ageYears: age,
    limitMs: LIMIT_MS[n],
    items,
    picks: items.map(() => -1),
    memOk: items.map(() => 0),
    idx: 0,
    finishedAt: 0,
    paperVer: PAPER_VER,
  });
  openQuiz();
}

function launchGame(mode) {
  pickMode = mode;
  const st = loadState();
  if (st && !st.finishedAt) {
    if (mode === "spd") openSpd();
    else openQuiz();
    return;
  }
  if (st?.finishedAt) {
    const go = () => {
      localStorage.removeItem(key());
      startNew();
    };
    if (deps.showWarn) {
      deps.showWarn("再玩一次", "會蓋掉這關上次成績。", go);
      return;
    }
    go();
    return;
  }
  startNew();
}

function hideIq(hide) {
  $("#gifted-done-iq-label")?.toggleAttribute("hidden", hide);
  $("#gifted-done-iq")?.toggleAttribute("hidden", hide);
  $("#gifted-done-iq-band")?.toggleAttribute("hidden", hide);
}

function renderDone(st) {
  pickMode = st.mode || pickMode;
  const gName = GIFTED_GRADE_LABEL[st.grade] || GIFTED_GRADE_LABEL[12];
  const used = formatMmSs(Math.max(0, st.finishedAt - st.startedAt));
  if (st.mode === "spd") {
    const score = Math.max(0, (st.hits || 0) - (st.miss || 0));
    hideIq(true);
    $("#gifted-done-band").textContent = "快快找";
    $("#gifted-done-score").textContent = `${score} 分`;
    $("#gifted-done-break").textContent = `對 ${st.hits || 0}　錯 ${st.miss || 0}　過 ${st.rounds || 0} 關`;
    $("#gifted-done-msg").textContent = `${gName} · 限時 ${formatMmSs(st.limitMs || SPD_MS)} · 用時 ${used}。練找一樣、動作快。不是正式處理速度測驗。`;
    deps.showView("giftedDone");
    return;
  }
  const sc = scoreOf(st);
  const band = bandOf(sc.pct);
  const showIq = st.mode === "mix";
  hideIq(!showIq);
  $("#gifted-done-band").textContent = `${gameTitle(st)} · ${band.title}`;
  if (showIq) {
    const est = estimateIndex(st, sc);
    $("#gifted-done-iq").textContent = String(est.index);
    $("#gifted-done-iq-band").textContent = `${est.band} · ${est.age} 歲`;
    $("#gifted-done-msg").textContent =
      `${st.n} 題 · ${gName} · 用時 ${used}（限時 ${formatMmSs(limitMsOf(st))}）。${est.conf}。${band.hint} 不是正式智力測驗。`;
  } else {
    $("#gifted-done-msg").textContent =
      `${st.n} 題 · ${gName} · 用時 ${used}（限時 ${formatMmSs(limitMsOf(st))}）。${band.hint} 不是正式智力測驗。`;
  }
  $("#gifted-done-score").textContent = `答對 ${sc.ok} / ${sc.total}　（${sc.pct}%）`;
  $("#gifted-done-break").textContent = catLine(sc);
  deps.showView("giftedDone");
}

function finish(st) {
  st.finishedAt = Date.now();
  saveState(st);
  if (st.items) {
    rememberSeen(st.items.filter((q) => !q.special).map((q) => q.id));
  }
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
  stopMem();
  const mem = splitMem(q);
  const seqEl = $("#gifted-mem-seq");
  const studied = Boolean(st.memOk?.[st.idx]);
  if (mem && !studied) {
    $("#gifted-q").textContent = mem.vis
      ? "先記住這些圖。看完會收起來，再問你。"
      : "先記住這一串。看完會收起來，再問你。";
    if (seqEl) {
      seqEl.hidden = Boolean(mem.vis);
      seqEl.textContent = mem.vis ? "" : mem.seq;
    }
    const figHide = $("#gifted-fig");
    if (figHide) {
      const html = mem.vis ? visPromptHtml(mem.vis) : "";
      figHide.innerHTML = html;
      figHide.hidden = !html;
    }
    const box = $("#gifted-choices");
    box.innerHTML = "";
    $("#btn-gifted-prev").disabled = true;
    $("#btn-gifted-next").hidden = true;
    $("#btn-gifted-submit").hidden = true;
    const idx = st.idx;
    memTick = setTimeout(() => {
      const cur = loadState();
      if (!cur || cur.finishedAt || cur.idx !== idx) return;
      cur.memOk = cur.memOk || [];
      cur.memOk[idx] = 1;
      saveState(cur);
      renderQ();
    }, memHoldMs(mem.seq));
    return;
  }
  if (seqEl) {
    seqEl.hidden = true;
    seqEl.textContent = "";
  }
  $("#gifted-q").textContent = mem ? mem.ask : q.q;
  const fig = $("#gifted-fig");
  if (fig) {
    const html = q.vis ? visPromptHtml(q.vis) : "";
    fig.innerHTML = html;
    fig.hidden = !html;
  }
  const box = $("#gifted-choices");
  box.innerHTML = "";
  const letters = ["Ａ", "Ｂ", "Ｃ", "Ｄ"];
  q.options.forEach((label, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "btn btn-secondary btn-block gifted-choice" +
      (q.vis?.choices ? " is-fig" : "") +
      (st.picks[st.idx] === i ? " is-picked" : "");
    if (q.vis?.choices?.[i]) {
      btn.innerHTML = visChoiceHtml(q.vis.choices[i], letters[i]);
    } else {
      btn.textContent = `${letters[i]}  ${label}`;
    }
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
  if (st.mode === "spd") {
    const score = Math.max(0, (st.hits || 0) - (st.miss || 0));
    $("#gifted-parent-body").textContent = [
      `${gameTitle(st)}　${GIFTED_GRADE_LABEL[st.grade] || ""}　${st.ageYears || ""} 歲`,
      `分數 ${score}　對 ${st.hits || 0}　錯 ${st.miss || 0}　過 ${st.rounds || 0} 關`,
      `限時 ${formatMmSs(st.limitMs || SPD_MS)}`,
      "自編找相同圖形，對齊處理速度那種「又快又準」，不是正式測驗。",
    ].join("\n");
    deps.showView("giftedParent");
    return;
  }
  const sc = scoreOf(st);
  const used = formatMmSs(Math.max(0, st.finishedAt - st.startedAt));
  const gName = GIFTED_GRADE_LABEL[st.grade] || "";
  const lines = [
    `${gameTitle(st)}　答對 ${sc.ok} / ${sc.total}（${sc.pct}%）　用時 ${used}／限時 ${formatMmSs(limitMsOf(st))}`,
    `${st.n} 題 · ${gName}　${st.ageYears || ""} 歲`,
    catLine(sc),
  ];
  if (st.mode === "mix") {
    const est = estimateIndex(st, sc);
    const sub = CATS.filter((c) => sc.by[c]?.n)
      .map((c) => `${GIFTED_CAT_LABEL[c]} ${est.subscales[c]}`)
      .join("　");
    lines.unshift(`參考指數 ${est.index}（${est.band}）　${est.age} 歲`, est.conf);
    lines.push(`向度指數：${sub}`);
    lines.push(
      "算法：對錯依題庫年級加權，再對照年齡該檔的預期答對率，快且準會微調；短測驗會往 100 收縮。不是官方魏氏／WISC，不能當鑑定或 PR。"
    );
  } else {
    lines.push("單一關卡只看對錯，不給參考指數。不是官方測驗。");
  }
  lines.push("");
  st.items.forEach((q, i) => {
    const pick = st.picks[i];
    const good = pick === q.answer;
    const letters = ["Ａ", "Ｂ", "Ｃ", "Ｄ"];
    const got =
      pick < 0
        ? "（空白）"
        : q.vis
          ? `圖案${letters[pick]}`
          : q.options[pick];
    const ans = q.vis ? `圖案${letters[q.answer]}` : q.options[q.answer];
    const gtag = GIFTED_GRADE_LABEL[q.grade] || "";
    const stem = q.vis ? `${q.q}（圖案）` : q.q;
    lines.push(
      `${good ? "○" : "×"} ${i + 1}.【${GIFTED_CAT_LABEL[q.cat] || q.cat}·${gtag}】${stem}`
    );
    lines.push(`　　選：${got}　答：${ans}`);
    if (!good && q.explain) lines.push(`　　${q.explain}`);
  });
  $("#gifted-parent-body").textContent = lines.join("\n");
  deps.showView("giftedParent");
}

const SPD_SHAPES = [
  { s: "c", fill: 1 },
  { s: "c", fill: 0 },
  { s: "q", fill: 1 },
  { s: "q", fill: 0 },
  { s: "t", fill: 1 },
  { s: "t", fill: 0 },
  { s: "d", fill: 1 },
  { s: "d", fill: 0 },
];

function shapeKey(spec) {
  return `${spec.s}|${Number(spec.fill)}|${spec.rot || 0}`;
}

function spdMatch(cell, st) {
  const same = shapeKey(cell.spec) === shapeKey(st.target);
  return st.rule === "diff" ? !same : same;
}

function spdPalette(grade) {
  const base = SPD_SHAPES.map((s) => ({ ...s }));
  if (grade >= 34) {
    base.push({ s: "t", fill: 1, rot: 90 }, { s: "t", fill: 1, rot: 180 });
  }
  return base;
}

function nextSpdRound() {
  const st = loadState();
  if (!st || st.mode !== "spd") return;
  const pal = spdPalette(st.grade);
  const rnd = seedRng(`${st.startedAt}|r${st.rounds}|${st.hits}`);
  const cols = st.grade >= 23 ? 5 : 4;
  const total = cols * 4;
  const target = pal[Math.floor(rnd() * pal.length)];
  const rule = rnd() < 0.38 ? "diff" : "same";
  const nSame = Math.max(3, Math.min(7, 3 + Math.floor(rnd() * 4)));
  const others = pal.filter((p) => shapeKey(p) !== shapeKey(target));
  const cells = [];
  for (let i = 0; i < nSame; i++) cells.push({ spec: { ...target }, hit: 0 });
  while (cells.length < total) {
    const spec = others[Math.floor(rnd() * others.length)] || pal[0];
    cells.push({ spec: { ...spec }, hit: 0 });
  }
  const shuffled = shuffle(cells, rnd);
  const need =
    rule === "diff" ? shuffled.filter((c) => shapeKey(c.spec) !== shapeKey(target)).length : nSame;
  st.rule = rule;
  st.target = { ...target };
  st.cells = shuffled;
  st.cols = cols;
  st.roundHits = 0;
  st.roundNeed = need;
  st.rounds += 1;
  saveState(st);
}

function startSpd(age) {
  saveState({
    mode: "spd",
    startedAt: Date.now(),
    n: 0,
    grade: pickGrade,
    ageYears: age,
    limitMs: SPD_MS,
    hits: 0,
    miss: 0,
    rounds: 0,
    roundHits: 0,
    roundNeed: 0,
    target: null,
    cells: [],
    cols: 4,
    finishedAt: 0,
    paperVer: PAPER_VER,
  });
  nextSpdRound();
  openSpd();
}

function paintSpd() {
  const st = loadState();
  if (!st || st.mode !== "spd") return;
  if (!st.finishedAt && remainingMs(st) <= 0) {
    finish(st);
    return;
  }
  const prog = $("#gifted-spd-progress");
  if (prog) prog.textContent = `第 ${st.rounds} 關`;
  const t = $("#gifted-spd-timer");
  if (t) {
    t.textContent = formatMmSs(remainingMs(st));
    t.classList.toggle("is-low", remainingMs(st) <= 10 * 1000);
  }
  const ask = document.querySelector(".gifted-spd-ask");
  if (ask) {
    ask.textContent =
      st.rule === "diff" ? "點所有跟這個不一樣的" : "點所有跟這個一樣的";
  }
  const scoreEl = $("#gifted-spd-score");
  if (scoreEl) {
    scoreEl.textContent = `${Math.max(0, st.hits - st.miss)} 分 · 對 ${st.hits}　錯 ${st.miss}`;
  }
  const tgt = $("#gifted-spd-target");
  if (tgt) tgt.innerHTML = cellSvg(st.target, 72);
  const grid = $("#gifted-spd-grid");
  if (!grid) return;
  grid.classList.toggle("is-wide", st.cols >= 5);
  grid.innerHTML = "";
  st.cells.forEach((cell, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "gifted-spd-cell" + (cell.hit ? " is-hit" : "");
    btn.innerHTML = cellSvg(cell.spec, 56);
    btn.disabled = Boolean(cell.hit);
    btn.addEventListener("click", () => tapSpd(i));
    grid.appendChild(btn);
  });
}

function tapSpd(i) {
  const st = loadState();
  if (!st || st.finishedAt || st.mode !== "spd") return;
  if (remainingMs(st) <= 0) {
    finish(st);
    return;
  }
  const cell = st.cells[i];
  if (!cell || cell.hit) return;
  if (spdMatch(cell, st)) {
    cell.hit = 1;
    st.hits += 1;
    st.roundHits += 1;
    saveState(st);
    if (st.roundHits >= st.roundNeed) nextSpdRound();
    paintSpd();
    return;
  }
  st.miss += 1;
  saveState(st);
  paintSpd();
}

function openSpd() {
  const st = loadState();
  if (!st || st.mode !== "spd") {
    showIntro();
    return;
  }
  if (st.finishedAt) {
    renderDone(st);
    return;
  }
  if (!st.target) nextSpdRound();
  deps.showView("giftedSpd");
  paintSpd();
  stopTick();
  tick = setInterval(() => {
    const cur = loadState();
    if (!cur || cur.finishedAt || cur.mode !== "spd") {
      stopTick();
      return;
    }
    if (remainingMs(cur) <= 0) {
      finish(cur);
      return;
    }
    const t = $("#gifted-spd-timer");
    if (t) {
      t.textContent = formatMmSs(remainingMs(cur));
      t.classList.toggle("is-low", remainingMs(cur) <= 10000);
    }
  }, 250);
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
  document.querySelectorAll("[data-gifted-game]").forEach((btn) => {
    btn.addEventListener("click", () => launchGame(btn.dataset.giftedGame));
  });
  $("#btn-gifted-quiz-back")?.addEventListener("click", () => {
    stopMem();
    stopTick();
    showIntro();
  });
  $("#btn-gifted-spd-back")?.addEventListener("click", () => {
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
    renderParent();
  });
  $("#btn-gifted-done-again")?.addEventListener("click", () => {
    showIntro();
  });
  $("#btn-gifted-parent-back")?.addEventListener("click", () => {
    const st = loadState();
    if (st?.finishedAt) renderDone(st);
    else showIntro();
  });
  $("#btn-gifted-reset")?.addEventListener("click", () => {
    localStorage.removeItem(key());
    showIntro();
  });
}
