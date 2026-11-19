/**
 * 英語單字／句子類似圖：試算表「圖片」欄優先；句子依「題目主體」對圖。
 */

const FILE_BY_ENGLISH = {
  pear: "pear.jpg",
  strawberry: "strawberry.jpg",
  strawberries: "strawberries.jpg",
  tomato: "tomato.jpg",
  tomatoes: "tomatoes.jpg",
  peach: "peach.jpg",
  peaches: "peaches.jpg",
  piano: "piano.jpg",
  guitar: "guitar.jpg",
  violin: "violin.jpg",
  lion: "lion.jpg",
  lions: "lions.jpg",
  tiger: "tiger.jpg",
  bear: "bear.jpg",
  monkey: "monkey.jpg",
  teacher: "teacher.jpg",
  student: "student.jpg",
  students: "students.jpg",
  magician: "magician.jpg",
  hair: "hair.jpg",
  arm: "arm.jpg",
  hand: "hand.jpg",
  leg: "leg.jpg",
  foot: "foot.jpg",
  feet: "feet.jpg",
  bikes: "bikes.jpg",
  libraries: "libraries.jpg",
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
  watching: "watching.jpg",
  "take a bath": "take-a-bath.jpg",
  "do my homework": "do-my-homework.jpg",
  doing: "doing.jpg",
  "ride a bike": "ride-a-bike.jpg",
  riding: "riding.jpg",
  "fly a kite": "fly-a-kite.jpg",
  flying: "flying.jpg",
  "take a picture": "take-a-picture.jpg",
  taking: "taking.jpg",
  using: "using.jpg",
  "make a cake": "make-a-cake.jpg",
  making: "making.jpg",
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

/** 句子：提示欄＋英文答句 → 圖（對齊題目主體，避免 big/small 水槍蓋掉獅子／猴子） */
const IMAGE_BY_QA = {
  "How's the weather?\tIt is sunny.": "sunny.jpg",
  "How's the weather?\tIt is cloudy.": "cloudy.jpg",
  "How's the weather?\tIt is windy.": "windy.jpg",
  "How's the weather?\tIt is rainy.": "rainy.jpg",
  "How's the weather?\tIt is snowy.": "snowy.jpg",
  "Is it sunny?\tYes, it is sunny.": "sunny.jpg",
  "Is it rainy?\tYes, it is rainy.": "rainy.jpg",
  "Is there a strawberry?\tYes, there is a strawberry.": "strawberry.jpg",
  "Are there two strawberries?\tYes, there are two strawberries.": "strawberry.jpg",
  "Are there many strawberries?\tYes, there are many strawberries.": "strawberry.jpg",
  "Are there many tomatoes?\tYes, there are many tomatoes.": "tomato.jpg",
  "Is there a monkey behind the tree?\tYes, there is a monkey behind the tree.": "monkey.jpg",
  "Are there two monkeys in front of the tree?\tYes, there are two monkeys in front of the tree.": "monkey.jpg",
  "Are there many monkeys near the tree?\tYes, there are many monkeys near the tree.": "monkey.jpg",
  "Is the monkey behind the box?\tNo, it is not behind the box. It is in front of the box.": "monkey.jpg",
  "Is the dog next to the box?\tYes, it is next to the box.": "next-to.jpg",
  "Is the dog on the box?\tYes, it is on the box.": "on.jpg",
  "Is the dog in the box?\tYes, it is in the box.": "in.jpg",
  "Is the dog under the box?\tYes, it is under the box.": "under.jpg",
  "Is the dog between the boxes?\tYes, it is between the boxes.": "between.jpg",
  "How much is it?\tIt is thirty dollars.": "dollars.jpg",
  "How much is the guitar?\tIt is thirty dollars.": "guitar.jpg",
  "Are you a magician?\tNo, I am not a magician. I am a student.": "magician.jpg",
  "Are you a student?\tYes, I am a student.": "student.jpg",
  "Are you magicians?\tNo, we are not magicians. We are students.": "magician.jpg",
  "Are you watching TV?\tYes, I am watching TV.": "watch-tv.jpg",
  "Are you watching TV?\tYes, we are watching TV.": "watch-tv.jpg",
  "Is Lucy watching TV?\tYes, she is watching TV.": "watch-tv.jpg",
  "Can you ride a bike?\tYes, I can ride a bike.": "ride-a-bike.jpg",
  "Can you ride a bike?\tNo, I cannot ride a bike.": "ride-a-bike.jpg",
  "What can you do?\tI can make a cake.": "make-a-cake.jpg",
  "What can Nini do?\tShe can ride a bike.": "ride-a-bike.jpg",
  "Can you make a cake?\tYes, I can make a cake.": "make-a-cake.jpg",
  "Can you fly a kite?\tYes, I can fly a kite.": "fly-a-kite.jpg",
  "Can you take a picture?\tYes, I can take a picture.": "take-a-picture.jpg",
  "Do you have a dog?\tYes, I have a dog.": "dog.jpg",
  "Does he have a dog?\tYes, he has a dog.": "dog.jpg",
  "Does she have a violin?\tYes, she has a violin.": "violin.jpg",
  "What does Abby have?\tShe has a violin.": "violin.jpg",
  "Where are you?\tI am in the bedroom.": "bedroom.jpg",
  "Where are you from?\tI am from Taiwan.": "taiwan.jpg",
  "Are you from the USA?\tYes, I am from the USA.": "the-usa.jpg",
  "Are you from England?\tYes, I am from England.": "england.jpg",
  "Are you from China?\tYes, I am from China.": "china.jpg",
  "Where are you going?\tI am going to the market.": "market.jpg",
  "Where's Nick going?\tHe is going to the library.": "library.jpg",
  "Is she going to the supermarket?\tYes, she is going to the supermarket.": "supermarket.jpg",
  "Where's Tom?\tHe is in the living room.": "living-room.jpg",
  "Is he in the bathroom?\tYes, he is in the bathroom.": "bathroom.jpg",
  "Is she in the kitchen?\tYes, she is in the kitchen.": "kitchen.jpg",
  "Are they in the dining room?\tYes, they are in the dining room.": "dining-room.jpg",
  "Is he in the office?\tYes, he is in the office.": "office.jpg",
  "Is Eric excited?\tNo, he is not excited. He is bored.": "bored.jpg",
  "Is he bored?\tYes, he is bored.": "bored.jpg",
  "Is she rich?\tYes, she is rich.": "rich.jpg",
  "Is he poor?\tYes, he is poor.": "poor.jpg",
  // 長／短：課本圖是長短對比（尺／水槍），不要配手臂／腳
  "Is it long?\tYes, it is long.": "long.jpg",
  "Is it short?\tYes, it is short.": "short.jpg",
  "Is the arm long?\tYes, it is long.": "long.jpg",
  "Is the foot short?\tYes, it is short.": "short.jpg",
  "Is it big?\tYes, it is big.": "big.jpg",
  "Is it small?\tYes, it is small.": "small.jpg",
  // 有主體時跟主體走，勿被答句 big/small 或試算表舊圖蓋掉
  "Is the lion big?\tYes, it is big.": "lion.jpg",
  "Is the monkey small?\tYes, it is small.": "monkey.jpg",
  "Is he taking a bath?\tYes, he is taking a bath.": "take-a-bath.jpg",
  "Is she doing her homework?\tYes, she is doing her homework.": "do-my-homework.jpg",
  "Is he riding a bike?\tYes, he is riding a bike.": "ride-a-bike.jpg",
  "Is she flying a kite?\tYes, she is flying a kite.": "fly-a-kite.jpg",
  "Is he taking a picture?\tYes, he is taking a picture.": "take-a-picture.jpg",
  "Is he making a cake?\tYes, he is making a cake.": "make-a-cake.jpg",
  "Is she making a cake?\tYes, she is making a cake.": "make-a-cake.jpg",
  "Can you see?\tYes, I can see.": "see.jpg",
  "Can you hear?\tYes, I can hear.": "hear.jpg",
  "Can you smell?\tYes, I can smell.": "smell.jpg",
  "Where's the teacher?\tHe is in the library.": "teacher.jpg",
  "Is there a piano?\tYes, there is a piano.": "piano.jpg",
  "Are there many bears?\tYes, there are many bears.": "bear.jpg",
  "Is there a tiger?\tYes, there is a tiger.": "tiger.jpg",
};

/** 形容詞／天氣：有主體名詞時不要優先拿這些當圖 */
const LOW_PRIORITY_KEYS = new Set([
  "long",
  "short",
  "big",
  "small",
  "bored",
  "excited",
  "poor",
  "rich",
  "sunny",
  "cloudy",
  "windy",
  "rainy",
  "snowy",
  "on",
  "in",
  "under",
  "near",
  "behind",
  "between",
  "see",
  "hear",
  "smell",
]);

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

function findVocabFileInText(text, { allowLowPriority = true } = {}) {
  const hay = normalizeForLookup(text);
  if (!hay) return null;
  for (const key of KEYS_BY_LENGTH) {
    if (!allowLowPriority && LOW_PRIORITY_KEYS.has(key)) continue;
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
function normalizeQaPart(s) {
  return String(s ?? "")
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveEnVocabImage(item) {
  if (!item) return null;

  const hint = normalizeQaPart(item.hint);
  const answer = normalizeQaPart(item.english);
  const qaKey = `${hint}\t${answer}`;
  // 句子固定對照優先於試算表舊圖片路徑（免重貼也能修正）
  if (IMAGE_BY_QA[qaKey]) {
    return siteAssetUrl(`assets/tj5-vocab/${IMAGE_BY_QA[qaKey]}`);
  }

  // 題目主體名詞優先於試算表「圖片」欄（避免獅子題仍載入 big.jpg）
  const fromHint = findVocabFileInText(hint, { allowLowPriority: false });
  if (fromHint) return siteAssetUrl(`assets/tj5-vocab/${fromHint}`);

  const fromSheet = String(item.image ?? "").trim();
  if (fromSheet) {
    if (/^https?:\/\//i.test(fromSheet) || fromSheet.startsWith("data:")) return fromSheet;
    return siteAssetUrl(fromSheet);
  }

  const exact = FILE_BY_ENGLISH[normalizeEnglishKey(item.english)];
  if (exact) return siteAssetUrl(`assets/tj5-vocab/${exact}`);

  const fromHintAny = findVocabFileInText(hint, { allowLowPriority: true });
  if (fromHintAny) return siteAssetUrl(`assets/tj5-vocab/${fromHintAny}`);
  const fromAnswer = findVocabFileInText(answer, { allowLowPriority: true });
  if (fromAnswer) return siteAssetUrl(`assets/tj5-vocab/${fromAnswer}`);
  return null;
}
