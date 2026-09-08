/** 每次新抽的特別題（不改原題庫）。非正式測驗。 */

function pick(rnd, arr) {
  return arr[Math.floor(rnd() * arr.length)];
}

function shuffle(list, rnd) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pack(correct, wrongs, rnd) {
  const uniq = [String(correct)];
  for (const w of wrongs) {
    const s = String(w);
    if (!uniq.includes(s) && uniq.length < 4) uniq.push(s);
  }
  let n = 0;
  while (uniq.length < 4) uniq.push(`其他${++n}`);
  const options = shuffle(uniq, rnd);
  return { options, answer: options.indexOf(String(correct)) };
}

function item(cat, grade, id, q, packed, explain, extra = {}) {
  return {
    id,
    cat,
    grade,
    q,
    options: packed.options,
    answer: packed.answer,
    explain,
    special: true,
    ...extra,
  };
}

const ANALOG = [
  ["鳥", "天空", "魚", "水裡", "住的地方"],
  ["筆", "寫", "剪刀", "剪", "工具用途"],
  ["眼睛", "看", "鼻子", "聞", "器官功能"],
  ["手套", "手", "襪子", "腳", "穿在哪"],
  ["老師", "學校", "廚師", "廚房", "工作場所"],
  ["白天", "太陽", "晚上", "月亮", "時段"],
  ["書", "讀", "歌", "唱", "怎麼用"],
  ["雨", "傘", "太陽", "帽子", "用來擋"],
];

const ODD = [
  { same: ["貓", "狗", "兔"], odd: "桌子", why: "前三是動物" },
  { same: ["紅", "藍", "綠"], odd: "圓", why: "前三是顏色" },
  { same: ["跑", "跳", "走"], odd: "椅子", why: "前三是動作" },
  { same: ["蘋果", "香蕉", "葡萄"], odd: "雨鞋", why: "前三是水果" },
  { same: ["星期一", "星期二", "星期三"], odd: "春天", why: "前三是星期" },
  { same: ["鉛筆", "橡皮", "尺"], odd: "下雨", why: "前三是文具" },
  { same: ["火車", "公車", "捷運"], odd: "枕頭", why: "前三是交通工具" },
  { same: ["春", "夏", "秋"], odd: "門", why: "前三是季節" },
];

const COMMON = [
  ["蘋果", "香蕉", "都是水果", ["都是動物", "都是車子", "都是數字"]],
  ["貓", "狗", "都是動物", ["都是水果", "都是衣服", "都是天氣"]],
  ["襯衫", "外套", "都是衣服", ["都是餐具", "都是樂器", "都是方向"]],
  ["筷子", "湯匙", "都用來吃飯", ["都是鞋子", "都是雲", "都是字母"]],
];

const COLORS = ["紅", "黃", "藍", "綠", "紫", "橘"];
const ANIMALS = ["貓", "狗", "鳥", "魚", "熊", "兔", "馬", "羊"];
const SHAPES = ["c", "q", "t"];

function langItems(grade, rnd, n) {
  const out = [];
  let i = 0;
  const add = (q, packed, explain, extra) => {
    out.push(item("lang", grade, `u-lang-${i}`, q, packed, explain, extra));
    i += 1;
  };
  while (out.length < n) {
    const kind = out.length % 5;
    if (kind === 0) {
      const g = pick(rnd, ODD);
      const opts = shuffle([...g.same, g.odd], rnd);
      add(
        "哪一個跟其他三個不同類？",
        { options: opts, answer: opts.indexOf(g.odd) },
        g.why
      );
    } else if (kind === 1) {
      const a = pick(rnd, ANALOG);
      add(
        `${a[0]}：${a[1]}＝${a[2]}：？`,
        pack(a[3], ["樹上", "路上", "雲上", "桌子", "睡覺"].filter((x) => x !== a[3]), rnd),
        a[4]
      );
    } else if (kind === 2) {
      const c = pick(rnd, COMMON);
      add(
        `${c[0]}和${c[1]}，最像哪一句？`,
        pack(c[2], c[3], rnd),
        "找兩個詞的共同點。"
      );
    } else if (kind === 3) {
      const names = shuffle(["小華", "小美", "阿明", "小玉"], rnd);
      add(
        `短文：${names[0]}把書交給${names[1]}，請他明天還。文中的「他」是誰？`,
        pack(names[1], [names[0], "老師", "書"], rnd),
        "請後面那個人還書。"
      );
    } else {
      const pair = pick(rnd, [
        ["先洗手再吃飯", "先吃飯再洗手才對", "吃飯前先洗手。"],
        ["先穿襪子再穿鞋子", "先穿鞋子再穿襪子", "襪子在鞋子裡面。"],
        ["先打開書包再拿書", "先拿書再打開書包才對", "書在書包裡。"],
      ]);
      add(
        "哪一個順序最合理？",
        pack(pair[0], [pair[1], "兩件事同一秒", "先睡覺再起床"], rnd),
        pair[2]
      );
    }
  }
  return out;
}

function figItems(grade, rnd, n) {
  const out = [];
  let i = 0;
  const add = (q, packed, explain, extra) => {
    out.push(item("fig", grade, `u-fig-${i}`, q, packed, explain, extra));
    i += 1;
  };
  while (out.length < n) {
    const kind = out.length % 6;
    const s = pick(rnd, SHAPES);
    const o = SHAPES.filter((x) => x !== s)[0];
    if (kind === 0) {
      const choices = [
        { s, fill: 1 },
        { s, fill: 1 },
        { s, fill: 1 },
        { s, fill: 0 },
      ];
      add(
        "哪一個跟其他三個不一樣？",
        { options: ["", "", "", ""], answer: 3 },
        "三個塗滿，一個空心。",
        { vis: { kind: "pick", choices } }
      );
    } else if (kind === 1) {
      add(
        "點的數量每次多 1。問號該選哪一個？",
        { options: ["", "", "", ""], answer: 0 },
        "1、2、3 之後是 4。",
        {
          vis: {
            kind: "row",
            cells: [{ s: "dot", n: 1 }, { s: "dot", n: 2 }, { s: "dot", n: 3 }, null],
            choices: [
              { s: "dot", n: 4 },
              { s: "dot", n: 2 },
              { s: "dot", n: 5 },
              { s, fill: 1 },
            ],
          },
        }
      );
    } else if (kind === 2) {
      add(
        "兩種圖形輪流出現。問號該選哪一個？",
        { options: ["", "", "", ""], answer: 1 },
        "兩種輪流。",
        {
          vis: {
            kind: "row",
            cells: [{ s, fill: 1 }, { s: o, fill: 1 }, { s, fill: 1 }, null],
            choices: [
              { s, fill: 1 },
              { s: o, fill: 1 },
              { s, fill: 0 },
              { s: "d", fill: 1 },
            ],
          },
        }
      );
    } else if (kind === 3) {
      add(
        "三角形每次順時針轉 90 度。問號該選哪一個？",
        { options: ["", "", "", ""], answer: 0 },
        "再轉一次，尖朝左。",
        {
          vis: {
            kind: "row",
            cells: [
              { s: "t", fill: 1, rot: 0 },
              { s: "t", fill: 1, rot: 90 },
              { s: "t", fill: 1, rot: 180 },
              null,
            ],
            choices: [
              { s: "t", fill: 1, rot: 270 },
              { s: "t", fill: 1, rot: 0 },
              { s: "t", fill: 0, rot: 180 },
              { s: "q", fill: 1 },
            ],
          },
        }
      );
    } else if (kind === 4) {
      add(
        "左上對右上的變化，套到左下，右下該選哪一個？",
        { options: ["", "", "", ""], answer: 0 },
        "實心變空心，形狀不變。",
        {
          vis: {
            kind: "grid2",
            cells: [
              { s, fill: 1 },
              { s, fill: 0 },
              { s: o, fill: 1 },
              null,
            ],
            choices: [
              { s: o, fill: 0 },
              { s: o, fill: 1 },
              { s, fill: 0 },
              { s: "t", fill: 0 },
            ],
          },
        }
      );
    } else {
      add(
        "正方形一次比一次大。問號該選哪一個？",
        { options: ["", "", "", ""], answer: 2 },
        "小、中、大，下一個最大。",
        {
          vis: {
            kind: "row",
            cells: [
              { s: "q", fill: 1, size: "s" },
              { s: "q", fill: 1, size: "m" },
              { s: "q", fill: 1, size: "l" },
              null,
            ],
            choices: [
              { s: "q", fill: 1, size: "s" },
              { s: "q", fill: 1, size: "m" },
              { s: "q", fill: 1, size: "xl" },
              { s: "c", fill: 1, size: "xl" },
            ],
          },
        }
      );
    }
  }
  return out;
}

function mathItems(grade, rnd, n) {
  const out = [];
  let i = 0;
  const add = (q, packed, explain) => {
    out.push(item("math", grade, `u-math-${i}`, q, packed, explain));
    i += 1;
  };
  const hi = grade >= 34 ? 20 : grade >= 23 ? 12 : 9;
  while (out.length < n) {
    const kind = out.length % 5;
    if (kind === 0) {
      const a = 1 + Math.floor(rnd() * 6);
      const d = 1 + Math.floor(rnd() * (grade >= 23 ? 4 : 3));
      const seq = [a, a + d, a + 2 * d, a + 3 * d];
      const ans = a + 4 * d;
      add(
        `找規律：${seq.join("、")}、？`,
        pack(ans, [ans + 1, ans - d, a * 2, ans + d + 1], rnd),
        `每次加 ${d}。`
      );
    } else if (kind === 1) {
      const a = 2 + Math.floor(rnd() * 4);
      const seq = [a, a * 2, a * 4];
      add(
        `找規律：${seq.join("、")}、？`,
        pack(a * 8, [a * 5, a * 6, a + 8], rnd),
        "每次乘 2。"
      );
    } else if (kind === 2) {
      const x = 4 + Math.floor(rnd() * hi);
      const y = 1 + Math.floor(rnd() * Math.min(8, x - 1));
      add(
        `盤子裡有 ${x} 顆草莓，吃掉 ${y} 顆，還剩幾顆？`,
        pack(x - y, [x + y, y, x], rnd),
        `${x}−${y}＝${x - y}。`
      );
    } else if (kind === 3) {
      const p = 2 + Math.floor(rnd() * 6);
      const k = 2 + Math.floor(rnd() * 4);
      add(
        `${p} 個人，每人 ${k} 顆糖，一共幾顆？`,
        pack(p * k, [p + k, p * (k + 1), k], rnd),
        `${p}×${k}＝${p * k}。`
      );
    } else {
      const a = 3 + Math.floor(rnd() * 8);
      const b = 3 + Math.floor(rnd() * 8);
      const left = `${a}+${b}`;
      const val = a + b;
      if (val === 10) {
        add(
          `${left} 跟 10，哪個比較大？`,
          pack("一樣大", [left, "10", "算不出來"], rnd),
          `${val}＝10。`
        );
      } else {
        const bigger = val > 10;
        add(
          `${left} 跟 10，哪個比較大？`,
          pack(bigger ? left : "10", [bigger ? "10" : left, "一樣大", "算不出來"], rnd),
          `${val} ${bigger ? ">" : "<"} 10。`
        );
      }
    }
  }
  return out;
}

function memLen(grade) {
  if (grade >= 56) return 6;
  if (grade >= 34) return 5;
  if (grade >= 23) return 4;
  return 3;
}

function memItems(grade, rnd, n) {
  const out = [];
  let i = 0;
  const add = (q, packed, explain, extra) => {
    out.push(item("mem", grade, `u-mem-${i}`, q, packed, explain, extra));
    i += 1;
  };
  const len = memLen(grade);
  while (out.length < n) {
    const kind = out.length % 4;
    if (kind === 0) {
      const digits = [];
      while (digits.length < len) {
        const d = String(Math.floor(rnd() * 10));
        if (digits[digits.length - 1] !== d) digits.push(d);
      }
      const idx = 1 + Math.floor(rnd() * len);
      const seq = digits.join("、");
      add(
        `記住：${seq}。從左邊數來第 ${idx} 個是？`,
        pack(digits[idx - 1], digits.filter((d) => d !== digits[idx - 1]).concat(["7"]), rnd),
        `左起第 ${idx} 個是 ${digits[idx - 1]}。`,
        { memSeq: seq, memAsk: `從左邊數來第 ${idx} 個是？` }
      );
    } else if (kind === 1) {
      const digits = [];
      while (digits.length < Math.min(len, grade >= 34 ? 5 : 3)) {
        const d = String(1 + Math.floor(rnd() * 9));
        if (digits[digits.length - 1] !== d) digits.push(d);
      }
      const seq = digits.join("、");
      const rev = digits.slice().reverse().join("、");
      const distract = [
        digits.join("、"),
        digits.slice().reverse().slice(0, -1).concat(digits[0]).join("、"),
        digits.slice(1).join("、") + "、0",
      ];
      add(
        `記住：${seq}。從最後一個往回唸，順序是？`,
        pack(rev, distract, rnd),
        "倒過來唸。",
        { memSeq: seq, memAsk: "從最後一個往回唸，順序是？" }
      );
    } else if (kind === 2) {
      const cols = shuffle(COLORS, rnd).slice(0, len);
      const seq = cols.join("、");
      add(
        `記住顏色順序：${seq}。最後一個是？`,
        pack(cols[cols.length - 1], cols.slice(0, -1).concat(["黑"]), rnd),
        `最後是${cols[cols.length - 1]}。`,
        { memSeq: seq, memAsk: "最後一個是？" }
      );
    } else {
      const a = { s: pick(rnd, SHAPES), fill: 1 };
      const b = { s: pick(rnd, SHAPES.filter((s) => s !== a.s)), fill: 1 };
      const c = { s: pick(rnd, ["c", "q", "t", "d"]), fill: 0 };
      const which = pick(rnd, ["左", "中", "右"]);
      const map = { 左: a, 中: b, 右: c };
      add(
        "記住這些圖。剛才最" + (which === "中" ? "中間" : which + "邊") + "是哪一個？",
        { options: ["", "", "", ""], answer: 0 },
        `剛才${which === "中" ? "中間" : which + "邊"}是那張。`,
        {
          visMem: { kind: "row", cells: [a, b, c] },
          memAsk: `剛才最${which === "中" ? "中間" : which + "邊"}是哪一個？`,
          vis: {
            kind: "pick",
            choices: [map[which], { s: "c", fill: 1, n: 2 }, { s: "q", fill: 0 }, { s: "t", fill: 1, rot: 90 }],
          },
        }
      );
    }
  }
  return out;
}

export function makeSpecials(cat, grade, rnd, n) {
  const need = Math.max(4, n);
  if (cat === "lang") return langItems(grade, rnd, need);
  if (cat === "fig") return figItems(grade, rnd, need);
  if (cat === "math") return mathItems(grade, rnd, need);
  if (cat === "mem") return memItems(grade, rnd, need);
  return [];
}
