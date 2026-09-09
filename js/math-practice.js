/**
 * 數學中心：二～六年級練習，九九乘法從這裡進去。
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

function makeG3Perim() {
  const l = rand(6, 18);
  const w = rand(3, l - 1);
  const ans = 2 * (l + w);
  return q(`長方形長 ${l} 公分、寬 ${w} 公分，周長是 □ 公分`, ans, [l + w, l * w, 2 * l + w, 4 * l]);
}

function oneDec(tenths) {
  const n = tenths / 10;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function makeG4Mul() {
  const a = rand(12, 24);
  const b = rand(11, 16);
  const ans = a * b;
  return q(`${a} × ${b} ＝ □`, ans, [(a - 1) * b, a * (b - 1), a + b, a * 10 + b]);
}

function makeG4Dec() {
  const a = rand(12, 70);
  const b = rand(11, 90 - a);
  if (Math.random() < 0.55) {
    const ans = oneDec(a + b);
    return q(`${oneDec(a)} ＋ ${oneDec(b)} ＝ □`, ans, [oneDec(a + b + 10), oneDec(Math.abs(a - b)), oneDec(a + b - 1), oneDec(a)]);
  }
  const x = Math.max(a, b);
  const y = Math.min(a, b);
  const ans = oneDec(x - y);
  return q(`${oneDec(x)} － ${oneDec(y)} ＝ □`, ans, [oneDec(x + y), oneDec(x - y + 10), oneDec(y), oneDec(x)]);
}

function makeG4FracEq() {
  const n = rand(1, 4);
  const d = n + rand(1, 4);
  const k = rand(2, 4);
  const ans = n * k;
  return q(`${n}/${d} ＝ □／${d * k}`, ans, [n, d * k, n + k, (d - n) * k]);
}

function makeG4Area() {
  const l = rand(5, 14);
  const w = rand(3, 12);
  const ans = l * w;
  return q(`長方形長 ${l} 公分、寬 ${w} 公分，面積是 □ 平方公分`, ans, [2 * (l + w), l + w, l * w + l, (l - 1) * w]);
}

function makeG5DecMul() {
  const a = rand(12, 48);
  const b = rand(2, 9);
  const ans = oneDec(a * b);
  return q(`${oneDec(a)} × ${b} ＝ □`, ans, [oneDec(a + b), oneDec(a * (b - 1)), oneDec(a), String(a * b)]);
}

function makeG5FracAdd() {
  const d = [4, 5, 6, 8, 10][rand(0, 4)];
  const a = rand(1, d - 2);
  const b = rand(1, d - a);
  if (a + b < d && Math.random() < 0.7) {
    const ans = `${a + b}/${d}`;
    return q(`${a}/${d} ＋ ${b}/${d} ＝ □`, ans, [`${a + b}/${d * 2}`, `${Math.abs(a - b)}/${d}`, `${a}/${b}`, `${d}/${a + b}`]);
  }
  const x = Math.max(a, b);
  const y = Math.min(a, b);
  const ans = `${x - y}/${d}`;
  return q(`${x}/${d} － ${y}/${d} ＝ □`, ans, [`${x + y}/${d}`, `${x - y}/${d * 2}`, `${x}/${y}`, `${d}/${x - y}`]);
}

function makeG5Percent() {
  const rows = [
    [50, 10, 5],
    [50, 20, 10],
    [80, 25, 20],
    [100, 20, 20],
    [200, 10, 20],
    [40, 25, 10],
    [80, 50, 40],
    [200, 25, 50],
    [25, 20, 5],
  ];
  const [whole, p, ans] = rows[rand(0, rows.length - 1)];
  return q(`${whole} 的 ${p}% 是 □`, ans, [whole - p, (whole * p) / 10, p, whole / 2]);
}

function makeG5Volume() {
  const l = rand(2, 8);
  const w = rand(2, 6);
  const h = rand(2, 6);
  const ans = l * w * h;
  return q(`長方體長 ${l}、寬 ${w}、高 ${h}，體積是 □ 立方公分`, ans, [l * w, 2 * (l * w + w * h + h * l), l + w + h, l * w * (h + 1)]);
}

function makeG6FracMul() {
  const n = rand(1, 4);
  const d = n + rand(1, 3);
  const m = rand(1, 3);
  const k = d * m;
  const ans = n * m;
  return q(`${n}/${d} × ${k} ＝ □`, ans, [n * k, k, d, n + k]);
}

function makeG6Ratio() {
  const a = rand(2, 5);
  const b = rand(a + 1, 9);
  const k = rand(2, 5);
  const ans = b * k;
  return q(`比 ${a}：${b}，前項是 ${a * k}，後項是 □`, ans, [a * k, b, (b - a) * k, a * b]);
}

function makeG6Discount() {
  const price = [100, 200, 250, 400, 500][rand(0, 4)];
  const fold = [6, 7, 8, 9][rand(0, 3)];
  const ans = (price * fold) / 10;
  return q(`原價 ${price} 元，打 ${fold} 折後是 □ 元`, ans, [price - fold * 10, (price * fold) / 100, price * fold, price - fold]);
}

function makeG6Speed() {
  const h = rand(2, 5);
  const speed = [30, 40, 50, 60, 80][rand(0, 4)];
  const dist = speed * h;
  if (Math.random() < 0.5) {
    return q(`走 ${dist} 公里花 ${h} 小時，平均速率是 □ 公里／小時`, speed, [dist / (h + 1), dist, h, speed + h]);
  }
  return q(`速率 ${speed} 公里／小時，走 ${h} 小時共 □ 公里`, dist, [speed + h, speed * (h - 1), h * 10, dist / h]);
}

function makeG6Circle() {
  const r = rand(2, 9);
  if (Math.random() < 0.5) {
    const ans = 2 * 3 * r;
    return q(`圓的半徑 ${r} 公分，圓周長約 □ 公分（π 用 3）`, ans, [3 * r, 3 * r * r, 2 * r, 6 * r + 3]);
  }
  const ans = 3 * r * r;
  return q(`圓的半徑 ${r} 公分，圓面積約 □ 平方公分（π 用 3）`, ans, [2 * 3 * r, 3 * r, r * r, 6 * r]);
}

const PACKS = {
  g2add100: { title: "100 以內加減", make: makeG2Add100 },
  g2add1000: { title: "1000 以內加減", make: makeG2Add1000 },
  g2measure: { title: "時間與長度", make: makeG2Measure },
  g3mul: { title: "二位數 × 一位數", make: makeG3Mul },
  g3div: { title: "除法（含餘數）", make: makeG3Div },
  g3frac: { title: "分數入門", make: makeG3Frac },
  g3perim: { title: "長方形周長", make: makeG3Perim },
  g4mul: { title: "二位數 × 二位數", make: makeG4Mul },
  g4dec: { title: "小數加減", make: makeG4Dec },
  g4frac: { title: "等值分數", make: makeG4FracEq },
  g4area: { title: "長方形面積", make: makeG4Area },
  g5decmul: { title: "小數 × 整數", make: makeG5DecMul },
  g5frac: { title: "同分母分數加減", make: makeG5FracAdd },
  g5percent: { title: "百分率", make: makeG5Percent },
  g5volume: { title: "長方體體積", make: makeG5Volume },
  g6fracmul: { title: "分數 × 整數", make: makeG6FracMul },
  g6ratio: { title: "比與比值", make: makeG6Ratio },
  g6discount: { title: "折扣百分率", make: makeG6Discount },
  g6speed: { title: "速率", make: makeG6Speed },
  g6circle: { title: "圓周長與面積", make: makeG6Circle },
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
