/**
 * 國語中心頁：聽寫設定切換、看字選注音、詞語練習、生字卡。
 */
import { pickRandomQuestions } from "./sheets.js";
import { refreshDuoBattleUI } from "./duo-pick.js";
import { countMistakes } from "./mistake-book.js";
import { getSelectedChild } from "./store.js";
import {
  bindLookupClicks,
  hideLookupCard,
  initZhLookup,
  loadLookupCards,
  weekLookupCards,
  clearLookupCards,
  showLookupCard,
} from "./zh-lookup.js";

const $ = (sel) => document.querySelector(sel);

/** @type {{
 *  showView: (name: string) => void,
 *  getZhBank: () => object[],
 *  getLessonFilter: () => string,
 *  getQuizCountSetting: () => number,
 *  openLessonSetup: (kind: string) => void,
 *  startWrite: () => void,
 *  startListen: () => void,
 *  startMistake: () => void,
 *  showOk?: (title: string, sub?: string, onClose?: () => void) => void,
 * } | null} */
let deps = null;
let setupKind = "write";
let choice = null;
let choiceLocked = false;

const SETUP_COPY = {
  write: {
    title: "手寫測驗",
    start: "開始測驗",
    hint: "看注音，寫出國字。搶答在這一頁。",
  },
  listen: {
    title: "本週聽寫",
    start: "開始聽寫",
    hint: "聽語音，寫出國字。不會先看到注音。",
  },
  pick: {
    title: "看字選注音",
    start: "開始選注音",
    hint: "看到國字，選正確的注音。",
  },
  phrase: {
    title: "詞語練習",
    start: "開始詞語",
    hint: "兩個字以上的詞：有例句就選詞，沒有就選注音。",
  },
  flip: {
    title: "國字翻牌",
    start: "開始翻牌",
    hint: "用上方課次抽字，國字配注音。",
  },
};

export function getZhSetupKind() {
  return setupKind;
}

export function openZhHub() {
  refreshDuoBattleUI();
  hideLookupCard();
  syncHubMeta();
  deps.showView("zhHub");
}

export function applyZhSetupKind(kind) {
  setupKind = SETUP_COPY[kind] ? kind : "write";
  const copy = SETUP_COPY[setupKind];
  const subject = $("#setup-zh-subject");
  if (subject) subject.textContent = copy.title;
  const hint = $("#setup-zh-mode-hint");
  if (hint) hint.textContent = copy.hint;
  const start = $("#btn-setup-zh-start");
  if (start) start.textContent = copy.start;
  const drill = $("#setup-zh-drill");
  const race = $("#btn-setup-zh-race");
  const flip = $("#setup-zh-flip");
  if (drill) drill.hidden = setupKind === "flip";
  if (start) start.hidden = setupKind === "flip";
  if (race) race.hidden = setupKind !== "write";
  if (flip) flip.hidden = setupKind !== "flip";
}

function syncHubMeta() {
  const week = weekLookupCards().length;
  const all = loadLookupCards().length;
  const cards = $("#btn-zh-hub-cards");
  if (cards) {
    cards.textContent = week ? `本週生字卡（${week}）` : all ? `生字卡（${all}）` : "本週生字卡";
  }
  const zhN = countMistakes(getSelectedChild(), "zh");
  const miss = $("#btn-zh-hub-mistakes");
  if (miss) {
    miss.hidden = zhN === 0;
    miss.textContent = `複習國語錯題（${zhN}）`;
  }
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[j], a[i]] = [a[i], a[j]];
  }
  return a;
}

function unique(list) {
  const seen = new Set();
  const out = [];
  for (const x of list) {
    const k = String(x || "").trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

function clozeSentence(sentence, word) {
  const sent = String(sentence || "").trim();
  const w = String(word || "").trim();
  if (!sent || !w) return "";
  const marker = `【${w}】`;
  if (sent.includes(marker)) return sent.split(marker).join("【　】");
  const i = sent.indexOf(w);
  if (i >= 0) return sent.slice(0, i) + "【　】" + sent.slice(i + w.length);
  return sent;
}

function zhuyinChoices(item, bank) {
  const answer = String(item.zhuyin || "").trim();
  const pool = unique(
    (bank || [])
      .map((x) => String(x.zhuyin || "").trim())
      .filter((z) => z && z !== answer)
  );
  return shuffle([answer, ...shuffle(pool).slice(0, 3)]);
}

function wordChoices(item, bank) {
  const answer = String(item.word || "").trim();
  const len = [...answer].length;
  const pool = unique(
    (bank || [])
      .map((x) => String(x.word || "").trim())
      .filter((w) => w && w !== answer && [...w].length === len)
  );
  const extra = unique(
    (bank || [])
      .map((x) => String(x.word || "").trim())
      .filter((w) => w && w !== answer)
  );
  const distractors = [...shuffle(pool), ...shuffle(extra)].filter(
    (w, i, arr) => arr.indexOf(w) === i
  );
  return shuffle([answer, ...distractors.slice(0, 3)]);
}

function phraseItems(bank) {
  return (bank || []).filter((x) => [...String(x.word || "")].length >= 2);
}

export function startZhChoice(kind) {
  const bank = deps.getZhBank() || [];
  const filter = deps.getLessonFilter();
  const count = deps.getQuizCountSetting();
  const source = kind === "phrase" ? phraseItems(bank) : bank;
  const picked = pickRandomQuestions(source, count, filter);
  if (!picked.length) {
    alert(
      kind === "phrase"
        ? "這個範圍沒有兩個字以上的詞。請換課次，或先用手寫測驗。"
        : "沒有題目！請檢查試算表或課次篩選。"
    );
    return;
  }
  choice = {
    kind,
    questions: picked.map((item) => {
      const cloze = kind === "phrase" && item.sentence;
      return {
        item,
        type: cloze ? "cloze" : "zhuyin",
        choices: cloze ? wordChoices(item, source) : zhuyinChoices(item, bank),
      };
    }),
    index: 0,
    correct: 0,
  };
  choiceLocked = false;
  hideLookupCard();
  const title = $("#view-zh-choice .quiz-subject");
  if (title) title.textContent = kind === "phrase" ? "詞語" : "選注音";
  deps.showView("zhChoice");
  renderChoice();
}

function renderChoice() {
  if (!choice) return;
  const q = choice.questions[choice.index];
  const item = q.item;
  $("#zh-choice-progress").textContent =
    `第 ${choice.index + 1} / ${choice.questions.length} 題`;
  const prompt = $("#zh-choice-prompt");
  const hint = $("#zh-choice-hint");
  const fb = $("#zh-choice-feedback");
  const next = $("#btn-zh-choice-next");
  if (fb) {
    fb.hidden = true;
    fb.textContent = "";
  }
  if (next) next.hidden = true;
  choiceLocked = false;

  if (q.type === "cloze") {
    if (prompt) prompt.textContent = clozeSentence(item.sentence, item.word);
    if (hint) hint.textContent = "選出句子空格裡的詞";
  } else {
    if (prompt) prompt.textContent = item.word;
    if (hint) hint.textContent = "這個字怎麼念？";
  }

  const box = $("#zh-choice-options");
  if (!box) return;
  box.innerHTML = "";
  q.choices.forEach((opt) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-secondary btn-block zh-choice-opt";
    btn.textContent = opt;
    btn.addEventListener("click", () => onChoice(opt, btn));
    box.appendChild(btn);
  });
}

function onChoice(opt, btn) {
  if (!choice || choiceLocked) return;
  const q = choice.questions[choice.index];
  const answer = q.type === "cloze" ? q.item.word : q.item.zhuyin;
  choiceLocked = true;
  const ok = String(opt) === String(answer);
  if (ok) choice.correct += 1;
  document.querySelectorAll(".zh-choice-opt").forEach((el) => {
    el.disabled = true;
    if (el.textContent === answer) el.classList.add("zh-choice-ok");
  });
  if (!ok) btn.classList.add("zh-choice-bad");
  const fb = $("#zh-choice-feedback");
  if (fb) {
    fb.hidden = false;
    fb.textContent = ok
      ? "答對了"
      : `答案是 ${answer}${q.item.zhuyin && q.type === "cloze" ? `（${q.item.zhuyin}）` : ""}`;
  }
  const next = $("#btn-zh-choice-next");
  if (next) {
    next.hidden = false;
    next.textContent =
      choice.index >= choice.questions.length - 1 ? "完成" : "下一題";
  }
}

function nextChoice() {
  if (!choice) return;
  if (choice.index >= choice.questions.length - 1) {
    const total = choice.questions.length;
    const n = choice.correct;
    choice = null;
    const go = () => openZhHub();
    if (deps.showOk) deps.showOk(`完成！${n} / ${total}`, "回國語中心", go);
    else {
      alert(`完成！${n} / ${total}`);
      go();
    }
    return;
  }
  choice.index += 1;
  renderChoice();
}

export function openZhCards() {
  hideLookupCard();
  const list = $("#zh-cards-list");
  const empty = $("#zh-cards-empty");
  const cards = loadLookupCards();
  if (list) list.innerHTML = "";
  if (!cards.length) {
    if (empty) {
      empty.hidden = false;
      empty.textContent = "還沒有生字卡。看範文或例句時，點不懂的字就會留下來。";
    }
    deps.showView("zhCards");
    return;
  }
  if (empty) empty.hidden = true;
  cards.forEach((c) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "zh-card-item";
    btn.innerHTML =
      `<span class="zh-card-word">${c.word}</span>` +
      `<span class="zh-card-zhuyin">${c.zhuyin || ""}</span>` +
      `<span class="zh-card-meaning">${c.meaning || ""}</span>`;
    btn.addEventListener("click", () => showLookupCard(c));
    list.appendChild(btn);
  });
  deps.showView("zhCards");
}

function bindEvents() {
  $("#btn-zh-hub-back")?.addEventListener("click", () => deps.showView("home"));
  $("#btn-zh-hub-write")?.addEventListener("click", () => deps.openLessonSetup("write"));
  $("#btn-zh-hub-listen")?.addEventListener("click", () => deps.openLessonSetup("listen"));
  $("#btn-zh-hub-pick")?.addEventListener("click", () => deps.openLessonSetup("pick"));
  $("#btn-zh-hub-phrase")?.addEventListener("click", () => deps.openLessonSetup("phrase"));
  $("#btn-zh-hub-flip")?.addEventListener("click", () => deps.openLessonSetup("flip"));
  $("#btn-zh-hub-cards")?.addEventListener("click", () => openZhCards());
  $("#btn-zh-hub-mistakes")?.addEventListener("click", () => deps.startMistake());
  $("#btn-zh-choice-back")?.addEventListener("click", () => {
    if (choice && !confirm("離開練習？進度不會儲存。")) return;
    choice = null;
    openZhHub();
  });
  $("#btn-zh-choice-next")?.addEventListener("click", () => nextChoice());
  $("#btn-zh-cards-back")?.addEventListener("click", () => openZhHub());
  $("#btn-zh-cards-clear")?.addEventListener("click", () => {
    if (!loadLookupCards().length) return;
    if (!confirm("清空這個小孩的生字卡？")) return;
    clearLookupCards();
    openZhCards();
  });
  bindLookupClicks($("#zh-choice-prompt"), (btn) => {
    const q = choice?.questions[choice.index];
    return q?.item?.word || btn.parentElement?.textContent || "";
  });
}

export function initZhPractice(d) {
  deps = d;
  initZhLookup();
  bindEvents();
}
