/**
 * 成語短題：看意思選成語、看成語選意思、近義、反義。每回 8 題。
 */
import { IDIOM_ALL } from "./idiom-bank.js?v=idiom-bank-v2";

const $ = (sel) => document.querySelector(sel);
const QUIZ_SIZE = 8;

/** 意思接近的成語。執行時只留下題庫裡有的。 */
const NEAR = [
  ["一石二鳥", "一箭雙鵰", "一舉兩得"],
  ["井底之蛙", "坐井觀天"],
  ["畫蛇添足", "弄巧成拙"],
  ["專心致志", "全神貫注", "聚精會神"],
  ["水滴石穿", "鐵杵成針", "繩鋸木斷"],
  ["聚沙成塔", "積少成多", "集腋成裘"],
  ["改過自新", "洗心革面", "痛改前非", "迷途知返"],
  ["光陰似箭", "日月如梭", "時光飛逝"],
  ["一諾千金", "言而有信"],
  ["口是心非", "言不由衷", "陽奉陰違"],
  ["望梅止渴", "畫餅充飢"],
  ["東施效顰", "邯鄲學步"],
  ["狐假虎威", "仗勢欺人"],
  ["舉一反三", "觸類旁通"],
  ["川流不息", "絡繹不絕"],
  ["五光十色", "五彩繽紛", "萬紫千紅"],
  ["山清水秀", "青山綠水"],
  ["名列前茅", "出類拔萃", "首屈一指"],
  ["才高八斗", "學富五車"],
  ["花言巧語", "甜言蜜語"],
  ["未雨綢繆", "有備無患", "防患未然"],
  ["道聽途說", "以訛傳訛", "人云亦云"],
  ["自食其果", "玩火自焚", "咎由自取"],
  ["粗心大意", "粗枝大葉"],
  ["勇往直前", "一往無前"],
  ["破釜沉舟", "背水一戰"],
  ["螳臂當車", "蚍蜉撼樹"],
  ["手忙腳亂", "七手八腳"],
  ["目瞪口呆", "張口結舌", "呆若木雞"],
  ["胸有成竹", "十拿九穩"],
  ["一清二楚", "一目了然"],
  ["大驚小怪", "小題大作"],
  ["筋疲力盡", "精疲力竭"],
  ["車水馬龍", "門庭若市"],
];

/** 意思相反。同一條若出現在多組，出題時錯項會避開它的全部反義。 */
const ANTI = [
  ["雪中送炭", "落井下石"],
  ["雪中送炭", "雪上加霜"],
  ["錦上添花", "雪上加霜"],
  ["門庭若市", "門可羅雀"],
  ["車水馬龍", "門可羅雀"],
  ["半途而廢", "持之以恆"],
  ["半途而廢", "堅持不懈"],
  ["口是心非", "表裡如一"],
  ["陽奉陰違", "表裡如一"],
  ["事半功倍", "事倍功半"],
  ["一心一意", "三心二意"],
  ["專心致志", "三心二意"],
  ["坐井觀天", "見多識廣"],
  ["井底之蛙", "見多識廣"],
  ["一意孤行", "集思廣益"],
  ["一曝十寒", "持之以恆"],
  ["百折不撓", "半途而廢"],
  ["不屈不撓", "半途而廢"],
  ["畫蛇添足", "恰到好處"],
  ["亡羊補牢", "執迷不悟"],
  ["痛改前非", "執迷不悟"],
  ["迷途知返", "執迷不悟"],
  ["鐵杵成針", "半途而廢"],
  ["水滴石穿", "半途而廢"],
  ["繩鋸木斷", "半途而廢"],
  ["鶴立雞群", "濫竽充數"],
  ["觸類旁通", "一竅不通"],
];

const MODE_TITLE = {
  meaning: "看意思選成語",
  idiom: "看成語選意思",
  near: "近義配對",
  anti: "反義配對",
};

/** @type {{ showView: (name: string) => void } | null} */
let deps = null;
/** @type {{ mode: string, questions: object[], index: number, correct: number, wrongs: object[] } | null} */
let session = null;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function byIdiom() {
  return new Map(IDIOM_ALL.map((item) => [item.idiom, item]));
}

function readyGroups(groups) {
  const known = byIdiom();
  return groups
    .map((group) => group.filter((word) => known.has(word)))
    .filter((group) => group.length >= 2);
}

function pickChoices(answer, pool, take) {
  const rest = shuffle(pool.filter((item) => item !== answer));
  return shuffle([answer, ...rest.slice(0, take)]);
}

function buildMeaningQuiz() {
  const items = shuffle(IDIOM_ALL.filter((item) => item.meaning));
  return items.slice(0, QUIZ_SIZE).map((item) => ({
    prompt: item.meaning,
    sub: "哪一條成語是這個意思？",
    answer: item.idiom,
    choices: pickChoices(item.idiom, items.map((x) => x.idiom), 3),
  }));
}

function buildIdiomQuiz() {
  const items = shuffle(IDIOM_ALL.filter((item) => item.meaning));
  const meanings = new Map();
  for (const item of items) {
    if (!meanings.has(item.meaning)) meanings.set(item.meaning, item);
  }
  const unique = [...meanings.values()];
  return unique.slice(0, QUIZ_SIZE).map((item) => ({
    prompt: item.idiom,
    sub: "這條成語是什麼意思？",
    answer: item.meaning,
    choices: pickChoices(item.meaning, unique.map((x) => x.meaning), 3),
  }));
}

function buildPairQuiz(groups, promptFor) {
  const known = byIdiom();
  const ready = shuffle(readyGroups(groups));
  const allWords = IDIOM_ALL.map((item) => item.idiom);
  const out = [];
  const seen = new Set();
  let i = 0;
  while (out.length < QUIZ_SIZE && ready.length && i < ready.length * 6) {
    const group = ready[i % ready.length];
    i += 1;
    const anchor = group[Math.floor(Math.random() * group.length)];
    const banned = new Set([anchor]);
    for (const g of ready) {
      if (g.includes(anchor)) for (const word of g) banned.add(word);
    }
    const answers = [...banned].filter((word) => word !== anchor);
    const answer = answers[Math.floor(Math.random() * answers.length)];
    const key = `${anchor}|${answer}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const distractors = shuffle(allWords.filter((word) => !banned.has(word))).slice(0, 3);
    if (distractors.length < 3) continue;
    const item = known.get(anchor);
    out.push({
      prompt: promptFor(anchor),
      sub: item ? `${anchor}：${item.meaning}` : "",
      answer,
      choices: shuffle([answer, ...distractors]),
    });
  }
  return out;
}

function buildQuiz(mode) {
  if (mode === "idiom") return buildIdiomQuiz();
  if (mode === "near") return buildPairQuiz(NEAR, (word) => `哪一條跟「${word}」最接近？`);
  if (mode === "anti") return buildPairQuiz(ANTI, (word) => `哪一條跟「${word}」意思相反？`);
  return buildMeaningQuiz();
}

function showSetup() {
  session = null;
  const title = $("#idiom-quiz-title");
  if (title) title.textContent = "成語練習";
  const progress = $("#idiom-quiz-progress");
  if (progress) progress.textContent = "";
  $("#idiom-quiz-setup")?.removeAttribute("hidden");
  const play = $("#idiom-quiz-play");
  if (play) play.hidden = true;
  deps.showView("idiomQuiz");
}

function renderQuestion() {
  const qn = session.questions[session.index];
  $("#idiom-quiz-progress").textContent = `第 ${session.index + 1} / ${session.questions.length} 題`;
  $("#idiom-quiz-prompt").textContent = qn.prompt;
  const sub = $("#idiom-quiz-sub");
  if (sub) sub.textContent = qn.sub || "";
  const pad = $("#idiom-quiz-choices");
  pad.innerHTML = "";
  for (const choice of qn.choices) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-secondary btn-block";
    btn.textContent = choice;
    btn.addEventListener("click", () => submitChoice(choice));
    pad.appendChild(btn);
  }
}

function submitChoice(picked) {
  const qn = session.questions[session.index];
  if (picked === qn.answer) session.correct += 1;
  else session.wrongs.push({ prompt: qn.prompt, answer: qn.answer, picked });
  session.index += 1;
  if (session.index >= session.questions.length) showResult();
  else renderQuestion();
}

function showResult() {
  const total = session.questions.length;
  $("#idiom-quiz-result-title").textContent = session.correct === total ? "全部答對！" : "練完了";
  $("#idiom-quiz-result-score").textContent = `${session.correct} / ${total}`;
  $("#idiom-quiz-result-sub").textContent = MODE_TITLE[session.mode] || "";
  const list = $("#idiom-quiz-wrong-list");
  if (session.wrongs.length) {
    list.hidden = false;
    list.innerHTML = session.wrongs
      .map((w) => `<li>${w.prompt}<br>答案：${w.answer}</li>`)
      .join("");
  } else {
    list.hidden = true;
    list.innerHTML = "";
  }
  deps.showView("idiomQuizResult");
}

function startMode(mode) {
  const questions = buildQuiz(mode);
  if (questions.length < 4) return;
  session = { mode, questions, index: 0, correct: 0, wrongs: [] };
  $("#idiom-quiz-setup")?.setAttribute("hidden", "");
  const play = $("#idiom-quiz-play");
  if (play) play.hidden = false;
  $("#idiom-quiz-title").textContent = MODE_TITLE[mode] || "成語練習";
  deps.showView("idiomQuiz");
  renderQuestion();
}

export function initIdiomQuiz(d) {
  deps = d;
  $("#btn-zh-hub-idiom-quiz")?.addEventListener("click", () => showSetup());
  document.querySelectorAll("[data-idiom-quiz]").forEach((btn) => {
    btn.addEventListener("click", () => startMode(btn.getAttribute("data-idiom-quiz") || "meaning"));
  });
  $("#btn-idiom-quiz-back")?.addEventListener("click", () => {
    if (session && session.index < session.questions.length) {
      if (!confirm("離開練習？進度不會儲存。")) return;
    }
    session = null;
    deps.showView("zhHub");
  });
  $("#btn-idiom-quiz-retry")?.addEventListener("click", () => {
    if (session?.mode) startMode(session.mode);
  });
  $("#btn-idiom-quiz-hub")?.addEventListener("click", () => {
    session = null;
    deps.showView("zhHub");
  });
}
