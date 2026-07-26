import { openDuoModePicker } from "./online-duo.js";
import {
  ensureChessBoardSvg,
  renderChessBoardSvg,
  renderChessStatusBar,
  resetChessBoardSvg,
} from "./chess-board-ui.js?v=chess-v4";
import {
  applyMove,
  clonePosition,
  createPosition,
  findKing,
  gameResult,
  getLegalMovesFrom,
  isInCheck,
  shouldFlipBoardForSide,
  sideOfPiece,
} from "./chess-core.js?v=chess-v4";
import { getChildName, otherDuoPlayer } from "./children.js";
import { getSelectedChild } from "./store.js";
import {
  canStartDuoBattle,
  getActiveDuoPlayerIds,
  refreshDuoBattleUI,
  renderDuoPickButtons,
} from "./duo-pick.js";
import {
  AI_PLAYER_ID,
  GRANDMASTER_LEVEL,
  requestChessAiMove,
  terminateChessAiWorker,
} from "./chess-ai.js?v=chess-v4";

/** @typedef {"local"|"ai"} SetupMode */

/** @type {SetupMode} */
let setupMode = "local";
let aiDifficulty = 2;
let aiMovePending = false;
let aiMoveToken = 0;
let localWinUiDismissed = false;
let pendingPromotion = null;

/** @type {{ showView: (v: string) => void, getChildNames: () => Record<string, string> } | null} */
let deps = null;

/**
 * @typedef {object} ChessGame
 * @property {"local"|"ai"} mode
 * @property {import('./chess-core.js').ChessPosition} position
 * @property {string} whitePlayerId
 * @property {string} blackPlayerId
 * @property {boolean} over
 * @property {"white"|"black"|null} winner
 * @property {string} [endReason]
 * @property {number} [aiDifficulty]
 * @property {string} [humanPlayerId]
 * @property {string} [aiPlayerId]
 * @property {[number,number]|null} selected
 * @property {{ from:[number,number], to:[number,number] }|null} lastMove
 * @property {boolean} viewFlipped
 * @property {{ from:[number,number], to:[number,number], promotion?: string }[]} moveHistory
 */

/** @type {ChessGame | null} */
let game = null;

const $ = (sel) => document.querySelector(sel);

const AI_LEVELS = [
  { level: 1, label: "入門", desc: "隨機合法走法，適合剛學規則。" },
  { level: 2, label: "普通", desc: "會吃子、會擋將，日常陪練。" },
  { level: 3, label: "高手", desc: "兩層搜尋，中盤較難僥倖。" },
  { level: 4, label: "大師", desc: "Worker 加深搜尋，棋力明顯提升。" },
  { level: 5, label: "宗師", desc: "內建最強搜尋，極難戰勝。" },
  { level: 6, label: "涅槃", desc: "暫與宗師同棋力；之後可接 Stockfish。" },
];

function aiLevelLabel(level) {
  return AI_LEVELS.find((d) => d.level === level)?.label || "";
}

function playerName(id) {
  if (!id) return "—";
  if (id === AI_PLAYER_ID) {
    const label = aiLevelLabel(game?.aiDifficulty ?? aiDifficulty);
    return label ? `電腦（${label}）` : "電腦";
  }
  const names = deps?.getChildNames() || {};
  return names[id] || getChildName(id) || id;
}

function sideName(side) {
  return side === "white" ? "白方" : "黑方";
}

function playerSide(playerId) {
  if (!game) return null;
  if (playerId === game.whitePlayerId) return "white";
  if (playerId === game.blackPlayerId) return "black";
  return null;
}

function sidePlayerId(side) {
  if (!game) return "";
  return side === "white" ? game.whitePlayerId : game.blackPlayerId;
}

export function renderChessHomePlayers() {
  refreshDuoBattleUI();
}

function setFirstScreenMode(mode) {
  setupMode = mode;
  $("#chess-local-setup")?.toggleAttribute("hidden", mode !== "local");
  $("#chess-ai-setup")?.toggleAttribute("hidden", mode !== "ai");
  const title = $("#chess-first-title");
  const meta = $("#chess-first-meta");
  if (mode === "ai") {
    if (title) title.textContent = "西洋棋 · 對電腦";
    if (meta) meta.textContent = "8×8 · 白先 · 史東頓棋子";
    renderAiSetup();
  } else {
    if (title) title.textContent = "誰執白（先手）？";
    if (meta) meta.textContent = "8×8 · 白先 · 國際象棋規則";
    renderLocalPick();
  }
}

function renderLocalPick() {
  refreshDuoBattleUI();
  renderDuoPickButtons("#chess-pick-btns", {
    onPick: startLocalGame,
    labelSuffix: " 執白（先手）",
  });
}

function renderAiSetup() {
  const active = getSelectedChild();
  const nameEl = $("#chess-ai-active-name");
  if (nameEl) nameEl.textContent = active ? playerName(active) : "—";
  const chips = $("#chess-ai-difficulty-chips");
  if (chips) {
    chips.innerHTML = "";
    for (const d of AI_LEVELS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `chess-ai-card${aiDifficulty === d.level ? " is-selected" : ""}`;
      btn.innerHTML = `<strong>${d.label}</strong><span>${d.desc}</span>`;
      btn.addEventListener("click", () => {
        aiDifficulty = d.level;
        renderAiSetup();
      });
      chips.appendChild(btn);
    }
  }
  const startBox = $("#chess-ai-start-btns");
  if (!startBox) return;
  startBox.innerHTML = "";
  const humanWhite = document.createElement("button");
  humanWhite.type = "button";
  humanWhite.className = "btn btn-secondary btn-block";
  humanWhite.textContent = "我執白（先手）";
  humanWhite.addEventListener("click", () => startAiGame(true));
  const aiWhite = document.createElement("button");
  aiWhite.type = "button";
  aiWhite.className = "btn btn-secondary btn-block";
  aiWhite.textContent = `電腦執白（${aiLevelLabel(aiDifficulty) || "電腦"}）`;
  aiWhite.addEventListener("click", () => startAiGame(false));
  startBox.append(humanWhite, aiWhite);
}

function startLocalGame(whitePlayerId) {
  if (!canStartDuoBattle()) return;
  const ids = getActiveDuoPlayerIds();
  const blackPlayerId = otherDuoPlayer(whitePlayerId, ids);
  beginGame({
    mode: "local",
    whitePlayerId,
    blackPlayerId,
  });
}

function startAiGame(humanWhite) {
  const humanId = getSelectedChild();
  if (!humanId) {
    alert("請在首頁選「誰在練習」");
    return;
  }
  beginGame({
    mode: "ai",
    aiDifficulty,
    whitePlayerId: humanWhite ? humanId : AI_PLAYER_ID,
    blackPlayerId: humanWhite ? AI_PLAYER_ID : humanId,
    humanPlayerId: humanId,
    aiPlayerId: AI_PLAYER_ID,
  });
}

function resolveViewFlipped(opts) {
  if (opts.mode === "ai" && opts.humanPlayerId) {
    const humanSide = opts.humanPlayerId === opts.whitePlayerId ? "white" : "black";
    return shouldFlipBoardForSide(humanSide);
  }
  return false;
}

function beginGame(opts) {
  aiMoveToken += 1;
  aiMovePending = false;
  localWinUiDismissed = false;
  pendingPromotion = null;
  hidePromotion();
  game = {
    mode: opts.mode,
    position: createPosition(),
    whitePlayerId: opts.whitePlayerId,
    blackPlayerId: opts.blackPlayerId,
    over: false,
    winner: null,
    aiDifficulty: opts.aiDifficulty,
    humanPlayerId: opts.humanPlayerId,
    aiPlayerId: opts.aiPlayerId,
    selected: null,
    lastMove: null,
    viewFlipped: resolveViewFlipped(opts),
    moveHistory: [],
  };
  resetBoardDom();
  renderBoard();
  maybeScheduleAiMove();
}

function resetBoardDom() {
  const svg = $("#chess-board");
  if (svg) {
    const next = svg.cloneNode(false);
    resetChessBoardSvg(next);
    svg.replaceWith(next);
  }
  $("#chess-win-overlay")?.setAttribute("hidden", "");
  syncResignButton();
  deps?.showView("chessPlay");
}

function ensureBoardSvg() {
  return ensureChessBoardSvg($("#chess-board"), onSquareClick);
}

function syncResignButton() {
  const btn = $("#btn-chess-resign");
  const wrap = btn?.closest(".chess-play-actions");
  if (!btn) return;
  const show = !!game && !game.over;
  btn.hidden = !show;
  if (wrap) wrap.hidden = !show;
  if (!show) return;
  btn.disabled = false;
  if (game.mode === "ai") btn.textContent = "認輸";
  else btn.textContent = `${playerName(sidePlayerId(game.position.turn))} 認輸`;
}

function resignGame() {
  if (!game || game.over) return;
  const resignSide = game.mode === "ai" ? playerSide(game.humanPlayerId) : game.position.turn;
  if (!resignSide) return;
  const resignName = game.mode === "ai" ? "你" : playerName(sidePlayerId(resignSide));
  if (!confirm(`${resignName}確定認輸？`)) return;
  aiMoveToken += 1;
  aiMovePending = false;
  pendingPromotion = null;
  hidePromotion();
  game.over = true;
  game.winner = resignSide === "white" ? "black" : "white";
  game.endReason = `${sideName(resignSide)}認輸`;
  game.selected = null;
  renderBoard();
  showWinOverlay();
}

function legalTargets() {
  if (!game?.selected) return [];
  const [sr, sc] = game.selected;
  return getLegalMovesFrom(game.position, sr, sc).map((m) => m.to);
}

function kingInCheckPos() {
  if (!game || game.over) return null;
  if (!isInCheck(game.position.board, game.position.turn)) return null;
  return findKing(game.position.board, game.position.turn);
}

function renderBoard() {
  const svg = ensureBoardSvg();
  if (!svg || !game) return;
  const legal = new Set(legalTargets().map(([r, c]) => `${r},${c}`));
  const humanSide = playerSide(game.humanPlayerId);
  renderChessBoardSvg(svg, {
    board: game.position.board,
    selected: game.selected,
    lastMove: game.lastMove,
    legal,
    kingInCheck: kingInCheckPos(),
    over: game.over,
    interactive: !(game.mode === "ai" && game.position.turn !== humanSide) && !pendingPromotion,
    flipped: game.viewFlipped,
  });
  renderPlayHeader();
}

function renderPlayHeader() {
  if (!game) return;
  const humanSide = playerSide(game.humanPlayerId);
  const isHumanTurn = game.mode !== "ai" || (!game.over && game.position.turn === humanSide);
  const waitingAi =
    game.mode === "ai" && !game.over && game.position.turn === playerSide(AI_PLAYER_ID) && aiMovePending;
  const deepThink = waitingAi && (game.aiDifficulty || aiDifficulty) >= GRANDMASTER_LEVEL;
  const inCheck = !game.over && isInCheck(game.position.board, game.position.turn);

  renderChessStatusBar({
    whiteCard: $("#chess-side-white"),
    blackCard: $("#chess-side-black"),
    banner: $("#chess-turn-banner"),
    turnMain: $("#chess-turn-main"),
    turnSub: $("#chess-turn-sub"),
    whiteName: playerName(game.whitePlayerId),
    blackName: playerName(game.blackPlayerId),
    turn: game.over ? null : game.position.turn,
    turnPlayerName: playerName(sidePlayerId(game.position.turn)),
    over: game.over,
    overTitle: game.winner ? `${playerName(sidePlayerId(game.winner))} 獲勝！` : "和棋",
    waitingAi: waitingAi && !deepThink,
    statusText: deepThink ? "電腦深度思考中…" : "",
    youHint: isHumanTurn ? " · 輪到你" : "",
    inCheck,
    checkEl: $("#chess-check-hint"),
    checkTitleEl: $("#chess-check-title"),
    checkDetailEl: $("#chess-check-detail"),
    checkTitle: inCheck ? (game.mode === "ai" && isHumanTurn ? "你被將軍了！" : `${sideName(game.position.turn)}被將軍！`) : "",
    checkDetail: inCheck ? "王有危險，快解將！" : "",
  });
  syncResignButton();
}

function getWinTexts() {
  if (!game) return { title: "", detail: "" };
  if (!game.winner) return { title: "和棋", detail: game.endReason || "" };
  return {
    title: `${playerName(sidePlayerId(game.winner))} 獲勝！`,
    detail: `${sideName(game.winner)} · ${game.endReason || "勝"}`,
  };
}

function showWinOverlay() {
  if (!game) return;
  localWinUiDismissed = false;
  const { title, detail } = getWinTexts();
  const titleEl = $("#chess-win-title");
  const detailEl = $("#chess-win-detail");
  if (titleEl) titleEl.textContent = title;
  if (detailEl) detailEl.textContent = detail;
  $("#chess-win-overlay")?.removeAttribute("hidden");
  syncResignButton();
}

function dismissWinOverlay() {
  if (!game) return;
  localWinUiDismissed = true;
  $("#chess-win-overlay")?.setAttribute("hidden", "");
}

function hidePromotion() {
  $("#chess-promo-overlay")?.setAttribute("hidden", "");
}

function showPromotion(from, to) {
  pendingPromotion = { from, to };
  $("#chess-promo-overlay")?.removeAttribute("hidden");
  renderBoard();
}

function finishAfterMove(move) {
  game.lastMove = { from: move.from, to: move.to };
  game.selected = null;
  const terminal = gameResult(game.position);
  if (terminal) {
    game.over = true;
    game.winner = terminal.winner;
    game.endReason = terminal.reason;
    aiMovePending = false;
    renderBoard();
    showWinOverlay();
    return;
  }
  renderBoard();
  maybeScheduleAiMove();
}

function commitMove(move) {
  if (!game.moveHistory) game.moveHistory = [];
  game.moveHistory.push({ from: move.from, to: move.to, promotion: move.promotion });
  game.position = applyMove(game.position, move);
  hidePromotion();
  pendingPromotion = null;
  finishAfterMove(move);
}

function tryMove(fromR, fromC, toR, toC) {
  const moves = getLegalMovesFrom(game.position, fromR, fromC).filter(
    (m) => m.to[0] === toR && m.to[1] === toC,
  );
  if (!moves.length) return false;
  const needsPromo = moves.some((m) => m.promotion);
  if (needsPromo) {
    showPromotion([fromR, fromC], [toR, toC]);
    return true;
  }
  commitMove(moves[0]);
  return true;
}

function onSquareClick(r, c) {
  if (!game || game.over || pendingPromotion) return;
  if (game.mode === "ai" && game.position.turn !== playerSide(game.humanPlayerId)) return;

  const piece = game.position.board[r][c];
  if (game.selected) {
    const [sr, sc] = game.selected;
    if (sr === r && sc === c) {
      game.selected = null;
      renderBoard();
      return;
    }
    if (tryMove(sr, sc, r, c)) return;
  }
  if (piece && sideOfPiece(piece) === game.position.turn) {
    game.selected = [r, c];
    renderBoard();
  }
}

function maybeScheduleAiMove() {
  if (!game || game.over || game.mode !== "ai") return;
  const aiSide = playerSide(AI_PLAYER_ID);
  if (game.position.turn !== aiSide) return;
  aiMovePending = true;
  renderPlayHeader();
  const token = ++aiMoveToken;
  window.setTimeout(() => void runAiMove(token), 40);
}

async function runAiMove(token) {
  if (!game || token !== aiMoveToken || game.over) return;
  const aiSide = playerSide(AI_PLAYER_ID);
  if (game.position.turn !== aiSide) {
    aiMovePending = false;
    return;
  }
  try {
    const move = await requestChessAiMove({
      position: clonePosition(game.position),
      aiSide,
      level: game.aiDifficulty || aiDifficulty,
    });
    if (token !== aiMoveToken || !game || game.over || game.position.turn !== aiSide) return;
    aiMovePending = false;
    if (!move) {
      renderBoard();
      return;
    }
    commitMove(move);
  } catch (err) {
    console.error("chess ai failed", err);
    if (token !== aiMoveToken) return;
    aiMovePending = false;
    renderBoard();
  }
}

export function beginChessFromHome() {
  openDuoModePicker({
    game: "chess",
    title: "西洋棋",
    backView: "home",
    localStart: beginChessLocal,
    aiStart: beginChessAi,
  });
}

export function beginChessLocal() {
  if (!canStartDuoBattle()) {
    alert("請在首頁選「誰在練習」，並在對戰設定中挑選對戰對象（至少需要兩位）");
    return;
  }
  setFirstScreenMode("local");
  renderLocalPick();
  deps?.showView("chessFirst");
}

export function beginChessAi() {
  setFirstScreenMode("ai");
  deps?.showView("chessFirst");
}

export function initChess(d) {
  deps = d;
  bindChessEvents();
}

function bindChessEvents() {
  if (bindChessEvents.done) return;
  bindChessEvents.done = true;

  $("#btn-start-chess")?.addEventListener("click", (e) => {
    e.preventDefault();
    beginChessFromHome();
  });
  $("#btn-chess-first-back")?.addEventListener("click", () => {
    deps?.showView("duoMode");
  });
  $("#btn-chess-play-back")?.addEventListener("click", () => {
    if (confirm("離開棋局？目前進度不會儲存。")) {
      aiMoveToken += 1;
      terminateChessAiWorker();
      game = null;
      pendingPromotion = null;
      hidePromotion();
      syncResignButton();
      deps?.showView("home");
    }
  });
  $("#btn-chess-resign")?.addEventListener("click", () => resignGame());
  $("#btn-chess-win-dismiss")?.addEventListener("click", () => dismissWinOverlay());
  $("#btn-chess-win-replay")?.addEventListener("click", () => {
    if (!game) return;
    beginGame({
      mode: game.mode,
      whitePlayerId: game.whitePlayerId,
      blackPlayerId: game.blackPlayerId,
      aiDifficulty: game.aiDifficulty,
      humanPlayerId: game.humanPlayerId,
      aiPlayerId: game.aiPlayerId,
    });
  });
  $("#btn-chess-win-home")?.addEventListener("click", () => {
    game = null;
    deps?.showView("home");
  });
  $("#chess-promo-choices")?.addEventListener("click", (e) => {
    const btn = e.target?.closest?.("[data-promo]");
    if (!btn || !pendingPromotion || !game) return;
    const promoBase = btn.getAttribute("data-promo");
    const side = game.position.turn;
    const promotion = side === "white" ? promoBase.toUpperCase() : promoBase.toLowerCase();
    const moves = getLegalMovesFrom(game.position, pendingPromotion.from[0], pendingPromotion.from[1]).filter(
      (m) =>
        m.to[0] === pendingPromotion.to[0] &&
        m.to[1] === pendingPromotion.to[1] &&
        m.promotion === promotion,
    );
    if (moves[0]) commitMove(moves[0]);
  });
}
