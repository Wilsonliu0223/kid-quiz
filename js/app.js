import {
  groupLessonsForBooks,
  formatLessonCurrent,
  formatLessonTitle,
} from "./lesson-books.js";
import {
  groupLessonsForEnExams,
  formatEnExamCurrent,
  formatEnExamTitle,
  dedupeEnExamLessons,
} from "./exam-books.js";
import { CONFIG } from "./config.site.js";
import {
  loadZhItems,
  loadEnItems,
  uniqueLessons,
  pickRandomQuestions,
} from "./sheets.js";
import {
  englishAnswersMatch,
  speakEnglish,
  primeSpeech,
} from "./english.js";
import { createHandwritingCanvas } from "./canvas-handwriting.js";
import {
  buildHomophoneChoices,
  classifyZhAnswer,
} from "./homophones.js";
import { recognizeZhHandwriting } from "./zh-recognize.js";
import { ensureHanziStrokeReady } from "./hanzi-stroke.js";
import { ensurePaddleOcr } from "./paddle-ocr.js";
import {
  showStrokeOrderForWord,
  hideStrokeOrderPanel,
} from "./stroke-order.js";
import {
  getSelectedChild,
  setSelectedChild,
  addPending,
  loadPending,
  removePending,
  saveQuizDraft,
  loadQuizDraft,
  clearQuizDraft,
} from "./store.js";
import { fillSentenceContext } from "./sentence.js";
import {
  getChildName,
  getChildNames,
  getChildren,
  nextChildId,
  setChildren,
} from "./children.js";
import {
  logQuizResult,
  loadLocalScores,
  formatScoreLine,
  formatScoreSummary,
  scoresForChild,
} from "./score-log.js";
import { logSiteVisit } from "./visit-log.js?v=visit-v4";
import {
  initFlipZh,
  renderFlipHomePlayers,
} from "./flip-zh.js";
import {
  initFlipMul,
  renderMulFlipHomePlayers,
} from "./flip-mul.js?v=mul-flip-v9";
import {
  initFlipMath,
  renderMathHomePlayers,
} from "./flip-math-deck30.js";
import { initGomoku, renderGomokuHomePlayers } from "./gomoku.js?v=gomoku-v34";
import { initXiangqi, renderXiangqiHomePlayers } from "./xiangqi.js?v=xiangqi-v12";
import { initChess, renderChessHomePlayers } from "./chess.js?v=chess-v2";
import { initAnqi, onAnqiFirstShown, renderAnqiHomePlayers } from "./anqi.js?v=anqi-v19";
import { initOnlineDuo } from "./online-duo.js";
import { initSkyOnline, openSkyDuoMenu } from "./sky-online.js?v=sky-duo-v43";
import "./flip-zh-online.js";
import "./flip-math-online.js";
import "./gomoku-online.js?v=gomoku-v34";
import "./xiangqi-online.js?v=xiangqi-v12";
import "./chess-online.js?v=chess-v2";
import "./anqi-online.js?v=anqi-v19";
import {
  initRaceDuo,
  openZhRaceDuoMode,
  openEnRaceDuoMode,
  openMulRaceDuoMode,
} from "./quiz-race-online.js?v=quiz-race-en-choice-v1";
import { initTimesTable, openMulHome } from "./times-table.js?v=mul-pair-v10";
import {
  addMistake,
  removeMistake,
  clearMistakes,
  countMistakes,
  listMistakes,
  recordMistakesFromQuiz,
  questionsFromMistakeBook,
  formatMistakeLine,
} from "./mistake-book.js";

const $ = (sel) => document.querySelector(sel);

let zhBank = [];
let enBank = [];
let zhLessonFilter = "?¨éƒ¨";
let enLessonFilter = "?¨éƒ¨";
let enMode = "meaning";
let quiz = null;
let handwriting = null;
/** @type {{ recognized: string, imageDataUrl: string | null } | null} */
let pendingReview = null;
let homeHistoryShowAll = false;
/** @type {{ subject: string, child: string, questions: object[], mode?: string } | null} */
let lastWrongRound = null;
const KEY_QUIZ_COUNT = "kid-quiz-count";

function getQuizCountSetting() {
  const raw = localStorage.getItem(KEY_QUIZ_COUNT);
  if (raw === "all") return 0;
  if (raw) {
    const n = parseInt(raw, 10);
    if (n > 0) return n;
  }
  return CONFIG.QUIZ_COUNT_DEFAULT || 10;
}

function setQuizCountSetting(value) {
  localStorage.setItem(KEY_QUIZ_COUNT, String(value));
}

function syncQuizCountChips() {
  const current =
    localStorage.getItem(KEY_QUIZ_COUNT) || String(CONFIG.QUIZ_COUNT_DEFAULT || 10);
  document.querySelectorAll(".quiz-count-chips .chip[data-quiz-count]").forEach((btn) => {
    const val = btn.dataset.quizCount;
    const active = val === "all" ? current === "all" : val === current;
    btn.classList.toggle("chip-active", active);
  });
  updateQuizCountHints();
}

function initQuizCountPicker() {
  document.querySelectorAll(".quiz-count-chips .chip[data-quiz-count]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const val = btn.dataset.quizCount;
      setQuizCountSetting(val === "all" ? "all" : val);
      syncQuizCountChips();
    });
  });

  syncQuizCountChips();
}

function updateQuizCountHints() {
  const setting = getQuizCountSetting();
  const text = !setting
    ? "?Œå…¨?¨ã€ï??®å?ç¯„å??‰å¹¾é¡Œå°±?ƒå¹¾é¡Œï??¨æ?ä¸€è¼ªã€ä??è?"
    : `?€å¤?${setting} é¡Œï?é¡Œåº«è¼ƒå??‚æ??ƒå??¨éƒ¨ï¼ˆä??è?ï¼‰`;
  document.querySelectorAll(".quiz-count-hint").forEach((hint) => {
    hint.textContent = text;
  });
}

const views = {
  home: $("#view-home"),
  setupZh: $("#view-setup-zh"),
  setupEn: $("#view-setup-en"),
  quizZh: $("#view-quiz-zh"),
  quizEn: $("#view-quiz-en"),
  flipFirst: $("#view-flip-first"),
  flipPlay: $("#view-flip-play"),
  flipResult: $("#view-flip-result"),
  mathSetup: $("#view-math-setup"),
  mathFirst: $("#view-math-first"),
  mathPlay: $("#view-math-play"),
  mathResult: $("#view-math-result"),
  mulPick: $("#view-mul-pick"),
  mulLearn: $("#view-mul-learn"),
  mulQuiz: $("#view-mul-quiz"),
  mulResult: $("#view-mul-result"),
  mulFlipFirst: $("#view-mul-flip-first"),
  mulFlipPlay: $("#view-mul-flip-play"),
  mulFlipResult: $("#view-mul-flip-result"),
  duoMode: $("#view-duo-mode"),
  onlineFirebaseSetup: $("#view-online-firebase-setup"),
  onlineRoomEntry: $("#view-online-room-entry"),
  onlineLobby: $("#view-online-lobby"),
  gomokuFirst: $("#view-gomoku-first"),
  gomokuPlay: $("#view-gomoku-play"),
  gomokuResult: $("#view-gomoku-result"),
  gomokuOnlinePlay: $("#view-gomoku-online-play"),
  gomokuOnlineResult: $("#view-gomoku-online-result"),
  xiangqiFirst: $("#view-xiangqi-first"),
  xiangqiPlay: $("#view-xiangqi-play"),
  xiangqiOnlinePlay: $("#view-xiangqi-online-play"),
  xiangqiVariant: $("#view-xiangqi-variant"),
  chessFirst: $("#view-chess-first"),
  chessPlay: $("#view-chess-play"),
  chessOnlinePlay: $("#view-chess-online-play"),
  anqiFirst: $("#view-anqi-first"),
  anqiPlay: $("#view-anqi-play"),
  anqiOnlinePlay: $("#view-anqi-online-play"),
  skyDuoMenu: $("#view-sky-duo-menu"),
  skyOnlinePlay: $("#view-sky-online-play"),
  skyOnlineResult: $("#view-sky-online-result"),
  racePlay: $("#view-race-play"),
  raceResult: $("#view-race-result"),
  result: $("#view-result"),
  parent: $("#view-parent"),
};

function showView(name) {
  if (name !== "quizEn" && enKeyboardLiftCleanup) {
    enKeyboardLiftCleanup();
    enKeyboardLiftCleanup = null;
  }

  Object.entries(views).forEach(([key, el]) => {
    if (!el) return;
    const on = key === name;
    el.classList.toggle("view-active", on);
    el.classList.toggle("view-hidden", !on);
  });
  if (name === "quizZh") {
    requestAnimationFrame(() => handwriting?.resize());
  }
  if (name === "anqiFirst") {
    onAnqiFirstShown();
  }
  if (name === "home") {
    renderHomeScoreHistory();
    renderResumeBanner();
    renderMistakeBookHome();
    renderMathHomePlayers();
    renderGomokuHomePlayers();
    renderXiangqiHomePlayers();
    renderChessHomePlayers();
    renderAnqiHomePlayers();
  }
  if (name === "setupZh") {
    renderFlipHomePlayers();
  }
  if (name === "mulPick") {
    renderMulFlipHomePlayers();
  }
  if (name === "quizEn") setupEnQuizKeyboardLift();
}

function showBootError(msg) {
  const el = $("#boot-error");
  if (!el) return;
  el.hidden = false;
  el.textContent = msg;
}

function setSheetStatus(msg, isError = false) {
  const el = $("#sheet-status");
  el.textContent = msg;
  el.style.color = isError ? "var(--err)" : "var(--muted)";
}

async function refreshBank() {
  setSheetStatus("æ­?œ¨è¼‰å…¥é¡Œåº«??);
  try {
    const [zh, en] = await Promise.all([loadZhItems(), loadEnItems()]);
    zhBank = zh;
    enBank = en;
    const src = CONFIG.SPREADSHEET_ID || CONFIG.SHEETS_JSON_URL ? "è©¦ç?è¡? : "ç¤ºç?é¡Œåº«";
    const enNote =
      enBank.length === 12 && CONFIG.SPREADSHEET_ID
        ? "ï¼ˆè‹¥?‰æ??´å?é¡Œï?è«‹é??°è??¥æ?æª¢æŸ¥è©¦ç?è¡¨ï?"
        : "";
    setSheetStatus(
      `?‹è? ${zhBank.length} é¡?Â· ?±è? ${enBank.length} é¡Œï?${src}ï¼?{enNote}`
    );
    if (CONFIG.HANZI_STROKE_ENABLED !== false) {
      ensureHanziStrokeReady().catch(() => {});
    }
  } catch (e) {
    console.error(e);
    setSheetStatus(`è¼‰å…¥å¤±æ?ï¼?{e.message}`, true);
  }
}

function updateLessonPickedRows(container, name, formatters = { formatTitle: formatLessonTitle }) {
  container.querySelectorAll(".lesson-book").forEach((article) => {
    const pickedRow = article.querySelector(".lesson-book-picked");
    const titleEl = article.querySelector(".lesson-book-picked-title");
    if (!pickedRow || !titleEl) return;
    const bookLessons = [...article.querySelectorAll("[data-lesson]")].map(
      (c) => c.dataset.lesson
    );
    if (name === "?¨éƒ¨" || !bookLessons.includes(name)) {
      pickedRow.hidden = true;
      titleEl.textContent = "";
      return;
    }
    pickedRow.hidden = false;
    titleEl.textContent = formatters.formatTitle(name);
  });
}

function selectLessonFilter(name, container, filterState, formatters) {
  filterState.set(name);
  const current = filterState.get();
  container.querySelectorAll("[data-lesson]").forEach((c) => {
    c.classList.toggle("chip-active", c.dataset.lesson === name);
  });
  container.querySelectorAll(".lesson-book-current").forEach((el) => {
    el.textContent =
      name === "?¨éƒ¨"
        ? formatters.formatCurrent(name)
        : formatters.formatTitle(name);
  });
  updateLessonPickedRows(container, current, formatters);
  container.querySelectorAll(".lesson-book-panel").forEach((p) => {
    p.hidden = true;
  });
  container.querySelectorAll(".lesson-book-head").forEach((h) => {
    h.setAttribute("aria-expanded", "false");
  });
  if (name !== "?¨éƒ¨") {
    container.querySelectorAll(".lesson-book").forEach((article) => {
      const bookLessons = [...article.querySelectorAll("[data-lesson]")].map(
        (c) => c.dataset.lesson
      );
      if (!bookLessons.includes(name)) return;
      const panel = article.querySelector(".lesson-book-panel");
      const head = article.querySelector(".lesson-book-head");
      if (panel) panel.hidden = false;
      if (head) head.setAttribute("aria-expanded", "true");
    });
  }
  updateQuizCountHints();
}

function buildLessonPicker(bank, container, options = {}) {
  if (!container) return;

  const {
    filterState,
    groupFn = groupLessonsForBooks,
    formatters = {
      formatCurrent: formatLessonCurrent,
      formatTitle: formatLessonTitle,
    },
    showAllChip = true,
    emptyMessage = "é¡Œåº«å°šç„¡èª²æ¬¡",
    pickedLabel = "èª²æ¬¡?ç¨±",
    lessonsOverride = null,
  } = options;

  const lessons = lessonsOverride || uniqueLessons(bank || zhBank);
  container.innerHTML = "";

  if (lessons.length <= 1) {
    filterState.set("?¨éƒ¨");
    if (lessons.length === 1) {
      const msg = document.createElement("p");
      msg.className = "setup-empty-hint";
      msg.textContent = emptyMessage;
      container.appendChild(msg);
    }
    return;
  }

  if (!lessons.includes(filterState.get())) {
    filterState.set("?¨éƒ¨");
  }

  const { books, ungrouped } = groupFn(lessons);

  function addChip(parent, name, label) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "chip chip-lesson" + (name === filterState.get() ? " chip-active" : "");
    btn.textContent = label;
    btn.dataset.lesson = name;
    btn.title = name;
    btn.addEventListener("click", () => {
      selectLessonFilter(name, container, filterState, formatters);
    });
    parent.appendChild(btn);
  }

  function buildBookCard(book, { collapsible = true } = {}) {
    const article = document.createElement("article");
    article.className = "lesson-book";
    article.dataset.book = book.id;

    const head = document.createElement("button");
    head.type = "button";
    head.className = "lesson-book-head";
    head.setAttribute("aria-expanded", collapsible ? "false" : "true");
    const current = filterState.get();
    head.innerHTML = `
      <span class="lesson-book-head-main">
        <span class="lesson-book-title">${book.label}</span>
        <span class="lesson-book-hint">${book.hint || ""}</span>
      </span>
      <span class="lesson-book-current">${
        current === "?¨éƒ¨"
          ? "?¨éƒ¨èª²æ¬¡"
          : formatters.formatTitle(current)
      }</span>
      <span class="lesson-book-chevron" aria-hidden="true"></span>
    `;

    const panel = document.createElement("div");
    panel.className = "lesson-book-panel";
    if (collapsible) panel.hidden = true;

    const chips = document.createElement("div");
    chips.className = "lesson-chips lesson-chips-compact";
    if (showAllChip) addChip(chips, "?¨éƒ¨", "?¨éƒ¨");
    book.lessons.forEach((name) => {
      addChip(chips, name, book.chipLabel ? book.chipLabel(name) : name);
    });
    panel.appendChild(chips);

    const picked = document.createElement("p");
    picked.className = "lesson-book-picked";
    picked.hidden = true;
    picked.innerHTML = `
      <span class="lesson-book-picked-label">${pickedLabel}</span>
      <span class="lesson-book-picked-title"></span>
    `;
    panel.appendChild(picked);

    if (collapsible) {
      head.addEventListener("click", () => {
        const open = panel.hidden;
        container.querySelectorAll(".lesson-book-panel").forEach((p) => {
          p.hidden = true;
        });
        container.querySelectorAll(".lesson-book-head").forEach((h) => {
          h.setAttribute("aria-expanded", "false");
        });
        if (open) {
          panel.hidden = false;
          head.setAttribute("aria-expanded", "true");
        }
      });
    }

    article.appendChild(head);
    article.appendChild(panel);
    container.appendChild(article);
  }

  books.forEach((book) => buildBookCard(book));

  if (ungrouped.length) {
    buildBookCard(
      {
        id: "other",
        label: "?¶ä?ç¯„å?",
        hint: ungrouped.length > 1 ? `${ungrouped.length} ?…` : "",
        lessons: ungrouped,
        chipLabel: null,
      },
      { collapsible: true }
    );
  }

  if (!books.length && !ungrouped.length) {
    const chips = document.createElement("div");
    chips.className = "lesson-chips";
    lessons.forEach((name) => addChip(chips, name, name));
    container.appendChild(chips);
  }

  updateLessonPickedRows(container, filterState.get(), formatters);

  const specific = lessons.filter((l) => l !== "?¨éƒ¨");
  if (!showAllChip && specific.length === 1) {
    selectLessonFilter(specific[0], container, filterState, formatters);
  }
}

const zhFilterState = {
  get: () => zhLessonFilter,
  set: (v) => {
    zhLessonFilter = v;
  },
};

const enFilterState = {
  get: () => enLessonFilter,
  set: (v) => {
    enLessonFilter = v;
  },
};

function openZhSetup() {
  zhLessonFilter = "?¨éƒ¨";
  buildLessonPicker(zhBank, $("#setup-zh-lesson-books"), {
    filterState: zhFilterState,
    emptyMessage: "å°šç„¡?‹è?èª²æ¬¡ï¼Œè?æª¢æŸ¥è©¦ç?è¡?,
  });
  syncQuizCountChips();
  renderFlipHomePlayers();
  showView("setupZh");
}

function openEnSetup() {
  enLessonFilter = "?¨éƒ¨";
  buildLessonPicker(enBank, $("#setup-en-exam-books"), {
    filterState: enFilterState,
    lessonsOverride: dedupeEnExamLessons(uniqueLessons(enBank)),
    groupFn: groupLessonsForEnExams,
    formatters: {
      formatCurrent: formatEnExamCurrent,
      formatTitle: formatEnExamTitle,
    },
    showAllChip: false,
    pickedLabel: "?ƒè©¦?ç¨±",
    emptyMessage: "å°šç„¡?±è??ƒè©¦ç¯„å?ï¼Œè??¨è©¦ç®—è¡¨?Œèª²æ¬¡ã€æ??°å?ï¼ˆä?ï¼šTJ3 Unit21?ƒè©¦ï¼?,
  });
  syncQuizCountChips();
  showView("setupEn");
}

function validateZhLessonFilter() {
  if (!zhBank.length) {
    alert("é¡Œåº«å°šæœªè¼‰å…¥ï¼Œè?ç¨å€™æ?æª¢æŸ¥ç¶²è·¯å¾Œå?è©¦ã€?);
    return false;
  }
  return true;
}

function validateEnLessonFilter() {
  const lessons = dedupeEnExamLessons(uniqueLessons(enBank)).filter((l) => l !== "?¨éƒ¨");
  if (!lessons.length) {
    alert("?±è?é¡Œåº«?¯ç©º?„ï?è«‹æª¢?¥è©¦ç®—è¡¨??);
    return false;
  }
  if (lessons.length === 1) {
    enLessonFilter = lessons[0];
    return true;
  }
  if (enLessonFilter === "?¨éƒ¨") {
    alert("è«‹é¸?‡è€ƒè©¦ç¯„å?ï¼ˆä?å¦?TJ3 Unit21?ƒè©¦ ??TJ4 ?Ÿæœ«?ƒï?");
    return false;
  }
  return true;
}

function getActiveLessonFilter(subject) {
  return subject === "en" ? enLessonFilter : zhLessonFilter;
}

function renderChildChips() {
  const container = $("#child-btns");
  if (!container) return;

  const children = getChildren();
  let selected = getSelectedChild();
  if (!children.some((c) => c.id === selected)) {
    selected = children[0]?.id || "A";
    setSelectedChild(selected);
  }

  container.innerHTML = "";
  children.forEach((child) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    if (child.id === selected) btn.classList.add("chip-active");
    btn.dataset.child = child.id;
    btn.textContent = child.name;
    container.appendChild(btn);
  });

  renderFlipHomePlayers();
  renderMathHomePlayers();
  renderGomokuHomePlayers();
}

function initChildPicker() {
  renderChildChips();
  const container = $("#child-btns");
  container?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-child]");
    if (!btn) return;
    setSelectedChild(btn.dataset.child);
    renderChildChips();
    renderHomeScoreHistory();
    renderMistakeBookHome();
  });
}

function renderParentNameList() {
  const list = $("#parent-name-list");
  if (!list) return;

  const children = getChildren();
  list.innerHTML = "";

  children.forEach((child, index) => {
    const row = document.createElement("div");
    row.className = "parent-name-row";

    const order = document.createElement("div");
    order.className = "parent-name-order";

    const upBtn = document.createElement("button");
    upBtn.type = "button";
    upBtn.className = "btn-icon parent-name-move";
    upBtn.textContent = "??;
    upBtn.dataset.move = "up";
    upBtn.dataset.index = String(index);
    upBtn.disabled = index === 0;

    const downBtn = document.createElement("button");
    downBtn.type = "button";
    downBtn.className = "btn-icon parent-name-move";
    downBtn.textContent = "??;
    downBtn.dataset.move = "down";
    downBtn.dataset.index = String(index);
    downBtn.disabled = index === children.length - 1;

    order.append(upBtn, downBtn);

    const input = document.createElement("input");
    input.type = "text";
    input.className = "parent-name-input";
    input.dataset.childId = child.id;
    input.value = child.name;
    input.maxLength = 8;
    input.autocomplete = "off";

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn-text parent-name-delete";
    delBtn.textContent = "?ªé™¤";
    delBtn.dataset.index = String(index);
    delBtn.disabled = children.length <= 1;

    row.append(order, input, delBtn);
    list.appendChild(row);
  });
}

function moveParentChild(index, direction) {
  const children = [...getChildren()];
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= children.length) return;
  [children[index], children[target]] = [children[target], children[index]];
  setChildren(children);
  renderParentNameList();
}

function deleteParentChild(index) {
  const children = getChildren();
  if (children.length <= 1) return;
  children.splice(index, 1);
  setChildren(children);
  renderParentNameList();
}

function addParentChildRow() {
  const children = getChildren();
  const ids = new Set(children.map((c) => c.id));
  children.push({ id: nextChildId(ids), name: `ä½¿ç”¨??${children.length + 1}` });
  setChildren(children);
  renderParentNameList();
  const inputs = $("#parent-name-list")?.querySelectorAll(".parent-name-input");
  inputs?.[inputs.length - 1]?.focus();
}

function fillParentNameInputs() {
  renderParentNameList();
}

function saveParentNames() {
  const inputs = $("#parent-name-list")?.querySelectorAll(".parent-name-input");
  if (!inputs?.length) return;

  const children = [...inputs].map((input) => ({
    id: input.dataset.childId,
    name: input.value,
  }));
  const saved = setChildren(children);
  renderChildChips();

  const msg = $("#name-save-msg");
  if (msg) {
    msg.hidden = false;
    msg.textContent = `å·²å„²å­?${saved.length} ä½ï?${saved.map((c) => c.name).join("??)}`;
    setTimeout(() => {
      msg.hidden = true;
    }, 2500);
  }
}

function initParentNameList() {
  const list = $("#parent-name-list");
  if (!list) return;

  list.addEventListener("click", (e) => {
    const moveBtn = e.target.closest(".parent-name-move");
    if (moveBtn) {
      moveParentChild(Number(moveBtn.dataset.index), moveBtn.dataset.move);
      return;
    }
    const delBtn = e.target.closest(".parent-name-delete");
    if (delBtn && !delBtn.disabled) {
      deleteParentChild(Number(delBtn.dataset.index));
    }
  });

  $("#btn-add-child-name")?.addEventListener("click", addParentChildRow);
}

function persistQuizDraft() {
  if (!quiz) return false;
  return saveQuizDraft({
    subject: quiz.subject,
    mode: quiz.mode,
    child: quiz.child,
    lessonFilter: getActiveLessonFilter(quiz.subject),
    enMode,
    questions: quiz.questions,
    index: quiz.index,
    autoCorrect: quiz.autoCorrect,
    pending: quiz.pending,
    wrong: quiz.wrong,
    startedAt: quiz.startedAt,
  });
}

function renderResumeBanner() {
  const banner = $("#resume-quiz-banner");
  const text = $("#resume-quiz-text");
  if (!banner) return;

  const draft = loadQuizDraft();
  if (!draft?.questions?.length) {
    banner.hidden = true;
    return;
  }

  const subj = draft.subject === "en" ? "?±è?" : "?‹è?";
  const at = draft.index + 1;
  const total = draft.questions.length;
  text.textContent = `${subj} æ¸¬é??²è?ä¸­ï?ç¬?${at} / ${total} é¡Œï?å·²æš«å­˜ï?`;
  banner.hidden = false;
}

function resumeQuiz() {
  const draft = loadQuizDraft();
  if (!draft?.questions?.length) return;

  if (draft.subject === "en") {
    enLessonFilter = draft.lessonFilter || "?¨éƒ¨";
    enMode = draft.mode || draft.enMode || "meaning";
  } else {
    zhLessonFilter = draft.lessonFilter || "?¨éƒ¨";
  }

  quiz = {
    subject: draft.subject,
    mode: draft.mode,
    child: draft.child || getSelectedChild(),
    questions: draft.questions,
    index: draft.index,
    autoCorrect: draft.autoCorrect,
    pending: draft.pending,
    wrong: draft.wrong || [],
    startedAt: draft.startedAt,
  };

  if (draft.subject === "en") {
    document.querySelectorAll(".en-mode-picker .chip").forEach((btn) => {
      btn.classList.toggle("chip-active", btn.dataset.enMode === (quiz.mode || enMode));
    });
    showView("quizEn");
    renderEnQuestion();
    return;
  }

  showView("quizZh");
  const canvas = $("#hand-canvas");
  const wrap = canvas.parentElement;
  if (!handwriting) {
    handwriting = createHandwritingCanvas(canvas, wrap);
  } else {
    handwriting.resize();
  }
  renderQuestion();
}

function leaveQuizToHome() {
  if (!quiz) {
    showView("home");
    return;
  }
  const at = quiz.index + 1;
  const total = quiz.questions.length;
  const ok = confirm(
    `?¢é?æ¸¬é?ï¼Ÿ\n\n?®å?ç¬?${at} / ${total} é¡Œã€‚\n?²åº¦?ƒæš«å­˜ï??é??å¯é»ã€Œç¹¼çºŒä?æ¬¡æ¸¬é©—ã€ã€‚`
  );
  if (!ok) return;
  hideStrokeOrderPanel();
  persistQuizDraft();
  showView("home");
}

function setupQuizAutoSave() {
  const saveIfInQuiz = () => {
    const active = document.querySelector(".view-active");
    if (
      quiz &&
      active &&
      (active.id === "view-quiz-zh" || active.id === "view-quiz-en")
    ) {
      persistQuizDraft();
    }
  };

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") saveIfInQuiz();
  });
  window.addEventListener("pagehide", saveIfInQuiz);
}

let enKeyboardLiftCleanup = null;

function setupEnQuizKeyboardLift() {
  enKeyboardLiftCleanup?.();
  enKeyboardLiftCleanup = null;

  const footer = $("#quiz-footer-en");
  if (!footer || !window.visualViewport) return;

  const onResize = () => {
    const gap = Math.max(0, window.innerHeight - window.visualViewport.height);
    footer.style.paddingBottom =
      gap > 0 ? `${gap + 8 + parseInt(getComputedStyle(document.documentElement).getPropertyValue("--safe-bottom") || "0", 10)}px` : "";
  };

  window.visualViewport.addEventListener("resize", onResize);
  window.visualViewport.addEventListener("scroll", onResize);
  onResize();

  enKeyboardLiftCleanup = () => {
    window.visualViewport.removeEventListener("resize", onResize);
    window.visualViewport.removeEventListener("scroll", onResize);
    footer.style.paddingBottom = "";
  };
}

function blockIfShouldResumeInstead() {
  const existing = loadQuizDraft();
  if (!existing?.questions?.length) return false;

  const subj = existing.subject === "en" ? "?±è?" : "?‹è?";
  const at = existing.index + 1;
  const total = existing.questions.length;
  const restart = confirm(
    `ä½ æ??ªå??ç?${subj}æ¸¬é?ï¼ˆç¬¬ ${at}/${total} é¡Œï??‚\n\n?‰ã€Œç¢ºå®šã€? ?¾æ??«å??é??°æ¸¬é©—\n?‰ã€Œå?æ¶ˆã€? ?é??é??Œç¹¼çºŒä?æ¬¡æ¸¬é©—ã€`
  );
  if (!restart) {
    showView("home");
    renderResumeBanner();
    return true;
  }
  clearQuizDraft();
  return false;
}

function clearMistakeOnCorrect(q) {
  if (!quiz || !q) return;
  const expected = quiz.subject === "en" ? q.english : q.word;
  removeMistake(quiz.child, quiz.subject, expected);
  renderMistakeBookHome();
}

function renderMistakeBookHome() {
  const section = $("#mistake-book-home");
  if (!section) return;

  const child = getSelectedChild();
  const zhN = countMistakes(child, "zh");
  const enN = countMistakes(child, "en");
  const name = getChildName(child);

  section.hidden = zhN + enN === 0;
  const meta = $("#mistake-book-meta");
  if (meta) {
    meta.textContent =
      zhN + enN === 0 ? "" : `${name}ï¼šå?èª?${zhN} Â· ?±è? ${enN}`;
  }

  const btnZh = $("#btn-review-zh-mistakes");
  const btnEn = $("#btn-review-en-mistakes");
  if (btnZh) {
    btnZh.hidden = zhN === 0;
    btnZh.textContent = `è¤‡ç??‹è??¯é?ï¼?{zhN}ï¼‰`;
  }
  if (btnEn) {
    btnEn.hidden = enN === 0;
    btnEn.textContent = `è¤‡ç??±è??¯é?ï¼?{enN}ï¼‰`;
  }
}

function renderParentMistakeList() {
  const listEl = $("#parent-mistake-list");
  const countEl = $("#parent-mistake-count");
  if (!listEl) return;

  const child = getSelectedChild();
  const all = [
    ...listMistakes(child, "zh").map((m) => ({ ...m, subject: "zh" })),
    ...listMistakes(child, "en").map((m) => ({ ...m, subject: "en" })),
  ].sort((a, b) => new Date(b.lastWrongAt) - new Date(a.lastWrongAt));

  if (countEl) countEl.textContent = String(all.length);
  listEl.innerHTML = "";

  if (!all.length) {
    listEl.innerHTML =
      "<li class=\"parent-note\" style=\"border:none\">?®å?æ²’æ??¯é?ï¼ˆæ?è«‹å??¸å?å°å­© A/Bï¼?/li>";
    return;
  }

  all.forEach((m) => {
    const li = document.createElement("li");
    const label = document.createElement("span");
    const subj = m.subject === "en" ? "?? : "??;
    label.textContent = `${subj} Â· ${formatMistakeLine(m)}`;

    const del = document.createElement("button");
    del.type = "button";
    del.className = "btn-text btn-text-sm";
    del.textContent = "?ªé™¤";
    del.addEventListener("click", () => {
      removeMistake(child, m.subject, m.expected);
      renderParentMistakeList();
      renderMistakeBookHome();
    });

    li.append(label, del);
    listEl.appendChild(li);
  });
}

function questionsFromQuizWrong(quiz) {
  const out = [];
  const seen = new Set();
  for (const w of quiz.wrong) {
    if (w.skipped) continue;
    const q = quiz.questions.find((item) =>
      quiz.subject === "en"
        ? item.english === w.expected
        : item.word === w.expected
    );
    if (!q) continue;
    const key =
      quiz.subject === "en"
        ? String(q.english).toLowerCase()
        : String(q.word);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(q);
  }
  return out;
}

function startZhQuiz(options = {}) {
  if (CONFIG.OCR_ENABLED) {
    ensurePaddleOcr().catch(() => {});
  }
  if (!options.mistakeReview && blockIfShouldResumeInstead()) return;
  if (!options.mistakeReview && !validateZhLessonFilter()) return;
  if (CONFIG.HANZI_STROKE_ENABLED !== false) {
    ensureHanziStrokeReady().catch(() => {});
  }
  clearQuizDraft();
  const countSetting = getQuizCountSetting();
  const child = getSelectedChild();
  const questions = options.mistakeReview
    ? questionsFromMistakeBook(zhBank, child, "zh", countSetting)
    : pickRandomQuestions(zhBank, countSetting, zhLessonFilter);

  if (!questions.length) {
    alert(
      options.mistakeReview
        ? "?¯é??¬è£¡æ²’æ??‹è?é¡Œç›®ï¼ˆæ?é¡Œåº«å·²åˆª?¤è©²å­—ï???
        : "æ²’æ?é¡Œç›®ï¼è?æª¢æŸ¥è©¦ç?è¡¨æ?èª²æ¬¡ç¯©é¸??
    );
    return;
  }

  quiz = {
    subject: "zh",
    child,
    questions,
    index: 0,
    autoCorrect: 0,
    pending: 0,
    wrong: [],
    startedAt: Date.now(),
    fromMistakeBook: Boolean(options.mistakeReview),
  };

  showView("quizZh");
  const canvas = $("#hand-canvas");
  const wrap = canvas.parentElement;
  if (!handwriting) {
    handwriting = createHandwritingCanvas(canvas, wrap);
  } else {
    handwriting.resize();
  }
  renderQuestion();
  persistQuizDraft();
}

function renderQuestion() {
  hideStrokeOrderPanel();
  const q = quiz.questions[quiz.index];
  $("#quiz-progress").textContent = `ç¬?${quiz.index + 1} / ${quiz.questions.length} é¡Œ`;

  const zhuyinEl = $("#zhuyin-display");
  const sentenceEl = $("#sentence-context");
  const hasSentence = fillSentenceContext(sentenceEl, q.sentence, q.word, q.zhuyin);

  const viewZh = $("#view-quiz-zh");
  if (viewZh) viewZh.classList.toggle("has-sentence", hasSentence);

  if (hasSentence) {
    zhuyinEl.classList.add("is-compact");
    zhuyinEl.textContent = q.zhuyin;
    $("#quiz-hint").textContent =
      "?‹ä??¥å¯«?‹å?ï¼›å?å¯«å¤§ä¸€é»ã€å¯«?¨æ ¼å­ä¸­?“ï?è¾¨è?è¼ƒæ?";
  } else {
    zhuyinEl.classList.remove("is-compact");
    zhuyinEl.textContent = q.zhuyin;
    sentenceEl.hidden = true;
    $("#quiz-hint").textContent =
      "è«‹å¯«?ºå?å­—æ?è©ï?å­—å¯«å¤§ä?é»ã€å¯«?¨æ ¼å­ä¸­?“ï?è¾¨è?è¼ƒæ?";
  }

  $("#ocr-status").hidden = true;
  handwriting.clear();
  requestAnimationFrame(() => handwriting?.resize());
}

function setEnMode(mode) {
  enMode = mode;
  if (quiz?.subject === "en") quiz.mode = mode;
  document.querySelectorAll(".en-mode-picker .chip").forEach((btn) => {
    btn.classList.toggle("chip-active", btn.dataset.enMode === mode);
  });
  if (quiz?.subject === "en") {
    renderEnQuestion();
    if (mode === "listen") void playEnglishAudio();
  }
}

async function playEnglishAudio() {
  const q = quiz?.questions[quiz.index];
  if (!q?.english) return;

  const btn = $("#btn-speak-en");
  const hint = $("#en-quiz-hint");
  primeSpeech();

  if (btn) {
    btn.disabled = true;
    btn.textContent = "?­æ”¾ä¸­â€?;
  }

  const ok = await speakEnglish(q.english);

  if (btn) {
    btn.disabled = false;
    btn.textContent = "?? ?­æ”¾?¼éŸ³";
  }
  if (!ok && hint) {
    hint.textContent = "?¡æ??­éŸ³ï¼šè?ç¢ºè??‰ç¶²è·¯ä¸¦èª¿å¤§?³é?ï¼Œæ??¹ã€Œç?ä¸­æ‹¼?±ã€?;
  } else if (hint && quiz?.mode === "listen") {
    hint.textContent = "?½æ?æ¥šå?è¼¸å…¥?±æ?ï¼ˆæ??½åˆ°å°±å??‰ä?æ¬¡ï?";
  }
}

function startEnQuiz(options = {}) {
  if (!options.mistakeReview && blockIfShouldResumeInstead()) return;
  if (!options.mistakeReview && !validateEnLessonFilter()) return;
  clearQuizDraft();
  const countSetting = getQuizCountSetting();
  const child = getSelectedChild();
  const questions = options.mistakeReview
    ? questionsFromMistakeBook(enBank, child, "en", countSetting)
    : pickRandomQuestions(enBank, countSetting, enLessonFilter);

  if (!questions.length) {
    const hint = options.mistakeReview
      ? "?¯é??¬è£¡æ²’æ??±è?é¡Œç›®??
      : enLessonFilter !== "?¨éƒ¨"
        ? `?®å?ç¯„å???{enLessonFilter}?åœ¨?±è?é¡Œåº«æ²’æ?é¡Œç›®ï¼Œè??¹é¸?¶ä??ƒè©¦ç¯„å??‚`
        : "è«‹åœ¨è©¦ç?è¡¨æ–°å¢ã€Œè‹±èªã€å·¥ä½œè¡¨ï¼Œä¸¦ç¢ºè??Œé??‹ã€æ??ºã€Œå–®å­—ã€ã€?;
    alert(`æ²’æ??±è?é¡Œç›®ï¼?{hint}`);
    return;
  }

  quiz = {
    subject: "en",
    mode: enMode,
    child,
    questions,
    index: 0,
    autoCorrect: 0,
    pending: 0,
    wrong: [],
    startedAt: Date.now(),
    fromMistakeBook: Boolean(options.mistakeReview),
  };

  showView("quizEn");
  renderEnQuestion();
  persistQuizDraft();
}

function renderEnQuestion() {
  const q = quiz.questions[quiz.index];
  const mode = quiz.mode || enMode;
  $("#quiz-progress-en").textContent = `ç¬?${quiz.index + 1} / ${quiz.questions.length} é¡Œ`;

  const meaningBlock = $("#en-prompt-meaning");
  const hintEl = $("#en-hint-display");
  const speakBtn = $("#btn-speak-en");

  let listenPrompt = $("#en-listen-prompt");
  if (mode === "listen") {
    meaningBlock.hidden = true;
    speakBtn.hidden = false;
    if (!listenPrompt) {
      listenPrompt = document.createElement("p");
      listenPrompt.id = "en-listen-prompt";
      listenPrompt.className = "en-listen-prompt";
      speakBtn.before(listenPrompt);
    }
    listenPrompt.hidden = false;
    listenPrompt.textContent = "è«‹æ?ä¸‹æ–¹?Œæ’­?¾ç™¼?³ã€?;
    $("#en-quiz-hint").textContent = "?½æ?æ¥šå?è¼¸å…¥?±æ?ï¼ˆæ??½åˆ°å°±å??‰ä?æ¬¡ï?";
  } else {
    if (listenPrompt) listenPrompt.hidden = true;
    meaningBlock.hidden = false;
    speakBtn.hidden = true;
    $("#en-chinese-display").textContent = q.chinese;
    if (q.hint) {
      hintEl.hidden = false;
      hintEl.textContent = `?ç¤ºï¼?{q.hint}`;
    } else {
      hintEl.hidden = true;
    }
    $("#en-quiz-hint").textContent = "?‹ä¸­?‡è??ç¤ºï¼Œè¼¸?¥è‹±?‡å–®å­?;
  }

  const input = $("#en-answer-input");
  input.value = "";
  input.focus();
}

function showFeedback(type, text, actions = [], options = {}) {
  const overlay = $("#feedback-overlay");
  const card = $("#feedback-card");
  overlay.hidden = false;
  overlay.classList.add("is-open");
  overlay.setAttribute("aria-hidden", "false");
  overlay.classList.remove("feedback-ok", "feedback-warn", "feedback-simple");
  card.classList.toggle("feedback-simple", !!options.simple);

  if (type === "ok") overlay.classList.add("feedback-ok");
  if (type === "warn") overlay.classList.add("feedback-warn");

  $("#feedback-text").textContent = text;
  const sub = $("#feedback-sub");
  if (options.sub) {
    sub.hidden = false;
    sub.textContent = options.sub;
  } else {
    sub.hidden = true;
  }

  const parentBlock = $("#feedback-parent");
  const homophoneBlock = $("#feedback-homophone");
  const choicesEl = $("#homophone-choices");

  if (options.homophonePicker && options.choices?.length) {
    homophoneBlock.hidden = false;
    parentBlock.hidden = true;
    $("#feedback-homophone-zhuyin").textContent = options.zhuyin || "";
    choicesEl.innerHTML = "";
    options.choices.forEach((word) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "homophone-choice";
      btn.textContent = word;
      btn.addEventListener("click", () => {
        closeFeedbackOverlay();
        onHomophonePick(word);
      });
      choicesEl.appendChild(btn);
    });
  } else {
    homophoneBlock.hidden = true;
    if (choicesEl) choicesEl.innerHTML = "";
  }

  if (options.parentReview) {
    parentBlock.hidden = false;
  } else if (!options.homophonePicker) {
    parentBlock.hidden = true;
  }

  const actionsEl = $("#feedback-actions");
  actionsEl.innerHTML = "";
  actions.forEach(({ label, primary, onClick }) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = primary ? "btn btn-primary" : "btn btn-secondary";
    btn.textContent = label;
    btn.addEventListener("click", () => {
      closeFeedbackOverlay();
      onClick?.();
    });
    actionsEl.appendChild(btn);
  });

  if (!actions.length) {
    setTimeout(closeFeedbackOverlay, 900);
  }
}

function closeFeedbackOverlay() {
  const overlay = $("#feedback-overlay");
  if (!overlay) return;
  overlay.hidden = true;
  overlay.classList.remove("is-open");
  overlay.setAttribute("aria-hidden", "true");
  const homophoneBlock = $("#feedback-homophone");
  if (homophoneBlock) homophoneBlock.hidden = true;
  const choicesEl = $("#homophone-choices");
  if (choicesEl) choicesEl.innerHTML = "";
  pendingReview = null;
}

function getQuestionExpected(q) {
  if (!q) return "";
  return quiz?.subject === "en" ? q.english : q.word;
}

function undoWrongForQuestion(q) {
  if (!quiz || !q) return;
  const expected = getQuestionExpected(q);
  quiz.wrong = quiz.wrong.filter((w) => w.expected !== expected);
  removeMistake(quiz.child, quiz.subject, expected);
  renderMistakeBookHome();
}

/** å®¶é•·ç¢ºè?ï¼šå­©å­å…¶å¯¦å¯«å°ä?ï¼ˆè¾¨è­˜èª¤?¤ï??¼å??­è­°ï¼?*/
function showParentConfirmWrittenCorrect(q, recognized, imageDataUrl) {
  pendingReview = { recognized, imageDataUrl, writtenCorrectClaim: true };
  const expected = getQuestionExpected(q);
  if (quiz.subject === "en") {
    $("#feedback-ocr-line").textContent = recognized
      ? `å­©å?è¼¸å…¥ï¼šã€?{recognized}?ã€€ï½œã€€æ¨™æ?ï¼?{expected}`
      : `æ¨™æ?ç­”æ?ï¼?{expected}`;
  } else {
    $("#feedback-ocr-line").textContent = recognized
      ? `è¾¨è?çµæ?ï¼šã€?{recognized}?ã€€ï½œã€€æ¨™æ?ï¼?{expected}`
      : `æ¨™æ?ç­”æ?ï¼?{expected}`;
  }

  showFeedback(
    "warn",
    "å®¶é•·ç¢ºè?ï¼šå…¶å¯¦å¯«å°ä?ï¼?,
    [
      {
        label: "?–æ?",
        primary: false,
        onClick: () => {
          pendingReview = null;
          closeFeedbackOverlay();
        },
      },
    ],
    {
      parentReview: true,
      sub: "?‰ã€Œç?å°ã€æ??–æ??¬é??¯é?ç´€?„ã€?,
    }
  );
}

/** è¨˜æœ¬è¼ªéŒ¯é¡Œä¸¦ç«‹åˆ»å¯«å…¥?¯é??¬ï??Œé??ªè?ä¸€æ¬¡ï??‹è?ï¼è‹±èªï? */
function recordWrongAnswer(q, recognized) {
  if (!quiz || !q) return;
  const expected = getQuestionExpected(q);
  const exists = quiz.wrong.some((w) => w.expected === expected);
  if (exists) return;

  if (quiz.subject === "en") {
    quiz.wrong.push({
      chinese: q.chinese,
      expected: q.english,
      recognized: recognized || "??,
      pending: false,
      skipped: false,
      mistakeBookSaved: true,
    });
  } else {
    quiz.wrong.push({
      zhuyin: q.zhuyin,
      expected: q.word,
      recognized: recognized || "??,
      pending: false,
      skipped: false,
      mistakeBookSaved: true,
    });
  }
  addMistake(quiz.child, quiz.subject, q, recognized || "??);
}

function recordZhWrong(q, recognized) {
  recordWrongAnswer(q, recognized);
}

/** ç­”éŒ¯å¾Œï??«å?åº•å±¤?­ç??«å??«ï?ä¸Šå±¤?‹å¯«?ç?ï¼ˆå???stroke-order-animationï¼?*/
function promptStrokeOrderRewrite(q) {
  const wrap = document.getElementById("canvas-wrap");
  if (wrap) wrap.classList.add("stroke-order-active");
  handwriting?.clear();
  requestAnimationFrame(() => {
    handwriting?.resize();
    void showStrokeOrderForWord(q.word);
  });
  const hint = $("#quiz-hint");
  if (hint) hint.textContent = "?¼å?è£¡æ?æ·¡è‰²ç­†ç•«ç¤ºç?ï¼Œç…§?—æ?ä¸€æ¬¡å??‰é€å‡º";
}

function onHomophonePick(picked) {
  if (!quiz || quiz.subject !== "zh") return;

  const q = quiz.questions[quiz.index];
  if (picked === q.word) {
    quiz.autoCorrect += 1;
    undoWrongForQuestion(q);
    showFeedback("ok", "ç­”å?äº†ï?", [], { simple: true });
    setTimeout(goNextQuestion, 900);
    return;
  }

  showFeedback(
    "warn",
    `ä½ é¸äº†ã€?{picked}?`,
    [
      {
        label: "?å¯«ä¸€æ¬?,
        primary: true,
        onClick: () => promptStrokeOrderRewrite(q),
      },
      {
        label: "ä¸‹ä?é¡?,
        primary: false,
        onClick: () => goNextQuestion(),
      },
    ],
    { sub: `æ­?¢ºç­”æ??¯ã€?{q.word}?ï?${q.zhuyin}ï¼‰` }
  );
}

/** ç­”éŒ¯å¾Œæ??Œä?ä¸€é¡Œã€â? ?›é¸ä¸€ï¼Œé¸å°å¯å¾—å? */
function showHomophoneRecovery(q, recognized, imageDataUrl) {
  const choices = buildHomophoneChoices(q.word, q.zhuyin, zhBank, 4);
  if (choices.length < 2 || CONFIG.HOMOPHONE_PICKER === false) {
    goNextQuestion();
    return;
  }

  pendingReview = { recognized, imageDataUrl };

  const note =
    recognized && recognized !== q.word
      ? `ä½ å¯«?„å???{recognized}?Â?`
      : "";
  showFeedback(
    "warn",
    "è«‹é¸?ºæ­£ç¢ºç?å­?,
    [],
    {
      homophonePicker: true,
      choices,
      zhuyin: q.zhuyin,
      sub: `${note}?‹æ³¨?³é???Â· ?¸å??¯ä»¥å¾—å?`,
    }
  );
}

/** ç­”éŒ¯ï¼šå?è¨˜éŒ¯é¡Œæœ¬ï¼Œæ??Œä?ä¸€é¡Œã€æ??›é¸ä¸€ */
function showZhWrongAnswer(q, recognized, imageDataUrl) {
  const rec = recognized && recognized !== "?? ? `ä½ å¯«?„å???{recognized}?` : "è¾¨è?çµæ?ä¸å??™å€‹å?";

  recordZhWrong(q, recognized);

  showFeedback(
    "warn",
    "ç­”éŒ¯äº?,
    [
      {
        label: "?å¯«ä¸€æ¬?,
        primary: true,
        onClick: () => promptStrokeOrderRewrite(q),
      },
      {
        label: "ä¸‹ä?é¡?,
        primary: false,
        onClick: () => showHomophoneRecovery(q, recognized, imageDataUrl),
      },
      {
        label: "?‘å¯«å°ä?ï¼ˆå®¶?·ç¢ºèªï?",
        primary: false,
        onClick: () => showParentConfirmWrittenCorrect(q, recognized, imageDataUrl),
      },
    ],
    {
      sub: `${rec} Â· æ­?¢ºï¼?{q.word}ï¼?{q.zhuyin}ï¼‰Â?å·²è??¥éŒ¯é¡Œæœ¬`,
    }
  );
}

function showParentReviewOverlay(recognized, imageDataUrl = null) {
  const q = quiz.questions[quiz.index];
  pendingReview = { recognized, imageDataUrl };

  const rec = recognized ? `??{recognized}?` : "ï¼ˆç„¡ï¼è¾¨è­˜ä??ºï?";
  if (quiz.subject === "en") {
    $("#feedback-ocr-line").textContent =
      `å­©å?ç­”æ?ï¼?{rec}?€ï½œã€€æ¨™æ?ï¼?{q.english}`;
  } else {
    $("#feedback-ocr-line").textContent =
      `è¾¨è?çµæ?ï¼?{rec}?€ï½œã€€æ¨™æ?ç­”æ?ï¼?{q.word}`;
  }

  const retryLabel = quiz.subject === "en" ? "?ç?ä¸€æ¬? : "?å¯«ä¸€æ¬?;

  showFeedback(
    "warn",
    "?»è…¦?¡æ?ç¢ºè?ï¼Œè?å®¶é•·?¤å?",
    [
      {
        label: retryLabel,
        primary: false,
        onClick: () => {
          pendingReview = null;
          if (quiz.subject === "en") {
            $("#en-answer-input").value = "";
            $("#en-answer-input").focus();
          } else {
            handwriting.clear();
          }
        },
      },
      {
        label: "?ˆè·³?ï?ä¸ç??†ï?",
        primary: true,
        onClick: () => {
          pushWrongSkipped(q, recognized);
          pendingReview = null;
          goNextQuestion();
        },
      },
    ],
    {
      parentReview: true,
      sub: "å­©å?ä¸èƒ½?ªè?çµ¦å?ï¼›è??‰ç?å°æ?ç®—éŒ¯??,
    }
  );
}

function pushWrongSkipped(q, recognized) {
  if (quiz.subject === "en") {
    quiz.wrong.push({
      chinese: q.chinese,
      expected: q.english,
      recognized: recognized || "??,
      pending: false,
      skipped: true,
    });
  } else {
    quiz.wrong.push({
      zhuyin: q.zhuyin,
      expected: q.word,
      recognized: recognized || "??,
      pending: false,
      skipped: true,
    });
  }
}

function resolveParentReview(isCorrect) {
  if (!quiz || !pendingReview) return;

  const q = quiz.questions[quiz.index];
  const { recognized, imageDataUrl } = pendingReview;

  if (isCorrect) {
    if (pendingReview.writtenCorrectClaim) {
      undoWrongForQuestion(q);
    }
    quiz.autoCorrect += 1;
    clearMistakeOnCorrect(q);
    closeFeedbackOverlay();
    const msg = pendingReview.writtenCorrectClaim
      ? "å®¶é•·ç¢ºè?ï¼šå¯«å°ä?ï¼?
      : "å®¶é•·ç¢ºè?ï¼šç?å°ï?";
    showFeedback("ok", msg, [], { simple: true });
    setTimeout(goNextQuestion, 800);
    return;
  }

  if (quiz.subject === "en") {
    if (!quiz.wrong.some((w) => w.expected === q.english)) {
      recordWrongAnswer(q, recognized || "??);
    }
    addPending({
      subject: "en",
      child: quiz.child,
      lesson: q.lesson,
      chinese: q.chinese,
      expected: q.english,
      recognized: recognized || "",
      imageDataUrl: imageDataUrl || "",
      at: new Date().toISOString(),
      questionIndex: quiz.index + 1,
    });
    const row = quiz.wrong.find((w) => w.expected === q.english);
    if (row) row.pending = true;
  } else {
    addPending({
      subject: "zh",
      child: quiz.child,
      lesson: q.lesson,
      zhuyin: q.zhuyin,
      expected: q.word,
      recognized: recognized || "(?¡æ?è¾¨è?)",
      imageDataUrl,
      at: new Date().toISOString(),
      questionIndex: quiz.index + 1,
    });
    quiz.wrong.push({
      zhuyin: q.zhuyin,
      expected: q.word,
      recognized: recognized || "??,
      pending: true,
    });
  }
  quiz.pending += 1;

  closeFeedbackOverlay();
  goNextQuestion();
}

function showEnWrongAnswer(q, recognized) {
  recordWrongAnswer(q, recognized);

  showFeedback(
    "warn",
    "ç­”éŒ¯äº?,
    [
      {
        label: "?ç?ä¸€æ¬?,
        primary: true,
        onClick: () => {
          $("#en-answer-input").value = "";
          $("#en-answer-input").focus();
        },
      },
      {
        label: "ä¸‹ä?é¡?,
        primary: false,
        onClick: () => goNextQuestion(),
      },
      {
        label: "è«‹å®¶?·å¹«å¿?,
        primary: false,
        onClick: () => showParentReviewOverlay(recognized, null),
      },
      {
        label: "?¶å¯¦?¼å?äº†ï?å®¶é•·ç¢ºè?ï¼?,
        primary: false,
        onClick: () => showParentConfirmWrittenCorrect(q, recognized, null),
      },
    ],
    {
      sub: `ä½ è¼¸?¥ï???{recognized}?Â?æ­?¢ºï¼?{q.english}ï¼?{q.chinese}ï¼‰Â?å·²è??¥éŒ¯é¡Œæœ¬`,
    }
  );
}

function submitEnAnswer() {
  if (!quiz || quiz.subject !== "en") return;

  const q = quiz.questions[quiz.index];
  const typed = $("#en-answer-input").value;

  if (!typed.trim()) {
    showFeedback("warn", "è«‹å?è¼¸å…¥?±æ?", [
      { label: "å¥½ç?", primary: true, onClick: () => {} },
    ]);
    return;
  }

  if (englishAnswersMatch(typed, q.english)) {
    quiz.autoCorrect += 1;
    clearMistakeOnCorrect(q);
    showFeedback("ok", "ç­”å?äº†ï?", [], { simple: true });
    setTimeout(goNextQuestion, 900);
    return;
  }

  showEnWrongAnswer(q, typed.trim());
}

async function submitAnswer() {
  if (!quiz || !handwriting) return;

  const q = quiz.questions[quiz.index];
  const submitBtn = $("#btn-submit-answer");
  submitBtn.disabled = true;

  if (handwriting.isBlank()) {
    showFeedback("warn", "è«‹å?å¯«å??é€å‡º", [
      { label: "å¥½ç?", primary: true, onClick: () => {} },
    ]);
    submitBtn.disabled = false;
    return;
  }

  const statusEl = $("#ocr-status");
  statusEl.hidden = false;
  statusEl.textContent = CONFIG.OCR_ENABLED
    ? "è¼‰å…¥ï¼è¾¨è­˜ä¸­?¦ï?é¦–æ¬¡è¼‰å…¥å¼•æ?è¼ƒä?ï¼?
    : "è¾¨è?ä¸­â€?;

  if (CONFIG.OCR_ENABLED) {
    await ensureOcrReady();
    statusEl.textContent = "è¾¨è?ä¸­â€?;
  }

  const canvas = $("#hand-canvas");
  const imageDataUrl = handwriting.toDataURL();
  const strokes = handwriting.getStrokes ? handwriting.getStrokes() : [];

  const result = await recognizeZhHandwriting({
    canvas,
    strokes,
    imageDataUrl,
    expected: q.word,
    onStatus: (msg) => {
      statusEl.textContent = msg;
    },
  });

  statusEl.hidden = true;
  submitBtn.disabled = false;

  if (result.matched) {
    quiz.autoCorrect += 1;
    clearMistakeOnCorrect(q);
    showFeedback("ok", "ç­”å?äº†ï?", [], { simple: true });
    setTimeout(goNextQuestion, 950);
    return;
  }

  const recognized = result.text || "";
  const verdict = classifyZhAnswer(q.word, q.zhuyin, zhBank, {
    recognized,
    strokeMatches: result.strokeMatches,
  });

  if (verdict.type === "correct") {
    quiz.autoCorrect += 1;
    clearMistakeOnCorrect(q);
    showFeedback("ok", "ç­”å?äº†ï?", [], { simple: true });
    setTimeout(goNextQuestion, 950);
    return;
  }

  showZhWrongAnswer(q, verdict.recognized || recognized, imageDataUrl);
}

function goNextQuestion() {
  quiz.index += 1;
  if (quiz.index >= quiz.questions.length) {
    showResult();
    return;
  }
  persistQuizDraft();
  if (quiz.subject === "en") renderEnQuestion();
  else renderQuestion();
}

function retryWrongRound() {
  if (!lastWrongRound?.questions?.length) return;
  const { subject, child, questions, mode } = lastWrongRound;
  clearQuizDraft();
  quiz = {
    subject,
    child,
    questions: [...questions],
    index: 0,
    autoCorrect: 0,
    pending: 0,
    wrong: [],
    startedAt: Date.now(),
    mode,
    fromMistakeBook: true,
  };

  if (subject === "en") {
    enMode = mode || enMode;
    setEnMode(enMode);
    showView("quizEn");
    renderEnQuestion();
  } else {
    if (CONFIG.OCR_ENABLED) ensurePaddleOcr().catch(() => {});
    showView("quizZh");
    const canvas = $("#hand-canvas");
    const wrap = canvas.parentElement;
    if (!handwriting) {
      handwriting = createHandwritingCanvas(canvas, wrap);
    } else {
      handwriting.resize();
    }
    renderQuestion();
  }
  persistQuizDraft();
}

function showResult() {
  clearQuizDraft();
  recordMistakesFromQuiz(quiz);

  const retryQs = questionsFromQuizWrong(quiz);
  lastWrongRound = retryQs.length
    ? {
        subject: quiz.subject,
        child: quiz.child,
        questions: retryQs,
        mode: quiz.mode || enMode,
      }
    : null;

  const retryBtn = $("#btn-retry-wrong");
  if (retryBtn) retryBtn.hidden = !lastWrongRound;

  showView("result");
  const total = quiz.questions.length;
  const scored = quiz.autoCorrect;
  const subj = quiz.subject === "en" ? "?±è?" : "?‹è?";
  const bookTag = quiz.fromMistakeBook ? " Â· ?¯é?è¤‡ç?" : "";
  $("#result-title").textContent = `${getChildName(quiz.child)} å®Œæ? Â· ${subj}${bookTag}`;
  $("#score-big").textContent = `${scored} / ${total}`;

  const pendingEl = $("#score-pending");
  if (quiz.pending > 0) {
    pendingEl.hidden = false;
    pendingEl.textContent = `?¦æ? ${quiz.pending} é¡Œå?ç¢ºè?ï¼ˆé•·?‰é??æ?é¡Œå¯?•ç?ï¼‰`;
  } else {
    pendingEl.hidden = true;
  }

  const saveStatus = $("#score-save-status");
  saveStatus.hidden = false;
  saveStatus.textContent = "æ­?œ¨è¨˜é??ç¸¾??;
  void logQuizResult(quiz, getActiveLessonFilter(quiz.subject)).then((r) => {
    saveStatus.textContent = r.message;
    renderHomeScoreHistory();
  });

  const list = $("#mistake-list");
  list.innerHTML = "";
  if (!quiz.wrong.length && scored === total) {
    const li = document.createElement("li");
    li.className = "ok-item";
    li.textContent = "?¨éƒ¨?ªå?ç­”å?ï¼Œå¤ªæ£’ä?ï¼?;
    list.appendChild(li);
  } else {
    quiz.wrong.forEach((w) => {
      const li = document.createElement("li");
      if (w.chinese !== undefined) {
        li.textContent = w.pending
          ? `${w.chinese} ??å­©å???{w.recognized}?ï?æ¨™æ?ï¼?{w.expected}ï¼‰å?ç¢ºè?`
          : `${w.chinese} ??æ¨™æ?ï¼?{w.expected}`;
      } else {
        li.textContent = w.pending
          ? `æ³¨éŸ³ ${w.zhuyin} ??è¾¨è???{w.recognized}?ï?æ¨™æ?ï¼?{w.expected}ï¼‰å?ç¢ºè?`
          : `æ³¨éŸ³ ${w.zhuyin} ??æ¨™æ?ç­”æ?ï¼?{w.expected}`;
      }
      list.appendChild(li);
    });
  }

  renderMistakeBookHome();
}

function openUserSettings() {
  showView("parent");
  fillParentNameInputs();
  renderPendingList();
  renderScoreHistory();
  renderParentMistakeList();
}

function renderHomeScoreHistory() {
  const listEl = $("#home-history-list");
  const emptyEl = $("#home-history-empty");
  const toggleBtn = $("#btn-home-history-toggle");
  if (!listEl) return;

  const all = loadLocalScores();
  const childId = getSelectedChild();
  const childName = getChildName(childId);
  const scores = homeHistoryShowAll
    ? all
    : scoresForChild(all, childId, childName);
  const shown = scores.slice(0, 8);

  listEl.innerHTML = "";
  if (emptyEl) emptyEl.hidden = shown.length > 0;

  if (!shown.length) {
    if (emptyEl) {
      emptyEl.hidden = false;
      emptyEl.textContent = homeHistoryShowAll
        ? "å°šç„¡ç´€?„ï?å®Œæ?æ¸¬é?å¾Œæ?é¡¯ç¤º"
        : `${childName} å°šç„¡ç´€?„`;
    }
  } else {
    shown.forEach((s) => {
      const { score, meta } = formatScoreSummary(s);
      const li = document.createElement("li");
      const scoreSpan = document.createElement("span");
      scoreSpan.className = "home-history-score";
      scoreSpan.textContent = score;
      if (s.subject === "?±è?") scoreSpan.style.color = "var(--en)";
      const metaSpan = document.createElement("span");
      metaSpan.className = "home-history-meta";
      const who =
        homeHistoryShowAll && s.child && s.child !== childName
          ? `${s.child} Â· `
          : "";
      metaSpan.textContent = who + meta;
      li.append(scoreSpan, metaSpan);
      listEl.appendChild(li);
    });
  }

  if (toggleBtn) {
    toggleBtn.textContent = homeHistoryShowAll ? "?ªç?æ­¤äºº" : "?‹å…¨??;
  }

  const cloudEl = $("#home-history-cloud");
  if (cloudEl) {
    const hasUrl = Boolean((CONFIG.SCORE_LOG_URL || "").trim());
    cloudEl.hidden = hasUrl;
    if (!hasUrl) {
      cloudEl.textContent =
        "?®å??ç¸¾?ªå??¨æ­¤?‹æ??‚è?å¯«å…¥ Google ?²ç«¯è©¦ç?è¡¨ï?è«‹å???Apps Script è¨­å?ï¼ˆè? docs/?ç¸¾å¯«å…¥è©¦ç?è¡?mdï¼‰ã€?;
    }
  }
}

function renderScoreHistory() {
  const listEl = $("#score-history-list");
  const hintEl = $("#score-history-hint");
  if (!listEl) return;

  const scores = loadLocalScores();
  listEl.innerHTML = "";

  if (!scores.length) {
    const li = document.createElement("li");
    li.textContent = "å°šç„¡ç´€?„ï?å®Œæ?ä¸€æ¬¡æ¸¬é©—å??ƒå‡º?¾ï?";
    listEl.appendChild(li);
  } else {
    scores.slice(0, 15).forEach((s) => {
      const li = document.createElement("li");
      li.textContent = formatScoreLine(s);
      listEl.appendChild(li);
    });
  }

  if (hintEl) {
    const hasUrl = Boolean((CONFIG.SCORE_LOG_URL || "").trim());
    hintEl.textContent = hasUrl
      ? "?¬æ?ä¿ç??€è¿‘ç??„ï?å®Œæ•´æ­·å²è«‹ç?è©¦ç?è¡¨ã€Œæ?ç¸¾ã€å·¥ä½œè¡¨??
      : "?¥è?å¯«å…¥ Google è©¦ç?è¡¨ï?è«‹éƒ¨ç½?Apps Script ä¸¦åœ¨ config.site.js è¨­å? SCORE_LOG_URL??;
  }
}

function renderPendingList() {
  const list = loadPending();
  $("#pending-count").textContent = String(list.length);
  const container = $("#pending-list");
  container.innerHTML = "";

  if (!list.length) {
    container.innerHTML = "<p class=\"parent-note\">?®å?æ²’æ?å¾…ç¢ºèªé??®ã€?/p>";
    return;
  }

  list.forEach((p) => {
    const card = document.createElement("div");
    card.className = "pending-card";
    const isEn = p.subject === "en" || p.chinese;
    if (isEn) {
      card.innerHTML = `
      <div><strong>${getChildName(p.childId || p.child)}</strong> Â· ?±è? Â· ç¬?${p.questionIndex} é¡?/div>
      <div class="pending-meta">${p.chinese || ""} ??æ¨™æ?ï¼?{p.expected}</div>
      <div class="pending-meta">å­©å?ç­”æ?ï¼?{p.recognized}</div>
    `;
    } else {
      card.innerHTML = `
      <div><strong>${getChildName(p.childId || p.child)}</strong> Â· ?‹è? Â· ç¬?${p.questionIndex} é¡?Â· ${p.lesson || ""}</div>
      <div class="pending-meta">æ³¨éŸ³ï¼?{p.zhuyin || ""}</div>
      <div class="pending-meta">è¾¨è?ï¼?{p.recognized} ??æ¨™æ?ï¼?{p.expected}</div>
    `;
      if (p.imageDataUrl) {
        const img = document.createElement("img");
        img.src = p.imageDataUrl;
        img.alt = "?‹å¯«?§å®¹";
        card.appendChild(img);
      }
    }

    const actions = document.createElement("div");
    actions.className = "pending-actions";

    const okBtn = document.createElement("button");
    okBtn.type = "button";
    okBtn.className = "btn btn-ok";
    okBtn.textContent = "ç®—å?";
    okBtn.addEventListener("click", () => {
      removePending(p.id);
      renderPendingList();
    });

    const noBtn = document.createElement("button");
    noBtn.type = "button";
    noBtn.className = "btn btn-no";
    noBtn.textContent = "ç®—éŒ¯";
    noBtn.addEventListener("click", () => {
      const childId = p.childId || p.child;
      if (p.subject === "en" || p.chinese) {
        addMistake(
          childId,
          "en",
          {
            lesson: p.lesson,
            chinese: p.chinese,
            english: p.expected,
            hint: p.hint || "",
          },
          p.recognized
        );
      } else {
        addMistake(
          childId,
          "zh",
          {
            lesson: p.lesson,
            word: p.expected,
            zhuyin: p.zhuyin,
            sentence: p.sentence || "",
          },
          p.recognized
        );
      }
      removePending(p.id);
      renderPendingList();
      renderParentMistakeList();
      renderMistakeBookHome();
    });

    actions.append(okBtn, noBtn);
    card.appendChild(actions);
    container.appendChild(card);
  });
}

let homeTitlePressTimer = null;

function bindEvents() {
  const bindStart = (btn, fn) => {
    if (!btn) return;
    const go = (e) => {
      e.preventDefault();
      fn();
    };
    btn.addEventListener("click", go);
  };

  bindStart($("#btn-start-zh"), openZhSetup);
  bindStart($("#btn-start-en"), () => {
    primeSpeech();
    enMode =
      document.querySelector(".en-mode-picker .chip-active")?.dataset.enMode ||
      "meaning";
    openEnSetup();
  });

  $("#btn-setup-zh-back")?.addEventListener("click", () => showView("home"));
  $("#btn-setup-en-back")?.addEventListener("click", () => showView("home"));
  $("#btn-setup-zh-start")?.addEventListener("click", () => startZhQuiz());
  $("#btn-setup-zh-race")?.addEventListener("click", (e) => {
    e.preventDefault();
    openZhRaceDuoMode();
  });
  $("#btn-setup-en-start")?.addEventListener("click", () => {
    primeSpeech();
    enMode =
      document.querySelector(".en-mode-picker .chip-active")?.dataset.enMode ||
      "meaning";
    startEnQuiz();
  });
  $("#btn-setup-en-race")?.addEventListener("click", (e) => {
    e.preventDefault();
    primeSpeech();
    enMode =
      document.querySelector(".en-mode-picker .chip-active")?.dataset.enMode ||
      "meaning";
    openEnRaceDuoMode();
  });

  $("#btn-review-zh-mistakes")?.addEventListener("click", () => {
    startZhQuiz({ mistakeReview: true });
  });
  $("#btn-review-en-mistakes")?.addEventListener("click", () => {
    primeSpeech();
    startEnQuiz({ mistakeReview: true });
  });
  $("#btn-retry-wrong")?.addEventListener("click", retryWrongRound);
  $("#btn-clear-zh-mistakes")?.addEventListener("click", () => {
    if (confirm("ç¢ºå?æ¸…ç©º?®å?å°å­©?„å?èªéŒ¯é¡Œæœ¬ï¼?)) {
      clearMistakes(getSelectedChild(), "zh");
      renderParentMistakeList();
      renderMistakeBookHome();
    }
  });
  $("#btn-clear-en-mistakes")?.addEventListener("click", () => {
    if (confirm("ç¢ºå?æ¸…ç©º?®å?å°å­©?„è‹±èªéŒ¯é¡Œæœ¬ï¼?)) {
      clearMistakes(getSelectedChild(), "en");
      renderParentMistakeList();
      renderMistakeBookHome();
    }
  });

  document.querySelectorAll(".en-mode-picker .chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      primeSpeech();
      setEnMode(btn.dataset.enMode);
    });
  });

  $("#btn-quiz-back").addEventListener("click", leaveQuizToHome);
  $("#btn-quiz-back-en").addEventListener("click", leaveQuizToHome);

  $("#btn-resume-quiz")?.addEventListener("click", resumeQuiz);
  $("#btn-discard-draft")?.addEventListener("click", () => {
    if (confirm("ç¢ºå??¾æ??«å??„æ¸¬é©—é€²åº¦?ï?")) {
      clearQuizDraft();
      renderResumeBanner();
    }
  });
  $("#btn-clear-canvas").addEventListener("click", () => handwriting?.clear());
  $("#btn-stroke-order-replay")?.addEventListener("click", () => {
    if (!quiz || quiz.subject !== "zh") return;
    const q = quiz.questions[quiz.index];
    if (q?.word) void showStrokeOrderForWord(q.word);
  });
  $("#btn-submit-answer").addEventListener("click", submitAnswer);
  $("#btn-clear-en").addEventListener("click", () => {
    $("#en-answer-input").value = "";
    $("#en-answer-input").focus();
  });
  $("#btn-submit-en").addEventListener("click", submitEnAnswer);
  $("#btn-speak-en").addEventListener("click", () => {
    void playEnglishAudio();
  });
  $("#en-answer-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitEnAnswer();
  });

  $("#btn-retry").addEventListener("click", () => {
    if (quiz?.subject === "en") startEnQuiz();
    else startZhQuiz();
  });
  $("#btn-home").addEventListener("click", () => showView("home"));

  $("#btn-home-history-toggle")?.addEventListener("click", () => {
    homeHistoryShowAll = !homeHistoryShowAll;
    renderHomeScoreHistory();
  });
  $("#btn-parent-back").addEventListener("click", () => showView("home"));
  $("#btn-reload-sheet").addEventListener("click", async () => {
    await refreshBank();
    renderPendingList();
  });

  $("#btn-save-names").addEventListener("click", saveParentNames);

  $("#feedback-mark-correct").addEventListener("click", () => resolveParentReview(true));
  $("#feedback-mark-wrong").addEventListener("click", () => resolveParentReview(false));

  const title = $("#home-title");
  title?.addEventListener("touchstart", (e) => {
    homeTitlePressTimer = setTimeout(() => {
      e.preventDefault();
      openUserSettings();
    }, 800);
  });
  title?.addEventListener("touchend", () => clearTimeout(homeTitlePressTimer));
  title?.addEventListener("touchmove", () => clearTimeout(homeTitlePressTimer));
  title?.addEventListener("mousedown", () => {
    homeTitlePressTimer = setTimeout(openUserSettings, 800);
  });
  title?.addEventListener("mouseup", () => clearTimeout(homeTitlePressTimer));
  title?.addEventListener("mouseleave", () => clearTimeout(homeTitlePressTimer));
}

async function init() {
  if (!$("#view-home") || !$("#btn-start-zh")) {
    showBootError("?é¢è¼‰å…¥ä¸å??´ï?è«‹é??°æ•´?†æ?æ¸…é™¤å¿«å?å¾Œå?è©¦ã€?);
    return;
  }

  const verEl = $("#app-version");
  if (verEl && CONFIG.APP_VERSION) {
    verEl.textContent = `v${CONFIG.APP_VERSION}`;
  }

  bindEvents();
  void logSiteVisit();
  window.__kidQuizReady = true;
  setupQuizAutoSave();
  initChildPicker();
  initParentNameList();
  initQuizCountPicker();
  initFlipZh({
    showView,
    getZhBank: () => zhBank,
    getLessonFilter: () => zhLessonFilter,
    getChildNames,
    showWarn: (title, sub) => {
      showFeedback("warn", title, [{ label: "å¥½ç?", primary: true, onClick: () => {} }], {
        sub: sub || "",
      });
    },
  });
  initFlipMath({
    showView,
    getChildNames,
    showWarn: (title, sub, onClose) => {
      showFeedback(
        "warn",
        title,
        [{ label: "å¥½ç?", primary: true, onClick: () => onClose?.() }],
        { sub: sub || "" }
      );
    },
    showOk: (title, sub, onClose) => {
      showFeedback(
        "ok",
        title,
        [{ label: "å¥½è€?, primary: true, onClick: () => onClose?.() }],
        { sub: sub || "" }
      );
    },
  });
  initGomoku({
    showView,
    getChildNames,
  });
  initXiangqi({
    showView,
    getChildNames,
  });
  initChess({
    showView,
    getChildNames,
  });
  initAnqi({
    showView,
    getChildNames,
  });
  initOnlineDuo({
    showView,
    getSelectedChild,
    getZhBank: () => zhBank,
    getLessonFilter: () => zhLessonFilter,
    showWarn: (title, sub) => {
      showFeedback(
        "warn",
        title,
        [{ label: "å¥½ç?", primary: true }],
        { sub: sub || "" }
      );
    },
  });
  initSkyOnline();
  initRaceDuo({
    getZhBank: () => zhBank,
    getEnBank: () => enBank,
    getLessonFilter: () => zhLessonFilter,
    getEnLessonFilter: () => enLessonFilter,
    getEnMode: () => enMode,
    getQuizCountSetting,
  });
  initFlipMul({
    showView,
    getChildNames: () => {
      const names = getChildNames();
      return { A: names.A, B: names.B };
    },
    showWarn: (title, sub) => {
      showFeedback("warn", title, [{ label: "å¥½ç?", primary: true }], { sub: sub || "" });
    },
  });
  initTimesTable({
    showView,
    getSelectedChild,
    showWarn: (title, sub, onClose) => {
      showFeedback(
        "warn",
        title,
        [{ label: "å¥½ç?", primary: true, onClick: () => onClose?.() }],
        { sub: sub || "" }
      );
    },
    showOk: (title, sub, onClose) => {
      showFeedback(
        "ok",
        title,
        [{ label: "å¥½è€?, primary: true, onClick: () => onClose?.() }],
        { sub: sub || "" }
      );
    },
  });
  $("#btn-start-mul")?.addEventListener("click", (e) => {
    e.preventDefault();
    openMulHome();
  });
  $("#btn-start-sky-shooter")?.addEventListener("click", (e) => {
    e.preventDefault();
    openSkyDuoMenu();
  });
  $("#btn-mul-race-duo")?.addEventListener("click", (e) => {
    e.preventDefault();
    openMulRaceDuoMode();
  });
  await refreshBank();
  renderHomeScoreHistory();
  renderResumeBanner();
  renderMistakeBookHome();
}

window.startZhQuiz = startZhQuiz;
window.startEnQuiz = startEnQuiz;

init().catch((e) => {
  console.error(e);
  showBootError(`ç¨‹å??¯èª¤ï¼?{e.message}?‚è??œé??†é??é?ï¼›è‹¥ä»ç„¡?ˆè?æ¸…é™¤?è¦½?¨å¿«?–ã€‚`);
});

async function ensureOcrReady() {
  if (!CONFIG.OCR_ENABLED) return false;
  try {
    await ensurePaddleOcr();
    return true;
  } catch (e) {
    console.warn(e);
    return false;
  }
}
