import {
  BLACK,
  WHITE,
  createPosition,
  playMove,
  playPass,
  isLegalMove,
  isGameOver,
  scoreChinese,
  formatScoreDetail,
  komiForSize,
  serializePosition,
  deserializePosition,
} from "./go-core.js?v=go-v1";
import { ensureGoBoardSvg, renderGoBoardSvg, resetGoBoardSvg } from "./go-board-ui.js?v=go-v1";
import {
  registerOnlineGame,
  getOnlineContext,
  leaveOnlineRoom,
  rematchOnlineRoom,
} from "./online-duo.js";
import { startGameRoom, transactGameState } from "./room-service.js?v=room-v37";
import { renderDuoTurnStatusBar } from "./game-turn-status.js?v=go-v1";
import { rebindGomokuBoardZoom, shouldSuppressGomokuCellTap } from "./gomoku-board-zoom.js";

const $ = (sel) => document.querySelector(sel);

/** @type {object|null} */
let onlineGame = null;
let bound = false;

async function startGoRoom(roomId, blackSlot) {
  const whiteSlot = blackSlot === "host" ? "guest" : "host";
  const pos = createPosition(9);
  await startGameRoom(roomId, {
    blackPlayerId: blackSlot,
    whitePlayerId: whiteSlot,
    pos: serializePosition(pos),
    over: false,
    winner: null,
    winnerSide: null,
    endReason: "",
    scoreText: "",
  });
}

function applySnap(snapshot) {
  const g = snapshot.state || {};
  onlineGame = {
    names: {
      host: snapshot.players?.host?.name || "房主",
      guest: snapshot.players?.guest?.name || "來賓",
    },
    blackPlayerId: g.blackPlayerId,
    whitePlayerId: g.whitePlayerId,
    position: deserializePosition(g.pos),
    over: !!g.over,
    winnerSide: g.winnerSide,
    endReason: g.endReason || "",
    scoreText: g.scoreText || "",
  };
}

function slotName(slot) {
  return onlineGame?.names?.[slot] || (slot === "host" ? "房主" : "來賓");
}

function myColor() {
  const slot = getOnlineContext().slot;
  if (!onlineGame) return null;
  if (slot === onlineGame.blackPlayerId) return BLACK;
  if (slot === onlineGame.whitePlayerId) return WHITE;
  return null;
}

function renderOnline() {
  if (!onlineGame) return;
  const pos = onlineGame.position;
  renderGoBoardSvg(ensureGoBoardSvg($("#go-online-board"), onOnlinePoint), pos);
  const turn = pos.turn === BLACK ? "black" : "white";
  const turnSlot = pos.turn === BLACK ? onlineGame.blackPlayerId : onlineGame.whitePlayerId;
  renderDuoTurnStatusBar({
    theme: "go",
    leftCard: $("#go-online-side-black"),
    rightCard: $("#go-online-side-white"),
    banner: $("#go-online-turn-banner"),
    turnMain: $("#go-online-turn-main"),
    turnSub: $("#go-online-turn-sub"),
    leftName: slotName(onlineGame.blackPlayerId),
    rightName: slotName(onlineGame.whitePlayerId),
    turn: onlineGame.over ? null : turn,
    turnPlayerName: slotName(turnSlot),
    over: onlineGame.over,
    overTitle: onlineGame.endReason || "終局",
    extraEl: $("#go-online-meta"),
    extraText: `9 路 · 貼目 ${komiForSize(9)} · 黑提 ${pos.captured[0]} · 白提 ${pos.captured[1]}`,
    extraVisible: true,
  });
  const mine = myColor();
  const canAct = !!mine && !onlineGame.over && pos.turn === mine;
  const passBtn = $("#btn-go-online-pass");
  const resignBtn = $("#btn-go-online-resign");
  if (passBtn) passBtn.hidden = !canAct;
  if (resignBtn) resignBtn.hidden = !canAct;
  if (onlineGame.over) {
    $("#go-online-win-title").textContent =
      onlineGame.winnerSide === BLACK ? "黑勝" : onlineGame.winnerSide === WHITE ? "白勝" : "和棋";
    $("#go-online-win-detail").textContent = onlineGame.scoreText || onlineGame.endReason || "";
    $("#go-online-win-overlay")?.removeAttribute("hidden");
  }
}

function enterOnlinePlay(snapshot) {
  applySnap(snapshot);
  const svg = $("#go-online-board");
  if (svg) {
    const next = svg.cloneNode(false);
    resetGoBoardSvg(next);
    svg.replaceWith(next);
  }
  $("#go-online-win-overlay")?.setAttribute("hidden", "");
  getOnlineContext().deps?.showView("goOnlinePlay");
  rebindGomokuBoardZoom("#go-online-board-viewport", "#go-online-board-stage");
  renderOnline();
}

async function transactPos(playFn) {
  const ctx = getOnlineContext();
  if (!ctx.roomId || !onlineGame || onlineGame.over) return;
  const result = await transactGameState(ctx.roomId, (current) => {
    if (!current || current.over) return;
    const pos = deserializePosition(current.pos);
    const mySide = ctx.slot === current.blackPlayerId ? BLACK : ctx.slot === current.whitePlayerId ? WHITE : null;
    if (!mySide || mySide !== pos.turn) return;
    const next = playFn(pos);
    if (!next) return;
    if (isGameOver(next)) {
      const sc = scoreChinese(next);
      return {
        ...current,
        pos: serializePosition(next),
        over: true,
        winnerSide: sc.winner,
        endReason: "雙方停著",
        scoreText: formatScoreDetail(sc),
      };
    }
    return { ...current, pos: serializePosition(next), over: false, endReason: "", scoreText: "" };
  });
  if (!result) alert("現在不能這樣下（可能還沒輪到你）");
}

function onOnlinePoint(r, c) {
  if (!onlineGame || onlineGame.over) return;
  if (shouldSuppressGomokuCellTap()) return;
  if (myColor() !== onlineGame.position.turn) return;
  if (!isLegalMove(onlineGame.position, r, c)) return;
  void transactPos((pos) => playMove(pos, r, c));
}

function renderBlackPick(panel, snap, onPick) {
  const host = snap.players.host;
  const guest = snap.players.guest;
  [
    ["host", `${host?.name || "房主"} 拿黑（先手）`],
    ["guest", `${guest?.name || "來賓"} 拿黑（先手）`],
  ].forEach(([slot, label]) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-secondary btn-block";
    btn.textContent = label;
    btn.addEventListener("click", () => onPick(slot));
    panel.appendChild(btn);
  });
}

function bindOnline() {
  if (bound) return;
  bound = true;
  $("#btn-go-online-play-back")?.addEventListener("click", () => void leaveOnlineRoom());
  $("#btn-go-online-pass")?.addEventListener("click", () => {
    if (!onlineGame || myColor() !== onlineGame.position.turn) return;
    void transactPos((pos) => playPass(pos));
  });
  $("#btn-go-online-resign")?.addEventListener("click", () => {
    const c = myColor();
    const ctx = getOnlineContext();
    if (!c || !ctx.roomId) return;
    void transactGameState(ctx.roomId, (current) => {
      if (!current || current.over) return;
      return {
        ...current,
        over: true,
        winnerSide: c === BLACK ? WHITE : BLACK,
        endReason: "對方認輸",
        scoreText: "認輸",
      };
    });
  });
  $("#btn-go-online-win-dismiss")?.addEventListener("click", () => {
    $("#go-online-win-overlay")?.setAttribute("hidden", "");
  });
  $("#btn-go-online-win-rematch")?.addEventListener("click", () => void rematchOnlineRoom());
  $("#btn-go-online-win-home")?.addEventListener("click", () => void leaveOnlineRoom());
}

registerOnlineGame("go", {
  startHint: "請選誰拿黑（黑先）",
  renderStartButtons: renderBlackPick,
  startGame: (roomId, slot) => startGoRoom(roomId, slot),
  onPlaying(snapshot) {
    bindOnline();
    const onPlay = $("#view-go-online-play")?.classList.contains("view-active");
    if (!onPlay) enterOnlinePlay(snapshot);
    else {
      applySnap(snapshot);
      renderOnline();
    }
  },
});
