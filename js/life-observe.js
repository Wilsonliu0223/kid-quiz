/**
 * 生活觀察：知識路徑迷宮。只能走連線，必經都踩到才算到終點。
 */
import {
  COUNTIES,
  NODES,
  RINGS,
  countyById,
  lensesOf,
  mazesForCounty,
  nodeById,
  placeNote,
  relsOf,
  zonesForCounty,
} from "./life-observe-bank.js?v=life-observe-bank-v9";
import { renderScene } from "./life-observe-art.js?v=life-observe-art-v7";

const KEY_COUNTY = "kid-quiz-life-county";
const KEY_FREE = "kid-quiz-life-free";
const KEY_MAZE = "kid-quiz-life-maze";
const KEY_STAMP = "kid-quiz-life-stamp";
const DEFAULT_COUNTY = "txg";
const MAP_BOX = 360;
const RADIUS = { 0: 58, 1: 100, 2: 136, 4: 168 };

/** @type {{ showView: (name: string) => void } | null} */
let deps = null;
let countyId = DEFAULT_COUNTY;
let hereId = "me";
let currentId = "";
let freeBrowse = false;
/** @type {ReturnType<typeof mazesForCounty>[0] | null} */
let maze = null;
let mazeIndex = 0;
/** @type {Set<string>} */
let visited = new Set(["me"]);
/** @type {Array<[string, string]>} */
let walked = [];
let won = false;
/** @type {{ from: string, to: string, why: string } | null} */
let lastStep = null;

const $ = (sel) => document.querySelector(sel);

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function loadCounty() {
  const id = localStorage.getItem(KEY_COUNTY);
  return COUNTIES.some((c) => c.id === id) ? id : DEFAULT_COUNTY;
}

function setCounty(id) {
  countyId = COUNTIES.some((c) => c.id === id) ? id : DEFAULT_COUNTY;
  localStorage.setItem(KEY_COUNTY, countyId);
}

function loadFree() {
  return localStorage.getItem(KEY_FREE) === "1";
}

function setFree(on) {
  freeBrowse = Boolean(on);
  localStorage.setItem(KEY_FREE, freeBrowse ? "1" : "0");
}

function lensTags(node) {
  return lensesOf(node)
    .map((x) => `<span class="life-lens life-lens-${escapeHtml(x.id)}">${escapeHtml(x.name)}</span>`)
    .join("");
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
  const out = { ...(relsOf(node, countyId) || {}) };
  for (const other of [...NODES, ...zonesForCounty(countyId)]) {
    if (other.id === node.id) continue;
    const why = relsOf(other, countyId)[node.id];
    if (why && !out[other.id]) out[other.id] = why;
  }
  return Object.entries(out).filter(([id]) => nodeById(id));
}

function neighborIds(id) {
  const n = nodeById(id);
  return n ? relEntries(n).map(([rid]) => rid) : [];
}

function canWalk(id) {
  if (freeBrowse) return true;
  if (!maze) return true;
  if (id === hereId) return true;
  return neighborIds(hereId).includes(id);
}

function mustDone() {
  return Boolean(maze && maze.must.every((id) => visited.has(id)));
}

function atGoal() {
  return Boolean(maze && hereId === maze.goal);
}

function stampId() {
  return maze ? `${todayKey()}:${maze.id}` : "";
}

function hasStamp() {
  const raw = localStorage.getItem(KEY_STAMP) || "";
  return raw.split(",").includes(stampId());
}

function saveStamp() {
  const id = stampId();
  if (!id) return;
  const set = new Set((localStorage.getItem(KEY_STAMP) || "").split(",").filter(Boolean));
  set.add(id);
  localStorage.setItem(KEY_STAMP, [...set].slice(-40).join(","));
}

function pickMaze(index) {
  const list = mazesForCounty(countyId);
  if (!list.length) {
    maze = null;
    return;
  }
  const saved = localStorage.getItem(KEY_MAZE) || "";
  const [savedDay, savedId] = saved.split("|");
  if (index == null && savedDay === todayKey()) {
    const found = list.findIndex((m) => m.id === savedId);
    mazeIndex = found >= 0 ? found : Math.floor(Date.now() / 86400000) % list.length;
  } else {
    mazeIndex = ((index ?? Math.floor(Date.now() / 86400000)) % list.length + list.length) % list.length;
  }
  maze = list[mazeIndex];
  localStorage.setItem(KEY_MAZE, `${todayKey()}|${maze.id}`);
}

function resetWalk() {
  lastStep = null;
  if (!maze) {
    hereId = "me";
    visited = new Set(["me"]);
    walked = [];
    won = false;
    return;
  }
  hereId = maze.start;
  visited = new Set([maze.start]);
  walked = [];
  won = hasStamp();
}

function whyBetween(fromId, toId) {
  const n = nodeById(fromId);
  if (!n) return "";
  const found = relEntries(n).find(([id]) => id === toId);
  return found ? found[1] : "";
}

function pathHops(fromId, toId) {
  if (!fromId || !toId || fromId === toId) return [];
  const prev = { [fromId]: null };
  const q = [fromId];
  for (let i = 0; i < q.length; i += 1) {
    const cur = q[i];
    for (const nb of neighborIds(cur)) {
      if (prev[nb] !== undefined) continue;
      prev[nb] = cur;
      if (nb === toId) {
        const ids = [toId];
        while (ids[0] !== fromId) ids.unshift(prev[ids[0]]);
        const hops = [];
        for (let j = 0; j < ids.length - 1; j += 1) {
          hops.push({ from: ids[j], to: ids[j + 1], why: whyBetween(ids[j], ids[j + 1]) });
        }
        return hops;
      }
      q.push(nb);
    }
  }
  return [];
}

function firstSentence(s) {
  const t = String(s || "").trim();
  if (!t) return "";
  const cut = t.split(/[。！？]/)[0];
  return cut ? `${cut}。` : t;
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
  const nbs = new Set(neighborIds(hereId));
  const locked = freeBrowse || id === hereId || nbs.has(id) ? "" : " is-locked";
  const on =
    id === hereId
      ? " is-here is-focus"
      : maze && id === maze.goal
        ? " is-goal" + (nbs.has(id) ? " is-rel" : "")
        : maze && maze.must.includes(id)
          ? (visited.has(id) ? " is-must-done" : " is-must") + (nbs.has(id) ? " is-rel" : "")
          : nbs.has(id)
            ? " is-rel"
            : walked.some(([a, b]) => a === id || b === id) || visited.has(id)
              ? " is-walked"
              : " is-dim";
  return `${extra || "life-link-chip"}${on}${locked}`;
}

function zoneChip(n) {
  return `<button type="button" class="${chipClass(n.id, "life-link-chip life-zone-chip")}" data-life-node="${escapeHtml(n.id)}">${escapeHtml(n.name)}</button>`;
}

function renderZones() {
  const box = $("#life-zones");
  const label = $("#life-zones-label");
  const fromBox = $("#life-zones-from");
  const fromLabel = $("#life-zones-from-label");
  if (!box) return;
  const zones = zonesForCounty(countyId);
  const faces = zones.filter((z) => z.kind !== "from");
  const from = zones.filter((z) => z.kind === "from");
  if (label) {
    label.hidden = faces.length === 0;
    label.textContent = faces.length ? "三種面貌" : "縣市往下長";
  }
  box.hidden = faces.length === 0;
  box.innerHTML = faces.map(zoneChip).join("");
  if (fromLabel) fromLabel.hidden = from.length === 0;
  if (fromBox) {
    fromBox.hidden = from.length === 0;
    fromBox.innerHTML = from.map(zoneChip).join("");
  }
}

function edgeKey(a, b) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function renderLines() {
  const seen = new Set();
  const parts = [];
  const add = (a, b, kind) => {
    const k = edgeKey(a, b);
    if (seen.has(k)) return;
    seen.add(k);
    const pa = mapPoint(nodeById(a));
    const pb = mapPoint(nodeById(b));
    if (!pa || !pb) return;
    parts.push(`<line class="${kind}" x1="${pa[0]}" y1="${pa[1]}" x2="${pb[0]}" y2="${pb[1]}" />`);
  };
  for (const [a, b] of walked) add(a, b, "is-walked");
  if (hereId) {
    for (const id of neighborIds(hereId)) add(hereId, id, "is-door");
  }
  return `<svg class="life-map-lines" viewBox="0 0 ${MAP_BOX} ${MAP_BOX}" aria-hidden="true">${parts.join("")}</svg>`;
}

function renderMap() {
  const box = $("#life-map");
  if (!box) return;
  const nbs = new Set(neighborIds(hereId));
  const rings = [4, 2, 1, 0]
    .map((id) => `<div class="life-map-orbit" data-ring="${id}" aria-hidden="true"></div>`)
    .join("");
  const nodes = NODES.filter((n) => n.ring !== "link" && n.ring !== "core")
    .map((n) => {
      const state =
        n.id === hereId
          ? " is-here is-focus"
          : maze && n.id === maze.goal
            ? " is-goal" + (nbs.has(n.id) ? " is-rel" : "")
            : maze && maze.must.includes(n.id)
              ? (visited.has(n.id) ? " is-must-done" : " is-must") + (nbs.has(n.id) ? " is-rel" : "")
              : nbs.has(n.id)
                ? " is-rel"
                : visited.has(n.id)
                  ? " is-walked"
                  : " is-dim";
      const locked = freeBrowse ? "" : nbs.has(n.id) || n.id === hereId ? "" : " is-locked";
      return `<span class="life-map-arm" style="--a:${n.angle}deg"><button type="button" class="life-map-node${state}${locked}" data-life-node="${escapeHtml(n.id)}" style="--r:${radiusFor(n.ring)}">${escapeHtml(n.short || n.name)}</button></span>`;
    })
    .join("");
  const coreOn =
    hereId === "me"
      ? " is-here is-focus"
      : nbs.has("me")
        ? " is-rel"
        : visited.has("me")
          ? " is-walked"
          : " is-dim";
  box.innerHTML =
    renderLines() +
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

function renderQuest() {
  const box = $("#life-quest");
  if (!box) return;
  if (freeBrowse || !maze) {
    box.hidden = true;
    box.innerHTML = "";
    return;
  }
  const start = nodeById(maze.start);
  const goal = nodeById(maze.goal);
  const must = maze.must
    .map((id) => {
      const n = nodeById(id);
      const done = visited.has(id);
      return `<span class="life-must${done ? " is-done" : ""}">${escapeHtml(n ? n.name : id)}${done ? " ✓" : ""}</span>`;
    })
    .join("");
  const lens = maze.lens && lensesOf({ id: maze.start }) ? "" : "";
  void lens;
  box.hidden = false;
  box.innerHTML =
    `<p class="life-quest-ask">${escapeHtml(maze.ask)}</p>` +
    `<p class="life-quest-path">從「${escapeHtml(start ? start.name : maze.start)}」走到「${escapeHtml(goal ? goal.name : maze.goal)}」</p>` +
    `<p class="life-quest-must">路上要經過：${must}</p>` +
    (won ? `<p class="life-quest-win">走到了！今天這題蓋過章。</p>` : "") +
    `<div class="life-quest-actions">` +
    `<button type="button" class="btn-text" id="btn-life-free">自由看圖</button>` +
    `<button type="button" class="btn-text" id="btn-life-next-maze">再走一題</button>` +
    `</div>`;
}

function joinHtml() {
  if (!lastStep) return "";
  const fromN = nodeById(lastStep.from);
  const toN = nodeById(lastStep.to);
  if (!fromN || !toN) return "";
  const hops = lastStep.hops || [];
  if (!hops.length) {
    return (
      `<p class="life-read-k">組合意義</p>` +
      `<p class="life-join">「${escapeHtml(fromN.name)}」和「${escapeHtml(toN.name)}」沒有連線，中間也接不起來。</p>`
    );
  }
  if (hops.length === 1) {
    return (
      `<p class="life-read-k">組合意義</p>` +
      `<p class="life-join">「${escapeHtml(fromN.name)}」和「${escapeHtml(toN.name)}」為什麼能連：${escapeHtml(hops[0].why)}</p>`
    );
  }
  const names = [fromN.name, ...hops.map((h) => nodeById(h.to)?.name || h.to)].join(" → ");
  const lines = hops
    .map((h) => {
      const a = nodeById(h.from);
      const b = nodeById(h.to);
      return `<p class="life-join-hop">「${escapeHtml(a ? a.name : h.from)}」→「${escapeHtml(b ? b.name : h.to)}」：${escapeHtml(h.why)}</p>`;
    })
    .join("");
  return (
    `<p class="life-read-k">組合意義</p>` +
    `<p class="life-join">這兩格要這樣連：${escapeHtml(names)}</p>` +
    lines
  );
}

function renderJoin() {
  const box = $("#life-join-slot");
  if (!box) return;
  const html = joinHtml();
  box.hidden = !html;
  box.innerHTML = html;
}

function renderFocus() {
  const box = $("#life-focus");
  if (!box) return;
  const n = nodeById(hereId);
  if (!n) {
    box.hidden = true;
    box.innerHTML = "";
    return;
  }
  const doors = relEntries(n)
    .map(([id, why]) => {
      const x = nodeById(id);
      if (!x) return "";
      return `<button type="button" class="life-rel-row" data-life-node="${escapeHtml(id)}"><strong>${escapeHtml(x.name)}</strong><span>${escapeHtml(why)}</span></button>`;
    })
    .join("");
  const note = placeNote(n.id, countyId);
  const missed = atGoal() && !mustDone() && !freeBrowse;
  const canWin = atGoal() && mustDone() && !freeBrowse;
  box.hidden = false;
  box.innerHTML =
    `<p class="life-focus-name">${escapeHtml(n.name)}</p>` +
    `<p class="life-lens-row">${lensTags(n)}</p>` +
    `<p class="life-focus-because">${escapeHtml(n.because || "")}</p>` +
    (note ? `<p class="life-place-note">${escapeHtml(note)}</p>` : "") +
    (missed ? `<p class="life-maze-miss">還沒接到路上的知識。先走到還沒亮的那幾格。</p>` : "") +
    (canWin
      ? `<button type="button" class="btn btn-primary btn-block" data-life-open="${escapeHtml(n.id)}">走到了，看這格</button>`
      : freeBrowse
        ? `<button type="button" class="btn btn-secondary btn-block" data-life-open="${escapeHtml(n.id)}">看觀察卡</button>`
        : "") +
    `<p class="life-read-k">${freeBrowse ? "為什麼連在一起" : "可以走的門"}</p>` +
    `<div class="life-rel-rows">${doors}</div>`;
}

function renderList() {
  const box = $("#life-list");
  const btn = $("#btn-life-list-toggle");
  if (btn) btn.hidden = !freeBrowse;
  if (!box) return;
  if (!freeBrowse) {
    box.hidden = true;
    return;
  }
  if (box.hidden) return;
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

function renderHint() {
  const hint = $("#life-hub-hint");
  if (!hint) return;
  if (!freeBrowse && maze) {
    hint.textContent = maze.hint || "只能走進有連線的格子。走錯可以退回。";
    return;
  }
  const c = countyById(countyId);
  hint.textContent = `自由看圖。現在放在${c.name}。亂點兩個點，上面會寫它們怎麼連在一起。`;
}

function renderModeBar() {
  const freeBtn = $("#btn-life-back-maze");
  if (freeBtn) freeBtn.hidden = !freeBrowse;
  const legend = $(".life-map-legend");
  if (legend) legend.hidden = !freeBrowse;
}

function paintHub() {
  renderCountySelect();
  renderQuest();
  renderModeBar();
  renderJoin();
  renderHint();
  renderMap();
  renderFocus();
  renderLinks();
  renderZones();
  renderList();
}

function walkTo(id) {
  if (!nodeById(id)) return;
  if (!freeBrowse && !canWalk(id)) return;
  if (id !== hereId) {
    lastStep = { from: hereId, to: id, hops: pathHops(hereId, id) };
    walked.push([hereId, id]);
    hereId = id;
    visited.add(id);
    if (!freeBrowse && atGoal() && mustDone()) {
      won = true;
      saveStamp();
    }
  } else {
    hereId = id;
    visited.add(id);
  }
  paintHub();
}

function openHub() {
  countyId = loadCounty();
  freeBrowse = loadFree();
  if (!maze || !mazesForCounty(countyId).some((m) => m.id === maze.id)) {
    pickMaze();
    resetWalk();
  }
  if (!nodeById(hereId)) resetWalk();
  paintHub();
  deps.showView("lifeHub");
}

function countyExtra(node) {
  if (!node.countyCard) return "";
  const c = countyById(countyId);
  const zones = zonesForCounty(countyId);
  const faces = zones.filter((z) => z.kind !== "from");
  const from = zones.filter((z) => z.kind === "from");
  const row = (z) =>
    `<button type="button" class="life-rel-row" data-life-node="${escapeHtml(z.id)}"><strong>${escapeHtml(z.name)}</strong><span>${escapeHtml(z.branch || z.because)}</span></button>`;
  return (
    `<div class="life-county-card">` +
    `<p class="life-county-name">${escapeHtml(c.name)}</p>` +
    `<p>${escapeHtml(c.pos)}。${escapeHtml(c.life)}</p>` +
    (faces.length ? `<p class="life-read-k">三種面貌</p><div class="life-rel-rows">${faces.map(row).join("")}</div>` : "") +
    (from.length ? `<p class="life-read-k">從面貌長出來</p><div class="life-rel-rows">${from.map(row).join("")}</div>` : "") +
    `</div>`
  );
}

function openNode(id) {
  const n = nodeById(id);
  if (!n) return;
  currentId = n.id;
  hereId = n.id;
  visited.add(n.id);
  const meta = ringMeta(n.ring);
  const scene = $("#life-read-scene");
  if (scene) scene.innerHTML = renderScene(n.scene);
  $("#life-read-title").textContent = n.name;
  $("#life-read-meta").innerHTML =
    escapeHtml(meta.label + (meta.hint ? ` · ${meta.hint}` : "")) +
    (lensesOf(n).length ? ` <span class="life-lens-row">${lensTags(n)}</span>` : "");
  const short = !freeBrowse && maze && n.id === maze.goal;
  const rels = relEntries(n)
    .map(([lid, why]) => {
      const x = nodeById(lid);
      return `<button type="button" class="life-rel-row" data-life-node="${escapeHtml(x.id)}"><strong>${escapeHtml(x.name)}</strong><span>${escapeHtml(why)}</span></button>`;
    })
    .join("");
  $("#life-read-body").innerHTML =
    (short ? "" : countyExtra(n)) +
    (n.because ? `<p class="life-read-k">它為什麼在這張圖上</p><p class="life-read-because">${escapeHtml(n.because)}</p>` : "") +
    (placeNote(n.id, countyId) ? `<p class="life-place-note">${escapeHtml(placeNote(n.id, countyId))}</p>` : "") +
    `<p class="life-read-k">這是什麼</p><p class="life-read-p">${escapeHtml(short ? firstSentence(n.what) : n.what)}</p>` +
    (short ? "" : `<p class="life-read-k">我在哪裡看得到</p><p class="life-read-p">${escapeHtml(n.where)}</p>`) +
    `<p class="life-read-k">去做一件小事</p><p class="life-read-do">${escapeHtml(n.do)}</p>`;
  const rel = $("#life-read-links");
  if (rel) rel.innerHTML = rels;
  const relLabel = $("#life-read-links-label");
  if (relLabel) relLabel.textContent = "為什麼連在一起";
  deps.showView("lifeRead");
}

function onNodeClick(e) {
  const nextBtn = e.target instanceof Element ? e.target.closest("#btn-life-next-maze") : null;
  if (nextBtn) {
    e.preventDefault();
    pickMaze(mazeIndex + 1);
    resetWalk();
    paintHub();
    return;
  }
  const freeBtn = e.target instanceof Element ? e.target.closest("#btn-life-free") : null;
  if (freeBtn) {
    e.preventDefault();
    setFree(true);
    paintHub();
    return;
  }
  const mazeBtn = e.target instanceof Element ? e.target.closest("#btn-life-back-maze") : null;
  if (mazeBtn) {
    e.preventDefault();
    setFree(false);
    pickMaze();
    resetWalk();
    paintHub();
    return;
  }
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
  if (!onHub) {
    if (freeBrowse || canWalk(id)) {
      hereId = id;
      visited.add(id);
      openNode(id);
    }
    return;
  }
  if (!canWalk(id)) return;
  if (freeBrowse && id === hereId && !btn.closest("#life-focus")) {
    openNode(id);
    return;
  }
  walkTo(id);
}

function toggleList() {
  const box = $("#life-list");
  const btn = $("#btn-life-list-toggle");
  if (!box || !freeBrowse) return;
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
  $("#btn-life-back-maze")?.addEventListener("click", () => {
    setFree(false);
    pickMaze();
    resetWalk();
    paintHub();
  });
  $("#life-county")?.addEventListener("change", (e) => {
    setCounty(e.target instanceof HTMLSelectElement ? e.target.value : countyId);
    pickMaze(0);
    resetWalk();
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
  freeBrowse = loadFree();
  pickMaze();
  resetWalk();
  bindEvents();
}
