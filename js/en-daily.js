/**
 * 每日實事英文閱讀：列表、點字英英（可遞迴）、朗讀、複習字、讀後小測
 */
import { loadEnArticles } from "./sheets.js";
import { speakEnglish, unlockSpeechFromGesture } from "./english.js";
import { getSelectedChild } from "./store.js";
import { logQuizResult } from "./score-log.js";

/** @type {{ showView: Function, showWarn?: Function, showOk?: Function, openEnSetup?: Function } | null} */
let deps = null;

/** @type {Awaited<ReturnType<typeof loadEnArticles>>} */
let articles = [];
/** @type {'l1'|'l2'|'l3'} */
let level = /** @type {'l1'|'l2'|'l3'} */ (
  localStorage.getItem("kid-quiz-en-daily-level") || "l1"
);
/** @type {typeof articles[0] | null} */
let current = null;
/** @type {{ word: string, gloss: string, example: string }[]} */
let glossStack = [];

/** @type {{ word: string, options: string[], answer: string }[]} */
let quizQs = [];
let quizIndex = 0;
let quizCorrect = 0;

const CAT_LABEL = {
  sport: "運動",
  world: "國際",
  technology: "科技",
  entertainment: "娛樂",
  health: "健康",
};

const $ = (sel) => document.querySelector(sel);

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function reviewKey() {
  return `kid-quiz-en-review-${getSelectedChild() || "A"}`;
}

function loadReview() {
  try {
    const raw = localStorage.getItem(reviewKey());
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveReview(list) {
  localStorage.setItem(reviewKey(), JSON.stringify(list.slice(0, 200)));
}

function bodyForLevel(art) {
  if (level === "l2") return art.bodyL2 || art.bodyL1;
  if (level === "l3") return art.bodyL3 || art.bodyL2 || art.bodyL1;
  return art.bodyL1;
}

function vocabMap(art) {
  /** @type {Map<string, { word: string, gloss: string, example: string, phonetic?: string }>} */
  const map = new Map();
  for (const v of art?.vocab || []) {
    const w = String(v.word || "")
      .trim()
      .toLowerCase();
    if (!w) continue;
    map.set(w, {
      word: String(v.word).trim(),
      gloss: String(v.gloss || "").trim(),
      example: String(v.example || "").trim(),
      phonetic: String(v.phonetic || "").trim(),
    });
  }
  return map;
}

function fallbackGloss(word) {
  return `This word means something about “${word}”. Try another simple word if you need more help.`;
}

/**
 * @param {{ showView: Function, showWarn?: Function, showOk?: Function }} d
 */
export function initEnDaily(d) {
  deps = d;
  bindUi();
}

export function openEnHub() {
  syncHubMeta();
  deps?.showView("enHub");
}

async function ensureArticles() {
  if (articles.length) return articles;
  articles = await loadEnArticles({ includeDraft: true });
  return articles;
}

function syncHubMeta() {
  const meta = $("#en-hub-daily-meta");
  if (!meta) return;
  const n = articles.filter((a) => a.date === todayIso()).length;
  const rev = loadReview().length;
  meta.textContent =
    (n ? `今日 ${n} 篇` : "今日尚無文章") + (rev ? ` · 複習字 ${rev}` : "");
}

function bindUi() {
  $("#btn-en-hub-back")?.addEventListener("click", () => deps?.showView("home"));
  $("#btn-en-hub-quiz")?.addEventListener("click", () => {
    deps?.openEnSetup?.();
  });
  $("#btn-en-hub-daily")?.addEventListener("click", () => openDailyList());
  $("#btn-en-hub-review")?.addEventListener("click", () => openReview());

  $("#btn-en-daily-list-back")?.addEventListener("click", () => openEnHub());
  $("#btn-en-daily-reload")?.addEventListener("click", async () => {
    articles = [];
    await openDailyList();
  });

  document.querySelectorAll("[data-en-daily-level]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const lv = btn.getAttribute("data-en-daily-level");
      if (lv === "l1" || lv === "l2" || lv === "l3") {
        level = lv;
        localStorage.setItem("kid-quiz-en-daily-level", level);
        syncLevelChips();
        if (current) renderReader();
      }
    });
  });

  $("#btn-en-daily-read-back")?.addEventListener("click", () => openDailyList());
  $("#btn-en-daily-speak-all")?.addEventListener("click", async () => {
    unlockSpeechFromGesture();
    if (!current) return;
    await speakEnglish(bodyForLevel(current));
  });
  $("#btn-en-daily-done")?.addEventListener("click", () => startMiniQuiz());
  $("#btn-en-daily-next")?.addEventListener("click", () => openNextArticle());

  $("#btn-en-gloss-close")?.addEventListener("click", () => hideGloss());
  $("#btn-en-gloss-back")?.addEventListener("click", () => popGloss());
  $("#btn-en-gloss-speak")?.addEventListener("click", async () => {
    unlockSpeechFromGesture();
    const w = $("#en-gloss-word")?.textContent;
    if (w) await speakEnglish(w);
  });
  $("#btn-en-gloss-example-speak")?.addEventListener("click", async () => {
    unlockSpeechFromGesture();
    const ex = $("#en-gloss-example")?.textContent;
    if (ex) await speakEnglish(ex);
  });
  $("#btn-en-gloss-add")?.addEventListener("click", () => addCurrentGlossToReview());

  $("#btn-en-review-back")?.addEventListener("click", () => openEnHub());
  $("#btn-en-review-clear")?.addEventListener("click", () => {
    if (confirm("清空目前小孩的複習字？")) {
      saveReview([]);
      renderReviewList();
    }
  });

  $("#btn-en-daily-quiz-back")?.addEventListener("click", () => {
    if (confirm("離開小測？進度不會儲存。")) {
      deps?.showView("enDailyRead");
    }
  });
}

export async function openDailyList() {
  syncLevelChips();
  const list = $("#en-daily-list");
  const empty = $("#en-daily-empty");
  const dateLabel = $("#en-daily-date-label");
  if (list) list.innerHTML = "<p class=\"en-daily-loading\">載入中…</p>";
  deps?.showView("enDailyList");

  await ensureArticles();
  syncHubMeta();

  const day = todayIso();
  if (dateLabel) dateLabel.textContent = day;

  let dayArts = articles.filter((a) => a.date === day);
  if (!dayArts.length && articles.length) {
    const latest = articles[0].date;
    dayArts = articles.filter((a) => a.date === latest);
    if (dateLabel) dateLabel.textContent = `${latest}（最近）`;
  }

  if (!list) return;
  list.innerHTML = "";
  if (!dayArts.length) {
    if (empty) empty.hidden = false;
    list.appendChild(
      Object.assign(document.createElement("p"), {
        className: "en-daily-empty-hint",
        textContent: "尚無文章。請先在試算表「英文文章」產文並設為 draft／published。",
      })
    );
    return;
  }
  if (empty) empty.hidden = true;

  for (const art of dayArts) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "en-daily-card";
    const cat = CAT_LABEL[art.category] || art.category;
    btn.innerHTML = `<span class="en-daily-card-cat">${escapeHtml(cat)}</span>
      <span class="en-daily-card-title">${escapeHtml(art.title)}</span>
      <span class="en-daily-card-meta">${art.status === "draft" ? "草稿" : "已發布"} · Level 可切換</span>`;
    btn.addEventListener("click", () => openReader(art.id));
    list.appendChild(btn);
  }
}

function syncLevelChips() {
  document.querySelectorAll("[data-en-daily-level]").forEach((btn) => {
    btn.classList.toggle(
      "chip-active",
      btn.getAttribute("data-en-daily-level") === level
    );
  });
}

function openReader(id) {
  current = articles.find((a) => a.id === id) || null;
  if (!current) {
    deps?.showWarn?.("找不到文章", "請重新載入列表。");
    return;
  }
  glossStack = [];
  hideGloss();
  renderReader();
  deps?.showView("enDailyRead");
}

function openNextArticle() {
  if (!current) {
    openDailyList();
    return;
  }
  const sameDay = articles.filter((a) => a.date === current.date);
  const i = sameDay.findIndex((a) => a.id === current.id);
  const next = sameDay[i + 1] || sameDay[0];
  if (next) openReader(next.id);
}

function renderReader() {
  if (!current) return;
  const cat = CAT_LABEL[current.category] || current.category;
  const sub = $("#en-daily-read-sub");
  if (sub) sub.textContent = `${level.toUpperCase()} · ${cat}`;
  const titleEl = $("#en-daily-title");
  const bodyEl = $("#en-daily-body");
  if (titleEl) titleEl.innerHTML = renderClickableText(current.title, current);
  if (bodyEl) bodyEl.innerHTML = renderClickableText(bodyForLevel(current), current);
  bindWordClicks(titleEl);
  bindWordClicks(bodyEl);
  renderReviewStrip();
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderClickableText(text, art) {
  const map = vocabMap(art);
  return String(text || "").replace(/([A-Za-z][A-Za-z'-]*)/g, (word) => {
    const key = word.toLowerCase();
    const isKey = map.has(key);
    const cls = isKey ? "en-word en-word-key" : "en-word";
    return `<button type="button" class="${cls}" data-en-word="${escapeHtml(word)}">${escapeHtml(word)}</button>`;
  });
}

function bindWordClicks(root) {
  if (!root) return;
  root.querySelectorAll("[data-en-word]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      unlockSpeechFromGesture();
      const w = btn.getAttribute("data-en-word") || "";
      const inGloss = Boolean(btn.closest("#en-gloss-text"));
      openGloss(w, !inGloss);
    });
  });
}

function lookupGloss(word) {
  const key = word.toLowerCase();
  const fromArt = current ? vocabMap(current).get(key) : null;
  if (fromArt) return fromArt;
  const fromReview = loadReview().find((r) => r.word.toLowerCase() === key);
  if (fromReview?.gloss) {
    return {
      word: fromReview.word,
      gloss: fromReview.gloss,
      example: fromReview.example || "",
      phonetic: fromReview.phonetic || "",
    };
  }
  return {
    word,
    gloss: fallbackGloss(word),
    example: "",
    phonetic: "",
  };
}

function openGloss(word, reset) {
  const entry = lookupGloss(word);
  if (reset) glossStack = [entry];
  else glossStack.push(entry);
  showGloss(entry);
}

function popGloss() {
  if (glossStack.length <= 1) {
    hideGloss();
    return;
  }
  glossStack.pop();
  showGloss(glossStack[glossStack.length - 1]);
}

function showGloss(entry) {
  const panel = $("#en-gloss-panel");
  if (!panel) return;
  panel.hidden = false;
  document.body.classList.add("en-gloss-open");
  const w = $("#en-gloss-word");
  const ph = $("#en-gloss-phonetic");
  const g = $("#en-gloss-text");
  const ex = $("#en-gloss-example");
  const back = $("#btn-en-gloss-back");
  if (w) w.textContent = entry.word;
  if (ph) {
    ph.textContent = entry.phonetic ? `/${entry.phonetic}/` : "";
    ph.hidden = !entry.phonetic;
  }
  if (g) {
    g.innerHTML = renderClickableText(entry.gloss, current);
    bindWordClicks(g);
  }
  if (ex) {
    ex.textContent = entry.example || "";
    ex.hidden = !entry.example;
  }
  const exSpeak = $("#btn-en-gloss-example-speak");
  if (exSpeak) exSpeak.hidden = !entry.example;
  if (back) back.hidden = glossStack.length <= 1;
  speakEnglish(entry.word);
}

function hideGloss() {
  const panel = $("#en-gloss-panel");
  if (panel) panel.hidden = true;
  document.body.classList.remove("en-gloss-open");
  glossStack = [];
}

function addCurrentGlossToReview() {
  if (!glossStack.length) return;
  const entry = glossStack[glossStack.length - 1];
  const list = loadReview();
  const key = entry.word.toLowerCase();
  if (!list.some((x) => x.word.toLowerCase() === key)) {
    list.unshift({
      word: entry.word,
      gloss: entry.gloss,
      example: entry.example || "",
      phonetic: entry.phonetic || "",
      articleId: current?.id || "",
      date: current?.date || todayIso(),
      addedAt: new Date().toISOString(),
    });
    saveReview(list);
  }
  deps?.showOk?.("已加入複習字", entry.word);
  renderReviewStrip();
  syncHubMeta();
}

function renderReviewStrip() {
  const el = $("#en-daily-review-strip");
  if (!el) return;
  const list = loadReview().slice(0, 8);
  if (!list.length) {
    el.textContent = "複習字：尚無（點字卡可加入）";
    return;
  }
  el.textContent = "複習字：" + list.map((x) => x.word).join(" · ");
}

function openReview() {
  renderReviewList();
  deps?.showView("enReview");
}

function renderReviewList() {
  const box = $("#en-review-list");
  if (!box) return;
  const list = loadReview();
  box.innerHTML = "";
  if (!list.length) {
    box.innerHTML = "<p class=\"en-daily-empty-hint\">還沒有複習字。閱讀時點生字，再按「加入複習字」。</p>";
    return;
  }
  for (const item of list) {
    const row = document.createElement("div");
    row.className = "en-review-item";
    row.innerHTML = `<strong>${escapeHtml(item.word)}</strong>
      <p>${escapeHtml(item.gloss || "")}</p>
      <p class="en-review-ex">${escapeHtml(item.example || "")}</p>`;
    const actions = document.createElement("div");
    actions.className = "en-review-actions";
    const speakBtn = document.createElement("button");
    speakBtn.type = "button";
    speakBtn.className = "btn btn-secondary";
    speakBtn.textContent = "朗讀";
    speakBtn.addEventListener("click", async () => {
      unlockSpeechFromGesture();
      await speakEnglish(item.word);
    });
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn btn-text";
    delBtn.textContent = "移除";
    delBtn.addEventListener("click", () => {
      saveReview(loadReview().filter((x) => x.word.toLowerCase() !== item.word.toLowerCase()));
      renderReviewList();
      syncHubMeta();
    });
    actions.append(speakBtn, delBtn);
    row.appendChild(actions);
    box.appendChild(row);
  }
}

function startMiniQuiz() {
  if (!current) return;
  const vocab = [...(current.vocab || [])].filter((v) => v.word && v.gloss);
  const pool = vocab.length ? vocab : extractFallbackVocab(bodyForLevel(current));
  if (pool.length < 1) {
    deps?.showWarn?.("無法出題", "這篇沒有足夠單字資料。");
    return;
  }
  const shuffled = shuffle([...pool]);
  quizQs = shuffled.slice(0, Math.min(3, shuffled.length)).map((v) => {
    const answer = String(v.word);
    const distractors = shuffled
      .map((x) => String(x.word))
      .filter((w) => w.toLowerCase() !== answer.toLowerCase());
    const options = shuffle([answer, ...distractors.slice(0, 3)]).slice(0, 4);
    while (options.length < 2) options.push(answer);
    return {
      word: answer,
      gloss: String(v.gloss || fallbackGloss(answer)),
      options: shuffle(options),
      answer,
    };
  });
  quizIndex = 0;
  quizCorrect = 0;
  renderQuizQ();
  deps?.showView("enDailyQuiz");
}

function extractFallbackVocab(text) {
  const words = String(text).match(/[A-Za-z][A-Za-z'-]{3,}/g) || [];
  const uniq = [...new Set(words.map((w) => w.toLowerCase()))].slice(0, 8);
  return uniq.map((w) => ({ word: w, gloss: fallbackGloss(w) }));
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function renderQuizQ() {
  const q = quizQs[quizIndex];
  const progress = $("#en-daily-quiz-progress");
  const prompt = $("#en-daily-quiz-prompt");
  const opts = $("#en-daily-quiz-options");
  if (progress) progress.textContent = `第 ${quizIndex + 1} / ${quizQs.length} 題`;
  if (prompt) prompt.textContent = q?.gloss || "";
  if (!opts || !q) return;
  opts.innerHTML = "";
  for (const opt of q.options) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-secondary btn-block";
    btn.textContent = opt;
    btn.addEventListener("click", () => answerQuiz(opt));
    opts.appendChild(btn);
  }
}

async function answerQuiz(choice) {
  const q = quizQs[quizIndex];
  if (!q) return;
  if (choice.toLowerCase() === q.answer.toLowerCase()) quizCorrect++;
  quizIndex++;
  if (quizIndex >= quizQs.length) {
    await finishQuiz();
    return;
  }
  renderQuizQ();
}

async function finishQuiz() {
  const total = quizQs.length;
  const child = getSelectedChild();
  const result = await logQuizResult(
    {
      subject: "en",
      child,
      mode: "daily-read",
      autoCorrect: quizCorrect,
      questions: quizQs,
      pending: 0,
    },
    `每日閱讀 ${current?.date || ""} ${current?.category || ""}`.trim()
  );
  deps?.showOk?.(
    `完成！${quizCorrect} / ${total}`,
    result.message || "",
    () => openDailyList()
  );
}
