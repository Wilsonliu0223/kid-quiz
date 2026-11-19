/**
 * 英語單字／句子類似圖：試算表「圖片」欄優先；否則依英文關鍵詞對站內圖。
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
  dog: "dog.jpg",
  dollars: "dollars.jpg",
  dollar: "dollars.jpg",
};

/** 句子答句 → 圖檔（確保 73 題都有圖） */
const IMAGE_BY_ANSWER = {
  "It is sunny.": "sunny.jpg",
  "It is cloudy.": "cloudy.jpg",
  "It is windy.": "windy.jpg",
  "It is rainy.": "rainy.jpg",
  "It is snowy.": "snowy.jpg",
  "Yes, it is sunny.": "sunny.jpg",
  "Yes, it is rainy.": "rainy.jpg",
  "Yes, there is a strawberry.": "strawberry.jpg",
  "Yes, there are two strawberries.": "strawberry.jpg",
  "Yes, there are many strawberries.": "strawberry.jpg",
  "Yes, there are many tomatoes.": "tomato.jpg",
  "Yes, there is a monkey behind the tree.": "behind.jpg",
  "Yes, there are two monkeys in front of the tree.": "in-front-of.jpg",
  "Yes, there are many monkeys near the tree.": "near.jpg",
  "No, it is not behind the box. It is in front of the box.": "in-front-of.jpg",
  "Yes, it is next to the box.": "next-to.jpg",
  "Yes, it is on the box.": "on.jpg",
  "Yes, it is in the box.": "in.jpg",
  "Yes, it is under the box.": "under.jpg",
  "Yes, it is between the boxes.": "between.jpg",
  "It is thirty dollars.": "dollars.jpg",
  "No, I am not a magician. I am a student.": "magician.jpg",
  "Yes, I am a student.": "student.jpg",
  "No, we are not magicians. We are students.": "student.jpg",
  "Yes, I am watching TV.": "watch-tv.jpg",
  "Yes, we are watching TV.": "watch-tv.jpg",
  "Yes, she is watching TV.": "watch-tv.jpg",
  "Yes, I can ride a bike.": "ride-a-bike.jpg",
  "No, I cannot ride a bike.": "ride-a-bike.jpg",
  "I can make a cake.": "make-a-cake.jpg",
  "She can ride a bike.": "ride-a-bike.jpg",
  "Yes, I can make a cake.": "make-a-cake.jpg",
  "Yes, I can fly a kite.": "fly-a-kite.jpg",
  "Yes, I can take a picture.": "take-a-picture.jpg",
  "Yes, I have a dog.": "dog.jpg",
  "Yes, he has a dog.": "dog.jpg",
  "Yes, she has a violin.": "violin.jpg",
  "She has a violin.": "violin.jpg",
  "I am in the bedroom.": "bedroom.jpg",
  "I am from Taiwan.": "taiwan.jpg",
  "Yes, I am from the USA.": "the-usa.jpg",
  "Yes, I am from England.": "england.jpg",
  "Yes, I am from China.": "china.jpg",
  "I am going to the market.": "market.jpg",
  "He is going to the library.": "library.jpg",
  "Yes, she is going to the supermarket.": "supermarket.jpg",
  "He is in the living room.": "living-room.jpg",
  "Yes, he is in the bathroom.": "bathroom.jpg",
  "Yes, she is in the kitchen.": "kitchen.jpg",
  "Yes, they are in the dining room.": "dining-room.jpg",
  "Yes, he is in the office.": "office.jpg",
  "No, he is not excited. He is bored.": "bored.jpg",
  "Yes, he is bored.": "bored.jpg",
  "Yes, she is rich.": "rich.jpg",
  "Yes, he is poor.": "poor.jpg",
  "Yes, it is long.": "long.jpg",
  "Yes, it is short.": "short.jpg",
  "Yes, it is big.": "big.jpg",
  "Yes, it is small.": "small.jpg",
  "Yes, he is taking a bath.": "take-a-bath.jpg",
  "Yes, she is doing her homework.": "do-my-homework.jpg",
  "Yes, he is riding a bike.": "ride-a-bike.jpg",
  "Yes, she is flying a kite.": "fly-a-kite.jpg",
  "Yes, he is taking a picture.": "take-a-picture.jpg",
  "Yes, she is making a cake.": "make-a-cake.jpg",
  "Yes, I can see.": "see.jpg",
  "Yes, I can hear.": "hear.jpg",
  "Yes, I can smell.": "smell.jpg",
  "He is in the library.": "library.jpg",
  "Yes, there is a piano.": "piano.jpg",
  "Yes, there are many bears.": "bear.jpg",
  "Yes, there is a tiger.": "tiger.jpg",
};

const NORM_REPLACEMENTS = [
  [/\bwatching tv\b/g, "watch tv"],
  [/\btaking a bath\b/g, "take a bath"],
  [/\briding a bike\b/g, "ride a bike"],
  [/\bflying a kite\b/g, "fly a kite"],
  [/\btaking a picture\b/g, "take a picture"],
  [/\bmaking a cake\b/g, "make a cake"],
  [/\bdoing (?:my|her|his|their|our) homework\b/g, "do my homework"],
  [/\bstrawberries\b/g, "strawberry"],
  [/\btomatoes\b/g, "tomato"],
  [/\bpeaches\b/g, "peach"],
  [/\bmonkeys\b/g, "monkey"],
  [/\bmagicians\b/g, "magician"],
  [/\bstudents\b/g, "student"],
  [/\bteachers\b/g, "teacher"],
  [/\bbears\b/g, "bear"],
  [/\blions\b/g, "lion"],
  [/\btigers\b/g, "tiger"],
  [/\bdollars\b/g, "dollars"],
  [/\bdollar\b/g, "dollars"],
];

function normalizeEnglishKey(english) {
  return String(english ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeForLookup(text) {
  let hay = normalizeEnglishKey(text);
  for (const [re, to] of NORM_REPLACEMENTS) hay = hay.replace(re, to);
  return hay;
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
    .map((p) => normalizeForLookup(p))
    .filter(Boolean)
    .join(" ");
  if (!hay) return null;
  for (const key of KEYS_BY_LENGTH) {
    if (!key.includes(" ")) {
      const re = new RegExp(
        `(?:^|[^a-z])${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:[^a-z]|$)`,
      );
      if (!re.test(hay)) continue;
      return FILE_BY_ENGLISH[key];
    }
    if (hay.includes(key)) return FILE_BY_ENGLISH[key];
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
  const answer = String(item.english ?? "").trim();
  const byAnswer = IMAGE_BY_ANSWER[answer];
  if (byAnswer) return siteAssetUrl(`assets/tj5-vocab/${byAnswer}`);

  const exact = FILE_BY_ENGLISH[normalizeEnglishKey(item.english)];
  if (exact) return siteAssetUrl(`assets/tj5-vocab/${exact}`);
  const fromText = findVocabFileInText(item.english, item.hint);
  if (!fromText) return null;
  return siteAssetUrl(`assets/tj5-vocab/${fromText}`);
}
