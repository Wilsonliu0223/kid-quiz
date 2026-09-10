/** 生活觀察插圖：自繪 SVG，給小朋友先看見畫面。 */

const svg = (inner, bg) =>
  `<svg class="life-scene-svg" viewBox="0 0 320 160" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="320" height="160" fill="${bg}"/>${inner}</svg>`;

const SCENES = {
  window: () =>
    svg(
      `<rect x="0" y="100" width="320" height="60" fill="#8d6e63"/><rect x="70" y="28" width="180" height="100" fill="#bbdefb" stroke="#5d4037" stroke-width="8"/><line x1="160" y1="28" x2="160" y2="128" stroke="#5d4037" stroke-width="6"/><circle cx="230" cy="48" r="16" fill="#ffd54f"/><circle cx="92" cy="70" r="10" fill="#81c784"/>`,
      "#fff3e0",
    ),
  house: () =>
    svg(
      `<rect x="0" y="110" width="320" height="50" fill="#a5d6a7"/><polygon points="70,90 160,28 250,90" fill="#e57373"/><rect x="95" y="90" width="130" height="55" fill="#ffe0b2"/><rect x="148" y="108" width="28" height="37" fill="#6d4c41"/><rect x="112" y="104" width="24" height="20" fill="#81d4fa"/><circle cx="260" cy="42" r="18" fill="#ffd54f"/>`,
      "#e3f2fd",
    ),
  school: () =>
    svg(
      `<rect x="0" y="118" width="320" height="42" fill="#81c784"/><rect x="40" y="58" width="200" height="70" fill="#90caf9"/><rect x="240" y="38" width="18" height="90" fill="#b0bec5"/><rect x="232" y="28" width="34" height="14" fill="#ef5350"/><circle cx="249" cy="22" r="8" fill="#eceff1"/><rect x="58" y="74" width="28" height="22" fill="#fff9c4"/><rect x="98" y="74" width="28" height="22" fill="#fff9c4"/>`,
      "#e8f5e9",
    ),
  suncloud: () =>
    svg(
      `<circle cx="70" cy="48" r="28" fill="#ffd54f"/><ellipse cx="190" cy="70" rx="70" ry="28" fill="#eceff1"/><ellipse cx="230" cy="82" rx="50" ry="22" fill="#cfd8dc"/><path d="M40 130 q20 20 40 0 q18 22 40 0 q16 18 36 0" fill="none" stroke="#42a5f5" stroke-width="6"/>`,
      "#e3f2fd",
    ),
  shadow: () =>
    svg(
      `<circle cx="70" cy="40" r="22" fill="#ffd54f"/><rect x="148" y="50" width="16" height="70" fill="#8d6e63"/><ellipse cx="210" cy="128" rx="70" ry="14" fill="#5d4037" opacity=".45"/>`,
      "#fff8e1",
    ),
  bowl: () =>
    svg(
      `<ellipse cx="160" cy="118" rx="80" ry="18" fill="#ffcc80"/><path d="M90 90 q70 50 140 0" fill="#ef9a9a"/><circle cx="130" cy="88" r="10" fill="#81c784"/><circle cx="170" cy="82" r="12" fill="#ffee58"/>`,
      "#fff3e0",
    ),
  tree: () =>
    svg(
      `<rect x="0" y="120" width="320" height="40" fill="#a5d6a7"/><rect x="148" y="78" width="18" height="50" fill="#6d4c41"/><circle cx="157" cy="62" r="38" fill="#43a047"/><circle cx="132" cy="72" r="22" fill="#66bb6a"/>`,
      "#e8f5e9",
    ),
  bug: () =>
    svg(
      `<ellipse cx="160" cy="92" rx="36" ry="22" fill="#7cb342"/><circle cx="198" cy="86" r="12" fill="#558b2f"/><line x1="130" y1="80" x2="110" y2="62" stroke="#33691e" stroke-width="3"/><line x1="130" y1="104" x2="112" y2="122" stroke="#33691e" stroke-width="3"/>`,
      "#f1f8e9",
    ),
  bird: () =>
    svg(
      `<path d="M70 90 q50 -40 100 0 q-40 -8 -50 10 q-20 -18 -50 -10" fill="#90a4ae"/><circle cx="168" cy="78" r="5" fill="#212121"/><path d="M200 70 q40 -30 70 -10" fill="none" stroke="#78909c" stroke-width="4"/>`,
      "#e3f2fd",
    ),
  veg: () =>
    svg(
      `<ellipse cx="160" cy="120" rx="90" ry="16" fill="#8d6e63"/><rect x="150" y="70" width="14" height="50" fill="#2e7d32"/><circle cx="157" cy="62" r="20" fill="#66bb6a"/><circle cx="138" cy="78" r="14" fill="#43a047"/>`,
      "#fff8e1",
    ),
  compass: () =>
    svg(
      `<circle cx="160" cy="80" r="48" fill="#e3f2fd" stroke="#1565c0" stroke-width="6"/><polygon points="160,42 172,80 160,76 148,80" fill="#e53935"/><text x="160" y="36" text-anchor="middle" font-size="16" fill="#1565c0" font-weight="700">北</text>`,
      "#e8eaf6",
    ),
  town: () =>
    svg(
      `<rect x="0" y="120" width="320" height="40" fill="#c8e6c9"/><rect x="40" y="70" width="50" height="50" fill="#90caf9"/><rect x="110" y="50" width="60" height="70" fill="#ffe082"/><rect x="190" y="78" width="70" height="42" fill="#ef9a9a"/>`,
      "#eceff1",
    ),
  city: () =>
    svg(
      `<rect x="0" y="120" width="320" height="40" fill="#81c784"/><rect x="24" y="48" width="40" height="72" fill="#90caf9"/><rect x="78" y="28" width="36" height="92" fill="#64b5f6"/><rect x="128" y="56" width="70" height="64" fill="#a5d6a7"/><rect x="214" y="40" width="44" height="80" fill="#ffcc80"/><rect x="268" y="70" width="36" height="50" fill="#ce93d8"/>`,
      "#e3f2fd",
    ),
  island: () =>
    svg(
      `<rect x="0" y="0" width="320" height="160" fill="#4fc3f7"/><ellipse cx="168" cy="86" rx="70" ry="36" fill="#81c784"/><polygon points="150,70 175,38 198,74" fill="#2e7d32"/><path d="M40 50 q30 10 50 0" fill="none" stroke="#fff" stroke-width="4"/>`,
      "#4fc3f7",
    ),
  water: () =>
    svg(
      `<path d="M0 90 q40 20 80 0 t80 0 t80 0 t80 0 v70 h-320z" fill="#29b6f6"/><circle cx="70" cy="50" r="10" fill="#81d4fa"/><rect x="240" y="40" width="14" height="50" fill="#6d4c41"/><circle cx="247" cy="36" r="16" fill="#43a047"/>`,
      "#e1f5fe",
    ),
  wind: () =>
    svg(
      `<path d="M40 50 q80 -20 160 10" fill="none" stroke="#90caf9" stroke-width="8"/><path d="M60 80 q90 -10 170 16" fill="none" stroke="#64b5f6" stroke-width="6"/><path d="M50 120 q40 20 80 0 t80 0 t80 0" fill="none" stroke="#42a5f5" stroke-width="5"/>`,
      "#e3f2fd",
    ),
  light: () =>
    svg(
      `<circle cx="160" cy="58" r="26" fill="#ffd54f"/><line x1="160" y1="14" x2="160" y2="0" stroke="#ffb300" stroke-width="4"/><line x1="110" y1="58" x2="90" y2="58" stroke="#ffb300" stroke-width="4"/><line x1="210" y1="58" x2="230" y2="58" stroke="#ffb300" stroke-width="4"/><rect x="0" y="118" width="320" height="42" fill="#a5d6a7"/>`,
      "#fff8e1",
    ),
  wetland: () =>
    svg(
      `<rect x="0" y="90" width="320" height="70" fill="#4db6ac"/><rect x="0" y="118" width="320" height="42" fill="#26a69a"/><path d="M20 108 h280" stroke="#ffe082" stroke-width="6"/><circle cx="260" cy="40" r="20" fill="#ff8a65"/><path d="M70 86 q10 -20 20 0" fill="#8d6e63"/>`,
      "#b3e5fc",
    ),
  mountain: () =>
    svg(
      `<polygon points="20,140 110,48 180,140" fill="#66bb6a"/><polygon points="120,140 210,30 300,140" fill="#43a047"/><polygon points="190,50 210,30 228,52" fill="#eceff1"/><rect x="0" y="138" width="320" height="22" fill="#81c784"/>`,
      "#e3f2fd",
    ),
  food: () =>
    svg(
      `<ellipse cx="120" cy="100" rx="50" ry="16" fill="#ffe0b2"/><ellipse cx="120" cy="88" rx="46" ry="14" fill="#fff8e1" stroke="#ffcc80"/><circle cx="230" cy="80" r="28" fill="#6d4c41"/><circle cx="230" cy="80" r="16" fill="#fff3e0"/><circle cx="230" cy="80" r="7" fill="#5d4037"/>`,
      "#fff3e0",
    ),
  butterfly: () =>
    svg(
      `<ellipse cx="118" cy="82" rx="34" ry="40" fill="#7e57c2"/><ellipse cx="202" cy="82" rx="34" ry="40" fill="#5e35b1"/><ellipse cx="126" cy="60" rx="18" ry="20" fill="#b39ddb"/><ellipse cx="194" cy="60" rx="18" ry="20" fill="#9575cd"/><rect x="154" y="50" width="12" height="58" rx="6" fill="#311b92"/><circle cx="160" cy="46" r="8" fill="#4527a0"/><path d="M156 42 q-18 -24 -30 -16" fill="none" stroke="#311b92" stroke-width="3"/><path d="M164 42 q18 -24 30 -16" fill="none" stroke="#311b92" stroke-width="3"/><circle cx="54" cy="124" r="7" fill="#66bb6a"/>`,
      "#f3e5f5",
    ),
  salmon: () =>
    svg(
      `<rect x="0" y="70" width="320" height="90" fill="#4fc3f7"/><ellipse cx="160" cy="100" rx="54" ry="18" fill="#ef9a9a"/><polygon points="210,100 236,86 236,114" fill="#e57373"/><circle cx="122" cy="96" r="3" fill="#212121"/><polygon points="40,70 80,40 90,70" fill="#2e7d32"/>`,
      "#e1f5fe",
    ),
};

export function renderScene(id) {
  const fn = SCENES[id] || SCENES.window;
  return `<div class="life-scene">${fn()}</div>`;
}
