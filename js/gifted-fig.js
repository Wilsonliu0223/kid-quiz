/** 自編幾何圖（圓／方／三角），非正式測驗圖案。 */

function oneShape(s, cx, cy, r, rot, fill, stroke) {
  const t = `transform="rotate(${rot} ${cx} ${cy})"`;
  if (s === "dot") {
    return `<circle cx="${cx}" cy="${cy}" r="${r * 0.42}" fill="${stroke}" />`;
  }
  if (s === "c") {
    return `<circle ${t} cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`;
  }
  if (s === "q") {
    return `<rect ${t} x="${cx - r}" y="${cy - r}" width="${2 * r}" height="${2 * r}" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`;
  }
  const p = `${cx},${cy - r} ${cx - r},${cy + r * 0.72} ${cx + r},${cy + r * 0.72}`;
  return `<polygon ${t} points="${p}" fill="${fill}" stroke="${stroke}" stroke-width="3" stroke-linejoin="round"/>`;
}

function scaleOf(size) {
  if (size === "s") return 0.26;
  if (size === "l") return 0.4;
  if (size === "xl") return 0.48;
  return 0.33;
}

/** 1～5 顆的座標，4 顆用田字、5 顆用梅花，避免擠成一排看起來一樣多。 */
function layoutPts(n, w, h) {
  if (n <= 1) return [{ x: w / 2, y: h / 2 }];
  if (n === 2) return [{ x: w * 0.32, y: h / 2 }, { x: w * 0.68, y: h / 2 }];
  if (n === 3) {
    return [
      { x: w * 0.5, y: h * 0.32 },
      { x: w * 0.3, y: h * 0.68 },
      { x: w * 0.7, y: h * 0.68 },
    ];
  }
  if (n === 4) {
    return [
      { x: w * 0.32, y: h * 0.32 },
      { x: w * 0.68, y: h * 0.32 },
      { x: w * 0.32, y: h * 0.68 },
      { x: w * 0.68, y: h * 0.68 },
    ];
  }
  return [
    { x: w * 0.5, y: h * 0.28 },
    { x: w * 0.28, y: h * 0.52 },
    { x: w * 0.72, y: h * 0.52 },
    { x: w * 0.32, y: h * 0.76 },
    { x: w * 0.68, y: h * 0.76 },
  ];
}

export function cellSvg(spec, px = 72) {
  if (!spec) return "";
  const w = px;
  const h = px;
  const n = Math.max(1, Math.min(5, spec.n || 1));
  const r0 = px * scaleOf(spec.size);
  const r = n >= 4 ? r0 * 0.52 : n === 3 ? r0 * 0.62 : r0;
  const fill = spec.fill ? "#5b3fa8" : "none";
  const stroke = "#3b2d7a";
  const rot = spec.rot || 0;
  const pts = layoutPts(n, w, h);
  let inner = "";
  for (const p of pts) {
    inner += oneShape(spec.s, p.x, p.y, r, rot, fill, stroke);
  }
  if (spec.inner) {
    const ir = r * 0.48;
    const ifill = spec.inner.fill ? "#5b3fa8" : "none";
    inner += oneShape(
      spec.inner.s,
      w / 2,
      h / 2,
      ir,
      spec.inner.rot || 0,
      ifill,
      stroke
    );
  }
  return `<svg class="gifted-fig-svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">${inner}</svg>`;
}

function wrapCell(spec) {
  const body = spec
    ? cellSvg(spec, 72)
    : `<span class="gifted-fig-miss">？</span>`;
  return `<div class="gifted-fig-cell">${body}</div>`;
}

export function visPromptHtml(vis) {
  if (!vis || vis.kind === "pick") return "";
  if (vis.kind === "row") {
    return `<div class="gifted-fig-row">${vis.cells
      .map((c) => wrapCell(c))
      .join('<span class="gifted-fig-arr" aria-hidden="true">→</span>')}</div>`;
  }
  if (vis.kind === "grid2") {
    return `<div class="gifted-fig-grid">${vis.cells.map((c) => wrapCell(c)).join("")}</div>`;
  }
  return "";
}

export function visChoiceHtml(spec, letter) {
  return `<span class="gifted-choice-letter">${letter}</span>${cellSvg(spec, 56)}`;
}
