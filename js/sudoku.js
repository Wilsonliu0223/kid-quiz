/**
 * 數獨：規則教學（文字步驟）＋ 簡單／普通／困難練習
 */
import {
  generatePuzzle,
  findHint,
  findConflicts,
  isSolvedCorrectly,
} from "./sudoku-engine.js";

/** @type {{ showView: (n: string) => void, showOk?: Function, showWarn?: Function } | null} */
let deps = null;

/** @type {'easy'|'medium'|'hard'} */
let difficulty = "easy";
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
let hintFlash = -1;

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
    body: "① 點選一個空格\n② 再點下方的數字 1～9 填入\n③ 若填錯（同一列／行／九宮有重複），格子會變紅\n④ 卡住時可按「提示」看一格答案\n⑤ 全部填對就過關！",
  },
  {
    title: "準備開始",
    body: "建議先從「簡單」開始。熟悉規則後再挑戰「普通」或「困難」。按「開始練習」選難度即可。",
  },
];

let tutorialIndex = 0;

const $ = (sel) => document.querySelector(sel);

const DIFF_MAP = {
  easy: 1,
  medium: 2,
  hard: 3,
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
      if (d === "easy" || d === "medium" || d === "hard") startGame(d);
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

/** @param {'easy'|'medium'|'hard'} diff */
function startGame(diff) {
  difficulty = diff;
  const { puzzle: p, solution: s } = generatePuzzle(DIFF_MAP[diff]);
  puzzle = p;
  solution = s;
  given = p.map((v) => v != null);
  selected = -1;
  paintDigit = null;
  conflict = Array(81).fill(false);
  hintFlash = -1;

  const label =
    diff === "easy" ? "簡單" : diff === "hard" ? "困難" : "普通";
  const sub = $("#sudoku-play-diff");
  if (sub) sub.textContent = label;

  renderBoard();
  deps?.showView("sudokuPlay");
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
    if (hintFlash === i) cell.classList.add("sudoku-cell-hint");
    if (puzzle[i] != null) cell.textContent = String(puzzle[i]);
    cell.addEventListener("click", () => {
      selected = i;
      if (paintDigit != null && !given[i]) placeDigit(paintDigit);
      else renderBoard();
    });
    grid.appendChild(cell);
  }
}

/** @param {number} n */
function placeDigit(n) {
  paintDigit = n;
  document.querySelectorAll(".sudoku-num").forEach((btn) => {
    btn.classList.toggle("chip-active", Number(btn.getAttribute("data-num")) === n);
  });
  if (selected < 0 || given[selected]) return;
  puzzle[selected] = n;
  conflict = findConflicts(puzzle, given);
  hintFlash = -1;
  renderBoard();
  if (isSolvedCorrectly(puzzle, solution)) {
    deps?.showOk?.("完成！", "這一盤全部填對了。", () => {});
  }
}

function eraseSelected() {
  if (selected < 0 || given[selected]) return;
  puzzle[selected] = null;
  conflict = findConflicts(puzzle, given);
  hintFlash = -1;
  renderBoard();
}

function applyHint() {
  const h = findHint(puzzle, solution, given);
  if (!h) {
    deps?.showWarn?.("沒有可提示的空格", "這盤可能已填完或無法提示。");
    return;
  }
  puzzle[h.index] = h.value;
  selected = h.index;
  hintFlash = h.index;
  conflict = findConflicts(puzzle, given);
  renderBoard();
  if (isSolvedCorrectly(puzzle, solution)) {
    deps?.showOk?.("完成！", "這一盤全部填對了。", () => {});
  }
}

function checkBoard() {
  conflict = findConflicts(puzzle, given);
  // 也標出填了但與解答不符的格
  for (let i = 0; i < 81; i++) {
    if (given[i]) continue;
    if (puzzle[i] != null && puzzle[i] !== solution[i]) conflict[i] = true;
  }
  renderBoard();
  const empty = puzzle.filter((v) => v == null).length;
  const wrong = conflict.filter(Boolean).length;
  if (isSolvedCorrectly(puzzle, solution)) {
    deps?.showOk?.("全部正確！", "太棒了。", () => {});
  } else if (wrong) {
    deps?.showWarn?.("有錯誤", `目前有 ${wrong} 格不合規則或填錯，已用紅色標出。`);
  } else if (empty) {
    deps?.showWarn?.("還沒填完", `還剩 ${empty} 個空格，目前沒有發現衝突。`);
  }
}
