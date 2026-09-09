/**
 * 英語基本寫作：20 招定式＋示範短文。
 */
import { speakEnglish } from "./english.js?v=en-speak-v32";
import { ESSAYS, JOSEKI, josekiByN } from "./en-writing-bank.js";

const KEY_TAB = "kid-quiz-en-writing-tab";

/** @type {{ showView: (name: string) => void } | null} */
let deps = null;
let tab = "joseki";
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

function syncTabs() {
  document.querySelectorAll("[data-en-writing-tab]").forEach((btn) => {
    btn.classList.toggle("chip-active", btn.dataset.enWritingTab === tab);
  });
}

function renderList() {
  const box = $("#en-writing-list");
  const hint = $("#en-writing-hub-hint");
  if (!box) return;
  if (hint) {
    hint.textContent =
      tab === "joseki"
        ? "像圍棋定式：先背 20 招句型，再組合成分段。起是開門，承是往下寫，轉是轉折，合是收尾。"
        : "六篇短文展示怎麼把定式串起來。先看用了哪幾招，再自己套一次。";
  }
  box.innerHTML = "";
  if (tab === "joseki") {
    JOSEKI.forEach((j) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "writing-list-item";
      btn.innerHTML =
        `<span class="writing-list-title">${escapeHtml(String(j.n).padStart(2, "0"))}　${escapeHtml(j.name)}</span>` +
        `<span class="writing-list-meta">${escapeHtml(j.role)} · ${escapeHtml(j.frame.split("\n")[0])}</span>`;
      btn.addEventListener("click", () => openJoseki(j.id));
      box.appendChild(btn);
    });
    return;
  }
  ESSAYS.forEach((e) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "writing-list-item";
    const used = e.used.map((n) => `${n}`).join("、");
    btn.innerHTML =
      `<span class="writing-list-title">${escapeHtml(e.title)}</span>` +
      `<span class="writing-list-meta">${escapeHtml(e.zhTitle)} · ${escapeHtml(e.kind)} · ${e.words} 詞 · 定式 ${escapeHtml(used)}</span>`;
    btn.addEventListener("click", () => openEssay(e.id));
    box.appendChild(btn);
  });
}

function usedLabel(used) {
  return used
    .map((n) => {
      const j = josekiByN(n);
      return j ? `第 ${j.n} 招 ${j.name}` : `第 ${n} 招`;
    })
    .join(" · ");
}

function renderParas(text) {
  return String(text || "")
    .split(/\n\n+/)
    .filter(Boolean)
    .map((p) => `<p class="writing-essay-p en-writing-essay-p">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function openJoseki(id) {
  const j = JOSEKI.find((x) => x.id === id);
  if (!j) return;
  currentKind = "joseki";
  currentId = j.id;
  $("#en-writing-read-title").textContent = `${String(j.n).padStart(2, "0")}　${j.name}`;
  $("#en-writing-read-meta").textContent = `${j.role} · 句型定式`;
  const used = $("#en-writing-read-used");
  if (used) {
    used.hidden = true;
    used.textContent = "";
  }
  $("#en-writing-read-body").innerHTML =
    `<p class="en-writing-frame">${escapeHtml(j.frame).replace(/\n/g, "<br>")}</p>` +
    renderParas(j.samples.join("\n\n"));
  $("#en-writing-read-steps").innerHTML =
    `<li>${escapeHtml(j.why)}</li>` + `<li>小心：${escapeHtml(j.trap)}</li>`;
  $("#en-writing-read-tips").innerHTML = `<li>${escapeHtml(j.tryHint)}</li>`;
  const input = $("#en-writing-try-input");
  if (input) {
    input.value = "";
    input.placeholder = j.tryHint;
  }
  const model = $("#en-writing-try-model");
  if (model) {
    model.hidden = true;
    model.textContent = "";
  }
  const show = $("#btn-en-writing-try-show");
  if (show) show.textContent = "看例句";
  deps.showView("enWritingRead");
}

function openEssay(id) {
  const e = ESSAYS.find((x) => x.id === id);
  if (!e) return;
  currentKind = "essay";
  currentId = e.id;
  $("#en-writing-read-title").textContent = e.title;
  $("#en-writing-read-meta").textContent = `${e.zhTitle} · ${e.kind} · ${e.words} 詞`;
  const used = $("#en-writing-read-used");
  if (used) {
    used.hidden = false;
    used.textContent = usedLabel(e.used);
  }
  $("#en-writing-read-body").innerHTML = renderParas(e.body);
  $("#en-writing-read-steps").innerHTML = e.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("");
  $("#en-writing-read-tips").innerHTML = e.tips.map((s) => `<li>${escapeHtml(s)}</li>`).join("");
  const input = $("#en-writing-try-input");
  if (input) {
    input.value = "";
    input.placeholder = "照上面的定式，自己換主題寫一段…";
  }
  const model = $("#en-writing-try-model");
  if (model) {
    model.hidden = true;
    model.textContent = "";
  }
  const show = $("#btn-en-writing-try-show");
  if (show) show.textContent = "看這篇英文";
  deps.showView("enWritingRead");
}

function speakCurrent() {
  let text = "";
  if (currentKind === "joseki") {
    const j = JOSEKI.find((x) => x.id === currentId);
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
    const j = JOSEKI.find((x) => x.id === currentId);
    model.textContent = j ? j.samples.join("\n") : "";
  } else {
    const e = ESSAYS.find((x) => x.id === currentId);
    model.textContent = e ? e.body : "";
  }
  model.hidden = false;
  if (show) show.textContent = "收起";
}

export function openEnWritingHub() {
  tab = loadTab();
  syncTabs();
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
  $("#btn-en-writing-speak")?.addEventListener("click", () => speakCurrent());
  $("#btn-en-writing-try-show")?.addEventListener("click", () => toggleModel());
}

/**
 * @param {{ showView: (name: string) => void }} d
 */
export function initEnWriting(d) {
  deps = d;
  tab = loadTab();
  bindEvents();
}
