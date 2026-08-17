import {
  opponent,
  listLegalMoves,
  playMove,
  clonePosition,
  groupAt,
  starPoints,
} from "./go-core.js?v=go-v1";
import {
  NIRVANA_LEVEL,
  katagoLoadState,
  requestKatagoMove,
  ensureKatagoReady,
  terminateKatagoEngine,
} from "./go-katago-engine.js?v=go-v1";

export const AI_PLAYER_ID = "__go_ai__";
export { NIRVANA_LEVEL, katagoLoadState, ensureKatagoReady, terminateKatagoEngine };

/**
 * 難度卡：label＝名稱，strength＝棋力（一定要講清楚），desc＝打起來感覺
 */
export const GO_AI_LEVELS = [
  {
    level: 1,
    label: "入門",
    strength: "棋力：約剛學會規則（遠低於業餘 20 級）",
    desc: "會提明顯的子、也會逃叫吃，偶爾下軟。適合熟悉棋盤。",
  },
  {
    level: 2,
    label: "普通",
    strength: "棋力：約業餘 15～20 級陪練",
    desc: "會連棋、靠近、佔大場。日常輕鬆對打。",
  },
  {
    level: 3,
    label: "高手",
    strength: "棋力：約業餘 10～15 級",
    desc: "優先處理叫吃與對殺，布局較穩。預設推薦。",
  },
  {
    level: 4,
    label: "大師",
    strength: "棋力：約業餘 5～10 級",
    desc: "會看對手下一步反擊，少送吃，明顯較難。",
  },
  {
    level: 5,
    label: "宗師",
    strength: "棋力：約業餘 1～5 級（內建啟發式最強）",
    desc: "多手推演＋嚴格挑選。還沒載入 KataGo 前的天花板。",
  },
  {
    level: 6,
    label: "涅槃",
    strength: "棋力：KataGo 小網路 b6c96＋搜尋 ≈ 業餘高段～職業入門量級（視手機／電腦）",
    desc: "開源最強引擎系列（KataGo）。首次約下載 3.6 MB 網路；明顯強過上面五級。不是完整桌面滿血最大網路。",
  },
];

export function isGoNirvanaLevel(level) {
  return Number(level) >= NIRVANA_LEVEL;
}
const DIRS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

/**
 * @param {import('./go-core.js').GoPosition} pos
 * @param {number} level
 * @returns {[number,number]|null} null = pass
 */
export function pickGoAiMove(pos, level) {
  const lv = Math.max(1, Math.min(5, Number(level) || 2));
  const moves = candidateMoves(pos, lv);
  if (!moves.length) return null;

  if (lv === 1) {
    const scored = moves.map((m) => ({ m, s: scoreMove(pos, m, lv) }));
    scored.sort((a, b) => b.s - a.s);
    const top = scored.slice(0, Math.min(8, scored.length));
    return top[Math.floor(Math.random() * top.length)].m;
  }

  if (lv <= 3) {
    const scored = moves.map((m) => ({ m, s: scoreMove(pos, m, lv) }));
    scored.sort((a, b) => b.s - a.s);
    const topN = lv === 2 ? 5 : 3;
    const top = scored.slice(0, Math.min(topN, scored.length));
    const best = top[0].s;
    const margin = lv === 2 ? 12 : 6;
    const near = top.filter((x) => x.s >= best - margin);
    return near[Math.floor(Math.random() * near.length)].m;
  }

  // 4–5：對前幾手做對手回應懲罰
  const depthOpp = lv >= 5 ? 2 : 1;
  const pre = moves
    .map((m) => ({ m, s: scoreMove(pos, m, lv) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, lv >= 5 ? 14 : 10);

  let bestM = pre[0].m;
  let bestS = -Infinity;
  for (const { m, s: base } of pre) {
    let s = base;
    try {
      const next = playMove(clonePosition(pos), m[0], m[1]);
      const reply = bestOpponentScore(next, lv, depthOpp);
      s -= reply * (lv >= 5 ? 0.95 : 0.75);
      // 自己這步後若立刻被大吃，重罰
      if (reply >= 35) s -= 20;
    } catch {
      s = -999;
    }
    if (s > bestS) {
      bestS = s;
      bestM = m;
    }
  }

  if (lv === 4) {
    // 大師保留一點變化：前兩名接近時可選第二
    const ranked = pre
      .map(({ m }) => {
        try {
          const next = playMove(clonePosition(pos), m[0], m[1]);
          const s = scoreMove(pos, m, lv) - bestOpponentScore(next, lv, 1) * 0.75;
          return { m, s };
        } catch {
          return { m, s: -999 };
        }
      })
      .sort((a, b) => b.s - a.s);
    if (ranked.length >= 2 && ranked[0].s - ranked[1].s < 5 && Math.random() < 0.25) {
      return ranked[1].m;
    }
    return ranked[0]?.m || bestM;
  }

  return bestM;
}

/**
 * 對手在下一手（或再一手）能拿到的最好分數（站在對手視角）。
 * @param {import('./go-core.js').GoPosition} pos
 * @param {number} level
 * @param {number} depth
 */
function bestOpponentScore(pos, level, depth) {
  const moves = candidateMoves(pos, level).slice(0, level >= 5 ? 12 : 8);
  if (!moves.length) return 0;
  let best = -Infinity;
  for (const m of moves) {
    let s = scoreMove(pos, m, Math.max(2, level - 1));
    if (depth > 1) {
      try {
        const next = playMove(clonePosition(pos), m[0], m[1]);
        // 我方再應一手（簡化）：扣掉我方最佳反制的一部分
        const myReplies = candidateMoves(next, level).slice(0, 6);
        let myBest = -Infinity;
        for (const rm of myReplies) {
          myBest = Math.max(myBest, scoreMove(next, rm, level));
        }
        if (myBest > -Infinity) s -= myBest * 0.35;
      } catch {
        /* ignore */
      }
    }
    if (s > best) best = s;
  }
  return best === -Infinity ? 0 : best;
}

/**
 * @param {import('./go-core.js').GoPosition} pos
 * @param {number} level
 * @returns {[number,number][]}
 */
function candidateMoves(pos, level) {
  const all = listLegalMoves(pos);
  if (!all.length) return [];
  if (pos.size <= 9 || all.length <= 48) return all;

  const must = new Set();
  const soft = new Set();
  const stars = new Set(starPoints(pos.size).map(([r, c]) => `${r},${c}`));
  const color = pos.turn;
  const opp = opponent(color);

  for (const [r, c] of all) {
    const key = `${r},${c}`;
    if (stars.has(key)) soft.add(key);
    let nearStone = false;
    for (const [dr, dc] of DIRS) {
      for (let k = 1; k <= 2; k++) {
        const nr = r + dr * k;
        const nc = c + dc * k;
        if (nr < 0 || nc < 0 || nr >= pos.size || nc >= pos.size) continue;
        const v = pos.board[nr][nc];
        if (v === 0) continue;
        nearStone = true;
        if (k === 1 && v === opp) {
          const g = groupAt(pos, nr, nc);
          if (g.libs.size <= 2) must.add(key);
        }
        if (k === 1 && v === color) {
          const g = groupAt(pos, nr, nc);
          if (g.libs.size <= 2) must.add(key);
        }
      }
    }
    if (nearStone) soft.add(key);
  }

  const picked = [];
  const seen = new Set();
  for (const key of must) {
    if (seen.has(key)) continue;
    seen.add(key);
    const [r, c] = key.split(",").map(Number);
    picked.push([r, c]);
  }
  for (const key of soft) {
    if (picked.length >= (level >= 4 ? 56 : 40)) break;
    if (seen.has(key)) continue;
    seen.add(key);
    const [r, c] = key.split(",").map(Number);
    picked.push([r, c]);
  }
  if (picked.length < 20) {
    for (const m of all) {
      const key = `${m[0]},${m[1]}`;
      if (seen.has(key)) continue;
      picked.push(m);
      if (picked.length >= 28) break;
    }
  }
  return picked.length ? picked : all;
}

/**
 * @param {import('./go-core.js').GoPosition} pos
 * @param {[number,number]} move
 * @param {number} level
 */
function scoreMove(pos, move, level) {
  const [r, c] = move;
  const color = pos.turn;
  const opp = opponent(color);
  let next;
  try {
    next = playMove(clonePosition(pos), r, c);
  } catch {
    return -999;
  }

  let s = 0;
  const gained = next.captured[color - 1] - pos.captured[color - 1];
  s += gained * (level >= 3 ? 55 : 42);

  const own = groupAt(next, r, c);
  if (own.libs.size === 1) s -= level >= 3 ? 55 : 30;
  else if (own.libs.size === 2) s -= level >= 4 ? 12 : 4;
  else s += Math.min(8, own.libs.size);

  // 打吃／逃氣
  for (const [dr, dc] of DIRS) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr < 0 || nc < 0 || nr >= pos.size || nc >= pos.size) continue;
    if (pos.board[nr][nc] === opp) {
      const g = groupAt(pos, nr, nc);
      if (g.libs.size === 1) s += 28;
      if (g.libs.size === 2) s += level >= 2 ? 14 : 8;
    }
    if (pos.board[nr][nc] === color) {
      const g = groupAt(pos, nr, nc);
      if (g.libs.size === 1) s += 32;
      if (g.libs.size === 2) s += 10;
      s += 3; // 連自己
    }
  }

  // 落子後對方是否立刻只剩少氣
  for (const [dr, dc] of DIRS) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr < 0 || nc < 0 || nr >= pos.size || nc >= pos.size) continue;
    if (next.board[nr][nc] !== opp) continue;
    const g = groupAt(next, nr, nc);
    if (g.libs.size === 1) s += 18;
    if (g.libs.size === 0) s += 40;
  }

  // 開局大場：星、角、邊
  const n = pos.size;
  const stones = countStones(pos);
  if (stones < n * 1.2) {
    const stars = starPoints(n);
    for (const [sr, sc] of stars) {
      if (r === sr && c === sc) s += level >= 2 ? 16 : 10;
    }
    const edge = Math.min(r, c, n - 1 - r, n - 1 - c);
    if (edge === 2 || edge === 3) s += 6;
    if (edge <= 1) s -= 8;
    const mid = (n - 1) / 2;
    if (stones < 8) s -= (Math.abs(r - mid) + Math.abs(c - mid)) * 0.15;
  } else {
    const mid = (n - 1) / 2;
    s += 4 - (Math.abs(r - mid) + Math.abs(c - mid)) * 0.12;
  }

  // 切斷：落在對方兩子之間的空隙（簡化）
  if (level >= 3) {
    let oppAdj = 0;
    for (const [dr, dc] of DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= pos.size || nc >= pos.size) continue;
      if (pos.board[nr][nc] === opp) oppAdj++;
    }
    if (oppAdj >= 2) s += 7;
  }

  return s;
}

function countStones(pos) {
  let n = 0;
  for (let r = 0; r < pos.size; r++) {
    for (let c = 0; c < pos.size; c++) {
      if (pos.board[r][c]) n++;
    }
  }
  return n;
}

/**
 * @param {import('./go-core.js').GoPosition} pos
 * @param {number} level
 * @returns {Promise<[number,number]|null>}
 */
export function requestGoAiMove(pos, level) {
  const lv = Math.max(1, Math.min(6, Number(level) || 2));
  if (lv >= NIRVANA_LEVEL) {
    return requestKatagoMove(pos).catch((err) => {
      console.warn("[go] KataGo failed, fallback to 宗師", err);
      katagoLoadState.failReason = err?.message || String(err);
      return new Promise((resolve) => {
        setTimeout(() => resolve(pickGoAiMove(pos, 5)), 80);
      });
    });
  }
  const delay = lv <= 2 ? 120 : lv === 3 ? 220 : lv === 4 ? 380 : 520;
  return new Promise((resolve) => {
    setTimeout(() => resolve(pickGoAiMove(pos, lv)), delay);
  });
}
