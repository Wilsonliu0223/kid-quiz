/**
 * 每日實事英文閱讀：列表、點字英英（可遞迴）、朗讀、複習字、讀後小測
 */
import { loadEnArticles } from "./sheets.js?v=sheets-en-quiz-v2";
import {
  speakEnglish,
  unlockSpeechFromGesture,
  prefetchEnglishAudio,
  prefetchChineseAudio,
  stopSpeaking,
  setSpeakingSpeed,
  getLastSpeakEngine,
  lookupEnglishGloss,
  translateEnToZh,
} from "./english.js?v=en-speak-v16";
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
/** @type {{ word: string, gloss: string, example: string, phonetic?: string }[]} */
let glossStack = [];
/** 避免連點時舊的字典查詢覆蓋新面板 */
let glossSeq = 0;
/** 字卡收合動畫 timer */
let glossCloseTimer = 0;

/** @type {{ word: string, options: string[], answer: string }[]} */
let quizQs = [];
let quizIndex = 0;
/** @type {(string|null)[]} 每題已選答案（可回頭改） */
let quizAnswers = [];
let quizCorrect = 0;

/** @type {'en'|'zh'} */
let playLang = /** @type {'en'|'zh'} */ (
  localStorage.getItem("kid-quiz-en-play-lang") === "zh" ? "zh" : "en"
);
/** @type {string} */
let playSourceText = "";
let playSeq = 0;
/** 全文逐句跟讀時為 true */
let playFollowSentences = false;
/** @type {number} 0.8 | 1 | 1.25 */
let playSpeed = Number(localStorage.getItem("kid-quiz-en-play-speed") || "1") || 1;
/** @type {string} 列表目前選的日期 yyyy-MM-dd */
let selectedDate = localStorage.getItem("kid-quiz-en-daily-date") || "";

const CAT_LABEL = {
  sport: "運動",
  world: "國際",
  technology: "科技",
  entertainment: "娛樂",
  health: "健康",
};

const $ = (sel) => document.querySelector(sel);

function syncPlayLangBtns() {
  document.querySelectorAll("[data-en-play-lang]").forEach((btn) => {
    btn.classList.toggle(
      "is-active",
      btn.getAttribute("data-en-play-lang") === playLang
    );
  });
}

function syncPlaySpeedBtns() {
  document.querySelectorAll("[data-en-play-speed]").forEach((btn) => {
    const v = Number(btn.getAttribute("data-en-play-speed"));
    btn.classList.toggle("is-active", Math.abs(v - playSpeed) < 0.01);
  });
}

function isReaderActive() {
  return Boolean($("#view-en-daily-read")?.classList.contains("view-active"));
}

/** 閱讀頁內：播放列必須一直在；只在離開文章時才允許收掉 */
function syncDockVisibility() {
  const dock = $("#en-bottom-dock");
  const bar = $("#en-play-bar");
  const panel = $("#en-gloss-panel");
  if (!dock) return;

  if (isReaderActive() && bar) {
    bar.hidden = false;
    document.body.classList.add("en-playing");
    dock.hidden = false;
  }

  const show =
    isReaderActive() ||
    (bar && !bar.hidden) ||
    document.body.classList.contains("en-gloss-open") ||
    (panel && !panel.hidden);
  dock.hidden = !show;
  void dock.offsetHeight;
  const h = show ? Math.ceil(dock.getBoundingClientRect().height) || 56 : 0;
  document.documentElement.style.setProperty("--en-dock-h", `${h}px`);
}

function syncPlayBarHeight() {
  syncDockVisibility();
}

function showPlayBar(status) {
  const bar = $("#en-play-bar");
  if (!bar) return;
  bar.hidden = false;
  document.body.classList.add("en-playing");
  const st = $("#en-play-status");
  if (st && status != null) st.textContent = status;
  syncPlayLangBtns();
  syncPlaySpeedBtns();
  syncDockVisibility();
}

/** 閱讀頁常駐 idle 播放列（含 中文旁 🔊），離開閱讀頁才真正收掉 */
function showPlayBarIdle() {
  const st = $("#en-play-status")?.textContent || "";
  // 若正在播全文／單字，不要蓋掉狀態文字
  if (/播放中|載入/.test(st) && !/點 🔊/.test(st)) {
    showPlayBar(st);
  } else {
    showPlayBar("點 🔊 播全文");
  }
  clearSentenceHighlight();
}

function hidePlayBar(force = false) {
  // 文章內任何時候都要看得到播放列
  if (!force && isReaderActive()) {
    showPlayBarIdle();
    return;
  }
  const bar = $("#en-play-bar");
  if (bar) bar.hidden = true;
  document.body.classList.remove("en-playing");
  clearSentenceHighlight();
  syncDockVisibility();
}

/**
 * @param {{ dismiss?: boolean }} [opts] dismiss=true 離開閱讀頁時收掉底板
 */
function stopPlayBar(opts = {}) {
  playSeq += 1;
  playFollowSentences = false;
  stopSpeaking();
  playSourceText = "";
  if (opts.dismiss) {
    hidePlayBar(true);
    return;
  }
  showPlayBar("點 🔊 播全文");
  clearSentenceHighlight();
}

/** 英文依句號切段（跟讀反亮用） */
function splitEnglishSentences(text) {
  const s = String(text || "")
    .trim()
    .replace(/\s+/g, " ");
  if (!s) return [];
  const parts = s.match(/[^.!?]+(?:[.!?]+|(?=$))/g);
  return (parts || [s]).map((p) => p.trim()).filter(Boolean);
}

function clearSentenceHighlight() {
  document
    .querySelectorAll(".en-sent.is-reading")
    .forEach((el) => el.classList.remove("is-reading"));
}

function highlightSentence(index) {
  clearSentenceHighlight();
  const el = document.querySelector(`.en-sent[data-en-sent="${index}"]`);
  if (!el) return;
  el.classList.add("is-reading");
  try {
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  } catch (_) {}
}

/** 依字數估最少朗讀時間，避免音檔被截短時反亮搶跑 */
function minSpeakHoldMs(text, speed = 1) {
  const s = String(text || "").trim();
  if (!s) return 0;
  const spd = Math.max(0.5, Number(speed) || 1);
  if (/[\u4e00-\u9fff]/.test(s)) {
    return Math.ceil((s.length * 140) / spd);
  }
  const words = s.split(/\s+/).filter(Boolean).length;
  return Math.ceil((Math.max(words, 1) * 280) / spd);
}

function sleepMs(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * 帶播放條的朗讀（英文／中文可切；全文可逐句反亮）
 * @param {string} text
 * @param {{ label?: string, followSentences?: boolean }} [opts]
 */
async function playWithBar(text, opts = {}) {
  const raw = String(text || "").trim();
  if (!raw) return;
  playSourceText = raw;
  playFollowSentences = Boolean(opts.followSentences);
  const seq = ++playSeq;
  unlockSpeechFromGesture();
  setSpeakingSpeed(playSpeed);

  const sentences = playFollowSentences
    ? splitEnglishSentences(raw)
    : [raw];
  const labelBase = opts.label || (playLang === "zh" ? "中文播放中" : "英文播放中");

  showPlayBar(
    playLang === "zh" ? "載入雲希神經音…" : "準備播放…"
  );

  let anyOk = false;
  for (let i = 0; i < sentences.length; i++) {
    if (seq !== playSeq) return;
    if (playFollowSentences) highlightSentence(i);
    const status =
      sentences.length > 1
        ? `${labelBase} ${i + 1}/${sentences.length}`
        : labelBase;
    showPlayBar(
      playLang === "zh" ? `${status} · 載入雲希…` : status
    );
    const t0 = Date.now();
    const ok = await speakEnglish(sentences[i], {
      fast: true,
      lang: playLang,
      speed: playSpeed,
    });
    if (seq !== playSeq) return;
    // 只有音檔明顯提早結束（疑似截斷）才補一點等待，避免整篇聽起來拖很慢
    if (playFollowSentences && ok) {
      const hold = minSpeakHoldMs(sentences[i], playSpeed);
      const elapsed = Date.now() - t0;
      if (elapsed < hold * 0.4) {
        const wait = hold * 0.5 - elapsed;
        if (wait > 100) await sleepMs(wait);
      }
      if (seq !== playSeq) return;
    }
    if (ok) {
      anyOk = true;
      const eng = getLastSpeakEngine() || "";
      let tip = "";
      if (playLang === "zh") {
        if (eng.startsWith("edge")) tip = "✓雲希神經音";
        else if (eng.startsWith("script")) tip = "伺服器語音";
        else if (eng === "zhiyu") tip = "舊女聲(備援)";
        else tip = "⚠備援機械音";
      } else if (eng.startsWith("edge")) {
        tip = "✓英文神經音";
      } else if (eng === "en-synth" || eng === "synth") {
        tip = "⚠備援機械音";
      }
      showPlayBar(
        tip
          ? sentences.length > 1
            ? `${labelBase} ${i + 1}/${sentences.length} · ${tip}`
            : `${labelBase} · ${tip}`
          : status
      );
    }
  }

  if (seq !== playSeq) return;
  clearSentenceHighlight();
  if (!anyOk) {
    showPlayBar("播放失敗，再點 🔊");
    setTimeout(() => {
      if (seq === playSeq) showPlayBarIdle();
    }, 1600);
    return;
  }
  showPlayBarIdle();
}

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
  return `Sorry, no simple English meaning found for “${word}”. Try a key (orange) word, or another word nearby.`;
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

  $("#btn-en-daily-date-prev")?.addEventListener("click", () => shiftSelectedDate(1));
  $("#btn-en-daily-date-next")?.addEventListener("click", () => shiftSelectedDate(-1));

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

  $("#btn-en-daily-read-back")?.addEventListener("click", () => {
    stopPlayBar({ dismiss: true });
    hideGloss();
    openDailyList();
  });
  $("#btn-en-daily-speak-all")?.addEventListener("click", async () => {
    if (!current) return;
    await playWithBar(bodyForLevel(current), {
      label: "全文播放中",
      followSentences: true,
    });
  });
  $("#btn-en-daily-done")?.addEventListener("click", () => {
    stopPlayBar({ dismiss: true });
    hideGloss();
    startMiniQuiz();
  });
  $("#btn-en-daily-next")?.addEventListener("click", () => {
    stopPlayBar({ dismiss: true });
    hideGloss();
    openNextArticle();
  });

  $("#btn-en-gloss-close")?.addEventListener("click", () => hideGloss());
  $("#btn-en-gloss-back")?.addEventListener("click", () => popGloss());
  $("#btn-en-gloss-speak")?.addEventListener("click", async () => {
    const w = $("#en-gloss-word")?.textContent;
    if (w) await playWithBar(w, { label: "單字播放中" });
  });
  $("#btn-en-gloss-example-speak")?.addEventListener("click", async () => {
    const ex = $("#en-gloss-example")?.textContent;
    if (ex) await playWithBar(ex, { label: "例句播放中" });
  });
  $("#btn-en-gloss-zh-speak")?.addEventListener("click", async () => {
    const zh = $("#en-gloss-zh")?.textContent?.trim();
    if (!zh || zh === "翻譯中…") return;
    unlockSpeechFromGesture();
    showPlayBar("中文說明播放中");
    const ok = await speakEnglish(zh, {
      fast: true,
      lang: "zh",
      alreadyZh: true,
      speed: playSpeed,
    });
    if (isReaderActive()) {
      showPlayBar(ok ? "點 🔊 播全文" : "中文說明播放失敗");
    }
  });
  $("#btn-en-gloss-zh-toggle")?.addEventListener("click", () => {
    toggleGlossZhExpanded();
  });
  $("#btn-en-gloss-add")?.addEventListener("click", () => addCurrentGlossToReview());
  window.addEventListener("resize", () => syncDockVisibility());

  $("#btn-en-play-stop")?.addEventListener("click", () => stopPlayBar());
  document.querySelectorAll("[data-en-play-lang]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const lang = btn.getAttribute("data-en-play-lang");
      if (lang !== "en" && lang !== "zh") return;
      playLang = lang;
      localStorage.setItem("kid-quiz-en-play-lang", playLang);
      syncPlayLangBtns();
      unlockSpeechFromGesture();
      if (playSourceText) {
        await playWithBar(playSourceText, {
          label: playLang === "zh" ? "中文播放中" : "英文播放中",
          followSentences: playFollowSentences,
        });
      }
    });
  });
  document.querySelectorAll("[data-en-play-speed]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const v = Number(btn.getAttribute("data-en-play-speed"));
      if (!(v > 0)) return;
      playSpeed = v;
      localStorage.setItem("kid-quiz-en-play-speed", String(playSpeed));
      setSpeakingSpeed(playSpeed);
      syncPlaySpeedBtns();
    });
  });

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
  $("#btn-en-daily-quiz-prev")?.addEventListener("click", () => {
    if (quizIndex <= 0) return;
    quizIndex -= 1;
    renderQuizQ();
  });
  $("#btn-en-daily-quiz-next")?.addEventListener("click", () => {
    const atLast = quizIndex >= quizQs.length - 1;
    if (atLast) {
      void submitMiniQuiz();
      return;
    }
    quizIndex += 1;
    renderQuizQ();
  });
}

export async function openDailyList() {
  syncLevelChips();
  const list = $("#en-daily-list");
  if (list) list.innerHTML = "<p class=\"en-daily-loading\">載入中…</p>";
  deps?.showView("enDailyList");

  await ensureArticles();
  syncHubMeta();
  ensureSelectedDate();
  renderDateChips();
  renderArticleList();
}

function availableDates() {
  const set = new Set(articles.map((a) => a.date).filter(Boolean));
  return [...set].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
}

function ensureSelectedDate() {
  const dates = availableDates();
  const today = todayIso();
  if (selectedDate && dates.includes(selectedDate)) return;
  if (dates.includes(today)) selectedDate = today;
  else selectedDate = dates[0] || today;
  localStorage.setItem("kid-quiz-en-daily-date", selectedDate);
}

function shiftSelectedDate(stepTowardOlder) {
  const dates = availableDates();
  if (!dates.length) return;
  ensureSelectedDate();
  const i = dates.indexOf(selectedDate);
  const next = dates[i + stepTowardOlder];
  if (!next) return;
  selectedDate = next;
  localStorage.setItem("kid-quiz-en-daily-date", selectedDate);
  renderDateChips();
  renderArticleList();
}

function renderDateChips() {
  const box = $("#en-daily-date-chips");
  const hint = $("#en-daily-date-hint");
  if (!box) return;
  const dates = availableDates();
  box.innerHTML = "";
  if (!dates.length) {
    if (hint) hint.textContent = "尚無歷史日期（產文後會出現在這裡）";
    return;
  }
  if (hint) {
    const today = todayIso();
    hint.textContent =
      selectedDate === today
        ? "今天 · 可左右切換看過去幾天"
        : `共 ${dates.length} 天有文章 · 點日期或用 ‹ › 切換`;
  }

  for (const d of dates) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip" + (d === selectedDate ? " chip-active" : "");
    btn.textContent = formatDateChip(d);
    btn.title = d;
    btn.addEventListener("click", () => {
      selectedDate = d;
      localStorage.setItem("kid-quiz-en-daily-date", selectedDate);
      renderDateChips();
      renderArticleList();
    });
    box.appendChild(btn);
  }

  // 讓目前日期晶片滾到可見
  const active = box.querySelector(".chip-active");
  active?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });

  const prev = $("#btn-en-daily-date-prev");
  const next = $("#btn-en-daily-date-next");
  const i = dates.indexOf(selectedDate);
  if (prev) prev.disabled = i < 0 || i >= dates.length - 1;
  if (next) next.disabled = i <= 0;
}

function formatDateChip(iso) {
  const today = todayIso();
  if (iso === today) return "今天";
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${Number(m[2])}/${Number(m[3])}`;
}

function renderArticleList() {
  const list = $("#en-daily-list");
  const empty = $("#en-daily-empty");
  if (!list) return;
  list.innerHTML = "";

  const dayArts = articles
    .filter((a) => a.date === selectedDate)
    .sort((a, b) => a.seq - b.seq);

  if (!dayArts.length) {
    if (empty) empty.hidden = false;
    list.appendChild(
      Object.assign(document.createElement("p"), {
        className: "en-daily-empty-hint",
        textContent: selectedDate
          ? `${selectedDate} 尚無文章。可切換其他日期，或產文後按重新載入。`
          : "尚無文章。請先在試算表「英文文章」產文。",
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
      <span class="en-daily-card-meta">${art.status === "draft" ? "草稿" : "已發布"} · ${escapeHtml(art.date)} · Level 可切換</span>`;
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
  stopPlayBar({ dismiss: true });
  current = articles.find((a) => a.id === id) || null;
  if (!current) {
    deps?.showWarn?.("找不到文章", "請重新載入列表。");
    return;
  }
  glossStack = [];
  hideGloss();
  deps?.showView("enDailyRead");
  renderReader();
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
  if (bodyEl) {
    bodyEl.innerHTML = renderClickableBody(bodyForLevel(current), current);
  }
  bindWordClicks(titleEl);
  bindWordClicks(bodyEl);
  renderReviewStrip();
  const body = bodyForLevel(current);
  prefetchEnglishAudio(current.title);
  prefetchEnglishAudio(body);
  // 預熱前兩句中文神經音，手機較不易落到機械備援
  const sents = splitEnglishSentences(body).slice(0, 2);
  for (const s of sents) prefetchChineseAudio(s);
  for (const v of current.vocab || []) {
    if (v.word) prefetchEnglishAudio(v.word);
  }
  // 閱讀頁常駐底部播放列，🔊 在「中文」右邊可點全文
  showPlayBarIdle();
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderClickableBody(text, art) {
  const sentences = splitEnglishSentences(text);
  if (!sentences.length) return renderClickableText(text, art);
  return sentences
    .map(
      (sent, i) =>
        `<span class="en-sent" data-en-sent="${i}">${renderClickableText(sent, art)}</span>`
    )
    .join(" ");
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

function lookupLocalGloss(word) {
  const key = word.toLowerCase();
  const fromArt = current ? vocabMap(current).get(key) : null;
  if (fromArt?.gloss) return fromArt;
  const fromReview = loadReview().find((r) => r.word.toLowerCase() === key);
  if (fromReview?.gloss) {
    return {
      word: fromReview.word,
      gloss: fromReview.gloss,
      example: fromReview.example || "",
      phonetic: fromReview.phonetic || "",
    };
  }
  return null;
}

async function openGloss(word, reset) {
  const seq = ++glossSeq;
  const local = lookupLocalGloss(word);
  if (local) {
    if (reset) glossStack = [local];
    else glossStack.push(local);
    showGloss(local);
    return;
  }

  const loading = {
    word,
    gloss: "Looking up meaning…",
    example: "",
    phonetic: "",
  };
  if (reset) glossStack = [loading];
  else glossStack.push(loading);
  showGloss(loading, { speak: false });

  const online = await lookupEnglishGloss(word);
  if (seq !== glossSeq) return;
  const entry = online || {
    word,
    gloss: fallbackGloss(word),
    example: "",
    phonetic: "",
  };
  glossStack[glossStack.length - 1] = entry;
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

/** 中文說明句是否展開（預設收合，點 ▼ 才顯示） */
let glossZhExpanded = false;

function setGlossZhExpanded(open) {
  glossZhExpanded = Boolean(open);
  const zhEl = $("#en-gloss-zh");
  const toggle = $("#btn-en-gloss-zh-toggle");
  const text = zhEl?.textContent?.trim() || "";
  const canShow = Boolean(text) && text !== "翻譯中…";
  if (zhEl) zhEl.hidden = !(glossZhExpanded && canShow);
  if (toggle) {
    toggle.textContent = glossZhExpanded ? "▲" : "▼";
    toggle.setAttribute("aria-expanded", glossZhExpanded ? "true" : "false");
    toggle.disabled = !canShow;
  }
}

function toggleGlossZhExpanded() {
  setGlossZhExpanded(!glossZhExpanded);
  requestAnimationFrame(() => syncDockVisibility());
}

function setGlossZhUi(zhText) {
  const row = $("#en-gloss-zh-row");
  const zhEl = $("#en-gloss-zh");
  const speakBtn = $("#btn-en-gloss-zh-speak");
  const raw = String(zhText || "").trim();
  const loading = raw === "翻譯中…";
  const has = Boolean(raw);
  if (zhEl) zhEl.textContent = has ? raw : "";
  if (row) row.hidden = !has;
  if (speakBtn) speakBtn.disabled = !has || loading;
  // 換字時一律收合；翻譯中也不展開
  setGlossZhExpanded(false);
}

/** 英英解釋 → 繁中說明（顯示用）；失敗則隱藏中文區 */
async function fillGlossZh(entry, seq) {
  const gloss = String(entry?.gloss || "").trim();
  if (!gloss || /^Looking up/i.test(gloss) || /^Sorry,/i.test(gloss)) {
    setGlossZhUi("");
    return;
  }
  if (entry.zhGloss) {
    setGlossZhUi(entry.zhGloss);
    return;
  }
  setGlossZhUi("翻譯中…");
  const zh =
    (await translateEnToZh(gloss, "TW")) ||
    (await translateEnToZh(gloss, "CN")) ||
    "";
  if (seq !== glossSeq) return;
  entry.zhGloss = zh;
  // 同步寫回 stack 目前這層
  if (glossStack.length) {
    glossStack[glossStack.length - 1] = { ...glossStack[glossStack.length - 1], zhGloss: zh };
  }
  setGlossZhUi(zh);
  requestAnimationFrame(() => syncDockVisibility());
}

function showGloss(entry, opts = {}) {
  const panel = $("#en-gloss-panel");
  if (!panel) return;
  const willSpeak = opts.speak !== false;
  const seq = glossSeq;

  if (glossCloseTimer) {
    clearTimeout(glossCloseTimer);
    glossCloseTimer = 0;
  }

  panel.hidden = false;
  void panel.offsetHeight;
  document.body.classList.add("en-gloss-open");

  // 查字時也一定先保證播放列在（紅框那條），不可只剩字卡
  const bar = $("#en-play-bar");
  if (!bar || bar.hidden) showPlayBarIdle();
  else syncDockVisibility();

  if (willSpeak) {
    showPlayBar("單字播放中");
  }

  panel.scrollTop = 0;
  const w = $("#en-gloss-word");
  const ph = $("#en-gloss-phonetic");
  const g = $("#en-gloss-text");
  const ex = $("#en-gloss-example");
  const exLabel = document.querySelector(".en-gloss-example-label");
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
  setGlossZhUi(entry.zhGloss || "");
  void fillGlossZh(entry, seq);

  const hasEx = Boolean(entry.example);
  if (ex) {
    ex.textContent = entry.example || "";
    ex.hidden = !hasEx;
  }
  if (exLabel) exLabel.hidden = !hasEx;
  const exSpeak = $("#btn-en-gloss-example-speak");
  if (exSpeak) exSpeak.hidden = !hasEx;
  if (back) back.hidden = glossStack.length <= 1;

  requestAnimationFrame(() => syncDockVisibility());

  if (willSpeak) {
    void playWithBar(entry.word, { label: "單字播放中" });
  }
}

function hideGloss() {
  const panel = $("#en-gloss-panel");
  document.body.classList.remove("en-gloss-open");
  glossStack = [];
  if (glossCloseTimer) clearTimeout(glossCloseTimer);
  // 先往下收合，動畫結束再 hidden
  glossCloseTimer = window.setTimeout(() => {
    glossCloseTimer = 0;
    if (document.body.classList.contains("en-gloss-open")) return;
    if (panel) panel.hidden = true;
    if (isReaderActive()) showPlayBarIdle();
    else syncDockVisibility();
  }, 280);
  if (isReaderActive()) {
    const bar = $("#en-play-bar");
    if (!bar || bar.hidden) showPlayBarIdle();
    else syncDockVisibility();
  } else {
    syncDockVisibility();
  }
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
    el.textContent = "";
    el.hidden = true;
    return;
  }
  el.hidden = false;
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
      await playWithBar(item.word, { label: "單字播放中" });
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
  const built = buildQuizQuestions(current);
  if (!built.length) {
    deps?.showWarn?.("無法出題", "這篇沒有足夠的小測資料。");
    return;
  }
  quizQs = built.slice(0, 5);
  quizAnswers = quizQs.map(() => null);
  quizIndex = 0;
  quizCorrect = 0;
  renderQuizQ();
  deps?.showView("enDailyQuiz");
}

/**
 * 優先用文章 quiz（3 理解 + 2 單字）；不足則用 vocab 補滿至最多 5 題。
 * @param {object} art
 */
function buildQuizQuestions(art) {
  const fromSheet = normalizeQuizItems(art?.quiz).slice(0, 5);
  if (fromSheet.length >= 5) return fromSheet;

  const usedWords = new Set(
    fromSheet
      .filter((q) => q.type === "vocab")
      .map((q) => String(q.answer || "").toLowerCase())
  );
  const vocab = [...(art.vocab || [])].filter((v) => v.word && v.gloss);
  let pool = [...vocab];
  if (pool.length < 5) {
    const extra = extractFallbackVocab(bodyForLevel(art)).filter(
      (v) =>
        !pool.some(
          (p) => String(p.word).toLowerCase() === String(v.word).toLowerCase()
        )
    );
    pool = [...pool, ...extra];
  }
  if (!pool.length && !fromSheet.length) return [];
  const shuffled = shuffle([...pool]);
  const out = [...fromSheet];
  for (const v of shuffled) {
    if (out.length >= 5) break;
    const answer = String(v.word);
    if (usedWords.has(answer.toLowerCase())) continue;
    usedWords.add(answer.toLowerCase());
    const distractors = shuffled
      .map((x) => String(x.word))
      .filter((w) => w.toLowerCase() !== answer.toLowerCase());
    const options = shuffle([answer, ...distractors.slice(0, 3)]).slice(0, 4);
    while (options.length < 2) options.push(answer);
    out.push({
      type: "vocab",
      q: String(v.gloss || fallbackGloss(answer)),
      options: shuffle(options),
      answer,
    });
  }
  return out;
}

function normalizeQuizItems(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const type = String(item.type || "").toLowerCase() === "vocab" ? "vocab" : "comp";
    let q = String(item.q || item.prompt || item.gloss || "").trim();
    let answer = String(item.answer || item.word || "").trim();
    let options = Array.isArray(item.options)
      ? item.options.map((o) => String(o || "").trim()).filter(Boolean)
      : [];
    if (type === "vocab" && !q && item.gloss) q = String(item.gloss).trim();
    if (type === "vocab" && !answer && item.word) answer = String(item.word).trim();
    if (!q || !answer) continue;
    if (!options.includes(answer)) options = [answer, ...options];
    options = shuffle([...new Set(options)]).slice(0, 4);
    if (options.length < 2) continue;
    if (!options.includes(answer)) {
      options[0] = answer;
      options = shuffle(options);
    }
    out.push({ type, q, options, answer });
  }
  return out;
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
  const typeLabel = $("#en-daily-quiz-type-label");
  const prompt = $("#en-daily-quiz-prompt");
  const opts = $("#en-daily-quiz-options");
  const prevBtn = $("#btn-en-daily-quiz-prev");
  const nextBtn = $("#btn-en-daily-quiz-next");
  if (progress) {
    progress.textContent = `第 ${quizIndex + 1} / ${quizQs.length} 題`;
  }
  if (typeLabel) {
    typeLabel.textContent =
      q?.type === "vocab" ? "Which word matches this meaning?" : "Reading check";
  }
  if (prompt) prompt.textContent = q?.q || "";
  renderQuizDots();
  if (prevBtn) prevBtn.disabled = quizIndex <= 0;
  if (nextBtn) {
    const atLast = quizIndex >= quizQs.length - 1;
    nextBtn.textContent = atLast ? "Submit" : "Next →";
  }
  if (!opts || !q) return;
  opts.innerHTML = "";
  const selected = quizAnswers[quizIndex];
  for (const opt of q.options) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-secondary btn-block";
    if (selected != null && String(selected) === String(opt)) {
      btn.classList.add("en-daily-quiz-opt-selected");
    }
    btn.textContent = opt;
    btn.addEventListener("click", () => selectQuizAnswer(opt));
    opts.appendChild(btn);
  }
}

function renderQuizDots() {
  const box = $("#en-daily-quiz-dots");
  if (!box) return;
  box.innerHTML = "";
  quizQs.forEach((_, i) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "en-daily-quiz-dot";
    if (quizAnswers[i] != null) dot.classList.add("is-answered");
    if (i === quizIndex) dot.classList.add("is-current");
    dot.setAttribute("aria-label", `Go to question ${i + 1}`);
    dot.addEventListener("click", () => {
      quizIndex = i;
      renderQuizQ();
    });
    box.appendChild(dot);
  });
}

function selectQuizAnswer(choice) {
  quizAnswers[quizIndex] = choice;
  renderQuizQ();
}

async function submitMiniQuiz() {
  const unanswered = quizAnswers.filter((a) => a == null).length;
  if (unanswered > 0) {
    deps?.showWarn?.(
      "還沒答完",
      `還有 ${unanswered} 題沒選。請全部選完再送出；可用 Prev 或圓點回頭修改。`
    );
    const firstEmpty = quizAnswers.findIndex((a) => a == null);
    if (firstEmpty >= 0) {
      quizIndex = firstEmpty;
      renderQuizQ();
    }
    return;
  }
  quizCorrect = 0;
  for (let i = 0; i < quizQs.length; i++) {
    const q = quizQs[i];
    const a = quizAnswers[i];
    if (
      q &&
      a != null &&
      String(a).toLowerCase() === String(q.answer).toLowerCase()
    ) {
      quizCorrect++;
    }
  }
  await finishQuiz();
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
