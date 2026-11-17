/**
 * 象棋本機教學（A 方案）：固定問法 → 啟發式分析。
 */
import {
  applyMove,
  getLegalMoves,
  isInCheck,
  opponent,
  pieceValue,
  cloneBoard,
} from "./xiangqi-core.js?v=xiangqi-v13";
import { computeXiangqiAiMove } from "./xiangqi-ai-core.js";

function sameSq(a, b) {
  return Boolean(a && b && a[0] === b[0] && a[1] === b[1]);
}

function sameMove(a, b) {
  return sameSq(a?.from, b?.from) && sameSq(a?.to, b?.to);
}

function explainMove(board, turn, move) {
  if (!move) {
    return { reason: "暫時找不到提示", why: "目前沒有合法手，或局面已結束。" };
  }
  const next = applyMove(board, move);
  const opp = opponent(turn);
  if (move.capture) {
    return {
      reason: `提示：吃子（${pieceLabel(move.capture)}）`,
      why: "這步能吃掉對方的棋。吃子通常很划算，尤其是車馬炮。",
    };
  }
  if (isInCheck(next, opp)) {
    return {
      reason: "提示：這步將軍",
      why: "下完後對方帥／將有危險，對方必須先解將。",
    };
  }
  if (isInCheck(board, turn)) {
    return {
      reason: "提示：先解將",
      why: "你正在被將軍。這步可以解除危險。",
    };
  }
  return {
    reason: "提示：這是目前較穩的一手",
    why: "沒有立刻吃子或將軍時，選能展開子力、保護帥／將的棋。",
  };
}

function pieceLabel(p) {
  const map = {
    R: "車",
    N: "馬",
    C: "炮",
    B: "相",
    A: "仕",
    P: "兵",
    K: "帥",
    r: "車",
    n: "馬",
    c: "炮",
    b: "象",
    a: "士",
    p: "卒",
    k: "將",
  };
  return map[p] || p;
}

/**
 * @param {string[][]} board
 * @param {"red"|"black"} turn
 */
export function coachSuggestMove(board, turn) {
  const move = computeXiangqiAiMove({
    board: cloneBoard(board),
    turn,
    aiSide: turn,
    level: 3,
  });
  const explained = explainMove(board, turn, move);
  return {
    move,
    from: move?.from || null,
    to: move?.to || null,
    reason: explained.reason,
    why: explained.why,
  };
}

/**
 * @param {string[][]} boardBefore
 * @param {"red"|"black"} turn
 * @param {{ from:[number,number], to:[number,number], capture?: string }} humanMove
 */
export function coachRateLastMove(boardBefore, turn, humanMove) {
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

  const best = coachSuggestMove(boardBefore, turn);
  const next = applyMove(boardBefore, humanMove);
  const opp = opponent(turn);

  if (isInCheck(boardBefore, turn)) {
    const still = isInCheck(next, turn);
    if (still) {
      return {
        rating: "bad",
        from: humanMove.from,
        to: humanMove.to,
        altTo: best.to,
        reason: "這步危險：還沒解將",
        why: "你被將軍了，必須先解將。可參考標示的建議點。",
      };
    }
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

  if (humanMove.capture && pieceValue(humanMove.capture) >= 400) {
    return {
      rating: "great",
      from: humanMove.from,
      to: humanMove.to,
      altTo: null,
      reason: "這步很好：吃了大子",
      why: "吃掉對方車馬炮之類的大子，通常是好棋。",
    };
  }

  if (isInCheck(next, opp)) {
    return {
      rating: "great",
      from: humanMove.from,
      to: humanMove.to,
      altTo: null,
      reason: "這步很好：將軍",
      why: "將軍逼對方應付，節奏上很有用。",
    };
  }

  // 漏吃明顯大子
  const captures = getLegalMoves(boardBefore, turn).filter(
    (m) => m.capture && pieceValue(m.capture) >= 400
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
 * @param {string[][]} board
 * @param {"red"|"black"} forSide 我方
 */
export function coachDangerPoints(board, forSide) {
  const opp = opponent(forSide);
  /** @type {Map<string,[number,number]>} */
  const uniq = new Map();
  const push = (r, c) => uniq.set(`${r},${c}`, [r, c]);

  if (isInCheck(board, forSide)) {
    // 被將軍：標出對方能直接打到帥的落點／攻擊點簡化：所有對方吃帥路線上的 to
    for (const m of getLegalMoves(board, opp)) {
      if (m.capture && m.capture.toLowerCase() === "k") push(m.to[0], m.to[1]);
      push(m.to[0], m.to[1]);
    }
  }

  for (const m of getLegalMoves(board, opp)) {
    if (!m.capture) continue;
    // 對方能吃我的子
    const p = board[m.to[0]][m.to[1]];
    if (!p) continue;
    const side = p === p.toUpperCase() ? "red" : "black";
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
    reason: isInCheck(board, forSide)
      ? `危險：你被將軍，標出 ${points.length} 處相關點`
      : `危險：標出 ${points.length} 處可能被吃的子`,
    why: isInCheck(board, forSide)
      ? "紅點與戰鬥點跟解將有關。先化解將軍再攻擊。"
      : "這些位置上的棋可能被對方吃到。可逃、可護、或先交換。",
  };
}
