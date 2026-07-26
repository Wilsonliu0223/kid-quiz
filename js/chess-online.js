import {
  applyMove,
  createPosition,
  findKing,
  gameResult,
  getLegalMovesFrom,
  isInCheck,
  positionFromFen,
  positionToFen,
  shouldFlipBoardForSide,
  sideOfPiece,
} from "./chess-core.js?v=chess-v2";
import {
  ensureChessBoardSvg,
  renderChessBoardSvg,
  renderChessStatusBar,
  resetChessBoardSvg,
} from "./chess-board-ui.js?v=chess-v2";
import {
  registerOnlineGame,
  getOnlineContext,
  leaveOnlineRoom,
  rematchOnlineRoom,
} from "./online-duo.js";
import { startGameRoom, transactGameState } from "./room-service.js?v=room-v37";

/** @typedef {'host' | 'guest'} RoomSlot */

/** @type {object | null} */
let onlineGame = null;
/** @type {[number, number] | null} */
let selected = null;
/** @type {string | null} */
let celebratedWinKey = null;
/** @type {{ from:[number,number], to:[number,number] } | null} */
let pendingPromotion = null;

const $ = (sel) => document.querySelector(sel);

async function startChessRoom(roomId, whiteSlot) {
  const blackSlot = whiteSlot === "host" ? "guest" : "host";
  const pos = createPosition();
  await startGameRoom(roomId, {
    whitePlayerId: whiteSlot,
    blackPlayerId: blackSlot,
    turn: "white",
    fen: positionToFen(pos),
    lastMove: null,
    over: false,
    winner: null,
    winnerSide: null,
    endReason: "",
  });
}

function otherSlot(slot) {
  return slot === "host" ? "guest" : "host";
}

function slotName(slot) {
  if (!onlineGame) return slot === "host" ? "?¿ä¸»" : "ä¾†è?";
  return onlineGame.names[slot] || (slot === "host" ? "?¿ä¸»" : "ä¾†è?");
}

function sideName(side) {
  return side === "white" ? "?½æ–¹" : "é»‘æ–¹";
}

function slotForSide(side) {
  if (!onlineGame) return null;
  return side === "white" ? onlineGame.whitePlayerId : onlineGame.blackPlayerId;
}

function sideForSlot(slot) {
  if (!onlineGame) return null;
  if (slot === onlineGame.whitePlayerId) return "white";
  if (slot === onlineGame.blackPlayerId) return "black";
  return null;
}

function renderWhitePick(panel, snap, onPick) {
  const host = snap.players.host;
  const guest = snap.players.guest;
  [
    ["host", `${host?.name || "?¿ä¸»"} ?·ç™½ï¼ˆå??‹ï?`],
    ["guest", `${guest?.name || "ä¾†è?"} ?·ç™½ï¼ˆå??‹ï?`],
  ].forEach(([slot, label]) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-secondary btn-block";
    btn.textContent = label;
    btn.addEventListener("click", () => onPick(/** @type {RoomSlot} */ (slot)));
    panel.appendChild(btn);
  });
}

function legalTargets() {
  if (!onlineGame?.position || !selected) return [];
  const [sr, sc] = selected;
  return getLegalMovesFrom(onlineGame.position, sr, sc).map((m) => m.to);
}

function ensureOnlineBoardSvg() {
  return ensureChessBoardSvg($("#chess-online-board"), onOnlineSquareClick);
}

function hidePromotion() {
  pendingPromotion = null;
  $("#chess-online-promo-overlay")?.setAttribute("hidden", "");
}

function syncResign() {
  const resignBtn = $("#btn-chess-online-resign");
  if (!resignBtn || !onlineGame) return;
  const ctx = getOnlineContext();
  const mySide = sideForSlot(ctx.slot);
  const show = !!mySide && !onlineGame.over;
  resignBtn.hidden = !show;
  const wrap = resignBtn.closest(".chess-play-actions");
  if (wrap) wrap.hidden = !show;
}

function renderOnlineBoard() {
  const svg = ensureOnlineBoardSvg();
  if (!svg || !onlineGame) return;
  const ctx = getOnlineContext();
  const mySide = sideForSlot(ctx.slot);
  const legal = new Set(legalTargets().map(([r, c]) => `${r},${c}`));
  const myTurn = !onlineGame.over && mySide === onlineGame.position.turn;
  const inCheck = !onlineGame.over && isInCheck(onlineGame.position.board, onlineGame.position.turn);
  const kingPos = inCheck ? findKing(onlineGame.position.board, onlineGame.position.turn) : null;

  renderChessBoardSvg(svg, {
    board: onlineGame.position.board,
    selected,
    lastMove: onlineGame.lastMove,
    legal,
    kingInCheck: kingPos,
    over: onlineGame.over,
    interactive: myTurn && !pendingPromotion,
    flipped: onlineGame.viewFlipped,
  });

  if ($("#chess-online-room-tag") && ctx.roomId) {
    $("#chess-online-room-tag").textContent = `?¿é? ${ctx.roomId}`;
  }

  const curSlot = slotForSide(onlineGame.position.turn);
  let overTitle = "å°å?çµæ?";
  if (onlineGame.over && onlineGame.winner) {
    overTitle = onlineGame.winner === ctx.slot ? "ä½ ç²?ï?" : `${slotName(onlineGame.winner)} ?²å?`;
  } else if (onlineGame.over) {
    overTitle = "?Œæ?";
  }

  renderChessStatusBar({
    whiteCard: $("#chess-online-side-white"),
    blackCard: $("#chess-online-side-black"),
    banner: $("#chess-online-turn-banner"),
    turnMain: $("#chess-online-turn-main"),
    turnSub: $("#chess-online-turn-sub"),
    whiteName: slotName(onlineGame.whitePlayerId),
    blackName: slotName(onlineGame.blackPlayerId),
    turn: onlineGame.over ? null : onlineGame.position.turn,
    turnPlayerName: slotName(curSlot),
    over: onlineGame.over,
    overTitle,
    youHint: myTurn ? " Â· è¼ªåˆ°ä½? : "",
    inCheck,
    checkEl: $("#chess-online-check-hint"),
    checkTitleEl: $("#chess-online-check-title"),
    checkDetailEl: $("#chess-online-check-detail"),
    checkTitle: inCheck ? (myTurn ? "ä½ è¢«å°‡è?äº†ï?" : `${sideName(onlineGame.position.turn)}è¢«å?è»ï?`) : "",
    checkDetail: inCheck ? "?‹æ??±éšªï¼Œå¿«è§??ï¼? : "",
  });
  syncResign();
}

function showOnlineWinOverlay() {
  if (!onlineGame) return;
  const ctx = getOnlineContext();
  const title = $("#chess-online-win-title");
  const detail = $("#chess-online-win-detail");
  if (!title || !detail) return;
  if (!onlineGame.winner) {
    title.textContent = "?Œæ?";
    detail.textContent = onlineGame.endReason || "";
  } else {
    title.textContent = onlineGame.winner === ctx.slot ? "ä½ è?äº†ï?" : `${slotName(onlineGame.winner)} ?²å?`;
    detail.textContent = `${sideName(onlineGame.winnerSide)} Â· ${onlineGame.endReason || "??}`;
  }
  $("#chess-online-win-overlay")?.removeAttribute("hidden");
}

function applyRemoteChess(snapshot) {
  const g = snapshot.state;
  if (!g) return;
  const position = g.fen ? positionFromFen(g.fen) : createPosition();
  const ctx = getOnlineContext();
  const mySide =
    ctx.slot === g.whitePlayerId ? "white" : ctx.slot === g.blackPlayerId ? "black" : null;
  onlineGame = {
    position,
    whitePlayerId: g.whitePlayerId,
    blackPlayerId: g.blackPlayerId,
    over: !!g.over,
    winner: g.winner || null,
    winnerSide: g.winnerSide || null,
    endReason: g.endReason || "",
    lastMove: g.lastMove || null,
    viewFlipped: shouldFlipBoardForSide(mySide),
    names: {
      host: snapshot.players.host?.name || "?¿ä¸»",
      guest: snapshot.players.guest?.name || "ä¾†è?",
    },
  };
  selected = null;
  hidePromotion();
  renderOnlineBoard();
  if (g.over) {
    const winKey = `${snapshot.roomId}:${g.winner || "draw"}:${g.fen}`;
    if (winKey !== celebratedWinKey) {
      celebratedWinKey = winKey;
      showOnlineWinOverlay();
    }
  }
}

function enterOnlinePlay(snapshot) {
  getOnlineContext().deps?.showView("chessOnlinePlay");
  celebratedWinKey = null;
  selected = null;
  hidePromotion();
  const svg = $("#chess-online-board");
  if (svg) {
    const next = svg.cloneNode(false);
    resetChessBoardSvg(next);
    svg.replaceWith(next);
  }
  $("#chess-online-win-overlay")?.setAttribute("hidden", "");
  applyRemoteChess(snapshot);
}

async function submitOnlineMove(move) {
  const ctx = getOnlineContext();
  if (!ctx.roomId || !ctx.slot || !onlineGame || onlineGame.over) return;

  const result = await transactGameState(ctx.roomId, (current) => {
    if (!current || current.over) return;
    const position = current.fen ? positionFromFen(current.fen) : createPosition();
    const mySide = ctx.slot === current.whitePlayerId ? "white" : ctx.slot === current.blackPlayerId ? "black" : null;
    if (!mySide || mySide !== position.turn) return;

    const legal = getLegalMovesFrom(position, move.from[0], move.from[1]).find(
      (m) =>
        m.to[0] === move.to[0] &&
        m.to[1] === move.to[1] &&
        (m.promotion || "") === (move.promotion || ""),
    );
    if (!legal) return;

    const nextPos = applyMove(position, legal);
    const terminal = gameResult(nextPos);
    if (terminal) {
      return {
        ...current,
        fen: positionToFen(nextPos),
        turn: nextPos.turn,
        lastMove: { from: legal.from, to: legal.to },
        over: true,
        winner: terminal.winner ? (terminal.winner === "white" ? current.whitePlayerId : current.blackPlayerId) : null,
        winnerSide: terminal.winner,
        endReason: terminal.reason,
      };
    }
    return {
      ...current,
      fen: positionToFen(nextPos),
      turn: nextPos.turn,
      lastMove: { from: legal.from, to: legal.to },
      over: false,
      winner: null,
      winnerSide: null,
      endReason: "",
    };
  });

  if (!result) {
    alert("?™ä?æ­¥ç„¡æ³•èµ°ï¼ˆå¯?½è¼ª?°å??¹æ?ä¸ç¬¦?ˆè??‡ï?");
    selected = null;
    hidePromotion();
    renderOnlineBoard();
  }
}

function onOnlineSquareClick(r, c) {
  if (!onlineGame || onlineGame.over || pendingPromotion) return;
  const ctx = getOnlineContext();
  const mySide = sideForSlot(ctx.slot);
  if (!mySide || mySide !== onlineGame.position.turn) return;

  const piece = onlineGame.position.board[r][c];
  if (selected) {
    const [sr, sc] = selected;
    if (sr === r && sc === c) {
      selected = null;
      renderOnlineBoard();
      return;
    }
    const moves = getLegalMovesFrom(onlineGame.position, sr, sc).filter((m) => m.to[0] === r && m.to[1] === c);
    if (!moves.length) {
      if (piece && sideOfPiece(piece) === mySide) {
        selected = [r, c];
        renderOnlineBoard();
      }
      return;
    }
    if (moves.some((m) => m.promotion)) {
      pendingPromotion = { from: [sr, sc], to: [r, c] };
      $("#chess-online-promo-overlay")?.removeAttribute("hidden");
      renderOnlineBoard();
      return;
    }
    void submitOnlineMove(moves[0]);
    selected = null;
    return;
  }

  if (piece && sideOfPiece(piece) === onlineGame.position.turn) {
    selected = [r, c];
    renderOnlineBoard();
  }
}

async function resignOnlineGame() {
  const ctx = getOnlineContext();
  if (!ctx.roomId || !ctx.slot || !onlineGame || onlineGame.over) return;
  const mySide = sideForSlot(ctx.slot);
  if (!mySide) return;
  if (!confirm("ç¢ºå?èªè¼¸ï¼?)) return;

  await transactGameState(ctx.roomId, (current) => {
    if (!current || current.over) return;
    const winnerSlot = otherSlot(ctx.slot);
    let winnerSide = "white";
    if (winnerSlot === current.whitePlayerId) winnerSide = "white";
    else if (winnerSlot === current.blackPlayerId) winnerSide = "black";
    else winnerSide = mySide === "white" ? "black" : "white";
    return {
      ...current,
      over: true,
      winner: winnerSlot,
      winnerSide,
      endReason: `${sideName(mySide)}èªè¼¸`,
    };
  });
}

function bindChessOnlineOnly() {
  if (bindChessOnlineOnly.done) return;
  bindChessOnlineOnly.done = true;

  $("#btn-chess-online-play-back")?.addEventListener("click", async () => {
    if (confirm("?¢é?æ£‹å?ï¼?)) {
      await leaveOnlineRoom();
      onlineGame = null;
      selected = null;
      celebratedWinKey = null;
      hidePromotion();
      getOnlineContext().deps?.showView("home");
    }
  });
  $("#btn-chess-online-resign")?.addEventListener("click", () => void resignOnlineGame());
  $("#btn-chess-online-win-dismiss")?.addEventListener("click", () => {
    $("#chess-online-win-overlay")?.setAttribute("hidden", "");
  });
  $("#btn-chess-online-win-rematch")?.addEventListener("click", async () => {
    onlineGame = null;
    selected = null;
    celebratedWinKey = null;
    hidePromotion();
    $("#chess-online-win-overlay")?.setAttribute("hidden", "");
    await rematchOnlineRoom();
  });
  $("#btn-chess-online-win-home")?.addEventListener("click", async () => {
    await leaveOnlineRoom();
    onlineGame = null;
    selected = null;
    celebratedWinKey = null;
    hidePromotion();
    getOnlineContext().deps?.showView("home");
  });
  $("#chess-online-promo-choices")?.addEventListener("click", (e) => {
    const btn = e.target?.closest?.("[data-promo]");
    if (!btn || !pendingPromotion || !onlineGame) return;
    const promoBase = btn.getAttribute("data-promo");
    const side = onlineGame.position.turn;
    const promotion = side === "white" ? promoBase.toUpperCase() : promoBase.toLowerCase();
    const moves = getLegalMovesFrom(onlineGame.position, pendingPromotion.from[0], pendingPromotion.from[1]).filter(
      (m) =>
        m.to[0] === pendingPromotion.to[0] &&
        m.to[1] === pendingPromotion.to[1] &&
        m.promotion === promotion,
    );
    if (moves[0]) {
      hidePromotion();
      void submitOnlineMove(moves[0]);
      selected = null;
    }
  });
}

registerOnlineGame("chess", {
  startHint: "è«‹é¸èª°åŸ·?½ï??½å?ï¼?,
  renderStartButtons: renderWhitePick,
  startGame: (roomId, slot) => startChessRoom(roomId, slot),
  onPlaying(snapshot) {
    bindChessOnlineOnly();
    const onPlay = $("#view-chess-online-play")?.classList.contains("view-active");
    if (!onPlay) enterOnlinePlay(snapshot);
    else applyRemoteChess(snapshot);
  },
});
