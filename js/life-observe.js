/**
 * 生活觀察：心智圖中心頁與觀察卡。
 */
import {
  COUNTIES,
  NODES,
  RINGS,
  countyById,
  nodeById,
  zonesForCounty,
} from "./life-observe-bank.js?v=life-observe-bank-v2";
import { renderScene } from "./life-observe-art.js?v=life-observe-art-v1";

const KEY_COUNTY = "kid-quiz-life-county";
const DEFAULT_COUNTY = "txg";

/** @type {{ showView: (name: string) => void } | null} */
let deps = null;
let countyId = DEFAULT_COUNTY;
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
  if (ring === "link") return { label: "連線", hint: "把地方和觀察接起來。" };
  if (ring === "zone") return { label: "都市面貌", hint: "同一座城市的不同樣子。" };
  return RINGS.find((r) => r.id === ring) || { label: "", hint: "" };
}

function radiusFor(ring) {
  if (ring === 0) return "64px";
  if (ring === 1) return "108px";
  if (ring === 2) return "144px";
  if (ring === 4) return "172px";
  return "0";
}

function renderCountySelect() {
  const sel = $("#life-county");
  if (!sel) return;
  sel.innerHTML = COUNTIES.map(
    (c) =>
      `<option value="${escapeHtml(c.id)}"${c.id === countyId ? " selected" : ""}>${escapeHtml(c.name)}</option>`,
  ).join("");
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
        `<button type="button" class="life-link-chip life-zone-chip" data-life-node="${escapeHtml(n.id)}">${escapeHtml(n.name)}</button>`,
    )
    .join("");
}

function renderMap() {
  const box = $("#life-map");
  if (!box) return;
  const rings = [4, 2, 1, 0]
    .map((id) => `<div class="life-map-orbit" data-ring="${id}" aria-hidden="true"></div>`)
    .join("");
  const nodes = NODES.filter((n) => n.ring !== "link" && n.ring !== "core")
    .map((n) => {
      const r = radiusFor(n.ring);
      return `<span class="life-map-arm" style="--a:${n.angle}deg"><button type="button" class="life-map-node" data-life-node="${escapeHtml(n.id)}" style="--r:${r}">${escapeHtml(n.short || n.name)}</button></span>`;
    })
    .join("");
  box.innerHTML =
    rings +
    nodes +
    `<button type="button" class="life-map-core" data-life-node="me">我</button>`;
}

function renderLinks() {
  const box = $("#life-links");
  if (!box) return;
  box.innerHTML = NODES.filter((n) => n.ring === "link")
    .map(
      (n) =>
        `<button type="button" class="life-link-chip" data-life-node="${escapeHtml(n.id)}">${escapeHtml(n.name)}</button>`,
    )
    .join("");
}

function renderList() {
  const box = $("#life-list");
  if (!box) return;
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
            `<button type="button" class="life-list-item" data-life-node="${escapeHtml(n.id)}"><span>${escapeHtml(n.name)}</span><span class="life-list-meta">${escapeHtml(n.what)}</span></button>`,
        )
        .join("");
      return `<p class="life-list-group">${escapeHtml(meta.label)}</p>${items}`;
    })
    .join("");
}

function openHub() {
  countyId = loadCounty();
  renderCountySelect();
  renderZones();
  renderMap();
  renderLinks();
  renderList();
  const hint = $("#life-hub-hint");
  if (hint) {
    const c = countyById(countyId);
    const extra = zonesForCounty(countyId).length ? "下面還有這座城市的面貌。" : "";
    hint.textContent = `由家門口往外看。現在中心是「${c.name}」。先點圖上的圈。${extra}`;
  }
  deps.showView("lifeHub");
}

function countyExtra(node) {
  if (!node.countyCard) return "";
  const c = countyById(countyId);
  const zones = zonesForCounty(countyId);
  const zoneBtns = zones
    .map(
      (z) =>
        `<button type="button" class="life-rel" data-life-node="${escapeHtml(z.id)}">${escapeHtml(z.name)}</button>`,
    )
    .join("");
  return (
    `<div class="life-county-card">` +
    `<p class="life-county-name">${escapeHtml(c.name)}</p>` +
    `<p>${escapeHtml(c.pos)}。地形常見：${escapeHtml(c.land)}。</p>` +
    `<p>${escapeHtml(c.life)}</p>` +
    (zoneBtns ? `<p class="life-read-k">這座城市的面貌</p><div class="life-read-links">${zoneBtns}</div>` : "") +
    `</div>`
  );
}

function openNode(id) {
  const n = nodeById(id);
  if (!n) return;
  currentId = n.id;
  const meta = ringMeta(n.ring);
  const scene = $("#life-read-scene");
  if (scene) scene.innerHTML = renderScene(n.scene);
  $("#life-read-title").textContent = n.name;
  $("#life-read-meta").textContent = meta.label + (meta.hint ? ` · ${meta.hint}` : "");
  $("#life-read-body").innerHTML =
    countyExtra(n) +
    `<p class="life-read-k">這是什麼</p><p class="life-read-p">${escapeHtml(n.what)}</p>` +
    `<p class="life-read-k">我在哪裡看得到</p><p class="life-read-p">${escapeHtml(n.where)}</p>` +
    `<p class="life-read-k">去做一件小事</p><p class="life-read-do">${escapeHtml(n.do)}</p>`;
  const rel = $("#life-read-links");
  if (rel) {
    rel.innerHTML = (n.links || [])
      .map((lid) => {
        const x = nodeById(lid);
        return x
          ? `<button type="button" class="life-rel" data-life-node="${escapeHtml(x.id)}">${escapeHtml(x.name)}</button>`
          : "";
      })
      .join("");
  }
  deps.showView("lifeRead");
}

function onNodeClick(e) {
  const btn = e.target instanceof Element ? e.target.closest("[data-life-node]") : null;
  if (!btn) return;
  e.preventDefault();
  openNode(btn.getAttribute("data-life-node") || "");
}

export function openLifeHub() {
  openHub();
}

function bindEvents() {
  $("#btn-start-life")?.addEventListener("click", () => openHub());
  $("#btn-life-hub-back")?.addEventListener("click", () => deps.showView("home"));
  $("#btn-life-read-back")?.addEventListener("click", () => openHub());
  $("#life-county")?.addEventListener("change", (e) => {
    setCounty(e.target instanceof HTMLSelectElement ? e.target.value : countyId);
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
