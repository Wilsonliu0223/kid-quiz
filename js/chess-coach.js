/**
 * 西洋棋本機教學（A 方案）：固定問法 → minimax 啟發式。
 */
import {
  applyMove,
  clonePosition,
  getLegalMoves,
  isInCheck,
  opponent,
  pieceValue,
} from "./chess-core.js?v=chess-v5";
import { computeChessAiMove } from "./chess-ai-core.js?v=chess-v5";

function sameSq(a, b) {
  return Boolean(a && b && a[0] === b[0] && a[1] === b[1]);
}

function sameMove(a, b) {
  return sameSq(a?.from, b?.from) && sameSq(a?.to, b?.to);
}

function allMoves(pos) {
  return getLegalMoves(pos);
}

function explainMove(pos, move) {
  if (!move) {
    return { reason: "暫時找不到提示", why: "目前沒有合法手，或局面已結束。" };
  }
  const next = applyMove(pos, move);
  const opp = opponent(pos.turn);
  if (move.capture) {
    return {
      reason: "提示：吃子",
      why: "這步能吃掉對方的棋。吃子前也要看會不會被反吃。",
    };
  }
  if (isInCheck(next.board, opp)) {
    return {
      reason: "提示：這步將軍",
      why: "下完後對方王有危險，對方必須先解將。",
    };
  }
  if (isInCheck(pos.board, pos.turn)) {
    return {
      reason: "提示：先解將",
      why: "你正在被將軍。這步可以解除危險。",
    };
  }
  if (move.promotion) {
    return {
      reason: "提示：兵升變",
      why: "兵走到底可以變成后等大子，通常很強。",
    };
  }
  return {
    reason: "提示：這是目前較穩的一手",
    why: "沒有立刻吃子或將軍時，選能展開子力、控制中心的棋。",
  };
}

/**
 * @param {import('./chess-core.js').ChessPosition} pos
 */
export function coachSuggestMove(pos) {
  const side = pos.turn;
  const move = computeChessAiMove(clonePosition(pos), side, 3);
  const explained = explainMove(pos, move);
  return {
    move,
    from: move?.from || null,
    to: move?.to || null,
    reason: explained.reason,
    why: explained.why,
  };
}

/**
 * @param {import('./chess-core.js').ChessPosition} before
 * @param {{ from:[number,number], to:[number,number], capture?: string, promotion?: string }} humanMove
 */
export function coachRateLastMove(before, humanMove) {
  if (!humanMove?.from || !humanMove?.to) {
    return {
      rating: "none",
      from: null,
      to: null,
      altTo: null,
      reason: "還沒有棋步可評",
      why: "先走一手，再按「這步好嗎」。",
    };
  }

  const best = coachSuggestMove(before);
  const next = applyMove(before, humanMove);
  const side = before.turn;
  const opp = opponent(side);

  if (isInCheck(before.board, side) && isInCheck(next.board, side)) {
    return {
      rating: "bad",
      from: humanMove.from,
      to: humanMove.to,
      altTo: best.to,
      reason: "這步危險：還沒解將",
      why: "你被將軍了，必須先解將。可參考標示的建議點。",
    };
  }

  if (best.move && sameMove(best.move, humanMove)) {
    return {
      rating: "great",
      from: humanMove.from,
      to: humanMove.to,
      altTo: null,
      reason: "這步很好：和推薦手一樣",
      why: best.why,
    };
  }

  if (humanMove.capture && pieceValue(humanMove.capture) >= 500) {
    return {
      rating: "great",
      from: humanMove.from,
      to: humanMove.to,
      altTo: null,
      reason: "這步很好：吃了大子",
      why: "吃掉對方車／后等大子，通常是好棋。",
    };
  }

  if (isInCheck(next.board, opp)) {
    return {
      rating: "great",
      from: humanMove.from,
      to: humanMove.to,
      altTo: null,
      reason: "這步很好：將軍",
      why: "將軍逼對方應付，節奏上很有用。",
    };
  }

  const captures = allMoves(before).filter(
    (m) => m.capture && pieceValue(m.capture) >= 500
  );
  if (
    captures.length &&
    !captures.some((m) => sameMove(m, humanMove)) &&
    !humanMove.capture
  ) {
    return {
      rating: "ok",
      from: humanMove.from,
      to: humanMove.to,
      altTo: captures[0].to,
      reason: "這步還可以，但漏了吃大子",
      why: "盤上有對方大子可吃。下次可先看能不能吃。",
    };
  }

  return {
    rating: "ok",
    from: humanMove.from,
    to: humanMove.to,
    altTo: best.to,
    reason: "這步還可以，另有更穩的點",
    why: best.move
      ? `你走的也能用；若選推薦手，理由是：${best.why}`
      : "沒有大錯。繼續留意將軍與大子交換。",
  };
}

/**
 * @param {import('./chess-core.js').ChessPosition} pos
 * @param {"white"|"black"} forSide
 */
export function coachDangerPoints(pos, forSide) {
  /** @type {Map<string,[number,number]>} */
  const uniq = new Map();
  const push = (r, c) => uniq.set(`${r},${c}`, [r, c]);
  const opp = opponent(forSide);

  // 用「輪到對方」的複本找攻擊點
  const shadow = clonePosition(pos);
  shadow.turn = opp;
  const oppMoves = allMoves(shadow);

  if (isInCheck(pos.board, forSide)) {
    for (const m of oppMoves) {
      if (m.capture && m.capture.toLowerCase() === "k") push(m.to[0], m.to[1]);
      push(m.to[0], m.to[1]);
    }
  }

  for (const m of oppMoves) {
    if (!m.capture) continue;
    const p = pos.board[m.to[0]][m.to[1]];
    if (!p) continue;
    const side = p === p.toUpperCase() ? "white" : "black";
    if (side === forSide) push(m.to[0], m.to[1]);
  }

  const points = [...uniq.values()].slice(0, 16);
  if (!points.length) {
    return {
      points: [],
      reason: "目前沒看到明顯危險點",
      why: "對方暫時沒有直接吃你子或將軍。仍要留意下一步被將軍。",
    };
  }
  return {
    points,
    reason: isInCheck(pos.board, forSide)
      ? `危險：你被將軍，標出 ${points.length} 處相關點`
      : `危險：標出 ${points.length} 處可能被吃的子`,
    why: isInCheck(pos.board, forSide)
      ? "紅點跟解將有關。先化解將軍再攻擊。"
      : "這些位置上的棋可能被對方吃到。可逃、可護、或先交換。",
  };
}
