/**
 * 成語翻牌：每條四字成語拆成 4 張字卡。
 * 預設 10 條＝40 張；每人一回合翻 4 張，湊成同一條才得分。
 */
import { duoScores, getChildName, otherDuoPlayer } from "./children.js";
import {
  getActiveDuoPlayerIds,
  refreshDuoBattleUI,
  renderDuoPickButtons,
} from "./duo-pick.js";
import { IDIOM_BANK } from "./idiom-bank.js";

const KEY_IDIOM_COUNT = "kid-quiz-idiom-flip-count";
const IDIOM_COUNT_OPTIONS = [5, 10];
const CARDS_PER_TURN = 4;
const MISMATCH_MS = 1100;

/** @type {import('./flip-idiom.js').IdiomFlipDeps | null} */
let deps = null;
/** @type {IdiomFlipGame | null} */
let game = null;
/** @type {'idiomFlipFirst' | 'idiomFlipPlay'} */
let teachReturn = "idiomFlipFirst";

/**
 * @typedef {object} IdiomFlipDeps
 * @property {(name: string) => void} showView
 * @property {() => { A: string, B: string }} getChildNames
 * @property {(title: string, sub?: string) => void} showWarn
 */

/**
 * @typedef {object} IdiomItem
 * @property {string} id
 * @property {string} idiom
 * @property {string} meaning
 */

/**
 * @typedef {object} IdiomCard
 * @property {string} id
 * @property {string} idiomId
 * @property {string} idiom
 * @property {string} meaning
 * @property {string} face
 * @property {boolean} faceUp
 * @property {boolean} matched
 */

/**
 * @typedef {object} IdiomFlipGame
 * @property {IdiomItem[]} idioms
 * @property {IdiomCard[]} cards
 * @property {Record<string, number>} scores
 * @property {string[]} playerIds
 * @property {string} firstPlayerId
 * @property {string} currentPlayerId
 * @property {number[]} flippedIdx
 * @property {boolean} locked
 * @property {number} matchedIdioms
 * @property {number} idiomCount
 * @property {string} lastFound
 */

const $ = (sel) => document.querySelector(sel);

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function getIdiomCountSetting() {
  const n = parseInt(localStorage.getItem(KEY_IDIOM_COUNT) || "", 10);
  if (IDIOM_COUNT_OPTIONS.includes(n)) return n;
  return 10;
}

function setIdiomCountSetting(n) {
  localStorage.setItem(KEY_IDIOM_COUNT, String(n));
}

export function syncIdiomCountChips() {
  const container = $("#idiom-flip-count-chips");
  if (!container) return;
  const current = String(getIdiomCountSetting());
  container.querySelectorAll(".chip").forEach((btn) => {
    btn.classList.toggle("chip-active", btn.dataset.idiomCount === current);
  });
}

function initIdiomCountPicker() {
  const container = $("#idiom-flip-count-chips");
  if (!container) return;
  container.querySelectorAll(".chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      const n = parseInt(btn.dataset.idiomCount, 10);
      if (IDIOM_COUNT_OPTIONS.includes(n)) {
        setIdiomCountSetting(n);
        syncIdiomCountChips();
      }
    });
  });
  syncIdiomCountChips();
}

function playerName(id) {
  const names = deps.getChildNames();
  return names[id] || getChildName(id) || id;
}

/** 抽 N 條互不共用字的四字成語，避免牌面上出現兩個相同字。 */
export function pickIdioms(count) {
  const pool = shuffle(IDIOM_BANK);
  const picked = [];
  const used = new Set();
  for (const item of pool) {
    const chars = [...item.idiom];
    if (chars.some((ch) => used.has(ch))) continue;
    picked.push(item);
    chars.forEach((ch) => used.add(ch));
    if (picked.length >= count) break;
  }
  if (picked.length < count) {
    return { ok: false, available: picked.length, idioms: picked };
  }
  return { ok: true, available: picked.length, idioms: picked };
}

function buildCards(idioms) {
  /** @type {IdiomCard[]} */
  const cards = [];
  idioms.forEach((item) => {
    [...item.idiom].forEach((ch, i) => {
      cards.push({
        id: `${item.id}-${i}`,
        idiomId: item.id,
        idiom: item.idiom,
        meaning: item.meaning,
        face: ch,
        faceUp: false,
        matched: false,
      });
    });
  });
  return shuffle(cards);
}

function gridCols(cardCount) {
  if (cardCount <= 20) return 5;
  return 5;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function fillIdiomList(sel, markFound) {
  const el = $(sel);
  if (!el || !game) return;
  const found = new Set(
    markFound ? game.cards.filter((c) => c.matched).map((c) => c.idiomId) : []
  );
  el.innerHTML = game.idioms
    .map((item) => {
      const cls = found.has(item.id) ? " is-found" : "";
      return (
        `<li class="${cls}">` +
        `<span class="idiom-flip-teach-word">${escapeHtml(item.idiom)}</span>` +
        `<span class="idiom-flip-teach-meaning">${escapeHtml(item.meaning)}</span>` +
        `</li>`
      );
    })
    .join("");
}

function openTeach(nextView) {
  teachReturn = nextView;
  const fromPlay = nextView === "idiomFlipPlay";
  const hint = $("#idiom-flip-teach-hint");
  const nextBtn = $("#btn-idiom-flip-teach-next");
  if (hint) {
    hint.textContent = fromPlay
      ? "忘記了可以再看一次。已找到的會標「已找到」。"
      : "先念給小孩聽：這幾條會拆成字卡，翻到同一條的四個字就得分。";
  }
  if (nextBtn) {
    nextBtn.textContent = fromPlay ? "回到翻牌" : "看完了，選誰先";
  }
  fillIdiomList("#idiom-flip-teach-list", fromPlay);
  deps.showView("idiomFlipTeach");
}

function renderFirstPicker() {
  refreshDuoBattleUI();
  renderDuoPickButtons("#idiom-flip-pick-btns", {
    onPick: startGameWithFirstPlayer,
  });
  const count = game?.idiomCount ?? getIdiomCountSetting();
  const el = $("#idiom-flip-first-count");
  if (el) el.textContent = `${count} 條 · ${count * 4} 張`;
}

function setFoundBanner(text) {
  const el = $("#idiom-flip-found");
  if (!el) return;
  if (!text) {
    el.hidden = true;
    el.textContent = "";
    return;
  }
  el.hidden = false;
  el.textContent = text;
}

function renderPlayHeader() {
  if (!game) return;
  const [idA, idB] = game.playerIds;
  const set = (sel, text) => {
    const el = $(sel);
    if (el) el.textContent = text;
  };
  set("#idiom-flip-play-name-a", playerName(idA));
  set("#idiom-flip-play-name-b", playerName(idB));
  set("#idiom-flip-score-a", String(game.scores[idA] ?? 0));
  set("#idiom-flip-score-b", String(game.scores[idB] ?? 0));
  set("#idiom-flip-turn-label", `輪到：${playerName(game.currentPlayerId)}`);
  set("#idiom-flip-progress-label", `成語 ${game.matchedIdioms} / ${game.idiomCount}`);
  set(
    "#idiom-flip-click-label",
    `本回合 ${game.flippedIdx.length} / ${CARDS_PER_TURN} 張`
  );

  $("#idiom-flip-score-block-a")?.classList.toggle(
    "flip-score-active",
    game.currentPlayerId === idA
  );
  $("#idiom-flip-score-block-b")?.classList.toggle(
    "flip-score-active",
    game.currentPlayerId === idB
  );

  const tagA = $("#idiom-flip-first-tag-a");
  const tagB = $("#idiom-flip-first-tag-b");
  if (tagA) tagA.hidden = game.firstPlayerId !== idA;
  if (tagB) tagB.hidden = game.firstPlayerId !== idB;
  setFoundBanner(game.lastFound);
}

function renderBoard() {
  const grid = $("#idiom-flip-card-grid");
  if (!grid || !game) return;

  grid.style.setProperty("--flip-cols", String(gridCols(game.cards.length)));
  grid.dataset.pairs = String(game.idiomCount * 2);
  grid.innerHTML = "";

  game.cards.forEach((card, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "flip-card";
    btn.dataset.idx = String(idx);
    btn.dataset.idiomId = card.idiomId;
    btn.disabled = game.locked || card.matched;

    if (card.matched || card.faceUp) {
      btn.classList.add("flip-card-face-up", "flip-card-char");
      if (card.matched) btn.classList.add("flip-card-matched");
      btn.innerHTML = `<span class="flip-card-inner">${escapeHtml(card.face)}</span>`;
    } else {
      btn.innerHTML = '<span class="flip-card-back">?</span>';
    }

    btn.addEventListener("click", () => onCardClick(idx));
    grid.appendChild(btn);
  });

  renderPlayHeader();
}

function fourCardsMatch(cards) {
  if (cards.length !== CARDS_PER_TURN) return false;
  const id = cards[0].idiomId;
  return cards.every((c) => c.idiomId === id);
}

function onCardClick(idx) {
  if (!game || game.locked) return;
  const card = game.cards[idx];
  if (!card || card.matched || card.faceUp) return;
  if (game.flippedIdx.length >= CARDS_PER_TURN) return;

  card.faceUp = true;
  game.flippedIdx.push(idx);
  renderBoard();

  if (game.flippedIdx.length < CARDS_PER_TURN) return;

  game.locked = true;
  const flipped = game.flippedIdx.map((i) => game.cards[i]);

  if (fourCardsMatch(flipped)) {
    flipped.forEach((c) => {
      c.matched = true;
    });
    game.scores[game.currentPlayerId] += 1;
    game.matchedIdioms += 1;
    game.lastFound = `${flipped[0].idiom}：${flipped[0].meaning}`;
    game.flippedIdx = [];
    game.locked = false;
    renderBoard();

    if (game.matchedIdioms >= game.idiomCount) {
      setTimeout(showResult, 500);
    }
    return;
  }

  setTimeout(() => {
    if (!game) return;
    game.flippedIdx.forEach((i) => {
      const c = game.cards[i];
      if (c && !c.matched) c.faceUp = false;
    });
    game.flippedIdx = [];
    game.lastFound = "";
    game.currentPlayerId = otherDuoPlayer(game.currentPlayerId, game.playerIds);
    game.locked = false;
    renderBoard();
  }, MISMATCH_MS);
}

function showResult() {
  if (!game) return;
  const [idA, idB] = game.playerIds;
  const a = game.scores[idA] ?? 0;
  const b = game.scores[idB] ?? 0;
  const title = $("#idiom-flip-result-title");
  const scores = $("#idiom-flip-result-scores");
  const detail = $("#idiom-flip-result-detail");
  const list = $("#idiom-flip-result-list");

  if (a > b && title) title.textContent = `${playerName(idA)} 獲勝！`;
  else if (b > a && title) title.textContent = `${playerName(idB)} 獲勝！`;
  else if (title) title.textContent = "平手！";

  if (scores) scores.textContent = `${playerName(idA)} ${a} ：${b} ${playerName(idB)}`;
  if (detail) detail.textContent = `共 ${game.idiomCount} 條成語 · ${game.idiomCount * 4} 張字卡`;

  if (list) {
    list.innerHTML = game.idioms
      .map(
        (item) =>
          `<li><strong>${escapeHtml(item.idiom)}</strong> ${escapeHtml(item.meaning)}</li>`
      )
      .join("");
  }

  deps.showView("idiomFlipResult");
}

function startGameWithFirstPlayer(firstPlayerId) {
  if (!game?.idioms || !game.playerIds?.includes(firstPlayerId)) return;
  game.firstPlayerId = firstPlayerId;
  game.currentPlayerId = firstPlayerId;
  game.cards = buildCards(game.idioms);
  game.scores = duoScores(game.playerIds);
  game.flippedIdx = [];
  game.locked = false;
  game.matchedIdioms = 0;
  game.lastFound = "";
  deps.showView("idiomFlipPlay");
  renderBoard();
}

function createLobby(idioms, idiomCount) {
  const playerIds = getActiveDuoPlayerIds();
  if (playerIds.length < 2) {
    deps.showWarn("需要兩位才能對戰", "請在首頁選「誰在練習」，並挑選對戰對象");
    return null;
  }
  return {
    idioms,
    cards: [],
    playerIds,
    scores: duoScores(playerIds),
    firstPlayerId: playerIds[0],
    currentPlayerId: playerIds[0],
    flippedIdx: [],
    locked: false,
    matchedIdioms: 0,
    idiomCount,
    lastFound: "",
  };
}

function beginLocal() {
  const idiomCount = getIdiomCountSetting();
  const result = pickIdioms(idiomCount);
  if (!result.ok) {
    deps.showWarn("成語不夠開局", `目前只能抽出 ${result.available} 條互不重複的成語`);
    return;
  }
  game = createLobby(result.idioms, idiomCount);
  if (!game) return;
  openTeach("idiomFlipFirst");
}

export function beginIdiomFlipFromHome() {
  beginLocal();
}

function bindEvents() {
  $("#btn-start-flip-idiom")?.addEventListener("click", (e) => {
    e.preventDefault();
    beginIdiomFlipFromHome();
  });
  $("#btn-idiom-flip-teach-back")?.addEventListener("click", () => {
    if (teachReturn === "idiomFlipPlay") {
      deps.showView("idiomFlipPlay");
      renderBoard();
      return;
    }
    deps.showView("setupZh");
  });
  $("#btn-idiom-flip-teach-next")?.addEventListener("click", () => {
    if (teachReturn === "idiomFlipPlay") {
      deps.showView("idiomFlipPlay");
      renderBoard();
      return;
    }
    renderFirstPicker();
    deps.showView("idiomFlipFirst");
  });
  $("#btn-idiom-flip-first-back")?.addEventListener("click", () => openTeach("idiomFlipFirst"));
  $("#btn-idiom-flip-peek")?.addEventListener("click", () => openTeach("idiomFlipPlay"));
  $("#btn-idiom-flip-play-back")?.addEventListener("click", () => {
    if (confirm("離開對戰？目前進度不會儲存。")) deps.showView("setupZh");
  });
  $("#btn-idiom-flip-replay")?.addEventListener("click", () => beginLocal());
  $("#btn-idiom-flip-home")?.addEventListener("click", () => deps.showView("setupZh"));
}

/**
 * @param {IdiomFlipDeps} d
 */
export function initFlipIdiom(d) {
  deps = d;
  initIdiomCountPicker();
  bindEvents();
}
