/**
 * 英語單字類似圖：試算表「圖片」欄優先；否則依英文對應站內 SVG。
 */

const FILE_BY_ENGLISH = {
  pear: "pear.svg",
  strawberry: "strawberry.svg",
  tomato: "tomato.svg",
  peach: "peach.svg",
  piano: "piano.svg",
  guitar: "guitar.svg",
  violin: "violin.svg",
  lion: "lion.svg",
  tiger: "tiger.svg",
  bear: "bear.svg",
  monkey: "monkey.svg",
  teacher: "teacher.svg",
  student: "student.svg",
  magician: "magician.svg",
  hair: "hair.svg",
  arm: "arm.svg",
  hand: "hand.svg",
  leg: "leg.svg",
  foot: "foot.svg",
  long: "long.svg",
  short: "short.svg",
  big: "big.svg",
  small: "small.svg",
  bored: "bored.svg",
  excited: "excited.svg",
  poor: "poor.svg",
  rich: "rich.svg",
  sunny: "sunny.svg",
  cloudy: "cloudy.svg",
  windy: "windy.svg",
  rainy: "rainy.svg",
  snowy: "snowy.svg",
  see: "see.svg",
  hear: "hear.svg",
  smell: "smell.svg",
  "watch tv": "watch-tv.svg",
  "take a bath": "take-a-bath.svg",
  "do my homework": "do-my-homework.svg",
  "ride a bike": "ride-a-bike.svg",
  "fly a kite": "fly-a-kite.svg",
  "take a picture": "take-a-picture.svg",
  "make a cake": "make-a-cake.svg",
  bedroom: "bedroom.svg",
  bathroom: "bathroom.svg",
  kitchen: "kitchen.svg",
  "dining room": "dining-room.svg",
  "living room": "living-room.svg",
  "next to": "next-to.svg",
  behind: "behind.svg",
  "in front of": "in-front-of.svg",
  on: "on.svg",
  in: "in.svg",
  under: "under.svg",
  near: "near.svg",
  between: "between.svg",
  market: "market.svg",
  office: "office.svg",
  library: "library.svg",
  supermarket: "supermarket.svg",
  taiwan: "taiwan.svg",
  "the usa": "the-usa.svg",
  england: "england.svg",
  china: "china.svg",
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

/**
 * @param {{ english?: string, image?: string } | null | undefined} item
 * @returns {string | null}
 */
export function resolveEnVocabImage(item) {
  if (!item) return null;
  const fromSheet = String(item.image ?? "").trim();
  if (fromSheet) {
    if (/^https?:\/\//i.test(fromSheet) || fromSheet.startsWith("data:")) return fromSheet;
    return siteAssetUrl(fromSheet);
  }
  const file = FILE_BY_ENGLISH[normalizeEnglishKey(item.english)];
  if (!file) return null;
  return siteAssetUrl(`assets/tj5-vocab/${file}`);
}
