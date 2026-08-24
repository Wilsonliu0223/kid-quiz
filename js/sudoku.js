/**
 * 數獨：規則教學（文字步驟）＋ 入門～專家五難度練習
 * 防試誤：不即時判錯、檢查不對答案、提示不直接填數字
 */
import {
  generatePuzzle,
  findHint,
  findConflicts,
  isSolvedCorrectly,
} from "./sudoku-engine.js";

/** @type {{ showView: (n: string) => void, showOk?: Function, showWarn?: Function } | null} */
let deps = null;

/** @type {'beginner'|'easy'|'medium'|'hard'|'expert'} */
let difficulty = "beginner";
/** @type {(number|null)[]} */
let puzzle = [];
/** @type {(number|null)[]} */
let solution = [];
/** @type {boolean[]} */
let given = [];
/** @type {number} */
let selected = -1;
/** @type {number | null} */
let paintDigit = null;
/** @type {boolean[]} */
let conflict = Array(81).fill(false);
/** 提示時高亮：同列／同行／同宮 */
/** @type {boolean[]} */
let related = Array(81).fill(false);
let hintFlash = -1;
/** @type {{ index: number, before: number|null, after: number|null }[]} */
let undoStack = [];

const TUTORIAL_STEPS = [
  {
    title: "什麼是數獨？",
    body: "數獨是 9×9 的格子遊戲。一開始有些格子已經填好數字，你要在空格填上 1～9，讓整盤都合乎規則。",
  },
  {
    title: "規則一：每一「列」",
    body: "橫的一排叫做「列」。每一列裡的數字 1～9 都只能出現一次，不能重複。",
  },
  {
    title: "規則二：每一「行」",
    body: "直的一排叫做「行」。每一行裡的數字 1～9 也只能出現一次。",
  },
  {
    title: "規則三：每一「九宮格」",
    body: "盤面分成 9 個 3×3 的小方塊（九宮格）。每個九宮格裡，1～9 同樣只能各出現一次。",
  },
  {
    title: "怎麼玩？",
    body: "① 先點選一個空格\n② 再點下方的數字 1～9 填入（填完下方會自動取消選取）\n③ 想檢查時再按「檢查」（只看有沒有重複，不會告訴你答案）\n④ 卡住時按「提示」：會指出該想哪一格，但不會直接填答案\n⑤ 全部填完且沒有重複就過關！",
  },
  {
    title: "準備開始",
    body: "建議先從「入門」或「簡單」開始。熟悉規則後再挑戰「普通」「困難」，最後試試「專家」。按「開始練習」選難度即可。",
  },
];

let tutorialIndex = 0;

const $ = (sel) => document.querySelector(sel);

const DIFF_MAP = {
  beginner: 1,
  easy: 2,
  medium: 3,
  hard: 4,
  expert: 5,
};

const DIFF_LABEL = {
  beginner: "入門",
  easy: "簡單",
  medium: "普通",
  hard: "困難",
  expert: "專家",
};

/**
 * @param {{ showView: (n: string) => void, showOk?: Function, showWarn?: Function }} d
 */
export function initSudoku(d) {
  deps = d;
  bindUi();
}

export function openSudokuHome() {
  deps?.showView("sudokuHome");
}

function bindUi() {
  $("#btn-sudoku-home-back")?.addEventListener("click", () => deps?.showView("home"));
  $("#btn-sudoku-tutorial")?.addEventListener("click", openTutorial);
  $("#btn-sudoku-play")?.addEventListener("click", () => deps?.showView("sudokuDiff"));

  $("#btn-sudoku-diff-back")?.addEventListener("click", () => deps?.showView("sudokuHome"));
  document.querySelectorAll("[data-sudoku-diff]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const d = btn.getAttribute("data-sudoku-diff");
      if (d && d in DIFF_MAP) startGame(d);
    });
  });

  $("#btn-sudoku-tutorial-back")?.addEventListener("click", () => deps?.showView("sudokuHome"));
  $("#btn-sudoku-tutorial-prev")?.addEventListener("click", () => {
    if (tutorialIndex > 0) {
      tutorialIndex--;
      renderTutorial();
    }
  });
  $("#btn-sudoku-tutorial-next")?.addEventListener("click", () => {
    if (tutorialIndex < TUTORIAL_STEPS.length - 1) {
      tutorialIndex++;
      renderTutorial();
    } else {
      deps?.showView("sudokuDiff");
    }
  });

  $("#btn-sudoku-play-back")?.addEventListener("click", () => {
    if (confirm("離開這局？進度不會儲存。")) deps?.showView("sudokuHome");
  });
  $("#btn-sudoku-new")?.addEventListener("click", () => startGame(difficulty));
  $("#btn-sudoku-hint")?.addEventListener("click", applyHint);
  $("#btn-sudoku-erase")?.addEventListener("click", eraseSelected);
  $("#btn-sudoku-undo")?.addEventListener("click", undoLast);
  $("#btn-sudoku-check")?.addEventListener("click", checkBoard);

  document.querySelectorAll(".sudoku-num").forEach((btn) => {
    btn.addEventListener("click", () => {
      const n = Number(btn.getAttribute("data-num"));
      if (n >= 1 && n <= 9) placeDigit(n);
    });
  });
}

function openTutorial() {
  tutorialIndex = 0;
  renderTutorial();
  deps?.showView("sudokuTutorial");
}

function renderTutorial() {
  const step = TUTORIAL_STEPS[tutorialIndex];
  const title = $("#sudoku-tutorial-title");
  const body = $("#sudoku-tutorial-body");
  const progress = $("#sudoku-tutorial-progress");
  const nextBtn = $("#btn-sudoku-tutorial-next");
  const prevBtn = $("#btn-sudoku-tutorial-prev");
  if (title) title.textContent = step.title;
  if (body) body.textContent = step.body;
  if (progress) {
    progress.textContent = `步驟 ${tutorialIndex + 1} / ${TUTORIAL_STEPS.length}`;
  }
  if (prevBtn) prevBtn.disabled = tutorialIndex === 0;
  if (nextBtn) {
    nextBtn.textContent =
      tutorialIndex === TUTORIAL_STEPS.length - 1 ? "開始練習" : "下一步";
  }
}

/** @param {keyof typeof DIFF_MAP} diff */
function startGame(diff) {
  difficulty = diff;
  const { puzzle: p, solution: s } = generatePuzzle(DIFF_MAP[diff]);
  puzzle = p;
  solution = s;
  given = p.map((v) => v != null);
  selected = -1;
  paintDigit = null;
  conflict = Array(81).fill(false);
  related = Array(81).fill(false);
  hintFlash = -1;
  undoStack = [];
  syncUndoButton();

  const sub = $("#sudoku-play-diff");
  if (sub) sub.textContent = DIFF_LABEL[diff] || "普通";

  document.querySelectorAll(".sudoku-num").forEach((btn) => {
    btn.classList.remove("chip-active");
  });

  renderBoard();
  deps?.showView("sudokuPlay");
}

function clearMarks() {
  conflict = Array(81).fill(false);
  related = Array(81).fill(false);
  hintFlash = -1;
}

function renderBoard() {
  const grid = $("#sudoku-grid");
  if (!grid) return;
  grid.innerHTML = "";
  for (let i = 0; i < 81; i++) {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "sudoku-cell";
    const r = Math.floor(i / 9);
    const c = i % 9;
    if (c % 3 === 0) cell.classList.add("sudoku-cell-box-l");
    if (r % 3 === 0) cell.classList.add("sudoku-cell-box-t");
    if (c === 8) cell.classList.add("sudoku-cell-box-r");
    if (r === 8) cell.classList.add("sudoku-cell-box-b");
    if (given[i]) cell.classList.add("sudoku-cell-given");
    if (selected === i) cell.classList.add("sudoku-cell-selected");
    if (conflict[i]) cell.classList.add("sudoku-cell-conflict");
    if (related[i]) cell.classList.add("sudoku-cell-related");
    if (hintFlash === i) cell.classList.add("sudoku-cell-hint");
    if (puzzle[i] != null) cell.textContent = String(puzzle[i]);
    cell.addEventListener("click", () => {
      selected = i;
      related = Array(81).fill(false);
      hintFlash = -1;
      // 只選格，不連續塗數字；必須再點下方 1～9
      renderBoard();
    });
    grid.appendChild(cell);
  }
}

function boardIsFull() {
  return puzzle.every((v) => v != null);
}

function syncUndoButton() {
  const btn = $("#btn-sudoku-undo");
  if (btn) btn.disabled = undoStack.length === 0;
}

/**
 * @param {number} index
 * @param {number|null} before
 * @param {number|null} after
 */
function pushUndo(index, before, after) {
  if (before === after) return;
  undoStack.push({ index, before, after });
  syncUndoButton();
}

function undoLast() {
  const move = undoStack.pop();
  syncUndoButton();
  if (!move) {
    deps?.showWarn?.("沒有可復原", "還沒有輸入可以退回。");
    return;
  }
  if (given[move.index]) {
    undoLast();
    return;
  }
  puzzle[move.index] = move.before;
  selected = move.index;
  clearMarks();
  clearNumPadSelection();
  renderBoard();
}

function clearNumPadSelection() {
  paintDigit = null;
  document.querySelectorAll(".sudoku-num").forEach((btn) => {
    btn.classList.remove("chip-active");
  });
}

/** @param {number} n */
function placeDigit(n) {
  if (selected < 0) {
    deps?.showWarn?.("先選空格", "請先點盤面上的空格，再點下方數字。");
    return;
  }
  if (given[selected]) {
    deps?.showWarn?.("不能改", "這格是題目給的數字。");
    return;
  }
  const before = puzzle[selected];
  puzzle[selected] = n;
  pushUndo(selected, before, n);
  clearMarks();
  clearNumPadSelection();
  renderBoard();
  tryWinIfComplete();
}

function eraseSelected() {
  if (selected < 0 || given[selected]) return;
  const before = puzzle[selected];
  if (before == null) return;
  puzzle[selected] = null;
  pushUndo(selected, before, null);
  clearMarks();
  clearNumPadSelection();
  renderBoard();
}

function tryWinIfComplete() {
  if (!boardIsFull()) return false;
  const bad = findConflicts(puzzle, given);
  if (bad.some(Boolean)) return false;
  if (isSolvedCorrectly(puzzle, solution)) {
    deps?.showOk?.("完成！", "整盤都合乎規則，太棒了！", () => {});
    return true;
  }
  return false;
}

/** @param {number} index */
function markRelatedUnits(index) {
  related = Array(81).fill(false);
  const r = Math.floor(index / 9);
  const c = index % 9;
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let i = 0; i < 9; i++) {
    related[r * 9 + i] = true;
    related[i * 9 + c] = true;
  }
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      related[(br + i) * 9 + (bc + j)] = true;
    }
  }
  related[index] = false;
}

function applyHint() {
  const h = findHint(puzzle, solution, given);
  if (!h) {
    deps?.showWarn?.("沒有可提示的空格", "這盤可能已填完。");
    return;
  }
  // 只指出格子與範圍，不填答案
  selected = h.index;
  hintFlash = h.index;
  conflict = Array(81).fill(false);
  markRelatedUnits(h.index);
  renderBoard();

  const row = Math.floor(h.index / 9) + 1;
  const col = (h.index % 9) + 1;
  if (h.candidates.length === 1) {
    deps?.showWarn?.(
      "想這一格",
      `第 ${row} 列、第 ${col} 行（黃格）：看淺色標出的同行、同列、同九宮，已經出現哪些數字？剩下只能填哪一個？`
    );
  } else {
    deps?.showWarn?.(
      "想這一格",
      `先看第 ${row} 列、第 ${col} 行（黃格）與淺色範圍。把不可能的數字划掉，再決定填哪個。`
    );
  }
}

function checkBoard() {
  // 只檢查規則衝突（重複），不對照標準答案 → 無法用「檢查」試誤
  conflict = findConflicts(puzzle, given);
  related = Array(81).fill(false);
  hintFlash = -1;
  renderBoard();

  const empty = puzzle.filter((v) => v == null).length;
  const wrong = conflict.filter(Boolean).length;

  if (boardIsFull() && wrong === 0) {
    deps?.showOk?.("全部正確！", "整盤都合乎規則。", () => {});
    return;
  }
  if (wrong) {
    deps?.showWarn?.(
      "有重複",
      `有 ${wrong} 格和同行／同列／同九宮重複了（紅格）。改掉重複的數字再檢查。`
    );
    return;
  }
  if (empty) {
    deps?.showWarn?.(
      "規則目前 OK",
      `還沒發現重複，還剩 ${empty} 個空格。繼續推理填完吧（檢查不會偷偷告訴你對不對）。`
    );
  }
}
