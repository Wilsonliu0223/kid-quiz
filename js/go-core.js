/** 圍棋規則：中國數子法（禁著點、單劫、虛手終局） */

export const BLACK = 1;
export const WHITE = 2;

/** @typedef {0|1|2} GoCell */
/** @typedef {{ size:number, board:GoCell[][], turn:1|2, ko:[number,number]|null, passes:number, captured:[number,number], lastMove:[number,number]|null, lastWasPass:boolean }} GoPosition */

export function komiForSize(size) {
  return size >= 19 ? 7.5 : 5.5;
}

export function starPoints(size) {
  /** @type {number[]} */
  let xs;
  if (size >= 19) xs = [3, 9, 15];
  else if (size >= 13) xs = [3, 6, 9];
  else if (size >= 9) xs = [2, 4, 6];
  else xs = [Math.floor(size / 2)];
  /** @type {[number,number][]} */
  const pts = [];
  for (const r of xs) {
    for (const c of xs) pts.push([r, c]);
  }
  return pts;
}

/** @param {number} size */
export function createPosition(size = 9) {
  return {
    size,
    board: Array.from({ length: size }, () => Array.from({ length: size }, () => 0)),
    turn: BLACK,
    ko: null,
    passes: 0,
    captured: [0, 0],
    lastMove: null,
    lastWasPass: false,
  };
}

/** @param {GoPosition} pos */
export function clonePosition(pos) {
  return {
    size: pos.size,
    board: pos.board.map((row) => row.slice()),
    turn: pos.turn,
    ko: pos.ko ? [pos.ko[0], pos.ko[1]] : null,
    passes: pos.passes,
    captured: [pos.captured[0], pos.captured[1]],
    lastMove: pos.lastMove ? [pos.lastMove[0], pos.lastMove[1]] : null,
    lastWasPass: pos.lastWasPass,
  };
}

export function opponent(color) {
  return color === BLACK ? WHITE : BLACK;
}

function inBoard(size, r, c) {
  return r >= 0 && c >= 0 && r < size && c < size;
}

const DIRS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

/**
 * @param {GoPosition} pos
 * @param {number} r
 * @param {number} c
 */
export function groupAt(pos, r, c) {
  const color = pos.board[r][c];
  /** @type {Set<string>} */
  const stones = new Set();
  /** @type {Set<string>} */
  const libs = new Set();
  if (!color) return { stones, libs, color: 0 };
  const stack = [[r, c]];
  stones.add(`${r},${c}`);
  while (stack.length) {
    const [cr, cc] = stack.pop();
    for (const [dr, dc] of DIRS) {
      const nr = cr + dr;
      const nc = cc + dc;
      if (!inBoard(pos.size, nr, nc)) continue;
      const v = pos.board[nr][nc];
      const key = `${nr},${nc}`;
      if (v === 0) libs.add(key);
      else if (v === color && !stones.has(key)) {
        stones.add(key);
        stack.push([nr, nc]);
      }
    }
  }
  return { stones, libs, color };
}

/**
 * @param {GoPosition} pos
 * @param {number} r
 * @param {number} c
 * @param {1|2} color
 */
export function isLegalMove(pos, r, c, color = pos.turn) {
  if (!inBoard(pos.size, r, c)) return false;
  if (pos.board[r][c] !== 0) return false;
  if (pos.ko && pos.ko[0] === r && pos.ko[1] === c) return false;
  const next = tryPlay(pos, r, c, color);
  return !!next;
}

/** @param {GoPosition} pos */
export function listLegalMoves(pos) {
  /** @type {[number,number][]} */
  const moves = [];
  for (let r = 0; r < pos.size; r++) {
    for (let c = 0; c < pos.size; c++) {
      if (isLegalMove(pos, r, c)) moves.push([r, c]);
    }
  }
  return moves;
}

/**
 * @param {GoPosition} pos
 * @param {number} r
 * @param {number} c
 * @param {1|2} color
 * @returns {GoPosition|null}
 */
function tryPlay(pos, r, c, color) {
  const size = pos.size;
  const board = pos.board.map((row) => row.slice());
  board[r][c] = color;
  const opp = opponent(color);
  /** @type {[number,number][]} */
  const capturedStones = [];
  const seen = new Set();
  for (const [dr, dc] of DIRS) {
    const nr = r + dr;
    const nc = c + dc;
    if (!inBoard(size, nr, nc) || board[nr][nc] !== opp) continue;
    const key0 = `${nr},${nc}`;
    if (seen.has(key0)) continue;
    const g = groupAt({ ...pos, board }, nr, nc);
    for (const k of g.stones) seen.add(k);
    if (g.libs.size === 0) {
      for (const k of g.stones) {
        const [gr, gc] = k.split(",").map(Number);
        board[gr][gc] = 0;
        capturedStones.push([gr, gc]);
      }
    }
  }
  const own = groupAt({ ...pos, board }, r, c);
  if (own.libs.size === 0) return null;

  let ko = null;
  if (capturedStones.length === 1 && own.stones.size === 1 && own.libs.size === 1) {
    ko = capturedStones[0];
  }

  const captured = pos.captured.slice();
  captured[color - 1] += capturedStones.length;

  return {
    size,
    board,
    turn: opp,
    ko,
    passes: 0,
    captured,
    lastMove: [r, c],
    lastWasPass: false,
  };
}

/**
 * @param {GoPosition} pos
 * @param {number} r
 * @param {number} c
 */
export function playMove(pos, r, c) {
  const next = tryPlay(pos, r, c, pos.turn);
  if (!next) throw new Error("illegal go move");
  return next;
}

/** @param {GoPosition} pos */
export function playPass(pos) {
  return {
    size: pos.size,
    board: pos.board.map((row) => row.slice()),
    turn: opponent(pos.turn),
    ko: null,
    passes: pos.passes + 1,
    captured: pos.captured.slice(),
    lastMove: pos.lastMove,
    lastWasPass: true,
  };
}

export function isGameOver(pos) {
  return pos.passes >= 2;
}

/**
 * 中國數子：活棋（盤上現況）＋所圍空；公氣各半。
 * 第一期不自動判死子。
 * @param {GoPosition} pos
 */
export function scoreChinese(pos) {
  const size = pos.size;
  const komi = komiForSize(size);
  const area = [0, 0];
  const seen = Array.from({ length: size }, () => Array(size).fill(false));
  let stonesB = 0;
  let stonesW = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (pos.board[r][c] === BLACK) stonesB++;
      if (pos.board[r][c] === WHITE) stonesW++;
    }
  }
  area[0] = stonesB;
  area[1] = stonesW;

  let dameSplit = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (pos.board[r][c] !== 0 || seen[r][c]) continue;
      const q = [[r, c]];
      seen[r][c] = true;
      /** @type {[number,number][]} */
      const empties = [[r, c]];
      let touchB = false;
      let touchW = false;
      while (q.length) {
        const [cr, cc] = q.pop();
        for (const [dr, dc] of DIRS) {
          const nr = cr + dr;
          const nc = cc + dc;
          if (!inBoard(size, nr, nc)) continue;
          const v = pos.board[nr][nc];
          if (v === BLACK) touchB = true;
          else if (v === WHITE) touchW = true;
          else if (!seen[nr][nc]) {
            seen[nr][nc] = true;
            empties.push([nr, nc]);
            q.push([nr, nc]);
          }
        }
      }
      const n = empties.length;
      if (touchB && !touchW) area[0] += n;
      else if (touchW && !touchB) area[1] += n;
      else if (touchB && touchW) {
        area[0] += n / 2;
        area[1] += n / 2;
        dameSplit += n;
      }
    }
  }

  const black = area[0];
  const white = area[1] + komi;
  let winner = null;
  if (black > white) winner = BLACK;
  else if (white > black) winner = WHITE;

  return {
    komi,
    blackStones: stonesB,
    whiteStones: stonesW,
    blackArea: area[0],
    whiteArea: area[1],
    blackScore: black,
    whiteScore: white,
    dameSplit,
    winner,
    captured: pos.captured.slice(),
  };
}

export function formatScoreDetail(score) {
  const who =
    score.winner === BLACK ? "黑勝" : score.winner === WHITE ? "白勝" : "和棋";
  const margin = Math.abs(score.blackScore - score.whiteScore);
  return [
    `黑：${score.blackStones} 子，合計 ${score.blackArea}（子＋空）`,
    `白：${score.whiteStones} 子，合計 ${score.whiteArea}（子＋空），再加貼目 ${score.komi}`,
    `黑 ${score.blackScore}  ：  白 ${score.whiteScore}`,
    dameNote(score),
    `${who}${score.winner ? `（差 ${margin}）` : ""}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function dameNote(score) {
  if (!score.dameSplit) return "";
  return `雙方交界空點 ${score.dameSplit} 點，各得一半（中國規則）。`;
}

/** @param {string[]} rows `.` 空 `x` 黑 `o` 白 */
export function positionFromAscii(rows, turn = BLACK) {
  const size = Math.max(rows.length, ...rows.map((row) => row.length));
  const pos = createPosition(size);
  pos.turn = turn;
  for (let r = 0; r < size; r++) {
    const row = rows[r] || "";
    for (let c = 0; c < size; c++) {
      const ch = row[c] || ".";
      pos.board[r][c] = ch === "x" || ch === "X" ? BLACK : ch === "o" || ch === "O" ? WHITE : 0;
    }
  }
  return pos;
}

export function serializePosition(pos) {
  return JSON.stringify(pos);
}

export function deserializePosition(raw) {
  const pos = typeof raw === "string" ? JSON.parse(raw) : raw;
  return clonePosition(pos);
}
