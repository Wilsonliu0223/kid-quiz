/**
 * 圍棋本機教學（A 方案）：固定問法 → 啟發式／叫吃分析，不呼叫雲端 LLM。
 */
import {
  opponent,
  groupAt,
  playMove,
  playPass,
  clonePosition,
  createPosition,
  listLegalMoves,
} from "./go-core.js?v=go-v1";
import { pickGoAiMove } from "./go-ai.js?v=go-v4";

const DIRS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

function sameMove(a, b) {
  return Boolean(a && b && a[0] === b[0] && a[1] === b[1]);
}

function cellKey(r, c) {
  return `${r},${c}`;
}

/**
 * @param {import('./go-core.js').GoPosition} pos
 * @param {{ pass?: boolean, r?: number, c?: number }[]} log
 */
export function rebuildGoFromLog(log, size) {
  let pos = createPosition(size);
  for (const step of log || []) {
    if (step.pass) pos = playPass(pos);
    else pos = playMove(pos, step.r, step.c);
  }
  return pos;
}

/**
 * @param {import('./go-core.js').GoPosition} pos
 * @param {[number, number]} move
 */
function explainSuggest(pos, move) {
  const [r, c] = move;
  const color = pos.turn;
  const opp = opponent(color);
  let next;
  try {
    next = playMove(clonePosition(pos), r, c);
  } catch {
    return {
      reason: "提示：這是目前較穩的一手",
      why: "引擎選了這點。可先連自己、提子或佔大場。",
    };
  }

  const gained = next.captured[color - 1] - pos.captured[color - 1];
  if (gained > 0) {
    return {
      reason: `提示：這裡可以提 ${gained} 子`,
      why: "對方棋子沒氣了。提子又能變厚，通常優先考慮。",
    };
  }

  // 逃自己的叫吃
  for (const [dr, dc] of DIRS) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr < 0 || nc < 0 || nr >= pos.size || nc >= pos.size) continue;
    if (pos.board[nr][nc] !== color) continue;
    const g = groupAt(pos, nr, nc);
    if (g.libs.size === 1 && g.libs.has(cellKey(r, c))) {
      return {
        reason: "提示：先逃／補自己的叫吃",
        why: "你的一塊棋只剩一口氣。不補這裡，對方下一手就可能提掉。",
      };
    }
  }

  // 打吃對方
  for (const [dr, dc] of DIRS) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr < 0 || nc < 0 || nr >= pos.size || nc >= pos.size) continue;
    if (next.board[nr][nc] !== opp) continue;
    const g = groupAt(next, nr, nc);
    if (g.libs.size === 1) {
      return {
        reason: "提示：這步打吃對方",
        why: "下完後對方那塊只剩一口氣。他若不逃，你下一手就能提。",
      };
    }
  }

  return {
    reason: "提示：這是目前較穩的一手",
    why: "沒有立刻提子或叫吃時，選能連自己、靠近戰場或佔大場的點。",
  };
}

/**
 * @param {import('./go-core.js').GoPosition} pos
 */
export function coachSuggestMove(pos) {
  const move = pickGoAiMove(clonePosition(pos), 3);
  if (!move) {
    return {
      move: null,
      reason: "暫時找不到提示（可考慮停著）",
      why: "合法點很少或局面適合停一手。也可以自己找大場。",
    };
  }
  const explained = explainSuggest(pos, move);
  return { move, reason: explained.reason, why: explained.why };
}

/**
 * @param {import('./go-core.js').GoPosition} before
 * @param {[number, number]} lastMove
 */
export function coachRateLastMove(before, lastMove) {
  if (!lastMove) {
    return {
      rating: "none",
      marks: [],
      emptyMarks: [],
      reason: "還沒有棋步可評",
      why: "先下一手，再按「這步好嗎」。",
    };
  }

  const best = coachSuggestMove(before);
  let next;
  try {
    next = playMove(clonePosition(before), lastMove[0], lastMove[1]);
  } catch {
    return {
      rating: "bad",
      marks: [lastMove],
      emptyMarks: [],
      reason: "這步不合法",
      why: "這點不能下（可能自殺或打劫）。請換合法點。",
    };
  }

  const color = before.turn;
  const opp = opponent(color);
  const gained = next.captured[color - 1] - before.captured[color - 1];

  // 漏救叫吃
  const atariLibs = findAtariLibertyPoints(before, color);
  const missedSave =
    atariLibs.length > 0 && !atariLibs.some((m) => sameMove(m, lastMove));
  if (missedSave && gained <= 0) {
    return {
      rating: "bad",
      marks: [lastMove],
      emptyMarks: atariLibs.slice(0, 4),
      reason: "這步危險：漏補自己的叫吃",
      why: "你有一塊棋只剩一口氣。應先補標示的氣口，否則對方可能提子。",
    };
  }

  // 漏提
  const capturePoints = findImmediateCapturePoints(before, color);
  if (
    capturePoints.length > 0 &&
    !capturePoints.some((m) => sameMove(m, lastMove)) &&
    gained <= 0
  ) {
    return {
      rating: "ok",
      marks: [lastMove],
      emptyMarks: capturePoints.slice(0, 3),
      reason: "這步還可以，但漏了提子機會",
      why: "盤上有對方只剩一口氣的棋。提子通常很賺，之後可優先看這些點。",
    };
  }

  if (best.move && sameMove(best.move, lastMove)) {
    return {
      rating: "great",
      marks: [lastMove],
      emptyMarks: [],
      reason: "這步很好：和推薦手一樣",
      why: best.why,
    };
  }

  if (gained > 0) {
    return {
      rating: "great",
      marks: [lastMove],
      emptyMarks: [],
      reason: `這步很好：提了 ${gained} 子`,
      why: "提子直接得分又變厚，是好棋。",
    };
  }

  if (best.move) {
    return {
      rating: "ok",
      marks: [lastMove],
      emptyMarks: [best.move],
      reason: "這步還可以，另有更穩的點",
      why: `你下的也能走；若選推薦點，理由是：${best.why}`,
    };
  }

  return {
    rating: "ok",
    marks: [lastMove],
    emptyMarks: [],
    reason: "這步普通：沒有大錯",
    why: "沒有明顯漏提或漏逃。繼續留意叫吃與大場。",
  };
}

/**
 * 對「我方顏色」危險：對方可提之處、我方叫吃氣口、對方打吃點。
 * @param {import('./go-core.js').GoPosition} pos
 * @param {1|2} forColor 我方棋色
 */
export function coachDangerPoints(pos, forColor) {
  /** @type {Map<string, [number, number]>} */
  const uniq = new Map();
  const push = (r, c) => {
    if (r < 0 || c < 0 || r >= pos.size || c >= pos.size) return;
    if (pos.board[r][c] !== 0) return;
    uniq.set(cellKey(r, c), [r, c]);
  };

  const opp = opponent(forColor);
  // 我方叫吃氣口、對方叫吃氣口（提／逃相關）
  for (const [r, c] of findAtariLibertyPoints(pos, forColor)) push(r, c);
  for (const [r, c] of findAtariLibertyPoints(pos, opp)) push(r, c);
  if (pos.turn === opp) {
    for (const [r, c] of findImmediateCapturePoints(pos, opp)) push(r, c);
  }

  const list = [...uniq.values()];
  if (!list.length) {
    return {
      points: [],
      reason: "目前沒看到明顯危險點",
      why: "沒有立刻叫吃或可提的氣口。仍要留意下一手被打吃。",
    };
  }
  return {
    points: list.slice(0, 12),
    reason: `危險：標出 ${Math.min(list.length, 12)} 處叫吃／提子相關點`,
    why: "紅點多半是「只剩一口氣」的氣口：要逃、要提、或要補。先處理這些再佔大場。",
  };
}

/**
 * 某色棋「只剩一口氣」的那口氣座標。
 * @param {import('./go-core.js').GoPosition} pos
 * @param {1|2} color
 * @returns {[number,number][]}
 */
function findAtariLibertyPoints(pos, color) {
  /** @type {Map<string,[number,number]>} */
  const uniq = new Map();
  const seenGroups = new Set();
  for (let r = 0; r < pos.size; r++) {
    for (let c = 0; c < pos.size; c++) {
      if (pos.board[r][c] !== color) continue;
      const g = groupAt(pos, r, c);
      const gk = [...g.stones].sort().join(";");
      if (seenGroups.has(gk)) continue;
      seenGroups.add(gk);
      if (g.libs.size !== 1) continue;
      const lib = [...g.libs][0];
      const [lr, lc] = lib.split(",").map(Number);
      uniq.set(lib, [lr, lc]);
    }
  }
  return [...uniq.values()];
}

/**
 * 當前手可立刻提子的落點。
 * @param {import('./go-core.js').GoPosition} pos
 * @param {1|2} color
 */
function findImmediateCapturePoints(pos, color) {
  if (pos.turn !== color) {
    // 仍掃描：以該色視角找「若輪到他」的提點
    const shadow = clonePosition(pos);
    shadow.turn = color;
    return findImmediateCapturePoints(shadow, color);
  }
  /** @type {[number,number][]} */
  const out = [];
  for (const [r, c] of listLegalMoves(pos)) {
    try {
      const next = playMove(clonePosition(pos), r, c);
      if (next.captured[color - 1] > pos.captured[color - 1]) out.push([r, c]);
    } catch {
      /* ignore */
    }
  }
  return out;
}
