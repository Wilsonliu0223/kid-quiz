/**
 * 英語寫作：初級／中級／中高級定式與短文。
 */
import { speakEnglish } from "./english.js?v=en-speak-v32";
import { openEnWordGloss } from "./en-daily.js?v=en-daily-v78";
import {
  ESSAYS,
  LEVELS,
  ROLE_GROUP,
  essaysForLevel,
  josekiById,
  josekiForLevel,
  levelById,
} from "./en-writing-bank.js?v=en-writing-bank-v4";

const KEY_TAB = "kid-quiz-en-writing-tab";
const KEY_LEVEL = "kid-quiz-en-writing-level";

/** @type {{ showView: (name: string) => void } | null} */
let deps = null;
let tab = "joseki";
let levelId = "elem";
let currentKind = "";
let currentId = "";

const $ = (sel) => document.querySelector(sel);

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function loadTab() {
  const t = localStorage.getItem(KEY_TAB);
  return t === "essay" ? "essay" : "joseki";
}

function setTab(t) {
  tab = t === "essay" ? "essay" : "joseki";
  localStorage.setItem(KEY_TAB, tab);
}

function loadLevel() {
  const id = localStorage.getItem(KEY_LEVEL);
  return LEVELS.some((x) => x.id === id) ? id : "elem";
}

function setLevel(id) {
  levelId = LEVELS.some((x) => x.id === id) ? id : "elem";
  localStorage.setItem(KEY_LEVEL, levelId);
}

function syncTabs() {
  document.querySelectorAll("[data-en-writing-tab]").forEach((btn) => {
    btn.classList.toggle("chip-active", btn.dataset.enWritingTab === tab);
  });
}

function syncLevels() {
  document.querySelectorAll("[data-en-writing-level]").forEach((btn) => {
    btn.classList.toggle("chip-active", btn.dataset.enWritingLevel === levelId);
  });
}

function renderSources(lv) {
  const box = $("#en-writing-sources");
  if (!box) return;
  box.innerHTML =
    `<p class="en-writing-source-lead">這一級不是自訂的。級名用全民英檢；程度對齊 CEFR ${escapeHtml(lv.cefr)}。</p>` +
    `<ul class="writing-teach-list">` +
    lv.sources
      .map(
        (s) =>
          `<li><a class="en-writing-source-link" href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.title)}</a>：${escapeHtml(s.quote)}</li>`,
      )
      .join("") +
    `</ul>`;
}

function renderList() {
  const box = $("#en-writing-list");
  const hint = $("#en-writing-hub-hint");
  const lv = levelById(levelId);
  if (!box) return;
  if (hint) {
    hint.textContent =
      `${lv.gept}（CEFR ${lv.cefr}）。${lv.canDo} 寫作量：${lv.wordHint}。` +
      (tab === "joseki"
        ? " 定式依起手式、連接詞、關係子句分組；每一招都附文法。"
        : " 下面短文的詞數對齊該級題面，可點英文查生字。");
  }
  renderSources(lv);
  box.innerHTML = "";
  if (tab === "joseki") {
    let lastGroup = "";
    josekiForLevel(levelId).forEach((j) => {
      const group = ROLE_GROUP[j.role] || j.role;
      if (group !== lastGroup) {
        lastGroup = group;
        const head = document.createElement("p");
        head.className = "en-writing-group";
        head.textContent = group;
        box.appendChild(head);
      }
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "writing-list-item";
      btn.innerHTML =
        `<span class="writing-list-title">${escapeHtml(String(j.n).padStart(2, "0"))}　${escapeHtml(j.name)}</span>` +
        `<span class="writing-list-meta">${escapeHtml(j.frame.split("\n")[0])}</span>`;
      btn.addEventListener("click", () => openJoseki(j.id));
      box.appendChild(btn);
    });
    return;
  }
  essaysForLevel(levelId).forEach((e) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "writing-list-item";
    btn.innerHTML =
      `<span class="writing-list-title">${escapeHtml(e.title)}</span>` +
      `<span class="writing-list-meta">${escapeHtml(e.zhTitle)} · ${escapeHtml(e.kind)} · ${e.words} 詞（${escapeHtml(lv.wordHint)}）</span>`;
    btn.addEventListener("click", () => openEssay(e.id));
    box.appendChild(btn);
  });
}

function usedLabel(used) {
  return used
    .map((id) => {
      const j = josekiById(id);
      return j ? j.name : id;
    })
    .join(" · ");
}

function setGrammar(text) {
  const wrap = $("#en-writing-grammar-wrap");
  const el = $("#en-writing-grammar");
  if (!wrap || !el) return;
  if (!text) {
    wrap.hidden = true;
    el.textContent = "";
    return;
  }
  wrap.hidden = false;
  el.textContent = text;
}

function keySet(vocab) {
  return new Set((vocab || []).map((v) => String(v.word || "").toLowerCase()));
}

function renderClickable(text, vocab) {
  const keys = keySet(vocab);
  return String(text || "")
    .replace(/\n/g, " ")
    .replace(/([A-Za-z][A-Za-z'-]*)/g, (word) => {
      const cls = keys.has(word.toLowerCase()) ? "en-word en-word-key" : "en-word";
      return `<button type="button" class="${cls}" data-en-word="${escapeHtml(word)}">${escapeHtml(word)}</button>`;
    });
}

function renderParas(text, vocab) {
  return String(text || "")
    .split(/\n\n+/)
    .filter(Boolean)
    .map((p) => `<p class="writing-essay-p en-writing-essay-p">${renderClickable(p, vocab)}</p>`)
    .join("");
}

function renderEssayBody(e) {
  const paras = String(e.body || "").split(/\n\n+/).filter(Boolean);
  const notes = e.notes || [];
  return paras
    .map((p, i) => {
      const note = notes[i]
        ? `<p class="en-writing-para-note">${escapeHtml(notes[i])}</p>`
        : "";
      return `<div class="en-writing-para"><p class="writing-essay-p en-writing-essay-p">${renderClickable(p, e.vocab)}</p>${note}</div>`;
    })
    .join("");
}

function renderVocab(vocab) {
  const wrap = $("#en-writing-vocab-wrap");
  const box = $("#en-writing-vocab");
  if (!wrap || !box) return;
  if (!vocab?.length) {
    wrap.hidden = true;
    box.innerHTML = "";
    return;
  }
  wrap.hidden = false;
  box.innerHTML = vocab
    .map((v) => {
      const w = escapeHtml(v.word);
      return `<button type="button" class="en-word en-word-key en-writing-vocab-chip" data-en-word="${w}">${w}<span class="en-writing-vocab-zh">${escapeHtml(v.zh || "")}</span></button>`;
    })
    .join("");
}

function setTapHint(show) {
  const el = $("#en-writing-tap-hint");
  if (el) el.hidden = !show;
}

function setBasis(text, url) {
  const el = $("#en-writing-read-basis");
  if (!el) return;
  if (!text) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }
  el.hidden = false;
  const link = url
    ? ` <a class="en-writing-source-link" href="${escapeHtml(url)}" target="_blank" rel="noopener">出處</a>`
    : "";
  el.innerHTML = `<strong>依據</strong> ${escapeHtml(text)}${link}`;
}

function resetTry(placeholder, showLabel) {
  const input = $("#en-writing-try-input");
  if (input) {
    input.value = "";
    input.placeholder = placeholder;
  }
  const model = $("#en-writing-try-model");
  if (model) {
    model.hidden = true;
    model.innerHTML = "";
  }
  const show = $("#btn-en-writing-try-show");
  if (show) show.textContent = showLabel;
}

function openJoseki(id) {
  const j = josekiById(id);
  if (!j) return;
  currentKind = "joseki";
  currentId = j.id;
  const lv = levelById(j.level);
  $("#en-writing-read-title").textContent = `${lv.label} ${String(j.n).padStart(2, "0")}　${j.name}`;
  $("#en-writing-read-meta").textContent =
    `${lv.gept} · CEFR ${lv.cefr} · ${ROLE_GROUP[j.role] || j.role}`;
  const used = $("#en-writing-read-used");
  if (used) {
    used.hidden = true;
    used.textContent = "";
  }
  setBasis(j.basis, j.basisUrl);
  setGrammar(j.grammar || "");
  setTapHint(true);
  renderVocab(null);
  $("#en-writing-read-body").innerHTML =
    `<p class="en-writing-frame">${escapeHtml(j.frame).replace(/\n/g, "<br>")}</p>` +
    renderParas(j.samples.join("\n\n"));
  $("#en-writing-read-steps").innerHTML =
    `<li>${escapeHtml(j.why)}</li>` + `<li>小心：${escapeHtml(j.trap)}</li>`;
  $("#en-writing-read-tips").innerHTML = `<li>${escapeHtml(j.tryHint)}</li>`;
  resetTry(j.tryHint, "看例句");
  deps.showView("enWritingRead");
}

function openEssay(id) {
  const e = ESSAYS.find((x) => x.id === id);
  if (!e) return;
  currentKind = "essay";
  currentId = e.id;
  const lv = levelById(e.level);
  $("#en-writing-read-title").textContent = e.title;
  $("#en-writing-read-meta").textContent =
    `${e.zhTitle} · ${lv.label} · ${e.kind} · ${e.words} 詞（目標 ${lv.wordHint}）`;
  const used = $("#en-writing-read-used");
  if (used) {
    used.hidden = false;
    used.textContent = usedLabel(e.used);
  }
  setBasis(lv.task, lv.sources[0]?.url);
  setGrammar("");
  setTapHint(true);
  renderVocab(e.vocab);
  $("#en-writing-read-body").innerHTML = renderEssayBody(e);
  $("#en-writing-read-steps").innerHTML = e.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("");
  $("#en-writing-read-tips").innerHTML = e.tips.map((s) => `<li>${escapeHtml(s)}</li>`).join("");
  resetTry("照這一級的定式，換主題寫一段…", "看這篇英文");
  deps.showView("enWritingRead");
}

function speakCurrent() {
  let text = "";
  if (currentKind === "joseki") {
    const j = josekiById(currentId);
    if (j) text = j.samples.join(" ");
  } else {
    const e = ESSAYS.find((x) => x.id === currentId);
    if (e) text = e.body.replace(/\n+/g, " ");
  }
  if (!text) return;
  void speakEnglish(text, { fast: true, speed: 0.95 });
}

function toggleModel() {
  const model = $("#en-writing-try-model");
  const show = $("#btn-en-writing-try-show");
  if (!model) return;
  if (!model.hidden) {
    model.hidden = true;
    if (show) show.textContent = currentKind === "joseki" ? "看例句" : "看這篇英文";
    return;
  }
  if (currentKind === "joseki") {
    const j = josekiById(currentId);
    model.innerHTML = j ? renderParas(j.samples.join("\n\n")) : "";
  } else {
    const e = ESSAYS.find((x) => x.id === currentId);
    model.innerHTML = e ? renderParas(e.body, e.vocab) : "";
  }
  model.hidden = false;
  if (show) show.textContent = "收起";
}

export function openEnWritingHub() {
  tab = loadTab();
  levelId = loadLevel();
  syncTabs();
  syncLevels();
  renderList();
  deps.showView("enWritingHub");
}

function bindEvents() {
  $("#btn-en-hub-writing")?.addEventListener("click", () => openEnWritingHub());
  $("#btn-en-writing-hub-back")?.addEventListener("click", () => deps.showView("enHub"));
  $("#btn-en-writing-read-back")?.addEventListener("click", () => {
    currentId = "";
    currentKind = "";
    openEnWritingHub();
  });
  document.querySelectorAll("[data-en-writing-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setTab(btn.dataset.enWritingTab);
      syncTabs();
      renderList();
    });
  });
  document.querySelectorAll("[data-en-writing-level]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setLevel(btn.dataset.enWritingLevel);
      syncLevels();
      renderList();
    });
  });
  $("#btn-en-writing-speak")?.addEventListener("click", () => speakCurrent());
  $("#btn-en-writing-try-show")?.addEventListener("click", () => toggleModel());
  $("#view-en-writing-read")?.addEventListener("click", (e) => {
    const btn = e.target instanceof Element ? e.target.closest("[data-en-word]") : null;
    if (!btn) return;
    e.preventDefault();
    openEnWordGloss(btn.getAttribute("data-en-word") || "");
  });
}

/**
 * @param {{ showView: (name: string) => void }} d
 */
export function initEnWriting(d) {
  deps = d;
  tab = loadTab();
  levelId = loadLevel();
  bindEvents();
}
