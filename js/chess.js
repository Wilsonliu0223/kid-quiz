import { openDuoModePicker } from "./online-duo.js";
import {
  ensureChessBoardSvg,
  renderChessBoardSvg,
  renderChessStatusBar,
  resetChessBoardSvg,
} from "./chess-board-ui.js?v=chess-v5";
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
} from "./chess-core.js?v=chess-v5";
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
  AI_WHITE_ID,
  AI_BLACK_ID,
  GRANDMASTER_LEVEL,
  requestChessAiMove,
  terminateChessAiWorker,
} from "./chess-ai.js?v=chess-v6";
import { bindRulesGuideButtons, getPieceMoveHint, setRulesPlayHint } from "./piece-rules-guide.js?v=rules-v5";

/** @typedef {"local"|"ai"} SetupMode */

/** @type {SetupMode} */
let setupMode = "local";
/** @type {"challenge"|"watch"} */
let aiSetupKind = "challenge";
let aiDifficulty = 2;
let aiDifficultyWhite = 3;
let aiDifficultyBlack = 4;
let aiMovePending = false;
let aiMoveToken = 0;
/** @type {number | null} */
let undoAiResumeTimer = null;
let localWinUiDismissed = false;
let pendingPromotion = null;

/** @type {{ showView: (v: string) => void, getChildNames: () => Record<string, string> } | null} */
let deps = null;

/**
 * @typedef {object} ChessGame
 * @property {"local"|"ai"|"ai-watch"} mode
 * @property {import('./chess-core.js').ChessPosition} position
 * @property {string} whitePlayerId
 * @property {string} blackPlayerId
 * @property {boolean} over
 * @property {"white"|"black"|null} winner
 * @property {string} [endReason]
 * @property {number} [aiDifficulty]
 * @property {number} [aiDifficultyWhite]
 * @property {number} [aiDifficultyBlack]
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

function currentSideDifficulty(g = game) {
  if (!g) return aiDifficulty;
  if (g.mode === "ai-watch") {
    return g.position.turn === "white"
      ? (g.aiDifficultyWhite ?? aiDifficultyWhite)
      : (g.aiDifficultyBlack ?? aiDifficultyBlack);
  }
  return g.aiDifficulty ?? aiDifficulty;
}

function shouldAiMoveNow(g = game) {
  if (!g || g.over) return false;
  if (g.mode === "ai-watch") return true;
  if (g.mode === "ai") return g.position.turn === playerSide(g.aiPlayerId);
  return false;
}

function playerName(id) {
  if (!id) return "—";
  if (id === AI_PLAYER_ID) {
    const label = aiLevelLabel(game?.aiDifficulty ?? aiDifficulty);
    return label ? `電腦（${label}）` : "電腦";
  }
  if (id === AI_WHITE_ID) {
    const label = aiLevelLabel(game?.aiDifficultyWhite ?? aiDifficultyWhite);
    return label ? `白方電腦（${label}）` : "白方電腦";
  }
  if (id === AI_BLACK_ID) {
    const label = aiLevelLabel(game?.aiDifficultyBlack ?? aiDifficultyBlack);
    return label ? `黑方電腦（${label}）` : "黑方電腦";
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

function renderDifficultyChipGroup(sel, selected, onPick) {
  const chips = $(sel);
  if (!chips) return;
  chips.innerHTML = "";
  for (const d of AI_LEVELS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `chess-ai-card${selected === d.level ? " is-selected" : ""}`;
    btn.innerHTML = `<strong>${d.label}</strong><span>${d.desc}</span>`;
    btn.addEventListener("click", () => onPick(d.level));
    chips.appendChild(btn);
  }
}

function syncAiSetupKindUi() {
  const challenge = $("#chess-ai-challenge-panel");
  const watch = $("#chess-ai-watch-panel");
  if (challenge) challenge.hidden = aiSetupKind !== "challenge";
  if (watch) watch.hidden = aiSetupKind !== "watch";
  $("#chess-ai-kind-chips")?.querySelectorAll("[data-chess-ai-kind]").forEach((btn) => {
    const on = btn.getAttribute("data-chess-ai-kind") === aiSetupKind;
    btn.classList.toggle("chip-active", on);
    btn.setAttribute("aria-pressed", String(on));
  });
  const title = $("#chess-first-title");
  const meta = $("#chess-first-meta");
  if (setupMode === "ai") {
    if (title) title.textContent = aiSetupKind === "watch" ? "兩台電腦對打" : "西洋棋 · 對電腦";
    if (meta) {
      meta.textContent =
        aiSetupKind === "watch" ? "觀戰 · 8×8 · 白先 · 可悔棋" : "8×8 · 白先 · 史東頓棋子";
    }
  }
}

function renderAiSetup() {
  const active = getSelectedChild();
  const nameEl = $("#chess-ai-active-name");
  if (nameEl) nameEl.textContent = active ? playerName(active) : "—";
  syncAiSetupKindUi();
  renderDifficultyChipGroup("#chess-ai-difficulty-chips", aiDifficulty, (level) => {
    aiDifficulty = level;
    renderAiSetup();
  });
  renderDifficultyChipGroup("#chess-ai-white-chips", aiDifficultyWhite, (level) => {
    aiDifficultyWhite = level;
    renderAiSetup();
  });
  renderDifficultyChipGroup("#chess-ai-black-chips", aiDifficultyBlack, (level) => {
    aiDifficultyBlack = level;
    renderAiSetup();
  });
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

function startAiWatchGame() {
  beginGame({
    mode: "ai-watch",
    aiDifficultyWhite,
    aiDifficultyBlack,
    whitePlayerId: AI_WHITE_ID,
    blackPlayerId: AI_BLACK_ID,
  });
}

function resolveViewFlipped(opts) {
  if (opts.mode === "ai" && opts.humanPlayerId) {
    const humanSide = opts.humanPlayerId === opts.whitePlayerId ? "white" : "black";
    return shouldFlipBoardForSide(humanSide);
  }
  return false;
}

function clearUndoAiResumeTimer() {
  if (undoAiResumeTimer != null) {
    window.clearTimeout(undoAiResumeTimer);
    undoAiResumeTimer = null;
  }
}

function cancelPendingAi() {
  aiMoveToken += 1;
  aiMovePending = false;
  clearUndoAiResumeTimer();
}

function syncUndoButton() {
  const btn = $("#btn-chess-undo");
  if (!btn) return;
  btn.disabled = !(game && (game.moveHistory?.length || 0) > 0);
}

function undoLastMove() {
  if (!game) return false;
  const hist = game.moveHistory;
  if (!hist?.length) return false;

  cancelPendingAi();
  pendingPromotion = null;
  hidePromotion();

  if (game.over) {
    game.over = false;
    game.winner = null;
    game.endReason = "";
    localWinUiDismissed = false;
    $("#chess-win-overlay")?.setAttribute("hidden", "");
  }

  hist.pop();
  let pos = createPosition();
  let lastMove = null;
  for (const m of hist) {
    pos = applyMove(pos, m);
    lastMove = { from: m.from, to: m.to };
  }
  game.position = pos;
  game.lastMove = lastMove;
  game.selected = null;

  renderBoard();
  syncUndoButton();

  if (shouldAiMoveNow(game)) {
    const token = aiMoveToken;
    undoAiResumeTimer = window.setTimeout(() => {
      undoAiResumeTimer = null;
      if (token !== aiMoveToken) return;
      maybeScheduleAiMove();
    }, 700);
  }
  return true;
}

function beginGame(opts) {
  cancelPendingAi();
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
    aiDifficultyWhite: opts.aiDifficultyWhite,
    aiDifficultyBlack: opts.aiDifficultyBlack,
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
  if (wrap) wrap.hidden = !game;
  if (!game) {
    btn.hidden = true;
    syncUndoButton();
    return;
  }
  const showResign = !game.over && game.mode !== "ai-watch";
  btn.hidden = !showResign;
  if (showResign) {
    btn.disabled = false;
    if (game.mode === "ai") btn.textContent = "認輸";
    else btn.textContent = `${playerName(sidePlayerId(game.position.turn))} 認輸`;
  }
  syncUndoButton();
}

function resignGame() {
  if (!game || game.over || game.mode === "ai-watch") return;
  const resignSide = game.mode === "ai" ? playerSide(game.humanPlayerId) : game.position.turn;
  if (!resignSide) return;
  const resignName = game.mode === "ai" ? "你" : playerName(sidePlayerId(resignSide));
  if (!confirm(`${resignName}確定認輸？`)) return;
  cancelPendingAi();
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
  const humanCanMove =
    game.mode !== "ai-watch" &&
    !(game.mode === "ai" && game.position.turn !== humanSide) &&
    !pendingPromotion;
  renderChessBoardSvg(svg, {
    board: game.position.board,
    selected: game.selected,
    lastMove: game.lastMove,
    legal,
    kingInCheck: kingInCheckPos(),
    over: game.over,
    interactive: humanCanMove,
    flipped: game.viewFlipped,
  });
  renderPlayHeader();
}

function renderPlayHeader() {
  if (!game) return;
  const humanSide = playerSide(game.humanPlayerId);
  const isHumanTurn =
    game.mode === "local" ||
    (game.mode === "ai" && !game.over && game.position.turn === humanSide);
  const waitingAi = shouldAiMoveNow(game) && aiMovePending;
  const deepThink = waitingAi && currentSideDifficulty(game) >= GRANDMASTER_LEVEL;
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
    statusText: deepThink
      ? "電腦深度思考中…"
      : game.mode === "ai-watch" && waitingAi
        ? "觀戰中…"
        : "",
    youHint: isHumanTurn ? " · 輪到你" : "",
    inCheck,
    checkEl: $("#chess-check-hint"),
    checkTitleEl: $("#chess-check-title"),
    checkDetailEl: $("#chess-check-detail"),
    checkTitle: inCheck ? (game.mode === "ai" && isHumanTurn ? "你被將軍了！" : `${sideName(game.position.turn)}被將軍！`) : "",
    checkDetail: inCheck ? "王有危險，快解將！" : "",
  });
  syncResignButton();
  let pieceHint = "";
  if (game.selected && !game.over) {
    const [sr, sc] = game.selected;
    pieceHint = getPieceMoveHint("chess", game.position.board[sr][sc]);
  }
  setRulesPlayHint($("#chess-piece-hint"), pieceHint);
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
  if (game.mode === "ai-watch") return;
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
  if (!shouldAiMoveNow(game)) return;
  aiMovePending = true;
  renderPlayHeader();
  const token = ++aiMoveToken;
  const delay = game.mode === "ai-watch" ? 320 : 40;
  window.setTimeout(() => void runAiMove(token), delay);
}

async function runAiMove(token) {
  if (!game || token !== aiMoveToken || game.over) return;
  if (!shouldAiMoveNow(game)) {
    aiMovePending = false;
    return;
  }
  const aiSide = game.position.turn;
  const level = currentSideDifficulty(game);
  try {
    const move = await requestChessAiMove({
      position: clonePosition(game.position),
      aiSide,
      level,
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
      cancelPendingAi();
      terminateChessAiWorker();
      game = null;
      pendingPromotion = null;
      hidePromotion();
      syncResignButton();
      deps?.showView("home");
    }
  });
  $("#btn-chess-undo")?.addEventListener("click", () => {
    undoLastMove();
  });
  $("#chess-ai-kind-chips")?.addEventListener("click", (e) => {
    const btn = e.target.closest?.("[data-chess-ai-kind]");
    if (!btn) return;
    const kind = btn.getAttribute("data-chess-ai-kind");
    if (kind !== "challenge" && kind !== "watch") return;
    aiSetupKind = kind;
    syncAiSetupKindUi();
  });
  $("#btn-chess-ai-watch-start")?.addEventListener("click", () => {
    startAiWatchGame();
  });
  $("#btn-chess-resign")?.addEventListener("click", () => resignGame());
  bindRulesGuideButtons("chess", ["#btn-chess-rules", "#btn-chess-first-rules"]);
  $("#btn-chess-win-dismiss")?.addEventListener("click", () => dismissWinOverlay());
  $("#btn-chess-win-replay")?.addEventListener("click", () => {
    if (!game) return;
    if (game.mode === "ai-watch") {
      startAiWatchGame();
      return;
    }
    beginGame({
      mode: game.mode,
      whitePlayerId: game.whitePlayerId,
      blackPlayerId: game.blackPlayerId,
      aiDifficulty: game.aiDifficulty,
      aiDifficultyWhite: game.aiDifficultyWhite,
      aiDifficultyBlack: game.aiDifficultyBlack,
      humanPlayerId: game.humanPlayerId,
      aiPlayerId: game.aiPlayerId,
    });
  });
  $("#btn-chess-win-home")?.addEventListener("click", () => {
    cancelPendingAi();
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
