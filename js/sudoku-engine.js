/**
 * 輕量數獨引擎：產生（唯一解）、驗證、提示、解題。
 * 難度以挖空數量為主（入門～專家五級）。
 */

/** @typedef {(number|null)[]} SudokuBoard 長度 81，null 為空格，數字 1–9 */

const SIZE = 9;
const BOX = 3;

/** @param {number} difficulty 1=入門 … 5=專家 */
export function cluesForDifficulty(difficulty) {
  const map = { 1: 45, 2: 40, 3: 34, 4: 28, 5: 22 };
  return map[difficulty] ?? 34;
}

/** @returns {SudokuBoard} */
export function emptyBoard() {
  return Array(81).fill(null);
}

/** @param {SudokuBoard} board */
export function cloneBoard(board) {
  return board.slice();
}

/**
 * @param {SudokuBoard} board
 * @param {number} index 0–80
 * @param {number} value 1–9
 */
export function isValidPlacement(board, index, value) {
  const r = Math.floor(index / SIZE);
  const c = index % SIZE;
  for (let i = 0; i < SIZE; i++) {
    if (board[r * SIZE + i] === value) return false;
    if (board[i * SIZE + c] === value) return false;
  }
  const br = Math.floor(r / BOX) * BOX;
  const bc = Math.floor(c / BOX) * BOX;
  for (let i = 0; i < BOX; i++) {
    for (let j = 0; j < BOX; j++) {
      if (board[(br + i) * SIZE + (bc + j)] === value) return false;
    }
  }
  return true;
}

/** @param {SudokuBoard} board */
function findEmpty(board) {
  for (let i = 0; i < 81; i++) {
    if (board[i] == null) return i;
  }
  return -1;
}

function shuffledDigits() {
  const d = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

/**
 * 回溯填滿；countSolutions 時最多數到 limit。
 * @param {SudokuBoard} board
 * @param {{ limit?: number, count?: number }} opts
 */
function solveBoard(board, opts = {}) {
  const limit = opts.limit ?? 1;
  if ((opts.count ?? 0) >= limit) return true;
  const i = findEmpty(board);
  if (i < 0) {
    opts.count = (opts.count ?? 0) + 1;
    return opts.count >= limit;
  }
  for (const v of shuffledDigits()) {
    if (!isValidPlacement(board, i, v)) continue;
    board[i] = v;
    if (solveBoard(board, opts)) {
      if (limit === 1 && (opts.count ?? 0) >= 1) return true;
      if ((opts.count ?? 0) >= limit) return true;
    }
    board[i] = null;
  }
  return (opts.count ?? 0) > 0 && limit > 1 ? false : (opts.count ?? 0) >= 1;
}

/** @param {SudokuBoard} board */
export function countSolutions(board, limit = 2) {
  const b = cloneBoard(board);
  const opts = { limit, count: 0 };
  solveBoard(b, opts);
  return opts.count;
}

/** @param {SudokuBoard} board @returns {SudokuBoard | null} */
export function solve(board) {
  const b = cloneBoard(board);
  const opts = { limit: 1, count: 0 };
  if (!solveBoard(b, opts) || opts.count < 1) return null;
  return b;
}

/** 產生一盤填滿的合法解 */
function generateSolved() {
  const board = emptyBoard();
  solveBoard(board, { limit: 1, count: 0 });
  return board;
}

/**
 * @param {number} difficulty 1|2|3|4|5
 * @returns {{ puzzle: SudokuBoard, solution: SudokuBoard }}
 */
export function generatePuzzle(difficulty) {
  const solution = generateSolved();
  const puzzle = cloneBoard(solution);
  const targetClues = cluesForDifficulty(difficulty);
  const targetHoles = 81 - targetClues;

  const order = Array.from({ length: 81 }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  let holes = 0;
  for (const idx of order) {
    if (holes >= targetHoles) break;
    const backup = puzzle[idx];
    puzzle[idx] = null;
    if (countSolutions(puzzle, 2) !== 1) {
      puzzle[idx] = backup;
    } else {
      holes++;
    }
  }
  return { puzzle, solution };
}

/**
 * 找出一個可提示的空格（優先唯一候選）。
 * @param {SudokuBoard} puzzle 題目（含玩家填入）
 * @param {SudokuBoard} solution
 * @param {boolean[]} given 題目給定格
 * @returns {{ index: number, value: number, candidates: number[] } | null}
 */
export function findHint(puzzle, solution, given) {
  const singles = [];
  const others = [];
  for (let i = 0; i < 81; i++) {
    if (given[i] || puzzle[i] != null) continue;
    const candidates = getCandidates(puzzle, i);
    const item = { index: i, value: solution[i], candidates };
    if (candidates.length === 1) singles.push(item);
    else if (candidates.length > 0) others.push(item);
  }
  if (singles.length) {
    return singles[Math.floor(Math.random() * singles.length)];
  }
  if (!others.length) return null;
  others.sort((a, b) => a.candidates.length - b.candidates.length);
  const bestLen = others[0].candidates.length;
  const pool = others.filter((x) => x.candidates.length === bestLen);
  return pool[Math.floor(Math.random() * pool.length)];
}

/** @param {SudokuBoard} board @param {number} index */
export function getCandidates(board, index) {
  if (board[index] != null) return [];
  const out = [];
  for (let v = 1; v <= 9; v++) {
    if (isValidPlacement(board, index, v)) out.push(v);
  }
  return out;
}

/** @param {SudokuBoard} board @param {boolean[]} given */
export function findConflicts(board, given) {
  /** @type {boolean[]} */
  const bad = Array(81).fill(false);
  for (let i = 0; i < 81; i++) {
    const v = board[i];
    if (v == null) continue;
    board[i] = null;
    if (!isValidPlacement(board, i, v)) bad[i] = true;
    board[i] = v;
  }
  return bad;
}

/** @param {SudokuBoard} board @param {SudokuBoard} solution */
export function isSolvedCorrectly(board, solution) {
  for (let i = 0; i < 81; i++) {
    if (board[i] !== solution[i]) return false;
  }
  return true;
}
