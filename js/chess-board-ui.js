import {
  COLS,
  PIECE_NAME_ZH,
  ROWS,
  sideOfPiece,
} from "./chess-core.js?v=chess-v5";
import { renderDuoTurnStatusBar } from "./game-turn-status.js";

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Staunton paths from Lichess Cburnett set (Wikimedia / CC BY-SA).
 * Each entry: { d, fill?: 'body'|'none'|'ink', strokeCap?: string }
 */
const PIECE_LAYERS = {
  P: [{ d: "M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z", fill: "body" }],
  R: [
    { d: "M9 39h27v-3H9zm3-3v-4h21v4zm-1-22V9h4v2h5V9h5v2h5V9h4v5", fill: "body", strokeCap: "butt" },
    { d: "m34 14-3 3H14l-3-3", fill: "body" },
    { d: "M31 17v12.5H14V17", fill: "body", strokeCap: "butt" },
    { d: "m31 29.5 1.5 2.5h-20l1.5-2.5", fill: "body" },
    { d: "M11 14h23", fill: "none" },
  ],
  N: [
    { d: "M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21", fill: "body" },
    {
      d: "M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3",
      fill: "body",
    },
    { d: "M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0m5.433-9.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5", fill: "ink" },
  ],
  B: [
    {
      d: "M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.94 3-2 3-2z",
      fill: "body",
      strokeCap: "butt",
    },
    {
      d: "M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z",
      fill: "body",
      strokeCap: "butt",
    },
    { d: "M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z", fill: "body", strokeCap: "butt" },
    { d: "M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5", fill: "none" },
  ],
  Q: [
    { d: "M8 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0m16.5-4.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0M41 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0M16 8.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0M33 9a2 2 0 1 1-4 0 2 2 0 1 1 4 0", fill: "body" },
    { d: "M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15-5.5-14V25L7 14z", fill: "body", strokeCap: "butt" },
    {
      d: "M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z",
      fill: "body",
      strokeCap: "butt",
    },
    { d: "M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0", fill: "none" },
  ],
  K: [
    { d: "M22.5 11.63V6M20 8h5", fill: "none" },
    {
      d: "M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5",
      fill: "body",
      strokeCap: "butt",
    },
    {
      d: "M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10z",
      fill: "body",
    },
    { d: "M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0", fill: "none" },
  ],
};

/**
 * @param {SVGElement} svg
 * @param {(r:number,c:number)=>void} onSquareClick
 */
export function ensureChessBoardSvg(svg, onSquareClick) {
  if (!svg) return null;
  if (svg.dataset.built === "1" && svg.querySelector(".chess-square") && svg.querySelector("#chess-grad-white")) {
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
  svg.setAttribute("aria-label", "西洋棋棋盤");
  svg.innerHTML = `<defs>
    <linearGradient id="chess-light-sq" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f3d9a8"/>
      <stop offset="100%" stop-color="#e4c48a"/>
    </linearGradient>
    <linearGradient id="chess-dark-sq" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#c08a58"/>
      <stop offset="100%" stop-color="#8f5a38"/>
    </linearGradient>
    <linearGradient id="chess-grad-white" x1="0.18" y1="0" x2="0.82" y2="1">
      <stop offset="0%" stop-color="#fffef9"/>
      <stop offset="38%" stop-color="#f4ebe0"/>
      <stop offset="100%" stop-color="#d4c4ae"/>
    </linearGradient>
    <linearGradient id="chess-grad-black" x1="0.18" y1="0" x2="0.82" y2="1">
      <stop offset="0%" stop-color="#555"/>
      <stop offset="42%" stop-color="#2c2c2c"/>
      <stop offset="100%" stop-color="#0e0e0e"/>
    </linearGradient>
    <radialGradient id="chess-select-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#6adf88" stop-opacity="0.9"/>
      <stop offset="65%" stop-color="#2f8f4e" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#2f8f4e" stop-opacity="0"/>
    </radialGradient>
    <filter id="chess-piece-shadow" x="-45%" y="-25%" width="190%" height="190%">
      <feDropShadow dx="0.035" dy="0.07" stdDeviation="0.04" flood-color="#1a120c" flood-opacity="0.5"/>
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
 * @param {string} piece
 * @param {boolean} flipped
 * @param {number} r
 * @param {number} c
 */
function createPieceGroup(piece, flipped, r, c) {
  const side = sideOfPiece(piece);
  const type = piece.toUpperCase();
  const layers = PIECE_LAYERS[type] || PIECE_LAYERS.P;
  const g = document.createElementNS(SVG_NS, "g");
  g.setAttribute("class", `chess-piece chess-piece-${side}`);
  g.setAttribute("filter", "url(#chess-piece-shadow)");
  g.setAttribute("pointer-events", "none");

  const scale = 0.0192;
  const ox = (1 - 45 * scale) / 2;
  const oy = 0.04;
  if (flipped) {
    g.setAttribute(
      "transform",
      `translate(${c + 0.5} ${r + 0.5}) rotate(180) translate(${-0.5 + ox} ${-0.5 + oy}) scale(${scale})`,
    );
  } else {
    g.setAttribute("transform", `translate(${c + ox} ${r + oy}) scale(${scale})`);
  }

  const bodyFill = side === "white" ? "url(#chess-grad-white)" : "url(#chess-grad-black)";
  const stroke = side === "white" ? "#2f2922" : "#e6dcc8";
  const ink = side === "white" ? "#2f2922" : "#e6dcc8";

  for (const layer of layers) {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", layer.d);
    path.setAttribute("stroke", stroke);
    path.setAttribute("stroke-width", "1.5");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("stroke-linecap", layer.strokeCap || "round");
    if (layer.fill === "none") {
      path.setAttribute("fill", "none");
    } else if (layer.fill === "ink") {
      path.setAttribute("fill", ink);
    } else {
      path.setAttribute("fill", bodyFill);
    }
    g.appendChild(path);
  }

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
        const glow = document.createElementNS(SVG_NS, "circle");
        glow.setAttribute("class", "chess-select-glow");
        glow.setAttribute("cx", String(c + 0.5));
        glow.setAttribute("cy", String(r + 0.72));
        glow.setAttribute("r", "0.44");
        glow.setAttribute("fill", "url(#chess-select-glow)");
        overlays.appendChild(glow);
        const ring = document.createElementNS(SVG_NS, "circle");
        ring.setAttribute("class", "chess-select-ring");
        ring.setAttribute("cx", String(c + 0.5));
        ring.setAttribute("cy", String(r + 0.72));
        ring.setAttribute("r", "0.3");
        overlays.appendChild(ring);
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
          dot.setAttribute("r", "0.13");
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
