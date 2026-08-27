/**
 * 每日實事英文閱讀：列表、點字英英（可遞迴）、朗讀、複習字、讀後小測
 */
import { loadEnArticles } from "./sheets.js?v=sheets-en-quiz-v3";
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
} from "./english.js?v=en-speak-v17";
import { getSelectedChild } from "./store.js";
import { logQuizResult } from "./score-log.js?v=score-log-v2";

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
/** @type {'read'|'dialogue'} */
let quizKind = "read";

/** @type {{ word: string, gloss?: string }[]} */
let dictationQs = [];
let dictationIndex = 0;
let dictationCorrect = 0;
let dictationLocked = false;

/** @type {Map<string, string>} */
const dlgZhCache = new Map();

/** @type {'en'|'zh'} */
let playLang = /** @type {'en'|'zh'} */ (
  localStorage.getItem("kid-quiz-en-play-lang") === "zh" ? "zh" : "en"
);
/** @type {string} */
let playSourceText = "";
let playSeq = 0;
/** 全文逐句跟讀時為 true */
let playFollowSentences = false;
/** @type {string[] | null} 全文播放時的逐段文字（對話用 turns） */
let playChunks = null;
/** @type {string[] | null} 與 chunks 對齊的說話人（對話配音） */
let playSpeakers = null;
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

function isDialogueActive() {
  return Boolean($("#view-en-daily-dialogue")?.classList.contains("view-active"));
}

function isEnSpeakViewActive() {
  return (
    Boolean($("#view-en-daily-read")?.classList.contains("view-active")) ||
    isDialogueActive()
  );
}

function speakRoot() {
  if (isDialogueActive()) return $("#en-daily-dialogue-body");
  return $("#en-daily-body");
}

/** 閱讀頁內：播放列必須一直在；只在離開文章時才允許收掉 */
function syncDockVisibility() {
  const dock = $("#en-bottom-dock");
  const bar = $("#en-play-bar");
  const panel = $("#en-gloss-panel");
  if (!dock) return;

  if (isEnSpeakViewActive() && bar) {
    bar.hidden = false;
    document.body.classList.add("en-playing");
    dock.hidden = false;
  }

  const show =
    isEnSpeakViewActive() ||
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
  if (!force && isEnSpeakViewActive()) {
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
  playChunks = null;
  playSpeakers = null;
  stopSpeaking();
  playSourceText = "";
  if (opts.dismiss) {
    hidePlayBar(true);
    return;
  }
  showPlayBar("點 🔊 播全文");
  clearSentenceHighlight();
}

/** 英文依句號切段（跟讀反亮用）；避開 a.m. / U.S. 等縮寫 */
function splitEnglishSentences(text) {
  const s = String(text || "")
    .trim()
    .replace(/\s+/g, " ");
  if (!s) return [];
  const holders = [];
  const protectedText = s.replace(
    /\b(?:[ap]\.m\.|U\.S\.A?\.|e\.g\.|i\.e\.|Mr\.|Mrs\.|Ms\.|Dr\.)/gi,
    (m) => {
      holders.push(m);
      return `\u0001${holders.length - 1}\u0001`;
    }
  );
  const parts = protectedText.match(/[^.!?]+(?:[.!?]+|(?=$))/g);
  return (parts || [protectedText])
    .map((p) =>
      p.replace(/\u0001(\d+)\u0001/g, (_, i) => holders[Number(i)]).trim()
    )
    .filter(Boolean);
}

function clearSentenceHighlight() {
  document
    .querySelectorAll(".en-sent.is-reading")
    .forEach((el) => el.classList.remove("is-reading"));
}

function highlightSentence(index) {
  clearSentenceHighlight();
  const el = speakRoot()?.querySelector(`.en-sent[data-en-sent="${index}"]`);
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
 * @param {{ label?: string, followSentences?: boolean, chunks?: string[], speakers?: string[], highlightIndex?: number }} [opts]
 */
async function playWithBar(text, opts = {}) {
  const raw = String(text || "").trim();
  if (!raw && !(opts.chunks && opts.chunks.length)) return;
  playSourceText = raw || (opts.chunks || []).join(" ");
  playChunks = Array.isArray(opts.chunks) && opts.chunks.length ? opts.chunks : null;
  playSpeakers =
    Array.isArray(opts.speakers) && opts.speakers.length ? opts.speakers : null;
  playFollowSentences = Boolean(opts.followSentences) || Boolean(playChunks);
  const seq = ++playSeq;
  unlockSpeechFromGesture();
  setSpeakingSpeed(playSpeed);

  const sentences = playChunks
    ? playChunks
    : playFollowSentences
      ? splitEnglishSentences(playSourceText)
      : [playSourceText];
  const labelBase = opts.label || (playLang === "zh" ? "中文播放中" : "英文播放中");

  showPlayBar(
    playLang === "zh" ? "載入雲希神經音…" : "準備播放…"
  );

  let anyOk = false;
  for (let i = 0; i < sentences.length; i++) {
    if (seq !== playSeq) return;
    const hi =
      opts.highlightIndex != null
        ? opts.highlightIndex
        : playFollowSentences
          ? i
          : -1;
    if (hi >= 0) highlightSentence(hi);
    const status =
      sentences.length > 1
        ? `${labelBase} ${i + 1}/${sentences.length}`
        : labelBase;
    showPlayBar(
      playLang === "zh" ? `${status} · 載入雲希…` : status
    );
    const t0 = Date.now();
    const speaker =
      playSpeakers && playSpeakers.length
        ? playSpeakers[Math.min(i, playSpeakers.length - 1)]
        : "";
    const ok = await speakEnglish(sentences[i], {
      fast: true,
      lang: playLang,
      speed: playSpeed,
      voice: speaker ? voiceForDialogueSpeaker(speaker, playLang) : undefined,
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

function vocabMap(art, extraWords = []) {
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
  for (const raw of extraWords || []) {
    const word = String(raw || "").trim();
    const w = word.toLowerCase();
    if (!w || map.has(w)) continue;
    map.set(w, { word, gloss: "", example: "", phonetic: "" });
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
  $("#btn-en-hub-dictation")?.addEventListener("click", () => {
    void openDictation();
  });
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
        if (isDialogueActive()) renderDialogue();
        else if (
          current &&
          $("#view-en-daily-read")?.classList.contains("view-active")
        ) {
          renderReader();
        }
      }
    });
  });

  $("#btn-en-daily-read-back")?.addEventListener("click", () => {
    stopPlayBar({ dismiss: true });
    hideGloss();
    openDailyList();
  });
  $("#btn-en-daily-speak-all")?.addEventListener("click", async () => {
    await playFullCurrent();
  });
  $("#btn-en-daily-done")?.addEventListener("click", () => {
    stopPlayBar({ dismiss: true });
    hideGloss();
    startMiniQuiz();
  });
  $("#btn-en-daily-dialogue")?.addEventListener("click", () => {
    openDialogue();
  });
  $("#btn-en-daily-dialogue-back")?.addEventListener("click", () => {
    hideGloss();
    if (current) {
      deps?.showView("enDailyRead");
      renderReader();
    } else {
      stopPlayBar({ dismiss: true });
      openDailyList();
    }
  });
  $("#btn-en-daily-dialogue-quiz")?.addEventListener("click", () => {
    stopPlayBar({ dismiss: true });
    hideGloss();
    startDialogueQuiz();
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
    if (isEnSpeakViewActive()) {
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
          chunks: playChunks || undefined,
          speakers: playSpeakers || undefined,
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

  $("#btn-en-daily-dictation-back")?.addEventListener("click", () => {
    if (confirm("離開聽寫？進度不會儲存。")) openEnHub();
  });
  $("#btn-en-daily-dictation-speak")?.addEventListener("click", () => {
    void speakDictationWord();
  });
  $("#btn-en-daily-dictation-next")?.addEventListener("click", () => {
    void onDictationNext();
  });
  $("#en-daily-dictation-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void onDictationNext();
    }
  });

  $("#btn-en-daily-quiz-back")?.addEventListener("click", () => {
    if (confirm("離開小測？進度不會儲存。")) {
      if (quizKind === "dialogue") {
        deps?.showView("enDailyDialogue");
        renderDialogue();
      } else {
        deps?.showView("enDailyRead");
        if (current) renderReader();
      }
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
  dlgZhCache.clear();
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
  bindSentencePlay(bodyEl);
  renderReviewStrip();
  const body = bodyForLevel(current);
  renderClozeCard("en-daily-cloze", body, current);
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

function renderClickableBody(text, art, extraWords) {
  const sentences = splitEnglishSentences(text);
  if (!sentences.length) return renderClickableText(text, art, extraWords);
  return sentences
    .map(
      (sent, i) =>
        `<span class="en-sent-row"><button type="button" class="en-sent-play" data-en-sent-play="${i}" aria-label="播放這句">▶</button><span class="en-sent" data-en-sent="${i}">${renderClickableText(sent, art, extraWords)}</span></span>`
    )
    .join("");
}

function renderClickableText(text, art, extraWords) {
  const map = vocabMap(art, extraWords);
  return String(text || "").replace(/([A-Za-z][A-Za-z'-]*)/g, (word) => {
    const key = word.toLowerCase();
    const isKey = map.has(key);
    const cls = isKey ? "en-word en-word-key" : "en-word";
    return `<button type="button" class="${cls}" data-en-word="${escapeHtml(word)}">${escapeHtml(word)}</button>`;
  });
}

function bindSentencePlay(root) {
  if (!root) return;
  root.querySelectorAll("[data-en-sent-play]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const i = Number(btn.getAttribute("data-en-sent-play"));
      const sentEl = root.querySelector(`.en-sent[data-en-sent="${i}"]`);
      const text = String(sentEl?.innerText || "").trim();
      if (!text) return;
      const speaker = btn.getAttribute("data-en-speaker") || "";
      await playWithBar(text, {
        label: "單句播放中",
        highlightIndex: i,
        speakers: speaker ? [speaker] : undefined,
      });
    });
  });
}

function dialogueOf(art) {
  const d = art?.dialogue;
  if (!d || typeof d !== "object") return null;
  const turns = Array.isArray(d.turns) ? d.turns.filter(Boolean) : [];
  if (!turns.length) return null;
  return d;
}

function dialogueFocusWords(d) {
  const out = [];
  for (const t of d?.turns || []) {
    for (const w of t.focus || t.focus_words || []) {
      if (w) out.push(String(w));
    }
  }
  return out;
}

function turnText(turn) {
  if (!turn) return "";
  if (level === "l3") return String(turn.l3 || turn.l2 || turn.l1 || "").trim();
  if (level === "l2") return String(turn.l2 || turn.l1 || turn.l3 || "").trim();
  return String(turn.l1 || turn.l2 || turn.l3 || "").trim();
}

function dialogueSpeakerNames(d) {
  const names = [];
  const add = (n) => {
    const s = String(n || "").trim();
    if (s && !names.includes(s)) names.push(s);
  };
  for (const n of d?.roles || []) add(n);
  for (const t of d?.turns || []) add(t.speaker);
  return names;
}

const EN_DLG_VOICES = [
  "en-US-GuyNeural",
  "en-US-JennyNeural",
  "en-US-DavisNeural",
  "en-US-AriaNeural",
  "en-GB-RyanNeural",
  "en-GB-SoniaNeural",
];
const ZH_DLG_VOICES = [
  "zh-CN-YunxiNeural",
  "zh-CN-XiaoxiaoNeural",
  "zh-CN-YunyangNeural",
  "zh-TW-HsiaoChenNeural",
  "zh-CN-YunjianNeural",
  "zh-CN-XiaoyiNeural",
];

function voiceForDialogueSpeaker(name, lang) {
  const d = current ? dialogueOf(current) : null;
  const names = dialogueSpeakerNames(d);
  let i = names.indexOf(String(name || "").trim());
  if (i < 0) i = 0;
  const pool = lang === "zh" ? ZH_DLG_VOICES : EN_DLG_VOICES;
  return pool[i % pool.length];
}

function dialogueTurnTexts(d) {
  return (d?.turns || []).map((t) => turnText(t)).filter(Boolean);
}

function dialogueTurnPlayList(d) {
  const chunks = [];
  const speakers = [];
  (d?.turns || []).forEach((t, i) => {
    const text = turnText(t);
    if (!text) return;
    chunks.push(text);
    speakers.push(String(t.speaker || `A${i + 1}`).trim());
  });
  return { chunks, speakers };
}

async function playFullCurrent() {
  if (!current) return;
  if (isDialogueActive()) {
    const d = dialogueOf(current);
    const { chunks, speakers } = dialogueTurnPlayList(d);
    if (!chunks.length) return;
    await playWithBar(chunks.join(" "), {
      label: "全文播放中",
      followSentences: true,
      chunks,
      speakers,
    });
    return;
  }
  await playWithBar(bodyForLevel(current), {
    label: "全文播放中",
    followSentences: true,
  });
}

function openDialogue() {
  if (!current) return;
  if (!dialogueOf(current)) {
    deps?.showWarn?.("尚無情境對話", "這篇還沒有對話資料。請先更新試算表後重新載入。");
    return;
  }
  hideGloss();
  deps?.showView("enDailyDialogue");
  renderDialogue();
}

function renderDialogue() {
  if (!current) return;
  const d = dialogueOf(current);
  if (!d) return;
  const cat = CAT_LABEL[current.category] || current.category;
  const sub = $("#en-daily-dialogue-sub");
  if (sub) sub.textContent = `${level.toUpperCase()} · 情境對話`;
  const scene = $("#en-daily-dialogue-scene");
  const roles = $("#en-daily-dialogue-roles");
  const bodyEl = $("#en-daily-dialogue-body");
  if (scene) scene.textContent = String(d.scene || current.title || "");
  if (roles) {
    const list = Array.isArray(d.roles) ? d.roles.filter(Boolean) : [];
    roles.textContent = list.length ? `角色：${list.join(" / ")}` : "";
    roles.hidden = !list.length;
  }
  const extra = dialogueFocusWords(d);
  if (bodyEl) {
    bodyEl.innerHTML = (d.turns || [])
      .map((t, i) => {
        const text = turnText(t);
        const name = escapeHtml(String(t.speaker || `A${i + 1}`));
        return `<div class="en-dlg-turn"><span class="en-dlg-speaker">${name}</span><span class="en-sent-row"><button type="button" class="en-sent-play" data-en-sent-play="${i}" data-en-speaker="${name}" aria-label="播放這句">▶</button><span class="en-sent" data-en-sent="${i}">${renderClickableText(text, current, extra)}</span></span><button type="button" class="en-dlg-zh-toggle" data-en-dlg-zh="${i}">中文 ▼</button><p class="en-dlg-zh" data-en-dlg-zh-text="${i}" hidden></p></div>`;
      })
      .join("");
    bindWordClicks(bodyEl);
    bindSentencePlay(bodyEl);
    bindDialogueZhToggles(bodyEl, d);
  }
  const playList = dialogueTurnPlayList(d);
  prefetchEnglishAudio(playList.chunks.join(" "));
  playList.chunks.slice(0, 2).forEach((s, i) => {
    prefetchChineseAudio(s, voiceForDialogueSpeaker(playList.speakers[i], "zh"));
  });
  renderClozeCard("en-dlg-cloze", playList.chunks.join(" "), current, extra);
  showPlayBarIdle();
}

function bindDialogueZhToggles(root, d) {
  if (!root) return;
  root.querySelectorAll("[data-en-dlg-zh]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const i = Number(btn.getAttribute("data-en-dlg-zh"));
      const p = root.querySelector(`[data-en-dlg-zh-text="${i}"]`);
      if (!p) return;
      if (!p.hidden && p.textContent && p.textContent !== "翻譯中…") {
        p.hidden = true;
        btn.textContent = "中文 ▼";
        return;
      }
      const cacheKey = `${current?.id || ""}|${level}|${i}`;
      let zh = dlgZhCache.get(cacheKey) || "";
      p.hidden = false;
      btn.textContent = "中文 ▲";
      if (!zh) {
        p.textContent = "翻譯中…";
        const src = turnText(d?.turns?.[i]);
        zh =
          (await translateEnToZh(src, "TW")) ||
          (await translateEnToZh(src, "CN")) ||
          "（暫無中文）";
        dlgZhCache.set(cacheKey, zh);
      }
      p.textContent = zh;
    });
  });
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildClozeItem(text, art, extraWords) {
  const map = vocabMap(art, extraWords);
  const sentences = splitEnglishSentences(text);
  const hits = [];
  for (const sent of sentences) {
    const words = sent.match(/[A-Za-z][A-Za-z'-]*/g) || [];
    for (const w of words) {
      if (w.length < 4) continue;
      const entry = map.get(w.toLowerCase());
      if (!entry?.word) continue;
      hits.push({ sent, surface: w, answer: entry.word });
    }
  }
  if (!hits.length) return null;
  const pick = hits[Math.floor(Math.random() * hits.length)];
  const sentence = pick.sent.replace(
    new RegExp(`\\b${escapeRegex(pick.surface)}\\b`),
    "______"
  );
  const pool = [...map.values()]
    .map((v) => v.word)
    .filter((w) => w.toLowerCase() !== pick.answer.toLowerCase());
  const options = shuffle([pick.answer, ...shuffle(pool).slice(0, 3)]).slice(
    0,
    4
  );
  if (options.length < 2) return null;
  if (!options.some((o) => o.toLowerCase() === pick.answer.toLowerCase())) {
    options[0] = pick.answer;
  }
  return {
    sentence,
    answer: pick.answer,
    options: shuffle(options),
  };
}

function renderClozeCard(idPrefix, text, art, extraWords) {
  const card = $(`#${idPrefix}`);
  const prompt = $(`#${idPrefix}-prompt`);
  const opts = $(`#${idPrefix}-options`);
  if (!card || !prompt || !opts) return;
  const item = buildClozeItem(text, art, extraWords);
  if (!item) {
    card.hidden = true;
    opts.innerHTML = "";
    prompt.textContent = "";
    return;
  }
  card.hidden = false;
  prompt.textContent = item.sentence;
  opts.innerHTML = "";
  let locked = false;
  for (const opt of item.options) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-secondary btn-block";
    btn.textContent = opt;
    btn.addEventListener("click", () => {
      if (locked) return;
      locked = true;
      const ok =
        String(opt).toLowerCase() === String(item.answer).toLowerCase();
      btn.classList.add(ok ? "en-cloze-ok" : "en-cloze-no");
      if (!ok) {
        opts.querySelectorAll("button").forEach((b) => {
          if (
            String(b.textContent).toLowerCase() ===
            String(item.answer).toLowerCase()
          ) {
            b.classList.add("en-cloze-ok");
          }
        });
      }
    });
    opts.appendChild(btn);
  }
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
    if (isEnSpeakViewActive()) showPlayBarIdle();
    else syncDockVisibility();
  }, 280);
  if (isEnSpeakViewActive()) {
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

function collectTodayDictationWords() {
  const today = todayIso();
  const seen = new Set();
  const out = [];
  const add = (word, gloss) => {
    const w = String(word || "").trim();
    if (!w || w.length < 2) return;
    const key = w.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ word: w, gloss: String(gloss || "").trim() });
  };
  for (const art of articles.filter((a) => a.date === today)) {
    for (const v of art.vocab || []) add(v.word, v.gloss);
  }
  for (const r of loadReview()) add(r.word, r.gloss);
  return out;
}

async function openDictation() {
  await ensureArticles();
  const pool = shuffle(collectTodayDictationWords());
  if (!pool.length) {
    deps?.showWarn?.(
      "還沒有今日詞",
      "先讀今天的文章，或加入複習字，再來聽寫。"
    );
    return;
  }
  dictationQs = pool.slice(0, Math.min(8, pool.length));
  dictationIndex = 0;
  dictationCorrect = 0;
  dictationLocked = false;
  deps?.showView("enDailyDictation");
  renderDictationQ();
  void speakDictationWord();
}

function renderDictationQ() {
  const q = dictationQs[dictationIndex];
  const progress = $("#en-daily-dictation-progress");
  const input = $("#en-daily-dictation-input");
  const fb = $("#en-daily-dictation-feedback");
  const nextBtn = $("#btn-en-daily-dictation-next");
  if (progress) {
    progress.textContent = `第 ${dictationIndex + 1} / ${dictationQs.length} 題`;
  }
  if (fb) {
    fb.hidden = true;
    fb.textContent = "";
    fb.classList.remove("is-ok", "is-no");
  }
  if (input) {
    input.value = "";
    input.disabled = false;
    input.focus();
  }
  if (nextBtn) {
    nextBtn.disabled = false;
    nextBtn.textContent =
      dictationIndex >= dictationQs.length - 1 ? "送出" : "送出";
  }
  dictationLocked = false;
  if (q?.word) prefetchEnglishAudio(q.word);
}

async function speakDictationWord() {
  const q = dictationQs[dictationIndex];
  if (!q?.word) return;
  unlockSpeechFromGesture();
  await speakEnglish(q.word, { fast: true, lang: "en", speed: playSpeed });
}

async function onDictationNext() {
  const q = dictationQs[dictationIndex];
  const input = $("#en-daily-dictation-input");
  const fb = $("#en-daily-dictation-feedback");
  const nextBtn = $("#btn-en-daily-dictation-next");
  if (!q) return;
  if (dictationLocked) {
    goDictationNext();
    return;
  }
  const typed = String(input?.value || "")
    .trim()
    .replace(/[.?!,'"]/g, "");
  if (!typed) {
    deps?.showWarn?.("還沒寫", "先聽發音，再拼出這個字。");
    return;
  }
  const ok = typed.toLowerCase() === String(q.word).toLowerCase();
  dictationLocked = true;
  if (ok) dictationCorrect += 1;
  if (fb) {
    fb.hidden = false;
    fb.classList.toggle("is-ok", ok);
    fb.classList.toggle("is-no", !ok);
    fb.textContent = ok ? "正確！" : `答案是 ${q.word}`;
  }
  if (input) input.disabled = true;
  if (nextBtn) {
    nextBtn.textContent =
      dictationIndex >= dictationQs.length - 1 ? "完成" : "下一題";
  }
}

async function goDictationNext() {
  if (dictationIndex >= dictationQs.length - 1) {
    await finishDictation();
    return;
  }
  dictationIndex += 1;
  renderDictationQ();
  void speakDictationWord();
}

async function finishDictation() {
  const total = dictationQs.length;
  const child = getSelectedChild();
  let message = "";
  try {
    const result = await logQuizResult(
      {
        subject: "en",
        child,
        mode: "daily-dictation",
        autoCorrect: dictationCorrect,
        questions: dictationQs.map((q) => ({
          english: q.word,
          chinese: q.gloss || "",
        })),
        pending: 0,
      },
      `聽寫今日詞 ${todayIso()}`
    );
    message = result?.message || "";
  } catch (e) {
    console.warn("logQuizResult", e);
    message = "成績已記在本機（試算表稍後再試）";
  }
  deps?.showOk?.(`完成！${dictationCorrect} / ${total}`, message, () =>
    openEnHub()
  );
}

function startMiniQuiz() {
  if (!current) return;
  const built = buildQuizQuestions(current);
  if (!built.length) {
    deps?.showWarn?.("無法出題", "這篇沒有足夠的小測資料。");
    return;
  }
  quizKind = "read";
  quizQs = built.slice(0, 5);
  quizAnswers = quizQs.map(() => null);
  quizIndex = 0;
  quizCorrect = 0;
  const subj = $("#en-daily-quiz-subject");
  if (subj) subj.textContent = "閱讀小測";
  renderQuizQ();
  deps?.showView("enDailyQuiz");
}

function startDialogueQuiz() {
  if (!current) return;
  const d = dialogueOf(current);
  const built = buildDialogueQuizQuestions(current, d);
  if (!built.length) {
    deps?.showWarn?.("無法出題", "這篇對話還沒有小測資料。");
    return;
  }
  quizKind = "dialogue";
  quizQs = built.slice(0, 3);
  quizAnswers = quizQs.map(() => null);
  quizIndex = 0;
  quizCorrect = 0;
  const subj = $("#en-daily-quiz-subject");
  if (subj) subj.textContent = "對話小測";
  renderQuizQ();
  deps?.showView("enDailyQuiz");
}

function buildDialogueQuizQuestions(art, d) {
  const fromSheet = normalizeQuizItems(d?.quiz).slice(0, 3);
  if (fromSheet.length >= 3) return fromSheet;
  const used = new Set(
    fromSheet.map((q) => String(q.answer || "").toLowerCase())
  );
  const vocab = [...(art.vocab || [])].filter((v) => v.word && v.gloss);
  const extra = extractFallbackVocab(
    dialogueTurnTexts(d).join(" ") || bodyForLevel(art)
  );
  const pool = [...vocab, ...extra];
  const out = [...fromSheet];
  for (const v of shuffle(pool)) {
    if (out.length >= 3) break;
    const answer = String(v.word);
    if (used.has(answer.toLowerCase())) continue;
    used.add(answer.toLowerCase());
    const distractors = pool
      .map((x) => String(x.word))
      .filter((w) => w.toLowerCase() !== answer.toLowerCase());
    const options = shuffle([answer, ...distractors.slice(0, 3)]).slice(0, 4);
    if (options.length < 2) continue;
    out.push({
      type: "vocab",
      q: String(v.gloss || fallbackGloss(answer)),
      options: shuffle(options),
      answer,
    });
  }
  return out;
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
  const nextBtn = $("#btn-en-daily-quiz-next");
  if (nextBtn) {
    nextBtn.disabled = true;
    nextBtn.textContent = "Submitting…";
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
  try {
    await finishQuiz();
  } catch (e) {
    console.warn("finishQuiz", e);
    deps?.showOk?.(
      `完成！${quizCorrect} / ${quizQs.length}`,
      "成績已記在本機（上傳時發生錯誤）",
      () => openDailyList()
    );
  } finally {
    if (nextBtn) {
      nextBtn.disabled = false;
      nextBtn.textContent = "Submit";
    }
  }
}

async function finishQuiz() {
  const total = quizQs.length;
  const child = getSelectedChild();
  let message = "";
  try {
    const result = await logQuizResult(
      {
        subject: "en",
        child,
        mode: quizKind === "dialogue" ? "daily-dialogue" : "daily-read",
        autoCorrect: quizCorrect,
        questions: quizQs,
        pending: 0,
      },
      `${quizKind === "dialogue" ? "情境對話" : "每日閱讀"} ${current?.date || ""} ${current?.category || ""}`.trim()
    );
    message = result?.message || "";
  } catch (e) {
    console.warn("logQuizResult", e);
    message = "成績已記在本機（試算表稍後再試）";
  }
  deps?.showOk?.(`完成！${quizCorrect} / ${total}`, message, () => openDailyList());
}
