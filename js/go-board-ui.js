import { BLACK, WHITE, starPoints } from "./go-core.js?v=go-v1";

/**
 * @param {SVGSVGElement} svg
 * @param {(r:number,c:number)=>void} onPoint
 */
export function ensureGoBoardSvg(svg, onPoint) {
  if (!svg) return null;
  if (svg.dataset.goBound === "1" && svg.querySelector(".go-point")) {
    svg._goOnPoint = onPoint;
    return svg;
  }
  svg.innerHTML = "";
  svg.dataset.goBound = "1";
  svg._goOnPoint = onPoint;
  svg.addEventListener("click", (e) => {
    const t = e.target?.closest?.("[data-r]");
    if (!t) return;
    svg._goOnPoint?.(+t.dataset.r, +t.dataset.c);
  });
  return svg;
}

export function resetGoBoardSvg(svg) {
  if (!svg) return;
  svg.innerHTML = "";
  delete svg.dataset.goBound;
}

/**
 * @param {SVGSVGElement} svg
 * @param {import('./go-core.js').GoPosition} pos
 * @param {{ lastMove?:[number,number]|null, marks?:[number,number][], ko?:[number,number]|null }} [opts]
 */
export function renderGoBoardSvg(svg, pos, opts = {}) {
  if (!svg || !pos) return;
  const n = pos.size;
  const pad = 28;
  const box = 640;
  const span = box - pad * 2;
  const gap = n === 1 ? 0 : span / (n - 1);
  const stars = new Set(starPoints(n).map(([r, c]) => `${r},${c}`));
  const last = opts.lastMove || pos.lastMove;
  const marks = new Set((opts.marks || []).map(([r, c]) => `${r},${c}`));

  let lines = "";
  for (let i = 0; i < n; i++) {
    const x = pad + i * gap;
    const y = pad + i * gap;
    lines += `<line x1="${pad}" y1="${y}" x2="${box - pad}" y2="${y}" class="go-grid-line"/>`;
    lines += `<line x1="${x}" y1="${pad}" x2="${x}" y2="${box - pad}" class="go-grid-line"/>`;
  }
  let starDots = "";
  for (const [r, c] of starPoints(n)) {
    const x = pad + c * gap;
    const y = pad + r * gap;
    starDots += `<circle cx="${x}" cy="${y}" r="${n >= 13 ? 4.2 : 5}" class="go-star"/>`;
  }
  let stones = "";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const x = pad + c * gap;
      const y = pad + r * gap;
      const v = pos.board[r][c];
      const key = `${r},${c}`;
      if (v === BLACK || v === WHITE) {
        const cls = v === BLACK ? "go-stone-black" : "go-stone-white";
        stones += `<circle cx="${x}" cy="${y}" r="${gap * 0.46}" class="go-stone ${cls}"/>`;
        if (last && last[0] === r && last[1] === c) {
          stones += `<circle cx="${x}" cy="${y}" r="${gap * 0.16}" class="go-last"/>`;
        }
      } else if (marks.has(key)) {
        stones += `<circle cx="${x}" cy="${y}" r="${gap * 0.14}" class="go-mark"/>`;
      } else if (pos.ko && pos.ko[0] === r && pos.ko[1] === c) {
        stones += `<rect x="${x - 5}" y="${y - 5}" width="10" height="10" class="go-ko" rx="1"/>`;
      }
    }
  }
  let hits = "";
  const hitR = Math.max(gap * 0.48, 12);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const x = pad + c * gap;
      const y = pad + r * gap;
      hits += `<circle class="go-point" data-r="${r}" data-c="${c}" cx="${x}" cy="${y}" r="${hitR}"/>`;
    }
  }
  svg.setAttribute("viewBox", `0 0 ${box} ${box}`);
  svg.innerHTML = `<rect class="go-wood" x="0" y="0" width="${box}" height="${box}" rx="12"/>${lines}${starDots}${stones}${hits}`;
}
