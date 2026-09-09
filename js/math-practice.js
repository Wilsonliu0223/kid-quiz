/**
 * 數學中心：二年級／三年級練習，九九乘法從這裡進去。
 */
const $ = (sel) => document.querySelector(sel);
const QUIZ_SIZE = 10;

/** @type {{ showView: (name: string) => void, openMulHome: () => void } | null} */
let deps = null;
/** @type {{ pack: string, title: string, questions: object[], index: number, correct: number, wrongs: object[] } | null} */
let session = null;

function rand(a, b) {
  return a + Math.floor(Math.random() * (b - a + 1));
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function choicesFor(answer, extras) {
  const set = new Set([answer]);
  for (const x of extras) {
    if (set.size >= 4) break;
    if (x !== answer && x != null && x !== "") set.add(x);
  }
  let guard = 0;
  while (set.size < 4 && guard++ < 40) {
    if (typeof answer === "number") {
      const n = answer + rand(-12, 12);
      if (n !== answer && n >= 0) set.add(n);
    } else break;
  }
  return shuffle([...set]).slice(0, 4);
}

function q(prompt, answer, extras, visual = "") {
  return { prompt, answer, choices: choicesFor(answer, extras), visual };
}

function makeG2Add100() {
  const add = Math.random() < 0.55;
  if (add) {
    const a = rand(18, 76);
    const b = rand(8, Math.min(99 - a, 48));
    const ans = a + b;
    return q(`${a} ＋ ${b} ＝ □`, ans, [ans - 10, ans + 10, a + b - 1, Math.abs(a - b)]);
  }
  const a = rand(30, 99);
  const b = rand(8, a - 5);
  const ans = a - b;
  return q(`${a} － ${b} ＝ □`, ans, [ans + 10, a + b, Math.abs(a - b - 10), b]);
}

function makeG2Add1000() {
  const add = Math.random() < 0.55;
  if (add) {
    const a = rand(120, 680);
    const b = rand(35, Math.min(999 - a, 320));
    const ans = a + b;
    return q(`${a} ＋ ${b} ＝ □`, ans, [ans - 100, ans + 100, a + (b % 100), ans - 10]);
  }
  const a = rand(250, 980);
  const b = rand(40, Math.min(a - 20, 420));
  const ans = a - b;
  return q(`${a} － ${b} ＝ □`, ans, [ans + 100, a + b, ans - 10, Math.abs(a - b - 100)]);
}

function makeG2Measure() {
  const kind = rand(1, 4);
  if (kind === 1) {
    const m = rand(1, 8);
    const ans = m * 100;
    return q(`${m} 公尺 ＝ □ 公分`, ans, [m * 10, m * 1000, m + 100, 100]);
  }
  if (kind === 2) {
    const cm = rand(2, 9) * 100;
    const ans = cm / 100;
    return q(`${cm} 公分 ＝ □ 公尺`, ans, [cm / 10, cm, ans + 1, 100]);
  }
  if (kind === 3) {
    const h = rand(1, 10);
    const min = [10, 15, 20, 30, 40, 45][rand(0, 5)];
    const add = [15, 20, 30, 40][rand(0, 3)];
    let nh = h;
    let nm = min + add;
    if (nm >= 60) {
      nh += 1;
      nm -= 60;
    }
    const ans = `${nh} 點 ${nm} 分`;
    return q(
      `現在 ${h} 點 ${min} 分，再過 ${add} 分是？`,
      ans,
      [`${h} 點 ${min + add} 分`, `${h + 1} 點 ${min} 分`, `${nh} 點 ${add} 分`, `${h} 點 ${nm} 分`].filter(
        (x) => x !== ans,
      ),
    );
  }
  const left = rand(40, 90);
  const ans = left < 100 ? "1 公尺比較長" : "一樣長";
  return q(
    `${left} 公分和 1 公尺，哪個比較長？`,
    "1 公尺比較長",
    ["90 公分比較長", `${left} 公分比較長`, "一樣長", "沒辦法比"],
  );
}

function makeG3Mul() {
  const a = rand(12, 48);
  const b = rand(2, 9);
  const ans = a * b;
  return q(`${a} × ${b} ＝ □`, ans, [a * (b - 1), a * (b + 1), a + b, (a - 1) * b]);
}

function makeG3Div() {
  const b = rand(2, 9);
  if (Math.random() < 0.55) {
    const quo = rand(3, 12);
    const a = b * quo;
    return q(`${a} ÷ ${b} ＝ □`, quo, [quo + 1, quo - 1, b, a - b]);
  }
  const quo = rand(2, 9);
  const rem = rand(1, b - 1);
  const a = b * quo + rem;
  if (Math.random() < 0.5) {
    return q(`${a} ÷ ${b} 的商是 □`, quo, [rem, quo + 1, b, a]);
  }
  return q(`${a} ÷ ${b} 的餘數是 □`, rem, [quo, rem + 1, 0, b]);
}

function makeG3Frac() {
  const den = [2, 3, 4, 5, 6, 8][rand(0, 5)];
  const num = rand(1, den - 1);
  const ans = `${num}/${den}`;
  const extras = [
    `${Math.max(1, num - 1)}/${den}`,
    `${num}/${Math.min(den + 1, 9)}`,
    `${den - num}/${den}`,
    `${den}/${num}`,
  ];
  const cells = Array.from({ length: den }, (_, i) => (i < num ? "1" : "0")).join("");
  return q(
    `塗黑的是全部的幾分之幾？`,
    ans,
    extras,
    cells,
  );
}

const PACKS = {
  g2add100: { title: "100 以內加減", make: makeG2Add100 },
  g2add1000: { title: "1000 以內加減", make: makeG2Add1000 },
  g2measure: { title: "時間與長度", make: makeG2Measure },
  g3mul: { title: "二位數 × 一位數", make: makeG3Mul },
  g3div: { title: "除法（含餘數）", make: makeG3Div },
  g3frac: { title: "分數入門", make: makeG3Frac },
};

function buildQuiz(packId) {
  const pack = PACKS[packId];
  const questions = [];
  const seen = new Set();
  let guard = 0;
  while (questions.length < QUIZ_SIZE && guard++ < 80) {
    const item = pack.make();
    const key = `${item.prompt}|${item.answer}`;
    if (seen.has(key)) continue;
    seen.add(key);
    questions.push(item);
  }
  return questions;
}

function renderFrac(visual) {
  const el = $("#math-grade-visual");
  if (!el) return;
  if (!visual) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }
  const cells = [...String(visual)];
  el.hidden = false;
  el.innerHTML = cells
    .map((c) => `<span class="math-frac-cell${c === "1" ? " is-on" : ""}"></span>`)
    .join("");
}

function renderQuestion() {
  const qn = session.questions[session.index];
  $("#math-grade-progress").textContent = `第 ${session.index + 1} / ${session.questions.length} 題`;
  $("#math-grade-prompt").textContent = qn.prompt;
  renderFrac(qn.visual);
  const pad = $("#math-grade-choices");
  pad.innerHTML = "";
  qn.choices.forEach((c) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mul-choice-key";
    btn.textContent = String(c);
    btn.addEventListener("click", () => submitChoice(c));
    pad.appendChild(btn);
  });
}

function submitChoice(picked) {
  const qn = session.questions[session.index];
  const ok = String(picked) === String(qn.answer);
  if (ok) session.correct += 1;
  else session.wrongs.push({ prompt: qn.prompt, answer: qn.answer, picked });
  session.index += 1;
  if (session.index >= session.questions.length) showResult();
  else renderQuestion();
}

function showResult() {
  const total = session.questions.length;
  $("#math-grade-result-title").textContent = session.correct === total ? "全部答對！" : "練完了";
  $("#math-grade-result-score").textContent = `${session.correct} / ${total}`;
  $("#math-grade-result-sub").textContent = session.packTitle;
  const list = $("#math-grade-wrong-list");
  if (session.wrongs.length) {
    list.hidden = false;
    list.innerHTML = session.wrongs
      .map((w) => `<li>${w.prompt.replace("□", String(w.answer))}（你選 ${w.picked}）</li>`)
      .join("");
  } else {
    list.hidden = true;
    list.innerHTML = "";
  }
  deps.showView("mathGradeResult");
}

function startPack(packId) {
  const pack = PACKS[packId];
  if (!pack) return;
  session = {
    pack: packId,
    packTitle: pack.title,
    questions: buildQuiz(packId),
    index: 0,
    correct: 0,
    wrongs: [],
  };
  $("#math-grade-title").textContent = pack.title;
  deps.showView("mathGradeQuiz");
  renderQuestion();
}

export function openMathHub() {
  deps.showView("mathHub");
}

export function initMathPractice(d) {
  deps = d;
  $("#btn-math-hub-back")?.addEventListener("click", () => deps.showView("home"));
  $("#btn-math-hub-mul")?.addEventListener("click", () => deps.openMulHome());
  document.querySelectorAll("[data-math-pack]").forEach((btn) => {
    btn.addEventListener("click", () => startPack(btn.dataset.mathPack));
  });
  $("#btn-math-hub-open")?.addEventListener("click", () => $("#btn-start-math-open")?.click());
  $("#btn-math-hub-flip")?.addEventListener("click", () => $("#btn-start-math-flip")?.click());
  $("#btn-math-hub-guess")?.addEventListener("click", () => $("#btn-start-math-guess")?.click());
  $("#btn-math-grade-back")?.addEventListener("click", () => {
    if (confirm("離開練習？進度不會儲存。")) {
      session = null;
      openMathHub();
    }
  });
  $("#btn-math-grade-retry")?.addEventListener("click", () => {
    if (session?.pack) startPack(session.pack);
  });
  $("#btn-math-grade-hub")?.addEventListener("click", () => {
    session = null;
    openMathHub();
  });
}
