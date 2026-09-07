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

export function cellSvg(spec, px = 72) {
  if (!spec) return "";
  const w = px;
  const h = px;
  const n = Math.max(1, Math.min(4, spec.n || 1));
  const r0 = px * scaleOf(spec.size);
  const r = n > 2 ? r0 * 0.72 : r0;
  const fill = spec.fill ? "#5b3fa8" : "none";
  const stroke = "#3b2d7a";
  const rot = spec.rot || 0;
  let inner = "";
  for (let i = 0; i < n; i += 1) {
    const cx = n === 1 ? w / 2 : (w * (i + 1)) / (n + 1);
    const cy = h / 2;
    inner += oneShape(spec.s, cx, cy, r, rot, fill, stroke);
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
