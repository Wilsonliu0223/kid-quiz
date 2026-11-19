/**
 * 英語單字類似圖：試算表「圖片」欄優先；否則依英文對應站內童趣圖。
 */

const FILE_BY_ENGLISH = {
  pear: "pear.jpg",
  strawberry: "strawberry.jpg",
  tomato: "tomato.jpg",
  peach: "peach.jpg",
  piano: "piano.jpg",
  guitar: "guitar.jpg",
  violin: "violin.jpg",
  lion: "lion.jpg",
  tiger: "tiger.jpg",
  bear: "bear.jpg",
  monkey: "monkey.jpg",
  teacher: "teacher.jpg",
  student: "student.jpg",
  magician: "magician.jpg",
  hair: "hair.jpg",
  arm: "arm.jpg",
  hand: "hand.jpg",
  leg: "leg.jpg",
  foot: "foot.jpg",
  long: "long.jpg",
  short: "short.jpg",
  big: "big.jpg",
  small: "small.jpg",
  bored: "bored.jpg",
  excited: "excited.jpg",
  poor: "poor.jpg",
  rich: "rich.jpg",
  sunny: "sunny.jpg",
  cloudy: "cloudy.jpg",
  windy: "windy.jpg",
  rainy: "rainy.jpg",
  snowy: "snowy.jpg",
  see: "see.jpg",
  hear: "hear.jpg",
  smell: "smell.jpg",
  "watch tv": "watch-tv.jpg",
  "take a bath": "take-a-bath.jpg",
  "do my homework": "do-my-homework.jpg",
  "ride a bike": "ride-a-bike.jpg",
  "fly a kite": "fly-a-kite.jpg",
  "take a picture": "take-a-picture.jpg",
  "make a cake": "make-a-cake.jpg",
  bedroom: "bedroom.jpg",
  bathroom: "bathroom.jpg",
  kitchen: "kitchen.jpg",
  "dining room": "dining-room.jpg",
  "living room": "living-room.jpg",
  "next to": "next-to.jpg",
  behind: "behind.jpg",
  "in front of": "in-front-of.jpg",
  on: "on.jpg",
  in: "in.jpg",
  under: "under.jpg",
  near: "near.jpg",
  between: "between.jpg",
  market: "market.jpg",
  office: "office.jpg",
  library: "library.jpg",
  supermarket: "supermarket.jpg",
  taiwan: "taiwan.jpg",
  "the usa": "the-usa.jpg",
  england: "england.jpg",
  china: "china.jpg",
};

function normalizeEnglishKey(english) {
  return String(english ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function siteAssetUrl(relPath) {
  const clean = String(relPath || "").replace(/^\.\//, "");
  try {
    return new URL(clean, document.baseURI || location.href).href;
  } catch {
    return clean;
  }
}

const KEYS_BY_LENGTH = Object.keys(FILE_BY_ENGLISH).sort(
  (a, b) => b.length - a.length,
);

function findVocabFileInText(...parts) {
  const hay = parts
    .map((p) => normalizeEnglishKey(p))
    .filter(Boolean)
    .join(" ");
  if (!hay) return null;
  for (const key of KEYS_BY_LENGTH) {
    if (hay === key || hay.includes(` ${key} `) || hay.startsWith(`${key} `) || hay.endsWith(` ${key}`) || hay.includes(key)) {
      // 避免短鍵誤中：單字鍵用詞界；片語已較長可直接 includes
      if (!key.includes(" ")) {
        const re = new RegExp(`(?:^|[^a-z])${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:[^a-z]|$)`);
        if (!re.test(hay)) continue;
      }
      return FILE_BY_ENGLISH[key];
    }
  }
  return null;
}

/**
 * @param {{ english?: string, hint?: string, chinese?: string, image?: string, type?: string } | null | undefined} item
 * @returns {string | null}
 */
export function resolveEnVocabImage(item) {
  if (!item) return null;
  const fromSheet = String(item.image ?? "").trim();
  if (fromSheet) {
    if (/^https?:\/\//i.test(fromSheet) || fromSheet.startsWith("data:")) return fromSheet;
    return siteAssetUrl(fromSheet);
  }
  const exact = FILE_BY_ENGLISH[normalizeEnglishKey(item.english)];
  if (exact) return siteAssetUrl(`assets/tj5-vocab/${exact}`);
  const fromText = findVocabFileInText(item.english, item.hint);
  if (!fromText) return null;
  return siteAssetUrl(`assets/tj5-vocab/${fromText}`);
}
