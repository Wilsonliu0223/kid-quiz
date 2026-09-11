/**
 * 英語翻牌：英文配中文。佳音課次／數字 one–twenty／複習字（可補中文、手加）。
 */
import { duoScores, otherDuoPlayer } from "./children.js";
import { getSelectedChild } from "./store.js";
import {
  getActiveDuoPlayerIds,
  refreshDuoBattleUI,
  renderDuoPickButtons,
} from "./duo-pick.js";
import { uniqueLessons } from "./sheets.js";
import { enLessonFilterAliases, groupLessonsForEnExams } from "./exam-books.js";
import {
  listEnReviewItems,
  patchEnReviewZh,
  ensureReviewChinese,
} from "./en-daily.js?v=en-daily-v80";
import { speakEnglish, unlockSpeechFromGesture } from "./english.js?v=en-speak-v33";

const PAIR_OPTIONS = [10, 20];
const KEY_PAIRS = "kid-quiz-en-flip-pairs";
const KEY_DECK = "kid-quiz-en-flip-deck";
const KEY_LESSON = "kid-quiz-en-flip-lesson";
const MISMATCH_MS = 900;

const EN_NUMBERS = [
  ["one", "一"],
  ["two", "二"],
  ["three", "三"],
  ["four", "四"],
  ["five", "五"],
  ["six", "六"],
  ["seven", "七"],
  ["eight", "八"],
  ["nine", "九"],
  ["ten", "十"],
  ["eleven", "十一"],
  ["twelve", "十二"],
  ["thirteen", "十三"],
  ["fourteen", "十四"],
  ["fifteen", "十五"],
  ["sixteen", "十六"],
  ["seventeen", "十七"],
  ["eighteen", "十八"],
  ["nineteen", "十九"],
  ["twenty", "二十"],
];

/** @type {null | {
 *   showView: Function,
 *   getEnBank: () => object[],
 *   getChildNames: () => { A: string, B: string },
 *   showWarn: Function,
 * }} */
let deps = null;
let game = null;

const $ = (sel) => document.querySelector(sel);

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function hasCjk(s) {
  return /[\u3400-\u9fff]/.test(String(s || ""));
}

export function extraKey() {
  return `kid-quiz-en-flip-extra-${getSelectedChild() || "A"}`;
}

function loadExtra() {
  try {
    const a = JSON.parse(localStorage.getItem(extraKey()) || "[]");
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

function saveExtra(list) {
  localStorage.setItem(extraKey(), JSON.stringify(list.slice(0, 80)));
}

function seenKey(deck) {
  return `kid-quiz-en-flip-seen-${getSelectedChild() || "A"}-${deck}`;
}

function loadSeen(deck) {
  try {
    const a = JSON.parse(localStorage.getItem(seenKey(deck)) || "[]");
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

function rememberSeen(deck, ens) {
  const prev = loadSeen(deck);
  const keys = ens.map((e) => e.toLowerCase());
  const next = [...keys, ...prev.filter((x) => !keys.includes(x))].slice(0, 80);
  localStorage.setItem(seenKey(deck), JSON.stringify(next));
}

export function getEnFlipPairCount() {
  const n = parseInt(localStorage.getItem(KEY_PAIRS) || "10", 10);
  return PAIR_OPTIONS.includes(n) ? n : 10;
}

function setPairCount(n) {
  localStorage.setItem(KEY_PAIRS, String(n));
}

export function getEnFlipDeck() {
  const d = localStorage.getItem(KEY_DECK) || "joy";
  return d === "number" || d === "review" ? d : "joy";
}

function setDeck(d) {
  localStorage.setItem(KEY_DECK, d);
}

function getLesson() {
  return localStorage.getItem(KEY_LESSON) || "全部";
}

function setLesson(name) {
  localStorage.setItem(KEY_LESSON, name);
}

function reviewZhOf(item) {
  const zh = String(item.zh || "").trim();
  if (hasCjk(zh)) return zh;
  const g = String(item.gloss || "").trim();
  if (hasCjk(g)) return g;
  return "";
}

export function reviewFlipPool() {
  /** @type {{ en: string, zh: string, id: string }[]} */
  const out = [];
  const seenEn = new Set();
  const seenZh = new Set();
  const push = (en, zh, id) => {
    const e = String(en || "").trim();
    const z = String(zh || "").trim();
    if (!e || !hasCjk(z)) return;
    const ek = e.toLowerCase();
    if (seenEn.has(ek) || seenZh.has(z)) return;
    seenEn.add(ek);
    seenZh.add(z);
    out.push({ en: e, zh: z, id });
  };
  for (const item of listEnReviewItems()) {
    push(item.word, reviewZhOf(item), `rv-${String(item.word).toLowerCase()}`);
  }
  for (const item of loadExtra()) {
    push(item.en, item.zh, `ex-${String(item.en).toLowerCase()}`);
  }
  return out;
}

function joyPool(bank, lesson) {
  let rows = (bank || []).filter((i) => {
    const en = String(i.english || "").trim();
    const zh = String(i.chinese || "").trim();
    return en && hasCjk(zh);
  });
  if (lesson && lesson !== "全部") {
    const aliases = new Set(enLessonFilterAliases(lesson));
    rows = rows.filter((i) => aliases.has(String(i.lesson || "").trim()));
  }
  const seenEn = new Set();
  const seenZh = new Set();
  const out = [];
  for (const i of rows) {
    const en = String(i.english).trim();
    const zh = String(i.chinese).trim();
    const ek = en.toLowerCase();
    if (seenEn.has(ek) || seenZh.has(zh)) continue;
    seenEn.add(ek);
    seenZh.add(zh);
    out.push({ en, zh, id: `joy-${ek}` });
  }
  return out;
}

function numberPool() {
  return EN_NUMBERS.map(([en, zh]) => ({ en, zh, id: `num-${en}` }));
}

function pickPairs(pool, n, deck) {
  if (pool.length < n) return { ok: false, available: pool.length, words: [] };
  const seen = new Set(loadSeen(deck).map((x) => String(x).toLowerCase()));
  const fresh = shuffle(pool.filter((p) => !seen.has(p.en.toLowerCase())));
  const rest = shuffle(pool.filter((p) => seen.has(p.en.toLowerCase())));
  const picked = [...fresh, ...rest].slice(0, n);
  return {
    ok: picked.length >= n,
    available: pool.length,
    words: picked.slice(0, n),
  };
}

function currentPool() {
  const deck = getEnFlipDeck();
  if (deck === "number") return numberPool();
  if (deck === "review") return reviewFlipPool();
  return joyPool(deps.getEnBank(), getLesson());
}

function deckLabel() {
  const deck = getEnFlipDeck();
  if (deck === "number") return "英文數字";
  if (deck === "review") return "複習字";
  const lesson = getLesson();
  return lesson === "全部" ? "佳音·全部" : `佳音·${lesson}`;
}

function playerName(id) {
  const names = deps.getChildNames();
  return names[id] || id;
}

function flipMinClicks(pairCount) {
  return pairCount * 2;
}

function gridCols(cardCount) {
  return cardCount <= 20 ? 5 : 5;
}

function buildCards(words) {
  const cards = [];
  words.forEach((w, i) => {
    cards.push({
      id: `e-${i}`,
      kind: "en",
      pairId: w.id,
      en: w.en,
      face: w.en,
      faceUp: false,
      matched: false,
    });
    cards.push({
      id: `z-${i}`,
      kind: "zh",
      pairId: w.id,
      en: w.en,
      face: w.zh,
      faceUp: false,
      matched: false,
    });
  });
  return shuffle(cards);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function cardsMatch(a, b) {
  return a.pairId === b.pairId && a.kind !== b.kind;
}

function syncPairChips() {
  const n = String(getEnFlipPairCount());
  document.querySelectorAll("[data-en-flip-pairs]").forEach((btn) => {
    btn.classList.toggle("chip-active", btn.dataset.enFlipPairs === n);
  });
}

function syncDeckChips() {
  const d = getEnFlipDeck();
  document.querySelectorAll("[data-en-flip-deck]").forEach((btn) => {
    btn.classList.toggle("chip-active", btn.dataset.enFlipDeck === d);
  });
  const joyBox = $("#en-flip-joy-box");
  const reviewBox = $("#en-flip-review-box");
  if (joyBox) joyBox.hidden = d !== "joy";
  if (reviewBox) reviewBox.hidden = d !== "review";
}

function renderJoyLessons() {
  const box = $("#en-flip-exam-books");
  if (!box || !deps) return;
  const lessons = uniqueLessons(deps.getEnBank() || []);
  box.innerHTML = "";
  const current = getLesson();
  const addChip = (parent, name) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip chip-lesson" + (name === current ? " chip-active" : "");
    btn.textContent = name;
    btn.addEventListener("click", () => {
      setLesson(name);
      renderJoyLessons();
    });
    parent.appendChild(btn);
  };
  const top = document.createElement("div");
  top.className = "lesson-chips";
  addChip(top, "全部");
  box.appendChild(top);
  const { books, ungrouped } = groupLessonsForEnExams(lessons);
  books.forEach((book) => {
    const wrap = document.createElement("div");
    wrap.className = "en-flip-book";
    const h = document.createElement("p");
    h.className = "label";
    h.textContent = book.label;
    wrap.appendChild(h);
    const chips = document.createElement("div");
    chips.className = "lesson-chips lesson-chips-compact";
    book.lessons.forEach((name) => addChip(chips, name));
    wrap.appendChild(chips);
    box.appendChild(wrap);
  });
  if (ungrouped.length) {
    const chips = document.createElement("div");
    chips.className = "lesson-chips lesson-chips-compact";
    ungrouped.forEach((name) => addChip(chips, name));
    box.appendChild(chips);
  }
}

function renderReviewPanel() {
  const meta = $("#en-flip-review-meta");
  const miss = $("#en-flip-review-missing");
  if (!meta) return;
  const items = listEnReviewItems();
  const ready = reviewFlipPool();
  const n = getEnFlipPairCount();
  meta.textContent = `複習字 ${items.length} 個 · 有中文可翻 ${ready.length} 組（本局要 ${n} 組）`;
  if (!miss) return;
  miss.innerHTML = "";
  const lacking = items.filter((it) => !reviewZhOf(it));
  lacking.slice(0, 12).forEach((it) => {
    const row = document.createElement("div");
    row.className = "en-flip-miss-row";
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "中文";
    input.setAttribute("aria-label", `補 ${it.word} 的中文`);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-text";
    btn.textContent = "補上";
    btn.addEventListener("click", () => {
      const zh = input.value.trim();
      if (!hasCjk(zh)) {
        deps.showWarn("請填國字", "中文要有漢字，例如 cat 填「貓」。");
        return;
      }
      patchEnReviewZh(it.word, zh);
      renderReviewPanel();
    });
    const lab = document.createElement("strong");
    lab.textContent = it.word;
    row.append(lab, input, btn);
    miss.appendChild(row);
  });
  if (lacking.length > 12) {
    const p = document.createElement("p");
    p.className = "en-hub-meta";
    p.textContent = `還有 ${lacking.length - 12} 個沒中文，可先補再玩。`;
    miss.appendChild(p);
  }
}

export async function openEnFlipSetup() {
  syncPairChips();
  syncDeckChips();
  renderJoyLessons();
  await ensureReviewChinese();
  renderReviewPanel();
  refreshDuoBattleUI();
  deps.showView("enFlipSetup");
}

function renderFirstPicker() {
  refreshDuoBattleUI();
  renderDuoPickButtons("#en-flip-pick-btns", {
    onPick: startGameWithFirstPlayer,
  });
  const pairs = $("#en-flip-first-pairs");
  const deck = $("#en-flip-first-deck");
  if (pairs) pairs.textContent = String(game?.pairCount ?? getEnFlipPairCount());
  if (deck) deck.textContent = deckLabel();
}

function renderPlayHeader() {
  if (!game) return;
  const [idA, idB] = game.playerIds;
  const set = (sel, text) => {
    const el = $(sel);
    if (el) el.textContent = text;
  };
  set("#en-flip-play-name-a", playerName(idA));
  set("#en-flip-play-name-b", playerName(idB));
  set("#en-flip-score-a", String(game.scores[idA] ?? 0));
  set("#en-flip-score-b", String(game.scores[idB] ?? 0));
  set("#en-flip-turn-label", `輪到：${playerName(game.currentPlayerId)}`);
  set("#en-flip-progress-label", `配對 ${game.matchedPairs} / ${game.pairCount}`);
  const min = flipMinClicks(game.pairCount);
  set("#en-flip-click-label", `點擊 ${game.totalClicks} 次 · 單人最少 ${min} 次`);
  $("#en-flip-score-block-a")?.classList.toggle(
    "flip-score-active",
    game.currentPlayerId === idA
  );
  $("#en-flip-score-block-b")?.classList.toggle(
    "flip-score-active",
    game.currentPlayerId !== idA
  );
  const tagA = $("#en-flip-first-tag-a");
  const tagB = $("#en-flip-first-tag-b");
  if (tagA) tagA.hidden = game.firstPlayerId !== idA;
  if (tagB) tagB.hidden = game.firstPlayerId !== idB;
}

function renderBoard() {
  const grid = $("#en-flip-card-grid");
  if (!grid || !game) return;
  grid.style.setProperty("--flip-cols", String(gridCols(game.cards.length)));
  grid.dataset.pairs = String(game.pairCount);
  grid.innerHTML = "";
  game.cards.forEach((card, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "flip-card";
    btn.dataset.idx = String(idx);
    btn.disabled = game.locked || card.matched;
    if (card.matched || card.faceUp) {
      btn.classList.add("flip-card-face-up");
      btn.classList.add(card.kind === "en" ? "flip-card-en" : "flip-card-zh");
      if (card.matched) btn.classList.add("flip-card-matched");
      const long = card.kind === "en" && String(card.face).length > 8;
      if (long) btn.classList.add("flip-card-en-long");
      btn.innerHTML = `<span class="flip-card-inner">${escapeHtml(card.face)}</span>`;
    } else {
      btn.innerHTML = '<span class="flip-card-back">?</span>';
    }
    btn.addEventListener("click", () => onCardClick(idx));
    grid.appendChild(btn);
  });
  renderPlayHeader();
}

function onCardClick(idx) {
  if (!game || game.locked) return;
  unlockSpeechFromGesture();
  const card = game.cards[idx];
  if (!card || card.matched || card.faceUp) return;
  if (game.flippedIdx.length >= 2) return;
  card.faceUp = true;
  game.flippedIdx.push(idx);
  game.totalClicks += 1;
  renderBoard();
  if (game.flippedIdx.length < 2) return;
  game.locked = true;
  const [i0, i1] = game.flippedIdx;
  const c0 = game.cards[i0];
  const c1 = game.cards[i1];
  if (cardsMatch(c0, c1)) {
    c0.matched = true;
    c1.matched = true;
    game.scores[game.currentPlayerId] += 1;
    game.matchedPairs += 1;
    game.flippedIdx = [];
    game.locked = false;
    void speakEnglish(c0.en, { fast: true, speed: 1 });
    renderBoard();
    if (game.matchedPairs >= game.pairCount) {
      setTimeout(showResult, 400);
    }
    return;
  }
  setTimeout(() => {
    if (!game) return;
    c0.faceUp = false;
    c1.faceUp = false;
    game.flippedIdx = [];
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
  const title = $("#en-flip-result-title");
  const scores = $("#en-flip-result-scores");
  const clicks = $("#en-flip-result-clicks");
  const detail = $("#en-flip-result-detail");
  if (scores) {
    scores.textContent = `${playerName(idA)} ${a} ：${b} ${playerName(idB)}`;
  }
  const min = flipMinClicks(game.pairCount);
  if (clicks) {
    const extra = game.totalClicks - min;
    clicks.textContent =
      extra > 0
        ? `本局共點擊 ${game.totalClicks} 次（比單人最少多 ${extra} 次）`
        : `本局共點擊 ${game.totalClicks} 次 · 達到單人最少！`;
  }
  if (title) {
    title.textContent =
      a > b ? `${playerName(idA)} 獲勝！` : b > a ? `${playerName(idB)} 獲勝！` : "平手！";
  }
  if (detail) {
    detail.textContent = `共 ${game.pairCount} 組 · ${deckLabel()}`;
  }
  deps.showView("enFlipResult");
}

function createLobby(words, pairCount) {
  const playerIds = getActiveDuoPlayerIds();
  if (playerIds.length < 2) {
    deps.showWarn("需要兩位才能對戰", "請在首頁選「誰在練習」，並挑選對戰對象");
    return null;
  }
  return {
    words,
    cards: [],
    playerIds,
    scores: duoScores(playerIds),
    firstPlayerId: playerIds[0],
    currentPlayerId: playerIds[0],
    flippedIdx: [],
    locked: false,
    matchedPairs: 0,
    pairCount,
    totalClicks: 0,
    deck: getEnFlipDeck(),
  };
}

function startGameWithFirstPlayer(firstPlayerId) {
  if (!game?.words || !game.playerIds?.includes(firstPlayerId)) return;
  game.firstPlayerId = firstPlayerId;
  game.currentPlayerId = firstPlayerId;
  game.cards = buildCards(game.words);
  game.scores = duoScores(game.playerIds);
  game.flippedIdx = [];
  game.locked = false;
  game.matchedPairs = 0;
  game.totalClicks = 0;
  deps.showView("enFlipPlay");
  renderBoard();
}

function beginFromSetup() {
  const pairCount = getEnFlipPairCount();
  const deck = getEnFlipDeck();
  const pool = currentPool();
  const result = pickPairs(pool, pairCount, deck);
  if (!result.ok) {
    const need = pairCount;
    const have = result.available;
    if (deck === "review") {
      deps.showWarn(
        "可翻的組數不夠",
        `現在只有 ${have} 組有中文，本局要 ${need} 組。請補中文、手加一組，或改選 10 組／換牌組。`
      );
      return;
    }
    if (deck === "joy") {
      deps.showWarn(
        "單字不夠開局",
        `${deckLabel()} 只有 ${have} 組不重複英文＋中文，請改課次、選全部，或改選較少組數。`
      );
      return;
    }
    deps.showWarn("單字不夠開局", `目前只有 ${have} 組。`);
    return;
  }
  game = createLobby(result.words, pairCount);
  if (!game) return;
  rememberSeen(deck, result.words.map((w) => w.en));
  renderFirstPicker();
  deps.showView("enFlipFirst");
}

function addExtraPair() {
  const enEl = $("#en-flip-extra-en");
  const zhEl = $("#en-flip-extra-zh");
  const en = String(enEl?.value || "").trim();
  const zh = String(zhEl?.value || "").trim();
  if (!en || !hasCjk(zh)) {
    deps.showWarn("請填英文和國字", "例如 apple ／ 蘋果");
    return;
  }
  const list = loadExtra();
  const ek = en.toLowerCase();
  if (list.some((x) => String(x.en).toLowerCase() === ek)) {
    deps.showWarn("已經有這個英文", en);
    return;
  }
  list.unshift({ en, zh });
  saveExtra(list);
  if (enEl) enEl.value = "";
  if (zhEl) zhEl.value = "";
  renderReviewPanel();
}

function bindEvents() {
  $("#btn-en-hub-flip")?.addEventListener("click", () => {
    void openEnFlipSetup();
  });
  $("#btn-en-flip-setup-back")?.addEventListener("click", () => deps.showView("enHub"));
  document.querySelectorAll("[data-en-flip-pairs]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const n = parseInt(btn.dataset.enFlipPairs, 10);
      if (PAIR_OPTIONS.includes(n)) {
        setPairCount(n);
        syncPairChips();
        renderReviewPanel();
      }
    });
  });
  document.querySelectorAll("[data-en-flip-deck]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setDeck(btn.dataset.enFlipDeck);
      syncDeckChips();
      renderReviewPanel();
    });
  });
  $("#btn-en-flip-extra-add")?.addEventListener("click", () => addExtraPair());
  $("#btn-en-flip-start")?.addEventListener("click", () => beginFromSetup());
  $("#btn-en-flip-first-back")?.addEventListener("click", () => openEnFlipSetup());
  $("#btn-en-flip-play-back")?.addEventListener("click", () => {
    if (confirm("離開對戰？目前進度不會儲存。")) openEnFlipSetup();
  });
  $("#btn-en-flip-replay")?.addEventListener("click", () => beginFromSetup());
  $("#btn-en-flip-home")?.addEventListener("click", () => deps.showView("enHub"));
}

export function initFlipEn(d) {
  deps = d;
  bindEvents();
}
