/**
 * 生活觀察：心智圖。先點出關聯，再打開觀察卡。
 */
import {
  COUNTIES,
  NODES,
  RINGS,
  countyById,
  nodeById,
  relsOf,
  zonesForCounty,
} from "./life-observe-bank.js?v=life-observe-bank-v5";
import { renderScene } from "./life-observe-art.js?v=life-observe-art-v4";

const KEY_COUNTY = "kid-quiz-life-county";
const DEFAULT_COUNTY = "txg";
const MAP_BOX = 360;
const RADIUS = { 0: 64, 1: 108, 2: 144, 4: 172 };

/** @type {{ showView: (name: string) => void } | null} */
let deps = null;
let countyId = DEFAULT_COUNTY;
let focusId = "me";
let currentId = "";

const $ = (sel) => document.querySelector(sel);

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function loadCounty() {
  const id = localStorage.getItem(KEY_COUNTY);
  return COUNTIES.some((c) => c.id === id) ? id : DEFAULT_COUNTY;
}

function setCounty(id) {
  countyId = COUNTIES.some((c) => c.id === id) ? id : DEFAULT_COUNTY;
  localStorage.setItem(KEY_COUNTY, countyId);
}

function ringMeta(ring) {
  if (ring === "core") return { label: "中心", hint: "" };
  if (ring === "link") return { label: "橫向連線", hint: "把地方和觀察接起來。" };
  if (ring === "zone") return { label: "縣市往下長", hint: "這一格長出來的例子。" };
  return RINGS.find((r) => r.id === ring) || { label: "", hint: "" };
}

function radiusFor(ring) {
  return RADIUS[ring] ? `${RADIUS[ring]}px` : "0";
}

function mapPoint(node) {
  if (!node) return null;
  if (node.ring === "core") return [MAP_BOX / 2, MAP_BOX / 2];
  const r = RADIUS[node.ring];
  if (!r) return null;
  const a = ((node.angle || 0) * Math.PI) / 180;
  return [MAP_BOX / 2 + Math.sin(a) * r, MAP_BOX / 2 - Math.cos(a) * r];
}

function relEntries(node) {
  const out = { ...relsOf(node, countyId) };
  for (const other of [...NODES, ...zonesForCounty(countyId)]) {
    if (other.id === node.id) continue;
    const why = relsOf(other, countyId)[node.id];
    if (why && !out[other.id]) out[other.id] = why;
  }
  return Object.entries(out).filter(([id]) => nodeById(id));
}

function renderCountySelect() {
  const sel = $("#life-county");
  if (!sel) return;
  sel.innerHTML = COUNTIES.map(
    (c) =>
      `<option value="${escapeHtml(c.id)}"${c.id === countyId ? " selected" : ""}>${escapeHtml(c.name)}</option>`,
  ).join("");
}

function chipClass(id, extra) {
  const on = id === focusId ? " is-focus" : relEntries(nodeById(focusId) || {}).some(([rid]) => rid === id) ? " is-rel" : "";
  return `${extra || "life-link-chip"}${on}`;
}

function renderZones() {
  const box = $("#life-zones");
  const label = $("#life-zones-label");
  if (!box) return;
  const zones = zonesForCounty(countyId);
  if (label) label.hidden = zones.length === 0;
  box.hidden = zones.length === 0;
  box.innerHTML = zones
    .map(
      (n) =>
        `<button type="button" class="${chipClass(n.id, "life-link-chip life-zone-chip")}" data-life-node="${escapeHtml(n.id)}">${escapeHtml(n.name)}</button>`,
    )
    .join("");
}

function renderLines(focus) {
  const from = mapPoint(focus);
  if (!from) return "";
  const lines = relEntries(focus)
    .map(([id]) => {
      const to = mapPoint(nodeById(id));
      if (!to) return "";
      return `<line x1="${from[0]}" y1="${from[1]}" x2="${to[0]}" y2="${to[1]}" />`;
    })
    .join("");
  return `<svg class="life-map-lines" viewBox="0 0 ${MAP_BOX} ${MAP_BOX}" aria-hidden="true">${lines}</svg>`;
}

function renderMap() {
  const box = $("#life-map");
  if (!box) return;
  const focus = nodeById(focusId);
  const relIds = new Set(focus ? relEntries(focus).map(([id]) => id) : []);
  const rings = [4, 2, 1, 0]
    .map((id) => `<div class="life-map-orbit" data-ring="${id}" aria-hidden="true"></div>`)
    .join("");
  const nodes = NODES.filter((n) => n.ring !== "link" && n.ring !== "core")
    .map((n) => {
      const state = n.id === focusId ? " is-focus" : relIds.has(n.id) ? " is-rel" : focus ? " is-dim" : "";
      return `<span class="life-map-arm" style="--a:${n.angle}deg"><button type="button" class="life-map-node${state}" data-life-node="${escapeHtml(n.id)}" style="--r:${radiusFor(n.ring)}">${escapeHtml(n.short || n.name)}</button></span>`;
    })
    .join("");
  const coreOn = focusId === "me" ? " is-focus" : relIds.has("me") ? " is-rel" : focus && focusId !== "me" ? " is-dim" : "";
  box.innerHTML =
    renderLines(focus) +
    rings +
    nodes +
    `<button type="button" class="life-map-core${coreOn}" data-life-node="me">我</button>`;
}

function renderLinks() {
  const box = $("#life-links");
  if (!box) return;
  box.innerHTML = NODES.filter((n) => n.ring === "link")
    .map(
      (n) =>
        `<button type="button" class="${chipClass(n.id)}" data-life-node="${escapeHtml(n.id)}">${escapeHtml(n.name)}</button>`,
    )
    .join("");
}

function renderFocus() {
  const box = $("#life-focus");
  if (!box) return;
  const n = nodeById(focusId);
  if (!n) {
    box.hidden = true;
    box.innerHTML = "";
    return;
  }
  const rows = relEntries(n)
    .map(([id, why]) => {
      const x = nodeById(id);
      return `<button type="button" class="life-rel-row" data-life-node="${escapeHtml(id)}"><strong>${escapeHtml(x.name)}</strong><span>${escapeHtml(why)}</span></button>`;
    })
    .join("");
  box.hidden = false;
  box.innerHTML =
    `<p class="life-focus-name">${escapeHtml(n.name)}</p>` +
    `<p class="life-focus-because">${escapeHtml(n.because || "")}</p>` +
    `<p class="life-read-k">為什麼連在一起</p>` +
    `<div class="life-rel-rows">${rows}</div>` +
    `<button type="button" class="btn btn-secondary btn-block" data-life-open="${escapeHtml(n.id)}">看觀察卡</button>`;
}

function renderList() {
  const box = $("#life-list");
  if (!box || box.hidden) return;
  const zones = zonesForCounty(countyId);
  const groups = [
    ...(zones.length ? [{ ring: "zone", nodes: zones }] : []),
    { ring: 0, nodes: NODES.filter((n) => n.ring === 0) },
    { ring: 1, nodes: NODES.filter((n) => n.ring === 1) },
    { ring: 2, nodes: NODES.filter((n) => n.ring === 2) },
    { ring: 4, nodes: NODES.filter((n) => n.ring === 4) },
  ];
  box.innerHTML = groups
    .map((g) => {
      const meta = ringMeta(g.ring);
      const items = g.nodes
        .map(
          (n) =>
            `<button type="button" class="life-list-item" data-life-node="${escapeHtml(n.id)}"><span>${escapeHtml(n.name)}</span><span class="life-list-meta">${escapeHtml(n.because || n.what)}</span></button>`,
        )
        .join("");
      return `<p class="life-list-group">${escapeHtml(meta.label)}</p>${items}`;
    })
    .join("");
}

function paintHub() {
  renderCountySelect();
  renderMap();
  renderFocus();
  renderLinks();
  renderZones();
  renderList();
  const hint = $("#life-hub-hint");
  if (hint) {
    const c = countyById(countyId);
    hint.textContent = `中心是「我」，現在放在${c.name}。點一個點，先看它連到誰；再點一次或按「看觀察卡」。`;
  }
}

function setFocus(id) {
  if (!nodeById(id)) return;
  focusId = id;
  paintHub();
}

function openHub() {
  countyId = loadCounty();
  if (!nodeById(focusId)) focusId = "me";
  paintHub();
  deps.showView("lifeHub");
}

function countyExtra(node) {
  if (!node.countyCard) return "";
  const c = countyById(countyId);
  const zones = zonesForCounty(countyId);
  const zoneBtns = zones
    .map(
      (z) =>
        `<button type="button" class="life-rel-row" data-life-node="${escapeHtml(z.id)}"><strong>${escapeHtml(z.name)}</strong><span>${escapeHtml(z.branch || z.because)}</span></button>`,
    )
    .join("");
  return (
    `<div class="life-county-card">` +
    `<p class="life-county-name">${escapeHtml(c.name)}</p>` +
    `<p>${escapeHtml(c.pos)}。${escapeHtml(c.life)}</p>` +
    (zoneBtns ? `<p class="life-read-k">這一格往下長</p><div class="life-rel-rows">${zoneBtns}</div>` : "") +
    `</div>`
  );
}

function openNode(id) {
  const n = nodeById(id);
  if (!n) return;
  currentId = n.id;
  focusId = n.id;
  const meta = ringMeta(n.ring);
  const scene = $("#life-read-scene");
  if (scene) scene.innerHTML = renderScene(n.scene);
  $("#life-read-title").textContent = n.name;
  $("#life-read-meta").textContent = meta.label + (meta.hint ? ` · ${meta.hint}` : "");
  const rels = relEntries(n)
    .map(([lid, why]) => {
      const x = nodeById(lid);
      return `<button type="button" class="life-rel-row" data-life-node="${escapeHtml(x.id)}"><strong>${escapeHtml(x.name)}</strong><span>${escapeHtml(why)}</span></button>`;
    })
    .join("");
  $("#life-read-body").innerHTML =
    countyExtra(n) +
    (n.because ? `<p class="life-read-k">它為什麼在這張圖上</p><p class="life-read-because">${escapeHtml(n.because)}</p>` : "") +
    `<p class="life-read-k">這是什麼</p><p class="life-read-p">${escapeHtml(n.what)}</p>` +
    `<p class="life-read-k">我在哪裡看得到</p><p class="life-read-p">${escapeHtml(n.where)}</p>` +
    `<p class="life-read-k">去做一件小事</p><p class="life-read-do">${escapeHtml(n.do)}</p>`;
  const rel = $("#life-read-links");
  if (rel) rel.innerHTML = rels;
  const relLabel = $("#life-read-links-label");
  if (relLabel) relLabel.textContent = "為什麼連在一起";
  deps.showView("lifeRead");
}

function onNodeClick(e) {
  const openBtn = e.target instanceof Element ? e.target.closest("[data-life-open]") : null;
  if (openBtn) {
    e.preventDefault();
    openNode(openBtn.getAttribute("data-life-open") || "");
    return;
  }
  const btn = e.target instanceof Element ? e.target.closest("[data-life-node]") : null;
  if (!btn) return;
  e.preventDefault();
  const id = btn.getAttribute("data-life-node") || "";
  const onHub = Boolean(btn.closest("#view-life-hub"));
  if (onHub && id === focusId && !btn.closest("#life-focus")) {
    openNode(id);
    return;
  }
  if (onHub) {
    setFocus(id);
    return;
  }
  openNode(id);
}

function toggleList() {
  const box = $("#life-list");
  const btn = $("#btn-life-list-toggle");
  if (!box) return;
  box.hidden = !box.hidden;
  if (btn) btn.textContent = box.hidden ? "列出全部點" : "收起全部點";
  if (!box.hidden) renderList();
}

export function openLifeHub() {
  openHub();
}

function bindEvents() {
  $("#btn-start-life")?.addEventListener("click", () => openHub());
  $("#btn-life-hub-back")?.addEventListener("click", () => deps.showView("home"));
  $("#btn-life-read-back")?.addEventListener("click", () => openHub());
  $("#btn-life-list-toggle")?.addEventListener("click", () => toggleList());
  $("#life-county")?.addEventListener("change", (e) => {
    setCounty(e.target instanceof HTMLSelectElement ? e.target.value : countyId);
    focusId = "county";
    openHub();
  });
  $("#view-life-hub")?.addEventListener("click", onNodeClick);
  $("#view-life-read")?.addEventListener("click", onNodeClick);
}

/**
 * @param {{ showView: (name: string) => void }} d
 */
export function initLifeObserve(d) {
  deps = d;
  countyId = loadCounty();
  bindEvents();
}
