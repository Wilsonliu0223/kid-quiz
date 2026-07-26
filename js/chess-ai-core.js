import {
  applyMove,
  gameResult,
  getLegalMoves,
  isInCheck,
  opponent,
  pieceValue,
} from "./chess-core.js?v=chess-v3";

export const GRANDMASTER_LEVEL = 5;
export const MASTER_WORKER_LEVEL = 4;
export const NIRVANA_LEVEL = 6;

const MATERIAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

const PST_P = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 25, 25, 10, 5, 5],
  [0, 0, 0, 20, 20, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

function evalBoard(pos, aiSide) {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = pos.board[r][c];
      if (!p) continue;
      const side = p === p.toUpperCase() ? "white" : "black";
      const sign = side === aiSide ? 1 : -1;
      const t = p.toLowerCase();
      score += sign * (MATERIAL[t] || 0);
      if (t === "p") {
        const row = side === "white" ? r : 7 - r;
        score += sign * (PST_P[row]?.[c] || 0);
      }
    }
  }
  if (isInCheck(pos.board, opponent(aiSide))) score += 35;
  if (isInCheck(pos.board, aiSide)) score -= 55;
  return score;
}

function orderMoves(pos, moves) {
  return [...moves].sort((a, b) => {
    const ca = a.capture ? pieceValue(a.capture) * 10 - pieceValue(pos.board[a.from[0]][a.from[1]]) : 0;
    const cb = b.capture ? pieceValue(b.capture) * 10 - pieceValue(pos.board[b.from[0]][b.from[1]]) : 0;
    return cb - ca;
  });
}

function minimax(pos, depth, alpha, beta, aiSide) {
  const terminal = gameResult(pos);
  if (terminal) {
    if (!terminal.winner) return 0;
    return terminal.winner === aiSide ? 100000 - (4 - depth) : -100000 + (4 - depth);
  }
  if (depth <= 0) return evalBoard(pos, aiSide);

  const moves = orderMoves(pos, getLegalMoves(pos));
  const maximizing = pos.turn === aiSide;
  if (maximizing) {
    let best = -Infinity;
    for (const m of moves) {
      const s = minimax(applyMove(pos, m), depth - 1, alpha, beta, aiSide);
      best = Math.max(best, s);
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }
  let best = Infinity;
  for (const m of moves) {
    const s = minimax(applyMove(pos, m), depth - 1, alpha, beta, aiSide);
    best = Math.min(best, s);
    alpha = Math.min(alpha, best);
    if (beta <= alpha) break;
  }
  return best;
}

function depthForLevel(level) {
  if (level <= 1) return 0;
  if (level === 2) return 1;
  if (level === 3) return 2;
  if (level === 4) return 2;
  return 3;
}

/**
 * @param {import('./chess-core.js').ChessPosition} pos
 * @param {import('./chess-core.js').ChessSide} aiSide
 * @param {number} level
 */
export function computeChessAiMove(pos, aiSide, level = 2) {
  if (pos.turn !== aiSide) return null;
  const moves = getLegalMoves(pos);
  if (!moves.length) return null;
  if (level <= 1) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  const depth = depthForLevel(level);
  if (depth === 0) {
    const captures = moves.filter((m) => m.capture);
    if (captures.length && Math.random() < 0.7) {
      return captures[Math.floor(Math.random() * captures.length)];
    }
    return moves[Math.floor(Math.random() * moves.length)];
  }

  let best = null;
  let bestScore = -Infinity;
  const ordered = orderMoves(pos, moves);
  for (const m of ordered) {
    let score = minimax(applyMove(pos, m), depth - 1, -Infinity, Infinity, aiSide);
    if (level >= 5 && m.promotion?.toLowerCase() === "q") score += 8;
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best || ordered[0];
}
