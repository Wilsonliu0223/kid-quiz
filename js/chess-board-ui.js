import {
  COLS,
  PIECE_NAME_ZH,
  ROWS,
  sideOfPiece,
} from "./chess-core.js?v=chess-v1";
import { renderDuoTurnStatusBar } from "./game-turn-status.js";

const SVG_NS = "http://www.w3.org/2000/svg";

/** Public-domain Staunton-style silhouettes (simplified) */
const PIECE_PATHS = {
  K: "M22 10c0-2 1.5-3.5 3.5-3.5S29 8 29 10v1.5h2.5V10c0-3.4-2.6-6-6-6h-.5V2h-2v2H22c-3.4 0-6 2.6-6 6v1.5H18.5V10zm-1.5 4h15l-1.2 3.5H21.7L20.5 14zm-1.8 5.5h19.6l-1.5 18H20.2l-1.5-18zm2.3 20h15l1 5H20l1-5z",
  Q: "M12 12l3-8 5 6 4-9 4 9 5-6 3 8-4 2v4H16v-4l-4-2zm4 8h16l-1.5 16H17.5L16 20zm1.5 18h13l1 5H16.5l1-5z",
  R: "M14 8h4v4h4V8h4v4h4V8h4v10H14V8zm0 12h28v4H14v-4zm2 6h24l-1.5 14H17.5L16 26zm1.5 16h21l1 5H16.5l1-5z",
  B: "M24 4c2.5 0 4.5 3 4.5 6.5 0 2-1 3.8-2.5 5.2L28 20H20l2-4.3C20.5 14.3 19.5 12.5 19.5 10.5 19.5 7 21.5 4 24 4zm-6 18h12l-1.2 14H19.2L18 22zm1.5 16h9l1 5H18.5l1-5z",
  N: "M30 8c-2 0-4 1-5.5 3L18 18v4h4l2-3c1.5 4 5 7 10 8v3H16v4h24V28c-6-1-10-5-11-10 3 1 6 0 8-2 2-2 2.5-5 1-7.5C36 10 33 8 30 8zm-12 28h20l1 5H17l1-5z",
  P: "M24 10c3 0 5.5 2.5 5.5 5.5S27 21 24 21s-5.5-2.5-5.5-5.5S21 10 24 10zm-4 13h8l-1 8H21l-1-8zm-1 10h10l-1.5 10H20.5L19 33zm1.5 12h7l1 4h-9l1-4z",
};

function piecePath(piece) {
  return PIECE_PATHS[piece.toUpperCase()] || PIECE_PATHS.P;
}

/**
 * @param {SVGElement} svg
 * @param {(r:number,c:number)=>void} onSquareClick
 */
export function ensureChessBoardSvg(svg, onSquareClick) {
  if (!svg) return null;
  if (svg.dataset.built === "1" && svg.querySelector(".chess-square")) return svg;
  if (svg.dataset.built === "1") {
    const fresh = svg.cloneNode(false);
    delete fresh.dataset.built;
    delete fresh.dataset.flipped;
    svg.replaceWith(fresh);
    svg = /** @type {SVGElement} */ (fresh);
  }

  svg.setAttribute("viewBox", "0 0 8 8");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("aria-label", "西洋棋棋盤");
  svg.innerHTML = `<defs>
    <linearGradient id="chess-light-sq" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f0d9b5"/>
      <stop offset="100%" stop-color="#e8c992"/>
    </linearGradient>
    <linearGradient id="chess-dark-sq" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#b58863"/>
      <stop offset="100%" stop-color="#8b5a3c"/>
    </linearGradient>
    <filter id="chess-piece-shadow" x="-30%" y="-20%" width="160%" height="160%">
      <feDropShadow dx="0.04" dy="0.06" stdDeviation="0.04" flood-opacity="0.35"/>
    </filter>
  </defs>
  <g class="chess-stage"><g class="chess-squares"></g><g class="chess-overlays"></g><g class="chess-pieces"></g></g>`;

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
      rect.setAttribute("fill", (r + c) % 2 === 0 ? "url(#chess-light-sq)" : "url(#chess-dark-sq)");
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
      if (sr === r && sc === c) {
        const hi = document.createElementNS(SVG_NS, "rect");
        hi.setAttribute("class", "chess-selected");
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
      if (legal.has(`${r},${c}`)) {
        const hasEnemy = !!board[r][c];
        if (hasEnemy) {
          const ring = document.createElementNS(SVG_NS, "circle");
          ring.setAttribute("class", "chess-target-capture");
          ring.setAttribute("cx", String(c + 0.5));
          ring.setAttribute("cy", String(r + 0.5));
          ring.setAttribute("r", "0.42");
          overlays.appendChild(ring);
        } else {
          const dot = document.createElementNS(SVG_NS, "circle");
          dot.setAttribute("class", "chess-target-dot");
          dot.setAttribute("cx", String(c + 0.5));
          dot.setAttribute("cy", String(r + 0.5));
          dot.setAttribute("r", "0.14");
          overlays.appendChild(dot);
        }
      }

      const piece = board[r][c];
      if (!piece) continue;
      const g = document.createElementNS(SVG_NS, "g");
      g.setAttribute("class", `chess-piece chess-piece-${sideOfPiece(piece)}`);
      g.setAttribute("transform", `translate(${c} ${r})`);
      g.setAttribute("filter", "url(#chess-piece-shadow)");
      g.setAttribute("pointer-events", "none");
      if (flipped) {
        // counter-rotate piece so figurine stays upright
        g.setAttribute("transform", `translate(${c + 0.5} ${r + 0.5}) rotate(180) translate(${-0.5} ${-0.5})`);
      }

      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", piecePath(piece));
      path.setAttribute("transform", "scale(0.0175) translate(4 2)");
      path.setAttribute("class", "chess-piece-path");
      g.appendChild(path);

      const title = document.createElementNS(SVG_NS, "title");
      title.textContent = PIECE_NAME_ZH[piece] || piece;
      g.appendChild(title);
      piecesLayer.appendChild(g);
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
