import {
  COLS,
  PIECE_NAME_ZH,
  ROWS,
  sideOfPiece,
} from "./chess-core.js?v=chess-v3";
import { renderDuoTurnStatusBar } from "./game-turn-status.js";

const SVG_NS = "http://www.w3.org/2000/svg";

const PIECE_FILE = {
  K: "wK.png",
  Q: "wQ.png",
  R: "wR.png",
  B: "wB.png",
  N: "wN.png",
  P: "wP.png",
  k: "bK.png",
  q: "bQ.png",
  r: "bR.png",
  b: "bB.png",
  n: "bN.png",
  p: "bP.png",
};

const PIECE_BASE = new URL("../assets/chess/pieces/", import.meta.url);
const BOARD_WOOD_URL = new URL("../assets/chess/board-wood.jpg", import.meta.url).href;

function pieceUrl(piece) {
  const file = PIECE_FILE[piece];
  return file ? new URL(file, PIECE_BASE).href : "";
}

/**
 * @param {SVGElement} svg
 * @param {(r:number,c:number)=>void} onSquareClick
 */
export function ensureChessBoardSvg(svg, onSquareClick) {
  if (!svg) return null;
  if (svg.dataset.built === "1" && svg.querySelector(".chess-square") && svg.querySelector(".chess-wood")) {
    return svg;
  }
  if (svg.dataset.built === "1") {
    const fresh = svg.cloneNode(false);
    delete fresh.dataset.built;
    delete fresh.dataset.flipped;
    svg.replaceWith(fresh);
    svg = /** @type {SVGElement} */ (fresh);
  }

  svg.setAttribute("viewBox", "0 0 8 8");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("aria-label", "\u897f\u6d0b\u68cb\u68cb\u76e4");
  svg.innerHTML = `<defs>
    <radialGradient id="chess-select-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#7dff9a" stop-opacity="0.75"/>
      <stop offset="55%" stop-color="#3ecf6a" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#3ecf6a" stop-opacity="0"/>
    </radialGradient>
    <filter id="chess-piece-shadow" x="-35%" y="-15%" width="170%" height="170%">
      <feDropShadow dx="0.03" dy="0.05" stdDeviation="0.035" flood-color="#1a120c" flood-opacity="0.4"/>
    </filter>
  </defs>
  <g class="chess-stage">
    <image class="chess-wood" href="${BOARD_WOOD_URL}" x="0" y="0" width="8" height="8" preserveAspectRatio="none" pointer-events="none"></image>
    <g class="chess-squares"></g>
    <g class="chess-overlays"></g>
    <g class="chess-pieces"></g>
  </g>`;

  const squares = svg.querySelector(".chess-squares");
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const rect = document.createElementNS(SVG_NS, "rect");
      rect.setAttribute("class", `chess-square ${(r + c) % 2 === 0 ? "is-light" : "is-dark"}`);
      rect.setAttribute("data-r", String(r));
      rect.setAttribute("data-c", String(c));
      rect.setAttribute("x", String(c));
      rect.setAttribute("y", String(r));
      rect.setAttribute("width", "1");
      rect.setAttribute("height", "1");
      rect.setAttribute("fill", "transparent");
      squares.appendChild(rect);
    }
  }

  const onActivate = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const pt = clientToSquare(svg, e.clientX, e.clientY);
    if (!pt) return;
    const [r, c] = pt;
    const cell = svg.querySelector(`.chess-square[data-r="${r}"][data-c="${c}"]`);
    if (!cell || cell.getAttribute("data-disabled") === "1") return;
    e.preventDefault();
    onSquareClick(r, c);
  };
  svg.addEventListener("pointerup", onActivate);
  svg.dataset.built = "1";
  svg.dataset.flipped = "0";
  return svg;
}

function clientToSquare(svg, clientX, clientY) {
  const rect = svg.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  let x = ((clientX - rect.left) / rect.width) * 8;
  let y = ((clientY - rect.top) / rect.height) * 8;
  if (svg.dataset.flipped === "1") {
    x = 8 - x;
    y = 8 - y;
  }
  const c = Math.floor(x);
  const r = Math.floor(y);
  if (r < 0 || r > 7 || c < 0 || c > 7) return null;
  return [r, c];
}

export function resetChessBoardSvg(svg) {
  if (!svg) return;
  delete svg.dataset.built;
  delete svg.dataset.flipped;
}

function applyFlip(svg, flipped) {
  const stage = svg.querySelector(".chess-stage");
  if (!stage) return;
  if (flipped) stage.setAttribute("transform", "rotate(180 4 4)");
  else stage.removeAttribute("transform");
  svg.dataset.flipped = flipped ? "1" : "0";
}

/**
 * @param {string} piece
 * @param {boolean} flipped
 * @param {number} r
 * @param {number} c
 */
function createPieceGroup(piece, flipped, r, c) {
  const side = sideOfPiece(piece);
  const g = document.createElementNS(SVG_NS, "g");
  g.setAttribute("class", `chess-piece chess-piece-${side}`);
  g.setAttribute("filter", "url(#chess-piece-shadow)");
  g.setAttribute("pointer-events", "none");

  const pad = 0.06;
  if (flipped) {
    g.setAttribute(
      "transform",
      `translate(${c + 0.5} ${r + 0.5}) rotate(180) translate(${-0.5 + pad} ${-0.5 + pad})`,
    );
  } else {
    g.setAttribute("transform", `translate(${c + pad} ${r + pad})`);
  }

  const img = document.createElementNS(SVG_NS, "image");
  img.setAttribute("href", pieceUrl(piece));
  img.setAttributeNS("http://www.w3.org/1999/xlink", "href", pieceUrl(piece));
  img.setAttribute("width", String(1 - pad * 2));
  img.setAttribute("height", String(1 - pad * 2));
  img.setAttribute("preserveAspectRatio", "xMidYMax meet");
  img.setAttribute("class", "chess-piece-img");
  g.appendChild(img);

  const title = document.createElementNS(SVG_NS, "title");
  title.textContent = PIECE_NAME_ZH[piece] || piece;
  g.appendChild(title);
  return g;
}

/**
 * @param {SVGElement} svg
 * @param {object} opts
 */
export function renderChessBoardSvg(svg, opts) {
  if (!svg) return;
  const {
    board,
    selected = null,
    lastMove = null,
    legal = new Set(),
    kingInCheck = null,
    over = false,
    interactive = true,
    flipped = false,
  } = opts;

  applyFlip(svg, flipped);
  const overlays = svg.querySelector(".chess-overlays");
  const piecesLayer = svg.querySelector(".chess-pieces");
  if (!overlays || !piecesLayer) return;
  overlays.innerHTML = "";
  piecesLayer.innerHTML = "";

  const [sr, sc] = selected || [null, null];
  const [lr, lc] = lastMove?.to || lastMove || [null, null];
  const [lfr, lfc] = lastMove?.from || [null, null];
  const [kr, kc] = kingInCheck || [null, null];
  const canPlay = !over && interactive;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const sq = svg.querySelector(`.chess-square[data-r="${r}"][data-c="${c}"]`);
      if (sq) sq.setAttribute("data-disabled", canPlay ? "0" : "1");

      if ((lr === r && lc === c) || (lfr === r && lfc === c)) {
        const hi = document.createElementNS(SVG_NS, "rect");
        hi.setAttribute("class", "chess-last");
        hi.setAttribute("x", String(c));
        hi.setAttribute("y", String(r));
        hi.setAttribute("width", "1");
        hi.setAttribute("height", "1");
        overlays.appendChild(hi);
      }
      if (kr === r && kc === c) {
        const hi = document.createElementNS(SVG_NS, "rect");
        hi.setAttribute("class", "chess-check");
        hi.setAttribute("x", String(c));
        hi.setAttribute("y", String(r));
        hi.setAttribute("width", "1");
        hi.setAttribute("height", "1");
        overlays.appendChild(hi);
      }
      if (sr === r && sc === c) {
        const glow = document.createElementNS(SVG_NS, "ellipse");
        glow.setAttribute("class", "chess-select-glow");
        glow.setAttribute("cx", String(c + 0.5));
        glow.setAttribute("cy", String(r + 0.78));
        glow.setAttribute("rx", "0.4");
        glow.setAttribute("ry", "0.22");
        glow.setAttribute("fill", "url(#chess-select-glow)");
        overlays.appendChild(glow);
        const ring = document.createElementNS(SVG_NS, "ellipse");
        ring.setAttribute("class", "chess-select-ring");
        ring.setAttribute("cx", String(c + 0.5));
        ring.setAttribute("cy", String(r + 0.78));
        ring.setAttribute("rx", "0.3");
        ring.setAttribute("ry", "0.14");
        overlays.appendChild(ring);
      }
      if (legal.has(`${r},${c}`)) {
        const hasEnemy = !!board[r][c];
        if (hasEnemy) {
          const ring = document.createElementNS(SVG_NS, "circle");
          ring.setAttribute("class", "chess-target-capture");
          ring.setAttribute("cx", String(c + 0.5));
          ring.setAttribute("cy", String(r + 0.5));
          ring.setAttribute("r", "0.4");
          overlays.appendChild(ring);
        } else {
          const dot = document.createElementNS(SVG_NS, "circle");
          dot.setAttribute("class", "chess-target-dot");
          dot.setAttribute("cx", String(c + 0.5));
          dot.setAttribute("cy", String(r + 0.5));
          dot.setAttribute("r", "0.11");
          overlays.appendChild(dot);
        }
      }

      const piece = board[r][c];
      if (!piece) continue;
      piecesLayer.appendChild(createPieceGroup(piece, flipped, r, c));
    }
  }
}

export function renderChessStatusBar(opts) {
  renderDuoTurnStatusBar({
    theme: "chess",
    leftCard: opts.whiteCard,
    rightCard: opts.blackCard,
    banner: opts.banner,
    turnMain: opts.turnMain,
    turnSub: opts.turnSub,
    leftName: opts.whiteName,
    rightName: opts.blackName,
    turn: opts.turn,
    turnPlayerName: opts.turnPlayerName,
    over: opts.over,
    overTitle: opts.overTitle,
    waitingAi: opts.waitingAi,
    statusText: opts.statusText,
    youHint: opts.youHint,
  });

  if (opts.checkEl) {
    const show = !!opts.inCheck && !opts.over;
    opts.checkEl.toggleAttribute("hidden", !show);
    if (opts.checkTitleEl) opts.checkTitleEl.textContent = opts.checkTitle || "";
    if (opts.checkDetailEl) opts.checkDetailEl.textContent = opts.checkDetail || "";
  }
}
