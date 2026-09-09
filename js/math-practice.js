/**
 * 數學中心：二～六年級練習，九九乘法從這裡進去。
 */
const $ = (sel) => document.querySelector(sel);
const QUIZ_SIZE = 12;

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

function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a || 1;
}

function frac(n, d) {
  const g = gcd(n, d);
  n /= g;
  d /= g;
  if (d < 0) {
    n = -n;
    d = -d;
  }
  return d === 1 ? String(n) : `${n}/${d}`;
}

function twoDec(cents) {
  return (cents / 100).toFixed(2);
}

function makeG2Add100() {
  const kind = rand(1, 3);
  if (kind === 1) {
    const o1 = rand(5, 9);
    const o2 = rand(10 - o1, 9);
    let a = rand(2, 5) * 10 + o1;
    let b = rand(1, 3) * 10 + o2;
    while (a + b > 99) b -= 10;
    if (b < 15) b += 10;
    const ans = a + b;
    return q(`${a} ＋ ${b} ＝ □（要進位）`, ans, [a + b - 10, a + (b % 10), ans + 10, Math.abs(a - b)]);
  }
  if (kind === 2) {
    const sum = rand(60, 99);
    const a = rand(18, sum - 15);
    const ans = sum - a;
    return q(`${a} ＋ □ ＝ ${sum}`, ans, [sum - a + 10, a, sum + a, Math.abs(a - 10)]);
  }
  const pay = 100;
  const x = rand(28, 46);
  const y = rand(19, 38);
  const ans = pay - x - y;
  return q(`買 ${x} 元和 ${y} 元，給 100 元，找回 □ 元`, ans, [pay - x, pay - y, x + y, ans + 10]);
}

function makeG2Add1000() {
  const kind = rand(1, 3);
  if (kind === 1) {
    const a = rand(5, 8) * 100 + rand(4, 9) * 10 + rand(5, 9);
    const b = rand(1, 3) * 100 + rand(4, 9) * 10 + rand(5, 9);
    const ans = a + b;
    return q(`${a} ＋ ${b} ＝ □`, ans, [ans - 100, a + (b % 100), ans - 10, ans + 20]);
  }
  if (kind === 2) {
    const a = rand(5, 8) * 100 + rand(0, 2) * 10 + rand(0, 3);
    const b = rand(1, 3) * 100 + rand(4, 8) * 10 + rand(5, 9);
    if (a <= b) return makeG2Add1000();
    const ans = a - b;
    return q(`${a} － ${b} ＝ □（要退位）`, ans, [ans + 100, a - (b % 100), ans + 10, a + b]);
  }
  const start = rand(420, 680);
  const get = rand(150, 280);
  const give = rand(80, 160);
  const ans = start + get - give;
  return q(`原本 ${start} 張，又拿到 ${get} 張，用掉 ${give} 張，還剩 □ 張`, ans, [start + get, start - give, ans + 10, get - give]);
}

function makeG2Measure() {
  const kind = rand(1, 3);
  if (kind === 1) {
    const m = rand(1, 4);
    const cm = rand(25, 85);
    const add = rand(40, 95);
    const total = m * 100 + cm + add;
    const ans = `${Math.floor(total / 100)} 公尺 ${total % 100} 公分`;
    return q(
      `${m} 公尺 ${cm} 公分再加 ${add} 公分是？`,
      ans,
      [`${m} 公尺 ${cm + add} 公分`, `${m + 1} 公尺 ${cm} 公分`, `${total} 公尺`, `${m} 公尺 ${add} 公分`].filter((x) => x !== ans),
    );
  }
  if (kind === 2) {
    const h = rand(7, 10);
    const min = [40, 45, 50, 55][rand(0, 3)];
    const add = [25, 30, 35, 40][rand(0, 3)];
    let nh = h;
    let nm = min + add;
    if (nm >= 60) {
      nh += 1;
      nm -= 60;
    }
    const ans = `${nh} 點 ${nm} 分`;
    return q(
      `${h} 點 ${min} 分再過 ${add} 分是？（要進位）`,
      ans,
      [`${h} 點 ${min + add} 分`, `${h + 1} 點 ${min} 分`, `${nh} 點 ${add} 分`, `${h} 點 ${nm} 分`].filter((x) => x !== ans),
    );
  }
  const m = rand(2, 5);
  const cm = [15, 20, 35, 40, 55][rand(0, 4)];
  const ans = m * 100 + cm;
  return q(`${m} 公尺 ${cm} 公分 ＝ □ 公分`, ans, [m * 10 + cm, m + cm, m * 100, ans - 100]);
}

function makeG3Mul() {
  const a = rand(108, 286);
  const b = rand(4, 9);
  const ans = a * b;
  return q(`${a} × ${b} ＝ □`, ans, [a * (b - 1), (a - 10) * b, a + b * 100, a * b + a]);
}

function makeG3Div() {
  const b = rand(6, 9);
  const quo = rand(24, 58);
  const rem = rand(1, b - 1);
  const a = b * quo + rem;
  if (Math.random() < 0.45) {
    return q(`${a} 顆糖分給 ${b} 人，每人 □ 顆，還剩 ${rem} 顆`, quo, [rem, quo + 1, Math.floor(a / (b - 1)), a - rem]);
  }
  if (Math.random() < 0.5) {
    return q(`${a} ÷ ${b} 的商是 □`, quo, [rem, quo + 1, quo - 1, Math.floor(a / 10)]);
  }
  return q(`${a} ÷ ${b} 的餘數是 □`, rem, [quo, rem + 1, 0, b - rem]);
}

function makeG3Frac() {
  const kind = rand(1, 3);
  if (kind === 1) {
    const den = [6, 8, 10, 12][rand(0, 3)];
    const num = rand(3, den - 2);
    const ans = frac(den - num, den);
    const cells = Array.from({ length: den }, (_, i) => (i < num ? "1" : "0")).join("");
    return q(`塗黑的吃掉了，還剩下全部的幾分之幾？`, ans, [frac(num, den), `${den - num}/${den + 1}`, `${num}/${den}`, "1"], cells);
  }
  if (kind === 2) {
    const a = [1, 2, 3][rand(0, 2)];
    const pairs = [
      [a, 2, 1, 3],
      [2, 5, 1, 2],
      [3, 8, 2, 5],
      [3, 7, 2, 5],
    ];
    const [n1, d1, n2, d2] = pairs[rand(0, 3)];
    const left = n1 * d2;
    const right = n2 * d1;
    const ans = left > right ? `${n1}/${d1}` : left < right ? `${n2}/${d2}` : "一樣大";
    return q(`${n1}/${d1} 和 ${n2}/${d2}，哪個比較大？`, ans, [`${n1}/${d1}`, `${n2}/${d2}`, "一樣大", `${n1 + n2}/${d1}`].filter((x, i, arr) => arr.indexOf(x) === i || x === ans));
  }
  const den = [6, 8, 10][rand(0, 2)];
  const num = rand(2, den - 2);
  return q(`一條平均切 ${den} 段，吃了 ${num} 段，吃了幾分之幾？`, frac(num, den), [frac(den - num, den), `${num}/${den - 1}`, `${den}/${num}`, "1"]);
}

function makeG3Perim() {
  const kind = rand(1, 3);
  if (kind === 1) {
    const l = rand(12, 28);
    const w = rand(6, l - 3);
    const per = 2 * (l + w);
    const ans = (per - 2 * l) / 2;
    return q(`長方形周長 ${per} 公分、長 ${l} 公分，寬是 □ 公分`, ans, [per - l, l - w, per / 2, w + 2]);
  }
  if (kind === 2) {
    const a = rand(8, 14);
    const ans = 4 * a;
    return q(`正方形邊長 ${a} 公分，周長是 □ 公分`, ans, [a * a, 2 * a, 3 * a, a * 4 + a]);
  }
  const l1 = rand(10, 16);
  const w1 = rand(4, 7);
  const l2 = rand(6, 10);
  const w2 = rand(3, 6);
  const ans = 2 * (l1 + w1) + 2 * (l2 + w2);
  return q(`兩個長方形（${l1}×${w1} 和 ${l2}×${w2}）周長加起來是 □ 公分`, ans, [l1 * w1 + l2 * w2, 2 * (l1 + w1), ans / 2, 2 * (l1 + w1 + l2)]);
}

function oneDec(tenths) {
  const n = tenths / 10;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function makeG4Mul() {
  const a = rand(36, 78);
  const b = rand(24, 48);
  const ans = a * b;
  return q(`${a} × ${b} ＝ □`, ans, [a * (b - 2), (a - 2) * b, a * 10 * Math.floor(b / 10), a * b + a]);
}

function makeG4Dec() {
  const kind = rand(1, 3);
  if (kind === 1) {
    const a = rand(847, 1865);
    const b = rand(276, 958);
    const ans = twoDec(a + b);
    return q(`${twoDec(a)} ＋ ${twoDec(b)} ＝ □`, ans, [twoDec(a + b - 100), twoDec(a + (b % 100)), twoDec(Math.abs(a - b)), twoDec(a)]);
  }
  if (kind === 2) {
    const a = rand(1000, 1800);
    const b = rand(256, 899);
    const ans = twoDec(a - b);
    return q(`${twoDec(a)} － ${twoDec(b)} ＝ □`, ans, [twoDec(a + b), twoDec(a - (b % 100)), twoDec(a - b + 100), twoDec(b)]);
  }
  const whole = 10;
  const sub = rand(158, 786);
  const ans = twoDec(whole * 100 - sub);
  return q(`${whole} － ${twoDec(sub)} ＝ □`, ans, [twoDec(sub), twoDec(whole * 100 + sub), twoDec(1000 - sub), "9.00"]);
}

function makeG4FracEq() {
  const kind = rand(1, 3);
  if (kind === 1) {
    const w = rand(2, 5);
    const d = rand(3, 8);
    const n = rand(1, d - 1);
    const ans = frac(w * d + n, d);
    return q(`${w} 又 ${n}/${d} ＝ □（假分數）`, ans, [frac(w * n, d), `${w * d + n}/${d + 1}`, String(w + n), `${w}/${d}`]);
  }
  if (kind === 2) {
    const d = rand(3, 7);
    const w = rand(2, 4);
    const n = rand(1, d - 1);
    const improper = w * d + n;
    const ans = `${w}又${n}/${d}`;
    return q(`${improper}/${d} ＝ □（帶分數）`, ans, [`${w}又${d - n}/${d}`, `${w + 1}又${n}/${d}`, `${improper}/${d}`, String(w)]);
  }
  const n = rand(2, 5);
  const d = n + rand(2, 5);
  const k = rand(3, 6);
  const ans = n * k;
  return q(`${n}/${d} ＝ □／${d * k}`, ans, [n * (k - 1), d * k, n + k, (d - n) * k]);
}

function makeG4Area() {
  const kind = rand(1, 3);
  if (kind === 1) {
    const L = rand(12, 20);
    const W = rand(8, 14);
    const l = rand(3, 6);
    const w = rand(2, 5);
    const ans = L * W - l * w;
    return q(`大長方形 ${L}×${W} 挖掉 ${l}×${w}，剩下面積是 □ 平方公分`, ans, [L * W, L * W + l * w, (L - l) * (W - w), 2 * (L + W)]);
  }
  if (kind === 2) {
    const l = rand(16, 24);
    const w = rand(6, 12);
    const per = 2 * (l + w);
    const ans = l * w;
    return q(`長方形周長 ${per} 公分、長 ${l} 公分，面積是 □ 平方公分`, ans, [per * l, 2 * (l + w), l * (w + 1), per / 2]);
  }
  const a = rand(8, 16);
  const b = rand(6, 12);
  const ans = a * b;
  return q(`長方形長 ${a} 公分、寬 ${b} 公分，面積是 □ 平方公分`, ans, [2 * (a + b), a + b, a * b + a, (a - 1) * b]);
}

function makeG5DecMul() {
  const kind = rand(1, 2);
  if (kind === 1) {
    const a = rand(16, 48);
    const b = rand(15, 39);
    const ans = twoDec(a * b);
    return q(`${oneDec(a)} × ${oneDec(b)} ＝ □`, ans, [oneDec(a + b), twoDec(a * 10 * Math.floor(b / 10)), String((a * b) / 10), oneDec(a * Math.floor(b / 10))]);
  }
  const a = rand(125, 375);
  const b = rand(6, 9);
  const ans = twoDec(a * b);
  return q(`${twoDec(a)} × ${b} ＝ □`, ans, [twoDec(a + b), twoDec(a * (b - 1)), twoDec(a), String(a * b)]);
}

function makeG5FracAdd() {
  const pairs = [
    [1, 2, 1, 3],
    [1, 2, 1, 5],
    [2, 3, 1, 6],
    [3, 4, 1, 6],
    [5, 6, 1, 4],
    [2, 5, 1, 2],
    [3, 8, 1, 4],
    [5, 12, 1, 3],
  ];
  const [n1, d1, n2, d2] = pairs[rand(0, pairs.length - 1)];
  if (Math.random() < 0.55) {
    const ans = frac(n1 * d2 + n2 * d1, d1 * d2);
    return q(`${n1}/${d1} ＋ ${n2}/${d2} ＝ □`, ans, [frac(n1 + n2, d1 + d2), frac(n1 + n2, d1), `${n1 + n2}/${d2}`, frac(n1 * n2, d1 * d2)]);
  }
  const left = n1 * d2;
  const right = n2 * d1;
  if (left <= right) {
    const ans = frac(n2 * d1 - n1 * d2, d1 * d2);
    return q(`${n2}/${d2} － ${n1}/${d1} ＝ □`, ans, [frac(n2 - n1, d2 - d1 || d2), frac(n2 - n1, d2), `${n2}/${d1}`, "0"]);
  }
  const ans = frac(n1 * d2 - n2 * d1, d1 * d2);
  return q(`${n1}/${d1} － ${n2}/${d2} ＝ □`, ans, [frac(n1 - n2, d1), frac(n1 * n2, d1 * d2), `${n1 - n2}/${d2}`, "1"]);
}

function makeG5Percent() {
  const kind = rand(1, 3);
  if (kind === 1) {
    const price = [80, 120, 160, 200, 240][rand(0, 4)];
    const p = [15, 25, 30, 40][rand(0, 3)];
    if ((price * p) % 100 !== 0) return makeG5Percent();
    const ans = price + (price * p) / 100;
    return q(`原價 ${price} 元，漲 ${p}% 後是 □ 元`, ans, [price - (price * p) / 100, (price * p) / 100, price + p, price * p]);
  }
  if (kind === 2) {
    const price = [80, 120, 200, 250][rand(0, 3)];
    const p = [20, 25, 40][rand(0, 2)];
    if ((price * p) % 100 !== 0) return makeG5Percent();
    const ans = price - (price * p) / 100;
    return q(`原價 ${price} 元，便宜 ${p}% 後是 □ 元`, ans, [price + (price * p) / 100, (price * p) / 100, price - p, price]);
  }
  const whole = [80, 120, 160, 200][rand(0, 3)];
  const p = [15, 25, 35][rand(0, 2)];
  if ((whole * p) % 100 !== 0) return makeG5Percent();
  const part = (whole * p) / 100;
  const ans = whole - part;
  return q(`${whole} 人有 ${p}% 請假，到校的有 □ 人`, ans, [part, whole + part, p, whole - p]);
}

function makeG5Volume() {
  const kind = rand(1, 2);
  if (kind === 1) {
    const l = rand(5, 10);
    const w = rand(4, 8);
    const h = rand(3, 7);
    const vol = l * w * h;
    const ans = h;
    return q(`長方體積 ${vol} 立方公分，長 ${l}、寬 ${w}，高是 □ 公分`, ans, [vol / l, l * w, vol - l * w, h + 1]);
  }
  const a = rand(3, 6);
  const b = rand(3, 6);
  const c = rand(2, 5);
  const d = rand(2, 4);
  const e = rand(2, 4);
  const f = rand(2, 4);
  const ans = a * b * c + d * e * f;
  return q(`兩塊長方體 ${a}×${b}×${c} 和 ${d}×${e}×${f}，體積和是 □`, ans, [a * b * c, (a + d) * (b + e) * (c + f), ans - d * e * f, a * b + d * e]);
}

function makeG6FracMul() {
  const kind = rand(1, 3);
  if (kind === 1) {
    const n = rand(2, 5);
    const d = n + rand(1, 3);
    const k = rand(2, 5);
    const ans = frac(n * k, d);
    return q(`${n}/${d} × ${k} ＝ □`, ans, [String(n * k), frac(n, d * k), `${k}/${d}`, String(n + k)]);
  }
  if (kind === 2) {
    const n = rand(2, 5);
    const d = [4, 6, 8, 10][rand(0, 3)];
    const ans = frac(n, d * 2);
    return q(`${n}/${d} ÷ 2 ＝ □`, ans, [frac(n * 2, d), frac(2, d), String(n / 2), frac(n, d)]);
  }
  const k = rand(3, 9);
  const d = [2, 3, 4, 5][rand(0, 3)];
  const ans = k * d;
  return q(`${k} ÷ 1/${d} ＝ □`, ans, [frac(k, d), k + d, d, k - 1]);
}

function makeG6Ratio() {
  const kind = rand(1, 2);
  if (kind === 1) {
    const a = rand(2, 5);
    const b = rand(a + 1, 8);
    const total = (a + b) * rand(3, 6);
    const ans = (total / (a + b)) * a;
    return q(`男生：女生＝${a}：${b}，共 ${total} 人，男生有 □ 人`, ans, [(total / (a + b)) * b, a * b, total - a, total / 2]);
  }
  const a = 2;
  const b = 3;
  const c = 5;
  const k = rand(2, 4);
  const ans = c * k;
  return q(`連比 ${a}：${b}：${c}，第一項是 ${a * k}，第三項是 □`, ans, [b * k, a * b * c, c, a * k + c]);
}

function makeG6Discount() {
  const kind = rand(1, 2);
  if (kind === 1) {
    const price = [200, 400, 500, 800][rand(0, 3)];
    const f1 = [8, 9][rand(0, 1)];
    const f2 = [8, 9][rand(0, 1)];
    const ans = (price * f1 * f2) / 100;
    return q(`原價 ${price} 元，先打 ${f1} 折再打 ${f2} 折，應付 □ 元`, ans, [(price * f1) / 10, (price * (f1 + f2)) / 10, price * f1 * f2, price - f1 * f2 * 10]);
  }
  const price = [200, 400, 500][rand(0, 2)];
  const ans = (price * 105) / 100;
  return q(`標價 ${price} 元，再加 5% 稅，應付 □ 元`, ans, [price + 5, (price * 95) / 100, price * 5, price]);
}

function makeG6Speed() {
  const kind = rand(1, 3);
  if (kind === 1) {
    const speed = [40, 50, 60, 80][rand(0, 3)];
    const dist = speed * rand(3, 6);
    const ans = dist / speed;
    return q(`速率 ${speed} 公里／小時，走 ${dist} 公里要 □ 小時`, ans, [dist - speed, speed / 10, dist / (speed + 10), dist]);
  }
  if (kind === 2) {
    const rows = [
      [40, 2, 60, 2, 50],
      [40, 3, 60, 1, 45],
      [40, 3, 60, 2, 48],
    ];
    const [s1, t1, s2, t2, ans] = rows[rand(0, 2)];
    return q(`先以 ${s1} 走 ${t1} 小時，再以 ${s2} 走 ${t2} 小時，平均速率 □ 公里／小時`, ans, [s1 + s2, (s1 + s2) / 2, s1 * t1 + s2 * t2, s2]);
  }
  const speed = 60;
  const rest = 0.5;
  const t = 2.5;
  const ans = speed * (t - rest);
  return q(`速率 60 公里／小時，共花 2.5 小時，其中休息 0.5 小時，走了 □ 公里`, ans, [60 * 2.5, 60 * 0.5, 60 * 3, 120]);
}

function makeG6Circle() {
  const kind = rand(1, 3);
  if (kind === 1) {
    const d = rand(3, 8) * 2;
    const ans = 3 * d;
    return q(`圓的直徑 ${d} 公分，圓周長約 □ 公分（π 用 3）`, ans, [3 * (d / 2), 3 * (d / 2) * (d / 2), 2 * 3 * d, d * d]);
  }
  if (kind === 2) {
    const R = rand(6, 10);
    const r = rand(2, R - 3);
    const ans = 3 * (R * R - r * r);
    return q(`大圓半徑 ${R}、小圓半徑 ${r}，中間圓環面積約 □（π 用 3）`, ans, [3 * (R * R + r * r), 3 * R * R, 2 * 3 * (R - r), 3 * (R - r) * (R - r)]);
  }
  const r = rand(5, 10);
  const ans = 3 * r * r;
  return q(`圓的半徑 ${r} 公分，圓面積約 □ 平方公分（π 用 3）`, ans, [2 * 3 * r, 3 * (2 * r), r * r, 6 * r]);
}

const PACKS = {
  g2add100: { title: "100 以內進退位", make: makeG2Add100 },
  g2add1000: { title: "1000 以內兩步驟", make: makeG2Add1000 },
  g2measure: { title: "時間與長度應用", make: makeG2Measure },
  g3mul: { title: "三位數 × 一位數", make: makeG3Mul },
  g3div: { title: "除法應用（含餘數）", make: makeG3Div },
  g3frac: { title: "分數比較與剩餘", make: makeG3Frac },
  g3perim: { title: "周長應用", make: makeG3Perim },
  g4mul: { title: "二位數 × 二位數", make: makeG4Mul },
  g4dec: { title: "小數加減（百分位）", make: makeG4Dec },
  g4frac: { title: "帶分數與等值", make: makeG4FracEq },
  g4area: { title: "面積應用", make: makeG4Area },
  g5decmul: { title: "小數乘法", make: makeG5DecMul },
  g5frac: { title: "異分母分數加減", make: makeG5FracAdd },
  g5percent: { title: "百分率增減", make: makeG5Percent },
  g5volume: { title: "體積應用", make: makeG5Volume },
  g6fracmul: { title: "分數乘除", make: makeG6FracMul },
  g6ratio: { title: "比的應用", make: makeG6Ratio },
  g6discount: { title: "連折扣與稅", make: makeG6Discount },
  g6speed: { title: "速率應用", make: makeG6Speed },
  g6circle: { title: "圓與圓環", make: makeG6Circle },
};

function buildQuiz(packId) {
  const pack = PACKS[packId];
  const questions = [];
  const seen = new Set();
  let guard = 0;
  while (questions.length < QUIZ_SIZE && guard++ < 120) {
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
