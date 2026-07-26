import { XIANGQI_RULES, XIANGQI_PIECE_HINT } from "./rules/xiangqi-rules.js?v=rules-v2";
import { CHESS_RULES, CHESS_PIECE_HINT } from "./rules/chess-rules.js?v=rules-v2";

const $ = (sel) => document.querySelector(sel);

/** @type {'xiangqi'|'chess'|null} */
let activeGame = null;
/** @type {'how'|'pieces'} */
let activeTab = "how";
/** @type {string|null} */
let activePieceId = null;

const RULES = {
  xiangqi: XIANGQI_RULES,
  chess: CHESS_RULES,
};

const HINTS = {
  xiangqi: XIANGQI_PIECE_HINT,
  chess: CHESS_PIECE_HINT,
};

function ensureOverlay() {
  let el = $("#rules-guide-overlay");
  if (el) return el;
  el = document.createElement("div");
  el.id = "rules-guide-overlay";
  el.className = "rules-guide-overlay";
  el.hidden = true;
  el.innerHTML = `
    <div class="rules-guide-card" role="dialog" aria-modal="true" aria-labelledby="rules-guide-title">
      <header class="rules-guide-head">
        <h2 class="rules-guide-title" id="rules-guide-title">小教室</h2>
        <button type="button" class="btn-text rules-guide-close" id="btn-rules-guide-close" aria-label="關閉">✕</button>
      </header>
      <div class="rules-guide-tabs" role="tablist">
        <button type="button" class="rules-guide-tab is-active" data-tab="how" role="tab">怎麼玩</button>
        <button type="button" class="rules-guide-tab" data-tab="pieces" role="tab">棋子怎麼走</button>
      </div>
      <div class="rules-guide-body" id="rules-guide-body"></div>
    </div>`;
  document.body.appendChild(el);

  el.addEventListener("click", (e) => {
    if (e.target === el) closeRulesGuide();
  });
  el.querySelector("#btn-rules-guide-close")?.addEventListener("click", () => closeRulesGuide());
  el.querySelectorAll(".rules-guide-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeTab = /** @type {'how'|'pieces'} */ (btn.getAttribute("data-tab") || "how");
      renderGuide();
    });
  });
  return el;
}

function renderMiniGrid(grid) {
  if (!grid) return "";
  const { rows, cols, cells } = grid;
  const map = new Map(cells.map((c) => [`${c.r},${c.c}`, c]));
  let html = `<div class="rules-mini-grid" style="--rules-cols:${cols};--rules-rows:${rows}">`;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = map.get(`${r},${c}`);
      const classes = ["rules-mini-cell"];
      if ((r + c) % 2) classes.push("is-dark");
      if (cell?.mark === "from") classes.push("is-from");
      if (cell?.mark === "dot") classes.push("is-dot");
      if (cell?.mark === "block") classes.push("is-block");
      if (cell?.mark === "x") classes.push("is-capture");
      const label = cell?.piece
        ? `<span class="rules-mini-piece">${cell.piece}</span>`
        : cell?.mark === "dot"
          ? `<span class="rules-mini-dot"></span>`
          : cell?.mark === "block"
            ? `<span class="rules-mini-block">擋</span>`
            : cell?.mark === "x"
              ? `<span class="rules-mini-x">吃</span>`
              : "";
      html += `<div class="${classes.join(" ")}">${label}</div>`;
    }
  }
  html += "</div>";
  return html;
}

function renderHow(pack) {
  return pack.how
    .map(
      (card) => `
    <article class="rules-how-card">
      <h3>${card.title}</h3>
      <ul>${card.lines.map((l) => `<li>${l}</li>`).join("")}</ul>
      ${card.tip ? `<p class="rules-tip">${card.tip}</p>` : ""}
    </article>`,
    )
    .join("");
}

function renderPieces(pack) {
  const pieces = pack.pieces;
  const current = pieces.find((p) => p.id === activePieceId) || pieces[0];
  activePieceId = current.id;
  const chips = pieces
    .map(
      (p) => `
    <button type="button" class="rules-piece-chip${p.id === current.id ? " is-selected" : ""}" data-piece="${p.id}">
      <span class="rules-piece-badge">${p.badge}</span>
      <span class="rules-piece-name">${p.name}</span>
    </button>`,
    )
    .join("");

  return `
    <div class="rules-piece-chips">${chips}</div>
    <article class="rules-piece-detail">
      <div class="rules-piece-detail-head">
        <span class="rules-piece-badge rules-piece-badge-lg">${current.badge}</span>
        <div>
          <h3>${current.name}</h3>
          ${current.tip ? `<p class="rules-tip">${current.tip}</p>` : ""}
        </div>
      </div>
      ${renderMiniGrid(current.grid)}
      <p class="rules-how-line"><strong>怎麼走：</strong>${current.how}</p>
      <p class="rules-limit-line"><strong>要注意：</strong>${current.limit}</p>
      <p class="rules-legend">綠點＝可以走 · 擋＝擋住了 · 吃＝可以吃這顆</p>
    </article>`;
}

function renderGuide() {
  const pack = activeGame ? RULES[activeGame] : null;
  if (!pack) return;
  const overlay = ensureOverlay();
  const title = $("#rules-guide-title");
  const body = $("#rules-guide-body");
  if (title) title.textContent = pack.title;
  overlay.querySelectorAll(".rules-guide-tab").forEach((btn) => {
    btn.classList.toggle("is-active", btn.getAttribute("data-tab") === activeTab);
  });
  if (body) {
    body.innerHTML = activeTab === "how" ? renderHow(pack) : renderPieces(pack);
    body.querySelectorAll("[data-piece]").forEach((btn) => {
      btn.addEventListener("click", () => {
        activePieceId = btn.getAttribute("data-piece");
        activeTab = "pieces";
        renderGuide();
      });
    });
  }
}

/**
 * @param {'xiangqi'|'chess'} game
 * @param {{ tab?: 'how'|'pieces', pieceId?: string }} [opts]
 */
export function openRulesGuide(game, opts = {}) {
  activeGame = game;
  activeTab = opts.tab || "how";
  activePieceId = opts.pieceId || null;
  const overlay = ensureOverlay();
  renderGuide();
  overlay.hidden = false;
}

export function closeRulesGuide() {
  const overlay = $("#rules-guide-overlay");
  if (overlay) overlay.hidden = true;
}

/**
 * @param {'xiangqi'|'chess'} game
 * @param {string} pieceCode
 */
export function getPieceMoveHint(game, pieceCode) {
  if (!pieceCode) return "";
  return HINTS[game]?.[pieceCode] || "";
}

/**
 * @param {HTMLElement|null} el
 * @param {string} text
 */
export function setRulesPlayHint(el, text) {
  if (!el) return;
  if (!text) {
    el.hidden = true;
    el.textContent = "";
    return;
  }
  el.hidden = false;
  el.textContent = text;
}

/**
 * Bind common "規則" buttons.
 * @param {'xiangqi'|'chess'} game
 * @param {string[]} buttonSelectors
 */
export function bindRulesGuideButtons(game, buttonSelectors) {
  for (const sel of buttonSelectors) {
    document.querySelector(sel)?.addEventListener("click", (e) => {
      e.preventDefault();
      openRulesGuide(game);
    });
  }
}
