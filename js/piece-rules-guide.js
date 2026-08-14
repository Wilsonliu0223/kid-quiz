import { XIANGQI_RULES, XIANGQI_PIECE_HINT } from "./rules/xiangqi-rules.js?v=rules-v4";
import { CHESS_RULES, CHESS_PIECE_HINT } from "./rules/chess-rules.js?v=rules-v4";
import { GO_RULES, GO_PIECE_HINT } from "./rules/go-rules.js?v=rules-v4";

const $ = (sel) => document.querySelector(sel);

/** @type {'xiangqi'|'chess'|'go'|null} */
let activeGame = null;
/** @type {'how'|'pieces'|'specials'} */
let activeTab = "how";
/** @type {string|null} */
let activePieceId = null;
/** @type {string|null} */
let activeSpecialId = null;

const RULES = {
  xiangqi: XIANGQI_RULES,
  chess: CHESS_RULES,
  go: GO_RULES,
};

const HINTS = {
  xiangqi: XIANGQI_PIECE_HINT,
  chess: CHESS_PIECE_HINT,
  go: GO_PIECE_HINT,
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
        <button type="button" class="rules-guide-tab" data-tab="specials" role="tab" hidden>特別招式</button>
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
      activeTab = /** @type {'how'|'pieces'|'specials'} */ (btn.getAttribute("data-tab") || "how");
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
      if (cell?.mark === "to") classes.push("is-to");
      if (cell?.mark === "bad") classes.push("is-bad");
      const label = cell?.piece
        ? `<span class="rules-mini-piece">${cell.piece}</span>`
        : cell?.mark === "dot" || cell?.mark === "to"
          ? `<span class="rules-mini-dot"></span>`
          : cell?.mark === "block"
            ? `<span class="rules-mini-block">擋</span>`
            : cell?.mark === "x"
              ? `<span class="rules-mini-x">吃</span>`
              : cell?.mark === "bad"
                ? `<span class="rules-mini-bad">✕</span>`
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
      ${card.grid ? renderMiniGrid(card.grid) : ""}
      ${card.caption ? `<p class="rules-legend">${card.caption}</p>` : ""}
      ${card.tip ? `<p class="rules-tip">${card.tip}</p>` : ""}
    </article>`,
    )
    .join("");
}

/**
 * @param {import('./rules/chess-rules.js').RulesPiece[] | any[]} items
 * @param {string|null} selectedId
 * @param {'piece'|'special'} kind
 */
function renderItemDetail(items, selectedId, kind) {
  const current = items.find((p) => p.id === selectedId) || items[0];
  if (!current) return "<p>尚無內容</p>";
  if (kind === "piece") activePieceId = current.id;
  else activeSpecialId = current.id;

  const chips = items
    .map(
      (p) => `
    <button type="button" class="rules-piece-chip${p.id === current.id ? " is-selected" : ""}" data-${kind}="${p.id}">
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
      <p class="rules-how-line"><strong>怎麼做：</strong>${current.how}</p>
      <p class="rules-limit-line"><strong>要注意：</strong>${current.limit}</p>
      <p class="rules-legend">綠框＝起點 · 點＝走到這裡 · 擋＝擋住 · 吃＝可吃 · ✕＝不行／被擋方向</p>
    </article>`;
}

function renderGuide() {
  const pack = activeGame ? RULES[activeGame] : null;
  if (!pack) return;
  const overlay = ensureOverlay();
  const title = $("#rules-guide-title");
  const body = $("#rules-guide-body");
  if (title) title.textContent = pack.title;

  const hasSpecials = Array.isArray(pack.specials) && pack.specials.length > 0;
  const specialsTab = overlay.querySelector('.rules-guide-tab[data-tab="specials"]');
  if (specialsTab) specialsTab.hidden = !hasSpecials;
  if (!hasSpecials && activeTab === "specials") activeTab = "how";

  overlay.querySelectorAll(".rules-guide-tab").forEach((btn) => {
    btn.classList.toggle("is-active", btn.getAttribute("data-tab") === activeTab);
    if (btn.getAttribute("data-tab") === "pieces") {
      btn.textContent = pack.piecesTab || "棋子怎麼走";
    }
  });
  if (body) {
    if (activeTab === "how") body.innerHTML = renderHow(pack);
    else if (activeTab === "specials") body.innerHTML = renderItemDetail(pack.specials || [], activeSpecialId, "special");
    else body.innerHTML = renderItemDetail(pack.pieces, activePieceId, "piece");

    body.querySelectorAll("[data-piece]").forEach((btn) => {
      btn.addEventListener("click", () => {
        activePieceId = btn.getAttribute("data-piece");
        activeTab = "pieces";
        renderGuide();
      });
    });
    body.querySelectorAll("[data-special]").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeSpecialId = btn.getAttribute("data-special");
        activeTab = "specials";
        renderGuide();
      });
    });
  }
}

/**
 * @param {'xiangqi'|'chess'|'go'} game
 * @param {{ tab?: 'how'|'pieces'|'specials', pieceId?: string, specialId?: string }} [opts]
 */
export function openRulesGuide(game, opts = {}) {
  activeGame = game;
  activeTab = opts.tab || "how";
  activePieceId = opts.pieceId || null;
  activeSpecialId = opts.specialId || null;
  const overlay = ensureOverlay();
  renderGuide();
  overlay.hidden = false;
}

export function closeRulesGuide() {
  const overlay = $("#rules-guide-overlay");
  if (overlay) overlay.hidden = true;
}

/**
 * @param {'xiangqi'|'chess'|'go'} game
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
 * @param {'xiangqi'|'chess'|'go'} game
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
