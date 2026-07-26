import { openDuoModePicker } from "./online-duo.js";
import {
  ensureChessBoardSvg,
  renderChessBoardSvg,
  renderChessStatusBar,
  resetChessBoardSvg,
} from "./chess-board-ui.js?v=chess-v2";
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
} from "./chess-core.js?v=chess-v2";
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
} from "./chess-ai.js?v=chess-v2";

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
  { level: 1, label: "?•È?", desc: "?®Ê??àÊ?Ëµ∞Ê?ÔºåÈÅ©?àÂ?Â≠∏Ë??á„Ä? },
  { level: 2, label: "?ÆÈÄ?, desc: "?ÉÂ?Â≠ê„ÄÅÊ??ãÂ?ÔºåÊó•Â∏∏Èô™Á∑¥„Ä? },
  { level: 3, label: "È´òÊ?", desc: "?©Â±§?úÂ?Ôºå‰∏≠?§Ë???É•?ñ„Ä? },
  { level: 4, label: "Â§ßÂ∏´", desc: "Worker ?†Ê∑±?úÂ?ÔºåÊ??õÊ?È°ØÊ??á„Ä? },
  { level: 5, label: "ÂÆóÂ∏´", desc: "?ßÂª∫?ÄÂº∑Ê?Â∞ãÔ?Ê•µÈõ£?∞Â??? },
  { level: 6, label: "Ê∂ÖÊ?", desc: "?´Ë?ÂÆóÂ∏´?åÊ??õÔ?‰πãÂ??ØÊé• Stockfish?? },
];

function aiLevelLabel(level) {
  return AI_LEVELS.find((d) => d.level === level)?.label || "";
}

function playerName(id) {
  if (!id) return "??;
  if (id === AI_PLAYER_ID) {
    const label = aiLevelLabel(game?.aiDifficulty ?? aiDifficulty);
    return label ? `?ªËÖ¶Ôº?{label}Ôºâ` : "?ªËÖ¶";
  }
  const names = deps?.getChildNames() || {};
  return names[id] || getChildName(id) || id;
}

function sideName(side) {
  return side === "white" ? "?ΩÊñπ" : "ÈªëÊñπ";
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
    if (title) title.textContent = "Ë•øÊ?Ê£?¬∑ Â∞çÈõª??;
    if (meta) meta.textContent = "8?8 ¬∑ ?ΩÂ? ¬∑ ?≤Êù±?ìÊ?Â≠?;
    renderAiSetup();
  } else {
    if (title) title.textContent = "Ë™∞Âü∑?ΩÔ??àÊ?ÔºâÔ?";
    if (meta) meta.textContent = "8?8 ¬∑ ?ΩÂ? ¬∑ ?ãÈ?Ë±°Ê?Ë¶èÂ?";
    renderLocalPick();
  }
}

function renderLocalPick() {
  refreshDuoBattleUI();
  renderDuoPickButtons("#chess-pick-btns", {
    onPick: startLocalGame,
    labelSuffix: " ?∑ÁôΩÔºàÂ??ãÔ?",
  });
}

function renderAiSetup() {
  const active = getSelectedChild();
  const nameEl = $("#chess-ai-active-name");
  if (nameEl) nameEl.textContent = active ? playerName(active) : "??;
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
  humanWhite.textContent = "?ëÂü∑?ΩÔ??àÊ?Ôº?;
  humanWhite.addEventListener("click", () => startAiGame(true));
  const aiWhite = document.createElement("button");
  aiWhite.type = "button";
  aiWhite.className = "btn btn-secondary btn-block";
  aiWhite.textContent = `?ªËÖ¶?∑ÁôΩÔº?{aiLevelLabel(aiDifficulty) || "?ªËÖ¶"}Ôºâ`;
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
    alert("Ë´ãÂú®È¶ñÈ??∏„ÄåË™∞?®Á∑¥Áøí„Ä?);
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
  if (game.mode === "ai") btn.textContent = "Ë™çËº∏";
  else btn.textContent = `${playerName(sidePlayerId(game.position.turn))} Ë™çËº∏`;
}

function resignGame() {
  if (!game || game.over) return;
  const resignSide = game.mode === "ai" ? playerSide(game.humanPlayerId) : game.position.turn;
  if (!resignSide) return;
  const resignName = game.mode === "ai" ? "‰Ω? : playerName(sidePlayerId(resignSide));
  if (!confirm(`${resignName}Á¢∫Â?Ë™çËº∏Ôºü`)) return;
  aiMoveToken += 1;
  aiMovePending = false;
  pendingPromotion = null;
  hidePromotion();
  game.over = true;
  game.winner = resignSide === "white" ? "black" : "white";
  game.endReason = `${sideName(resignSide)}Ë™çËº∏`;
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
    overTitle: game.winner ? `${playerName(sidePlayerId(game.winner))} ?≤Â?ÔºÅ` : "?åÊ?",
    waitingAi: waitingAi && !deepThink,
    statusText: deepThink ? "?ªËÖ¶Ê∑±Â∫¶?ùËÄÉ‰∏≠?? : "",
    youHint: isHumanTurn ? " ¬∑ Ëº™Âà∞‰Ω? : "",
    inCheck,
    checkEl: $("#chess-check-hint"),
    checkTitleEl: $("#chess-check-title"),
    checkDetailEl: $("#chess-check-detail"),
    checkTitle: inCheck ? (game.mode === "ai" && isHumanTurn ? "‰Ω†Ë¢´Â∞áË?‰∫ÜÔ?" : `${sideName(game.position.turn)}Ë¢´Â?ËªçÔ?`) : "",
    checkDetail: inCheck ? "?ãÊ??±Èö™ÔºåÂø´Ëß??Ôº? : "",
  });
  syncResignButton();
}

function getWinTexts() {
  if (!game) return { title: "", detail: "" };
  if (!game.winner) return { title: "?åÊ?", detail: game.endReason || "" };
  return {
    title: `${playerName(sidePlayerId(game.winner))} ?≤Â?ÔºÅ`,
    detail: `${sideName(game.winner)} ¬∑ ${game.endReason || "??}`,
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
    title: "Ë•øÊ?Ê£?,
    backView: "home",
    localStart: beginChessLocal,
    aiStart: beginChessAi,
  });
}

export function beginChessLocal() {
  if (!canStartDuoBattle()) {
    alert("Ë´ãÂú®È¶ñÈ??∏„ÄåË™∞?®Á∑¥Áøí„ÄçÔ?‰∏¶Âú®Â∞çÊà∞Ë®≠Â?‰∏≠Ê??∏Â??∞Â?Ë±°Ô??≥Â??ÄË¶ÅÂÖ©‰ΩçÔ?");
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
    if (confirm("?¢È?Ê£ãÂ?ÔºüÁõÆ?çÈÄ≤Â∫¶‰∏çÊ??≤Â???)) {
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
