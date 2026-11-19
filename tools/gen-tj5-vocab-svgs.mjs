/**
 * 產生 TJ5 Unit21 自製類似圖（扁平童趣 SVG，非課本掃描）。
 * node tools/gen-tj5-vocab-svgs.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "assets", "tj5-vocab");

function svg(inner, bg = "#fff8e8") {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160" role="img">
  <rect width="160" height="160" rx="18" fill="${bg}"/>
  ${inner}
</svg>
`;
}

const icons = {
  pear: svg(`
    <ellipse cx="80" cy="95" rx="32" ry="42" fill="#c8e06a" stroke="#6a8a20" stroke-width="3"/>
    <path d="M80 55 C78 40 88 32 96 28" fill="none" stroke="#6a4a20" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="98" cy="38" rx="12" ry="7" fill="#7cbc3a" transform="rotate(25 98 38)"/>
  `),
  strawberry: svg(`
    <path d="M80 40 C55 40 42 70 48 100 C55 130 105 130 112 100 C118 70 105 40 80 40Z" fill="#e85d4a" stroke="#b03020" stroke-width="3"/>
    <path d="M58 42 C65 28 80 24 80 24 C80 24 95 28 102 42 C90 38 70 38 58 42Z" fill="#4caf50"/>
    <circle cx="68" cy="72" r="3" fill="#fff"/><circle cx="90" cy="78" r="3" fill="#fff"/>
    <circle cx="76" cy="95" r="3" fill="#fff"/><circle cx="95" cy="100" r="3" fill="#fff"/>
    <circle cx="62" cy="100" r="3" fill="#fff"/>
  `),
  tomato: svg(`
    <circle cx="80" cy="92" r="40" fill="#e53935" stroke="#b71c1c" stroke-width="3"/>
    <path d="M62 58 C70 48 80 52 80 52 C80 52 90 48 98 58 C90 54 70 54 62 58Z" fill="#43a047"/>
    <circle cx="80" cy="55" r="5" fill="#2e7d32"/>
  `),
  peach: svg(`
    <ellipse cx="78" cy="95" rx="38" ry="40" fill="#ffb074" stroke="#e07a40" stroke-width="3"/>
    <path d="M78 55 Q90 90 78 128" fill="none" stroke="#e07a40" stroke-width="2"/>
    <path d="M78 55 C76 40 88 32 100 30" fill="none" stroke="#6a4a20" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="104" cy="40" rx="14" ry="8" fill="#66bb6a" transform="rotate(20 104 40)"/>
  `),
  piano: svg(`
    <ellipse cx="78" cy="100" rx="55" ry="28" fill="#222" stroke="#111" stroke-width="2"/>
    <rect x="55" y="55" width="50" height="40" rx="4" fill="#333"/>
    <g fill="#fff">
      <rect x="58" y="58" width="8" height="28"/><rect x="68" y="58" width="8" height="28"/>
      <rect x="78" y="58" width="8" height="28"/><rect x="88" y="58" width="8" height="28"/>
      <rect x="98" y="58" width="8" height="28"/>
    </g>
    <g fill="#111">
      <rect x="64" y="58" width="5" height="18"/><rect x="74" y="58" width="5" height="18"/>
      <rect x="84" y="58" width="5" height="18"/><rect x="94" y="58" width="5" height="18"/>
    </g>
  `),
  guitar: svg(`
    <ellipse cx="70" cy="105" rx="28" ry="32" fill="#d4a017" stroke="#8a6010" stroke-width="3"/>
    <ellipse cx="70" cy="78" rx="18" ry="16" fill="#e8b84a" stroke="#8a6010" stroke-width="2"/>
    <rect x="66" y="28" width="8" height="52" rx="2" fill="#c48a20"/>
    <rect x="58" y="24" width="24" height="10" rx="2" fill="#333"/>
    <circle cx="70" cy="82" r="7" fill="#5d4037"/>
    <line x1="70" y1="34" x2="70" y2="110" stroke="#eee" stroke-width="1"/>
  `),
  violin: svg(`
    <ellipse cx="78" cy="100" rx="22" ry="34" fill="#a0522d" stroke="#6d3410" stroke-width="3"/>
    <path d="M62 90 Q78 85 94 90" fill="none" stroke="#6d3410" stroke-width="2"/>
    <rect x="74" y="30" width="8" height="55" fill="#8b4513"/>
    <rect x="66" y="24" width="24" height="10" rx="2" fill="#333"/>
    <line x1="110" y1="40" x2="50" y2="130" stroke="#5d4037" stroke-width="4" stroke-linecap="round"/>
  `),
  lion: svg(`
    <circle cx="80" cy="88" r="36" fill="#e6a23c"/>
    <circle cx="80" cy="88" r="24" fill="#f5d08a" stroke="#c47a20" stroke-width="2"/>
    <circle cx="70" cy="84" r="4" fill="#333"/><circle cx="90" cy="84" r="4" fill="#333"/>
    <ellipse cx="80" cy="96" rx="8" ry="5" fill="#c47a20"/>
    <path d="M72 104 Q80 110 88 104" fill="none" stroke="#333" stroke-width="2"/>
  `),
  tiger: svg(`
    <ellipse cx="80" cy="95" rx="40" ry="32" fill="#f0a020" stroke="#c07010" stroke-width="2"/>
    <path d="M50 80 Q55 95 50 110 M65 70 Q70 95 65 118 M80 68 Q80 95 80 120 M95 70 Q90 95 95 118 M110 80 Q105 95 110 110" fill="none" stroke="#333" stroke-width="4" stroke-linecap="round"/>
    <circle cx="68" cy="88" r="4" fill="#222"/><circle cx="92" cy="88" r="4" fill="#222"/>
    <path d="M76 98 L80 104 L84 98" fill="#222"/>
  `),
  bear: svg(`
    <circle cx="52" cy="52" r="16" fill="#6d4c41"/><circle cx="108" cy="52" r="16" fill="#6d4c41"/>
    <circle cx="80" cy="90" r="42" fill="#8d6e63"/>
    <circle cx="80" cy="98" r="22" fill="#a1887f"/>
    <circle cx="66" cy="86" r="5" fill="#333"/><circle cx="94" cy="86" r="5" fill="#333"/>
    <ellipse cx="80" cy="100" rx="8" ry="6" fill="#5d4037"/>
  `),
  monkey: svg(`
    <circle cx="50" cy="70" r="14" fill="#a1887f"/><circle cx="110" cy="70" r="14" fill="#a1887f"/>
    <circle cx="80" cy="88" r="36" fill="#8d6e63"/>
    <ellipse cx="80" cy="98" rx="22" ry="20" fill="#d7ccc8"/>
    <circle cx="68" cy="86" r="4" fill="#333"/><circle cx="92" cy="86" r="4" fill="#333"/>
    <ellipse cx="80" cy="100" rx="6" ry="4" fill="#5d4037"/>
  `),
  teacher: svg(`
    <circle cx="80" cy="48" r="22" fill="#ffcc80"/>
    <path d="M55 48 Q80 20 105 48" fill="#ef6c00"/>
    <rect x="48" y="72" width="64" height="50" rx="8" fill="#43a047"/>
    <rect x="100" y="70" width="8" height="55" fill="#5d4037"/>
    <circle cx="72" cy="48" r="3" fill="#333"/><circle cx="90" cy="48" r="3" fill="#333"/>
    <path d="M70 58 Q80 64 90 58" fill="none" stroke="#333" stroke-width="2"/>
  `),
  student: svg(`
    <circle cx="80" cy="50" r="22" fill="#ffcc80"/>
    <path d="M55 48 Q80 22 105 48" fill="#5d4037"/>
    <rect x="50" y="74" width="60" height="48" rx="8" fill="#42a5f5"/>
    <path d="M55 78 L80 95 L105 78" fill="none" stroke="#fff" stroke-width="4"/>
    <circle cx="72" cy="50" r="3" fill="#333"/><circle cx="90" cy="50" r="3" fill="#333"/>
  `),
  magician: svg(`
    <rect x="58" y="22" width="44" height="18" fill="#222"/>
    <rect x="48" y="40" width="64" height="10" fill="#222"/>
    <circle cx="80" cy="68" r="20" fill="#ffcc80"/>
    <rect x="52" y="90" width="56" height="40" rx="6" fill="#222"/>
    <circle cx="118" cy="100" r="8" fill="#fdd835" stroke="#f9a825" stroke-width="2"/>
    <line x1="118" y1="70" x2="118" y2="100" stroke="#8d6e63" stroke-width="4"/>
  `),
  hair: svg(`
    <path d="M40 110 C40 50 120 50 120 110" fill="#5d4037"/>
    <path d="M48 70 Q55 40 70 55 Q80 35 95 55 Q110 40 115 75" fill="#3e2723"/>
  `),
  arm: svg(`
    <path d="M45 50 C55 40 70 55 75 70 L110 105 C118 113 108 122 100 114 L68 82 C60 95 40 90 38 75 C36 60 40 55 45 50Z" fill="#ffcc80" stroke="#e0a060" stroke-width="3"/>
  `),
  hand: svg(`
    <path d="M70 120 V70 C70 55 85 50 90 62 V45 C90 35 102 35 102 48 V58 C110 50 122 55 118 70 V110 C118 125 70 130 70 120Z" fill="#64b5f6" stroke="#1976d2" stroke-width="3"/>
  `),
  leg: svg(`
    <rect x="68" y="30" width="28" height="100" rx="12" fill="#ab47bc" stroke="#7b1fa2" stroke-width="3"/>
    <circle cx="82" cy="80" r="8" fill="#e91e63"/>
  `),
  foot: svg(`
    <ellipse cx="85" cy="100" rx="45" ry="22" fill="#42a5f5" stroke="#1565c0" stroke-width="3"/>
    <rect x="45" y="70" width="28" height="40" rx="10" fill="#42a5f5" stroke="#1565c0" stroke-width="3"/>
  `),
  long: svg(`
    <rect x="25" y="70" width="110" height="22" rx="8" fill="#66bb6a" stroke="#2e7d32" stroke-width="3"/>
    <polygon points="130,60 150,81 130,102" fill="#2e7d32"/>
  `),
  short: svg(`
    <rect x="55" y="70" width="50" height="22" rx="8" fill="#66bb6a" stroke="#2e7d32" stroke-width="3"/>
    <polygon points="100,60 120,81 100,102" fill="#2e7d32"/>
  `),
  big: svg(`
    <rect x="30" y="40" width="100" height="80" rx="12" fill="#66bb6a" stroke="#2e7d32" stroke-width="3"/>
    <text x="80" y="95" text-anchor="middle" font-size="36" font-family="sans-serif" fill="#fff" font-weight="700">大</text>
  `),
  small: svg(`
    <rect x="55" y="60" width="50" height="40" rx="8" fill="#a5d6a7" stroke="#2e7d32" stroke-width="3"/>
    <text x="80" y="88" text-anchor="middle" font-size="20" font-family="sans-serif" fill="#2e7d32" font-weight="700">小</text>
  `),
  bored: svg(`
    <rect x="40" y="35" width="80" height="55" rx="6" fill="#90a4ae"/>
    <rect x="48" y="42" width="64" height="40" fill="#263238"/>
    <circle cx="80" cy="115" r="18" fill="#ffcc80"/>
    <path d="M70 118 Q80 114 90 118" fill="none" stroke="#333" stroke-width="2"/>
    <circle cx="72" cy="110" r="2" fill="#333"/><circle cx="88" cy="110" r="2" fill="#333"/>
  `),
  excited: svg(`
    <rect x="40" y="30" width="80" height="55" rx="6" fill="#90a4ae"/>
    <rect x="48" y="37" width="64" height="40" fill="#1565c0"/>
    <circle cx="80" cy="115" r="18" fill="#ffcc80"/>
    <path d="M68 114 Q80 126 92 114" fill="none" stroke="#e53935" stroke-width="3"/>
    <circle cx="72" cy="108" r="3" fill="#333"/><circle cx="88" cy="108" r="3" fill="#333"/>
    <path d="M108 100 L120 70 L115 100Z" fill="#ffcc80"/>
  `),
  poor: svg(`
    <circle cx="80" cy="48" r="18" fill="#ffcc80"/>
    <path d="M55 70 L80 85 L105 70 L100 130 L60 130Z" fill="#8d6e63"/>
    <rect x="70" y="95" width="20" height="14" fill="#5d4037" opacity=".5"/>
    <ellipse cx="110" cy="115" rx="14" ry="10" fill="#a1887f"/>
  `),
  rich: svg(`
    <polygon points="80,18 95,40 65,40" fill="#ffd54f"/>
    <circle cx="80" cy="55" r="18" fill="#ffcc80"/>
    <path d="M48 78 L80 90 L112 78 L108 130 L52 130Z" fill="#5c6bc0"/>
    <circle cx="80" cy="100" r="8" fill="#ffd54f"/>
  `),
  sunny: svg(`
    <rect x="40" y="85" width="80" height="40" fill="#8d6e63"/>
    <polygon points="40,85 80,55 120,85" fill="#e57373"/>
    <circle cx="120" cy="40" r="16" fill="#ffca28"/>
    <g stroke="#ffca28" stroke-width="3" stroke-linecap="round">
      <line x1="120" y1="16" x2="120" y2="8"/><line x1="140" y1="40" x2="148" y2="40"/>
      <line x1="136" y1="24" x2="142" y2="18"/><line x1="136" y1="56" x2="142" y2="62"/>
    </g>
  `),
  cloudy: svg(`
    <rect x="40" y="95" width="80" height="35" fill="#8d6e63"/>
    <polygon points="40,95 80,65 120,95" fill="#e57373"/>
    <ellipse cx="60" cy="50" rx="22" ry="14" fill="#eceff1"/>
    <ellipse cx="85" cy="45" rx="26" ry="16" fill="#cfd8dc"/>
    <ellipse cx="110" cy="52" rx="20" ry="12" fill="#eceff1"/>
  `),
  windy: svg(`
    <rect x="40" y="95" width="80" height="35" fill="#8d6e63"/>
    <polygon points="40,95 80,65 120,95" fill="#e57373"/>
    <path d="M30 50 Q55 35 80 50 T130 50" fill="none" stroke="#90a4ae" stroke-width="5" stroke-linecap="round"/>
    <path d="M35 70 Q60 55 85 70 T135 70" fill="none" stroke="#b0bec5" stroke-width="4" stroke-linecap="round"/>
  `),
  rainy: svg(`
    <rect x="40" y="100" width="80" height="30" fill="#8d6e63"/>
    <polygon points="40,100 80,70 120,100" fill="#e57373"/>
    <ellipse cx="80" cy="48" rx="36" ry="18" fill="#78909c"/>
    <g stroke="#5c6bc0" stroke-width="3" stroke-linecap="round">
      <line x1="55" y1="70" x2="48" y2="90"/><line x1="75" y1="72" x2="68" y2="95"/>
      <line x1="95" y1="72" x2="88" y2="95"/><line x1="112" y1="70" x2="105" y2="90"/>
    </g>
  `),
  snowy: svg(`
    <rect x="40" y="100" width="80" height="30" fill="#b0bec5"/>
    <polygon points="40,100 80,70 120,100" fill="#eceff1"/>
    <circle cx="55" cy="55" r="4" fill="#fff" stroke="#90a4ae"/><circle cx="90" cy="45" r="5" fill="#fff" stroke="#90a4ae"/>
    <circle cx="115" cy="60" r="4" fill="#fff" stroke="#90a4ae"/>
    <circle cx="125" cy="115" r="10" fill="#fff" stroke="#90a4ae"/><circle cx="125" cy="100" r="7" fill="#fff" stroke="#90a4ae"/>
  `),
  see: svg(`
    <circle cx="80" cy="80" r="36" fill="#fff" stroke="#42a5f5" stroke-width="6"/>
    <circle cx="80" cy="80" r="16" fill="#1e88e5"/>
    <circle cx="86" cy="72" r="6" fill="#fff"/>
  `),
  hear: svg(`
    <path d="M70 40 C100 40 115 70 100 100 C90 118 70 120 60 110" fill="none" stroke="#ffb74d" stroke-width="14" stroke-linecap="round"/>
    <path d="M70 55 C90 55 98 75 90 95" fill="none" stroke="#fff3e0" stroke-width="6" stroke-linecap="round"/>
  `),
  smell: svg(`
    <ellipse cx="80" cy="90" rx="28" ry="36" fill="#ffcc80" stroke="#e0a060" stroke-width="3"/>
    <ellipse cx="70" cy="88" rx="6" ry="10" fill="#ef9a9a"/><ellipse cx="90" cy="88" rx="6" ry="10" fill="#ef9a9a"/>
    <path d="M55 50 Q70 30 80 50 Q90 30 105 50" fill="none" stroke="#90caf9" stroke-width="4" stroke-linecap="round"/>
  `),
  "watch-tv": svg(`
    <rect x="35" y="40" width="90" height="60" rx="6" fill="#546e7a"/>
    <rect x="42" y="47" width="76" height="46" fill="#81d4fa"/>
    <rect x="70" y="100" width="20" height="12" fill="#455a64"/>
    <rect x="55" y="112" width="50" height="8" rx="2" fill="#37474f"/>
    <circle cx="80" cy="130" r="10" fill="#ffcc80"/>
  `),
  "take-a-bath": svg(`
    <path d="M30 90 H130 V110 Q130 125 110 125 H50 Q30 125 30 110Z" fill="#4fc3f7" stroke="#0288d1" stroke-width="3"/>
    <circle cx="80" cy="70" r="16" fill="#ffcc80"/>
    <ellipse cx="80" cy="48" rx="20" ry="10" fill="#f8bbd0"/>
    <circle cx="50" cy="85" r="6" fill="#fff" opacity=".7"/><circle cx="110" cy="88" r="5" fill="#fff" opacity=".7"/>
  `),
  "do-my-homework": svg(`
    <rect x="40" y="45" width="80" height="70" rx="4" fill="#fff" stroke="#90a4ae" stroke-width="3"/>
    <line x1="52" y1="65" x2="108" y2="65" stroke="#b0bec5" stroke-width="2"/>
    <line x1="52" y1="80" x2="108" y2="80" stroke="#b0bec5" stroke-width="2"/>
    <line x1="52" y1="95" x2="90" y2="95" stroke="#b0bec5" stroke-width="2"/>
    <rect x="100" y="100" width="8" height="30" fill="#ffb74d" transform="rotate(-25 104 115)"/>
  `),
  "ride-a-bike": svg(`
    <circle cx="45" cy="110" r="22" fill="none" stroke="#333" stroke-width="5"/>
    <circle cx="115" cy="110" r="22" fill="none" stroke="#333" stroke-width="5"/>
    <path d="M45 110 L75 70 L105 110 M75 70 L95 70" fill="none" stroke="#ec407a" stroke-width="5" stroke-linecap="round"/>
    <circle cx="95" cy="55" r="12" fill="#ffcc80"/>
  `),
  "fly-a-kite": svg(`
    <polygon points="90,30 120,70 90,110 60,70" fill="#ef5350" stroke="#c62828" stroke-width="3"/>
    <line x1="90" y1="70" x2="50" y2="130" stroke="#90a4ae" stroke-width="2"/>
    <circle cx="40" cy="130" r="10" fill="#ffcc80"/>
  `),
  "take-a-picture": svg(`
    <rect x="35" y="55" width="90" height="55" rx="8" fill="#546e7a"/>
    <circle cx="80" cy="82" r="18" fill="#263238"/>
    <circle cx="80" cy="82" r="10" fill="#4fc3f7"/>
    <rect x="55" y="42" width="30" height="14" rx="3" fill="#455a64"/>
    <circle cx="110" cy="65" r="5" fill="#ffca28"/>
  `),
  "make-a-cake": svg(`
    <ellipse cx="80" cy="110" rx="45" ry="14" fill="#ffe0b2"/>
    <rect x="40" y="70" width="80" height="40" fill="#ffcc80"/>
    <ellipse cx="80" cy="70" rx="40" ry="12" fill="#f8bbd0"/>
    <circle cx="65" cy="68" r="5" fill="#e91e63"/><circle cx="90" cy="65" r="5" fill="#ab47bc"/>
    <rect x="115" y="85" width="18" height="18" rx="3" fill="#fff" stroke="#90a4ae"/>
  `),
  bedroom: svg(`
    <rect x="30" y="70" width="100" height="45" rx="4" fill="#90caf9"/>
    <rect x="35" y="55" width="40" height="20" rx="4" fill="#ef9a9a"/>
    <rect x="100" y="40" width="16" height="30" fill="#ffe082"/>
    <circle cx="108" cy="36" r="8" fill="#fff59d"/>
  `),
  bathroom: svg(`
    <rect x="30" y="85" width="55" height="30" rx="6" fill="#4fc3f7"/>
    <ellipse cx="110" cy="100" rx="18" ry="22" fill="#eceff1" stroke="#90a4ae" stroke-width="3"/>
    <rect x="95" y="45" width="30" height="18" rx="4" fill="#b3e5fc"/>
  `),
  kitchen: svg(`
    <rect x="35" y="70" width="90" height="45" fill="#90a4ae"/>
    <rect x="45" y="55" width="30" height="20" fill="#546e7a"/>
    <circle cx="60" cy="50" r="8" fill="#78909c"/>
    <rect x="90" y="78" width="25" height="20" fill="#ff7043"/>
  `),
  "dining-room": svg(`
    <ellipse cx="80" cy="95" rx="50" ry="18" fill="#a1887f"/>
    <rect x="72" y="70" width="16" height="30" fill="#8d6e63"/>
    <rect x="40" y="85" width="12" height="35" fill="#6d4c41"/>
    <rect x="108" y="85" width="12" height="35" fill="#6d4c41"/>
  `),
  "living-room": svg(`
    <rect x="30" y="85" width="100" height="35" rx="6" fill="#7e57c2"/>
    <rect x="40" y="70" width="30" height="20" rx="4" fill="#9575cd"/>
    <rect x="90" y="70" width="30" height="20" rx="4" fill="#9575cd"/>
    <rect x="70" y="100" width="40" height="12" fill="#8d6e63"/>
  `),
  "next-to": svg(`
    <rect x="30" y="55" width="45" height="55" rx="6" fill="#a1887f"/>
    <ellipse cx="110" cy="100" rx="22" ry="18" fill="#fff"/>
    <circle cx="110" cy="70" r="16" fill="#fff" stroke="#90a4ae" stroke-width="2"/>
    <circle cx="104" cy="68" r="2" fill="#333"/><circle cx="116" cy="68" r="2" fill="#333"/>
  `),
  behind: svg(`
    <ellipse cx="80" cy="115" rx="20" ry="12" fill="#fff"/>
    <rect x="50" y="45" width="60" height="70" rx="6" fill="#a1887f"/>
    <text x="80" y="90" text-anchor="middle" font-size="18" fill="#fff" font-family="sans-serif">JOY</text>
  `),
  "in-front-of": svg(`
    <rect x="50" y="40" width="60" height="55" rx="6" fill="#a1887f"/>
    <ellipse cx="80" cy="115" rx="24" ry="16" fill="#fff"/>
    <circle cx="80" cy="95" r="16" fill="#fff" stroke="#90a4ae" stroke-width="2"/>
  `),
  on: svg(`
    <rect x="45" y="85" width="70" height="40" rx="6" fill="#a1887f"/>
    <ellipse cx="80" cy="70" rx="22" ry="16" fill="#fff"/>
    <circle cx="80" cy="48" r="16" fill="#fff" stroke="#90a4ae" stroke-width="2"/>
  `),
  in: svg(`
    <rect x="40" y="50" width="80" height="70" rx="6" fill="#a1887f"/>
    <circle cx="80" cy="85" r="18" fill="#fff" stroke="#90a4ae" stroke-width="2"/>
    <circle cx="74" cy="82" r="2" fill="#333"/><circle cx="86" cy="82" r="2" fill="#333"/>
  `),
  under: svg(`
    <ellipse cx="80" cy="115" rx="28" ry="14" fill="#fff"/>
    <circle cx="55" cy="105" r="8" fill="#fff" stroke="#90a4ae"/>
    <rect x="40" y="45" width="80" height="55" rx="6" fill="#a1887f"/>
  `),
  near: svg(`
    <rect x="25" y="55" width="45" height="55" rx="6" fill="#a1887f"/>
    <circle cx="120" cy="95" r="16" fill="#fff" stroke="#90a4ae" stroke-width="2"/>
    <ellipse cx="120" cy="120" rx="20" ry="12" fill="#fff"/>
  `),
  between: svg(`
    <rect x="20" y="50" width="40" height="60" rx="6" fill="#a1887f"/>
    <rect x="100" y="50" width="40" height="60" rx="6" fill="#a1887f"/>
    <circle cx="80" cy="85" r="14" fill="#fff" stroke="#90a4ae" stroke-width="2"/>
    <ellipse cx="80" cy="115" rx="18" ry="12" fill="#fff"/>
  `),
  market: svg(`
    <rect x="25" y="70" width="50" height="45" fill="#ffe082"/>
    <path d="M25 70 L50 50 L75 70Z" fill="#ef5350"/>
    <rect x="85" y="70" width="50" height="45" fill="#c8e6c9"/>
    <path d="M85 70 L110 50 L135 70Z" fill="#66bb6a"/>
    <circle cx="45" cy="95" r="6" fill="#e53935"/><circle cx="110" cy="95" r="6" fill="#ff9800"/>
  `),
  office: svg(`
    <rect x="40" y="70" width="80" height="40" fill="#8d6e63"/>
    <rect x="55" y="40" width="50" height="35" rx="3" fill="#90a4ae"/>
    <rect x="60" y="45" width="40" height="25" fill="#81d4fa"/>
    <rect x="100" y="85" width="25" height="35" fill="#6d4c41"/>
  `),
  library: svg(`
    <rect x="30" y="40" width="20" height="85" fill="#a1887f"/>
    <rect x="55" y="40" width="20" height="85" fill="#8d6e63"/>
    <rect x="80" y="40" width="20" height="85" fill="#a1887f"/>
    <rect x="105" y="40" width="20" height="85" fill="#8d6e63"/>
    <g fill="#ef5350"><rect x="33" y="50" width="14" height="8"/><rect x="58" y="70" width="14" height="8"/><rect x="83" y="55" width="14" height="8"/></g>
  `),
  supermarket: svg(`
    <rect x="30" y="40" width="25" height="85" fill="#90a4ae"/>
    <rect x="105" y="40" width="25" height="85" fill="#90a4ae"/>
    <rect x="55" y="95" width="50" height="30" rx="4" fill="#78909c"/>
    <circle cx="65" cy="130" r="8" fill="#37474f"/><circle cx="95" cy="130" r="8" fill="#37474f"/>
    <rect x="35" y="50" width="15" height="10" fill="#ef5350"/><rect x="110" y="70" width="15" height="10" fill="#66bb6a"/>
  `),
  taiwan: svg(`
    <ellipse cx="80" cy="85" rx="28" ry="45" fill="#66bb6a" stroke="#2e7d32" stroke-width="3"/>
    <rect x="88" y="40" width="10" height="45" fill="#90a4ae"/>
    <rect x="82" y="50" width="22" height="8" fill="#42a5f5"/>
  `),
  "the-usa": svg(`
    <path d="M35 50 L125 50 L120 110 L40 110Z" fill="#5c6bc0"/>
    <rect x="70" y="55" width="12" height="50" fill="#ffe082"/>
    <path d="M76 40 L90 70 L62 70Z" fill="#ef5350"/>
  `),
  england: svg(`
    <path d="M40 55 L120 55 L115 115 L45 115Z" fill="#ff8a65"/>
    <rect x="55" y="70" width="50" height="8" fill="#5c6bc0"/>
    <rect x="55" y="70" width="8" height="35" fill="#5c6bc0"/>
    <rect x="97" y="70" width="8" height="35" fill="#5c6bc0"/>
  `),
  china: svg(`
    <path d="M40 45 L120 55 L110 120 L35 105Z" fill="#8d6e63"/>
    <path d="M50 70 Q80 50 110 80" fill="none" stroke="#ff7043" stroke-width="4"/>
    <path d="M45 95 Q75 75 105 105" fill="none" stroke="#ff7043" stroke-width="4"/>
  `),
};

fs.mkdirSync(outDir, { recursive: true });
for (const [name, content] of Object.entries(icons)) {
  fs.writeFileSync(path.join(outDir, `${name}.svg`), content, "utf8");
}
console.log(`Wrote ${Object.keys(icons).length} SVGs to ${outDir}`);
