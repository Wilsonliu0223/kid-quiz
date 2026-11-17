/**
 * 五子棋本機教學（A 方案）：固定問法 → 威脅／戰術分析，不呼叫雲端 LLM。
 */
import { wouldBlackForbidden } from "./gomoku-renju.js?v=gomoku-v12";
import {
  createThreatContext,
  findImmediateWinMove,
  findMustBlockMove,
  findProactiveDefenseMove,
  getFourThreatMoves,
  getOpenThreeThreatMoves,
} from "./gomoku-ai-threat.js?v=gomoku-v11";
import { findUrgentTacticalMove, computeAiMove } from "./gomoku-ai-core.js?v=gomoku-v11";

const SIZE = 15;
const DIRS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

function hasFiveWin(cells, row, col, player) {
  for (const [dr, dc] of DIRS) {
    let n = 1;
    for (const sign of [-1, 1]) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && cells[r][c] === player) {
        n += 1;
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (n >= 5) return true;
  }
  return false;
}

function isForbidden(cells, r, c, player, blackId, whiteId) {
  if (player !== blackId) return false;
  return !!wouldBlackForbidden(cells, r, c, blackId, whiteId, hasFiveWin);
}

const threatCtx = createThreatContext({ hasFiveWin, isForbidden });

function cloneBoard(cells) {
  return cells.map((row) => [...row]);
}

function cellKey(r, c) {
  return `${r},${c}`;
}

function sameMove(a, b) {
  return Boolean(a && b && a[0] === b[0] && a[1] === b[1]);
}

/**
 * @param {(''|string)[][]} cells
 * @param {{ sideToMove: string, blackId: string, whiteId: string }} opts
 * @returns {{ move: [number, number]|null, reason: string, why: string }}
 */
export function coachSuggestMove(cells, opts) {
  const { sideToMove, blackId, whiteId } = opts;
  const board = cloneBoard(cells);
  const opp = sideToMove === blackId ? whiteId : blackId;

  const win = findImmediateWinMove(board, sideToMove, threatCtx, blackId, whiteId);
  if (win) {
    return {
      move: win,
      reason: "提示：這裡可以連五獲勝",
      why: "這格下下去會連成五子，立刻贏棋，所以優先下。",
    };
  }

  const block = findMustBlockMove(board, opp, sideToMove, threatCtx, blackId, whiteId);
  if (block) {
    return {
      move: block,
      reason: "提示：要先擋對方的殺棋",
      why: "對方下一手就能連五。不擋這裡會馬上輸，所以先守。",
    };
  }

  const proactive = findProactiveDefenseMove(
    board,
    sideToMove,
    opp,
    threatCtx,
    blackId,
    whiteId
  );
  if (proactive) {
    return {
      move: proactive,
      reason: "提示：先破掉對方的大威脅",
      why: "對方快做出活三或衝四。先點這格，比較不會被一路追著打。",
    };
  }

  const tactical = findUrgentTacticalMove(board, {
    aiId: sideToMove,
    blackId,
    whiteId,
  });
  if (tactical) {
    return {
      move: tactical,
      reason: "提示：這是較急的攻防點",
      why: "這步能形成或阻止重要威脅（例如衝四、活三），比隨便佔空位更有用。",
    };
  }

  const move = computeAiMove(board, {
    aiId: sideToMove,
    blackId,
    whiteId,
    difficulty: 2,
  });
  if (move) {
    return {
      move,
      reason: "提示：這是目前較穩的一手",
      why: "沒有立刻殺棋或必擋點時，選靠近戰場、能發展自己形狀的點。",
    };
  }
  return { move: null, reason: "暫時找不到提示", why: "棋盤上沒有明顯可下的點。" };
}

/**
 * 評估「剛下的那步」好不好（以當下盤面的最後一手為準）。
 * @param {(''|string)[][]} cells
 * @param {[number, number]} lastMove
 * @param {{ moverId: string, blackId: string, whiteId: string }} opts
 */
export function coachRateLastMove(cells, lastMove, opts) {
  if (!lastMove) {
    return {
      rating: "none",
      marks: [],
      reason: "還沒有棋步可評",
      why: "先下一手，再按「這步好嗎」。",
    };
  }
  const { moverId, blackId, whiteId } = opts;
  const [lr, lc] = lastMove;
  if (cells[lr]?.[lc] !== moverId) {
    return {
      rating: "none",
      marks: [],
      reason: "找不到剛下的那步",
      why: "棋盤狀態和最後一手對不上，請再下一手後重試。",
    };
  }

  const before = cloneBoard(cells);
  before[lr][lc] = "";
  const opp = moverId === blackId ? whiteId : blackId;

  if (hasFiveWin(cells, lr, lc, moverId)) {
    return {
      rating: "great",
      marks: [lastMove],
      reason: "這步很好：直接連五獲勝",
      why: "這手完成五連，已經贏了。",
    };
  }

  const mustBlock = findMustBlockMove(before, opp, moverId, threatCtx, blackId, whiteId);
  if (mustBlock && !sameMove(mustBlock, lastMove)) {
    return {
      rating: "bad",
      marks: [lastMove, mustBlock],
      reason: "這步危險：漏擋對方殺棋",
      why: "下這步前，對方已經有一手能連五。應該先擋標示的那格。",
    };
  }

  const best = coachSuggestMove(before, {
    sideToMove: moverId,
    blackId,
    whiteId,
  });
  if (best.move && sameMove(best.move, lastMove)) {
    return {
      rating: "great",
      marks: [lastMove],
      reason: "這步很好：和推薦手一樣",
      why: best.why,
    };
  }

  const myWinAfter = findImmediateWinMove(before, moverId, threatCtx, blackId, whiteId);
  if (myWinAfter && !sameMove(myWinAfter, lastMove)) {
    return {
      rating: "bad",
      marks: [lastMove, myWinAfter],
      reason: "這步可惜：漏了立刻贏的機會",
      why: "當時已有連五點，應該下標示的那格。",
    };
  }

  if (best.move) {
    return {
      rating: "ok",
      marks: [lastMove, best.move],
      reason: "這步還可以，另有更穩的點",
      why: `你下的也能走；若選推薦點，理由是：${best.why}`,
    };
  }

  return {
    rating: "ok",
    marks: [lastMove],
    reason: "這步普通：沒有大錯",
    why: "沒有立刻殺棋或漏擋。可繼續留意對方活三與衝四。",
  };
}

/**
 * 找出對「我方」危險的點（對方衝四／活三等）。
 * @param {(''|string)[][]} cells
 * @param {{ forPlayer: string, blackId: string, whiteId: string }} opts
 */
export function coachDangerPoints(cells, opts) {
  const { forPlayer, blackId, whiteId } = opts;
  const board = cloneBoard(cells);
  const opp = forPlayer === blackId ? whiteId : blackId;
  /** @type {Map<string, [number, number]>} */
  const map = new Map();

  const kill = findImmediateWinMove(board, opp, threatCtx, blackId, whiteId);
  if (kill) map.set(cellKey(kill[0], kill[1]), kill);

  for (const [r, c] of getFourThreatMoves(board, opp, threatCtx, blackId, whiteId, 4)) {
    map.set(cellKey(r, c), [r, c]);
  }
  for (const [r, c] of getOpenThreeThreatMoves(board, opp, threatCtx, blackId, whiteId, 4)) {
    map.set(cellKey(r, c), [r, c]);
  }

  const points = [...map.values()];
  if (!points.length) {
    return {
      points: [],
      reason: "目前沒看到明顯危險點",
      why: "對方暫時沒有衝四或活三逼你立刻回應。仍要留意下一步成形。",
    };
  }

  const hasKill = Boolean(kill);
  return {
    points,
    reason: hasKill
      ? `危險：有 ${points.length} 處要立刻注意（含殺棋）`
      : `危險：標出 ${points.length} 處對方威脅`,
    why: hasKill
      ? "紅色格是對方下一步可能連五或做成大威脅的地方，請優先處理。"
      : "這些空位是對方活三／衝四相關點。可擋、可交換，不要假裝沒看到。",
  };
}
