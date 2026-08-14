import {
  BLACK,
  WHITE,
  opponent,
  listLegalMoves,
  playMove,
  clonePosition,
  groupAt,
} from "./go-core.js?v=go-v1";

export const AI_PLAYER_ID = "__go_ai__";

/**
 * @param {import('./go-core.js').GoPosition} pos
 * @param {number} level
 * @returns {[number,number]|null} null = pass
 */
export function pickGoAiMove(pos, level) {
  const moves = listLegalMoves(pos);
  if (!moves.length) return null;
  if (level <= 1) return moves[Math.floor(Math.random() * moves.length)];

  const scored = moves.map((m) => ({ m, s: scoreMove(pos, m, level) }));
  scored.sort((a, b) => b.s - a.s);
  const topN = level >= 3 ? 3 : 6;
  const top = scored.slice(0, Math.min(topN, scored.length));
  const best = top[0].s;
  const near = top.filter((x) => x.s >= best - 8);
  return near[Math.floor(Math.random() * near.length)].m;
}

function scoreMove(pos, move, level) {
  const [r, c] = move;
  const color = pos.turn;
  const opp = opponent(color);
  let s = 0;
  const next = (() => {
    try {
      return playMove(clonePosition(pos), r, c);
    } catch {
      return null;
    }
  })();
  if (!next) return -999;
  const gained = next.captured[color - 1] - pos.captured[color - 1];
  s += gained * 40;
  const mid = (pos.size - 1) / 2;
  s += 6 - (Math.abs(r - mid) + Math.abs(c - mid)) * 0.4;
  if (level >= 2) {
    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= pos.size || nc >= pos.size) continue;
      if (pos.board[nr][nc] === opp) {
        const g = groupAt(pos, nr, nc);
        if (g.libs.size === 1) s += 25;
        if (g.libs.size === 2) s += 8;
      }
      if (pos.board[nr][nc] === color) {
        const g = groupAt(pos, nr, nc);
        if (g.libs.size === 1) s += 22;
      }
    }
  }
  const own = groupAt(next, r, c);
  if (own.libs.size === 1) s -= 18;
  return s;
}

export function requestGoAiMove(pos, level) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(pickGoAiMove(pos, level)), 80);
  });
}
