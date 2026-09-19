/**
 * 兒童時事英文：上傳前文法／用法查核。
 *
 *   node tools/check-en-article-grammar.mjs articles.json
 *   node tools/check-en-article-grammar.mjs --self-test
 *
 * 擋的是「孩子會學走」的錯句與教學範本彆扭句，不是一般新聞標題省略。
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const DAYS =
  "Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday";

/** @typedef {{ where: string, text: string, rule: string, hint: string }} Issue */

function splitSentences(text) {
  let s = String(text || "").trim().replace(/\s+/g, " ");
  if (!s) return [];
  const holders = [];
  const hold = (m) => {
    holders.push(m);
    return `\u0001${holders.length - 1}\u0001`;
  };
  s = s.replace(/\d+\.\d+/g, hold);
  s = s.replace(/\b[A-Z]\.(?:[A-Z]\.)+/g, hold);
  s = s.replace(
    /\b(?:[ap]\.m\.|U\.S\.A?\.|e\.g\.|i\.e\.|Mr\.|Mrs\.|Ms\.|Dr\.|Jr\.|Sr\.|vs\.|No\.|St\.|Prof\.|Inc\.|Ltd\.|etc\.)/gi,
    hold
  );
  const parts = s.match(/[^.!?]+(?:[.!?]+|(?=$))/g);
  return (parts || [s])
    .map((p) => p.replace(/\u0001(\d+)\u0001/g, (_, i) => holders[Number(i)]).trim())
    .filter(Boolean);
}

/**
 * @param {string} sentence
 * @returns {Issue[]}
 */
export function checkSentence(sentence, where = "") {
  const t = String(sentence || "").trim();
  if (!t) return [];
  /** @type {Issue[]} */
  const hits = [];
  const add = (rule, hint) => hits.push({ where, text: t, rule, hint });

  if (
    /\bdelay(?:ed|s)? the\b.+\b(?:field|stadium|park|ground|court)\b/i.test(t)
  ) {
    add(
      "delay-place",
      "delay 的受詞應是活動（practice / game），不是場地（field / stadium）。"
    );
  }

  if (/\btry with effort\b/i.test(t) || /\ba goal you try(?!\s+to\b)/i.test(t)) {
    add("try-incomplete", "try 後面要有 to + 原形，例如 try to reach。");
  }

  if (/\bmultiplayer let\b/i.test(t)) {
    add("multiplayer-sva", "multiplayer 當不可數名詞時用 lets，或改成 modes let。");
  }

  if (
    new RegExp(
      `\\b(?:festival|event|show|concert|game|class|meeting|parade)s? is (?!on )(?:${DAYS})\\b`,
      "i"
    ).test(t)
  ) {
    add("missing-on-day", "活動 + is 後面的星期幾前面加 on。");
  }

  if (new RegExp(`\\b(?:shows|games|events|concerts) are (?!on )(?:${DAYS})\\b`, "i").test(t)) {
    add("missing-on-day", "複數活動 + are 後面的星期幾前面加 on。");
  }

  if (/\bnot a sweet soda all day\b/i.test(t)) {
    add("uneven-contrast", "對比不平行：改成 not sweet soda all day。");
  }

  if (/\bjoin sports,\s*food\b/i.test(t) && !/\bmini-?games?\b/i.test(t)) {
    add("join-list", "join sports, food 讀起來像加入食物。在最後補上 mini-games。");
  }

  if (/\b(?:landed|arrived|left|came) before one(?!\s+o['’]?clock)\b/i.test(t)) {
    add("before-one", "before one 對孩子太省略，寫 before one o'clock。");
  }

  if (/\bmonths of growing\b/i.test(t)) {
    add("months-growing", "懷孕／待產不要寫 months of growing，容易讀成出生後還在長。");
  }

  if (/\bbefore they stand in the world\b/i.test(t)) {
    add("stand-in-world", "長頸鹿是出生後很快站起來；十五個月是出生前。改 before they are born。");
  }

  if (/\blog minutes with books\b/i.test(t)) {
    add("log-minutes", "改成 log their reading minutes。");
  }

  if (/\b\w+s already (?:reached|arrived|joined|entered)\b/i.test(t) && !/\bhave already\b/i.test(t)) {
    if (!/\b(?:yesterday|last)\b/i.test(t)) {
      add("already-present-perfect", "already + 完成動作用 have / has already，不要只用過去式。");
    }
  }

  if (/\b(?:should|can|must|will) drink(?!\s+\w)/i.test(t)) {
    add("drink-object", "drink 後面要有受詞，例如 drink water。");
  }

  return hits;
}

function pushField(out, where, text) {
  const raw = String(text || "").trim();
  if (!raw) return;
  for (const sent of splitSentences(raw)) {
    out.push(...checkSentence(sent, where));
  }
}

function walkDialogue(out, prefix, dialogue) {
  if (!dialogue || typeof dialogue !== "object") return;
  pushField(out, `${prefix}.scene`, dialogue.scene);
  const turns = Array.isArray(dialogue.turns) ? dialogue.turns : [];
  turns.forEach((turn, i) => {
    pushField(out, `${prefix}.turn${i + 1}.l1`, turn.l1);
    pushField(out, `${prefix}.turn${i + 1}.l2`, turn.l2);
    pushField(out, `${prefix}.turn${i + 1}.l3`, turn.l3);
  });
  const quiz = Array.isArray(dialogue.quiz) ? dialogue.quiz : [];
  quiz.forEach((q, i) => pushField(out, `${prefix}.dquiz${i + 1}`, q.q));
}

/**
 * @param {object} row
 * @param {string} label
 * @returns {Issue[]}
 */
export function checkArticleRow(row, label = "") {
  /** @type {Issue[]} */
  const out = [];
  const p = label || String(row.topic_key || row.topicKey || row.seq || "row");
  pushField(out, `${p}.title`, row.title);
  pushField(out, `${p}.body_l1`, row.body_l1 || row.bodyL1);
  pushField(out, `${p}.body_l2`, row.body_l2 || row.bodyL2);
  pushField(out, `${p}.body_l3`, row.body_l3 || row.bodyL3);
  const vocab = Array.isArray(row.vocab) ? row.vocab : [];
  vocab.forEach((v, i) => {
    pushField(out, `${p}.vocab${i + 1}.gloss`, v.gloss);
    pushField(out, `${p}.vocab${i + 1}.example`, v.example);
  });
  const quiz = Array.isArray(row.quiz) ? row.quiz : [];
  quiz.forEach((q, i) => pushField(out, `${p}.quiz${i + 1}`, q.q));
  walkDialogue(out, `${p}.dialogue`, row.dialogue);
  return out;
}

export function checkArticleFile(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const rows = raw.rows || raw;
  if (!Array.isArray(rows)) {
    throw new Error("JSON 需含 rows 陣列");
  }
  /** @type {Issue[]} */
  const issues = [];
  rows.forEach((row, i) => {
    issues.push(...checkArticleRow(row, String(row.topic_key || row.seq || i + 1)));
  });
  return { rows: rows.length, issues };
}

function selfTest() {
  const cases = [
    ["Rain delayed the Saturday practice field.", "delay-place"],
    ["A challenge is a goal you try with effort.", "try-incomplete"],
    ["Local and online multiplayer let friends play.", "multiplayer-sva"],
    ["The festival is Saturday and Sunday by the river.", "missing-on-day"],
    ["The shows are Friday evening and twice on Saturday.", "missing-on-day"],
    ["Water is a kind drink, not a sweet soda all day.", "uneven-contrast"],
    ["Players can join sports, food, and music clubs.", "join-list"],
    ["They landed before one.", "before-one"],
    ["The baby arrived after about fifteen months of growing.", "months-growing"],
    ["Giraffe calves grow for about fifteen months before they stand in the world.", "stand-in-world"],
    ["Kids log minutes with books.", "log-minutes"],
    ["Three bushels of pears already reached cafeteria trays.", "already-present-perfect"],
    ["Kids should drink.", "drink-object"],
    ["Rain delayed Saturday practice.", null],
    ["A challenge is a goal you try to reach with effort.", null],
    ["Local and online multiplayer lets friends play.", null],
    ["The festival is on Saturday and Sunday by the river.", null],
    ["They landed before one o'clock.", null],
    ["Three bushels of pears have already reached cafeteria trays.", null],
    ["Kids should drink water.", null],
  ];
  let failed = 0;
  for (const [sent, expect] of cases) {
    const rules = checkSentence(sent).map((x) => x.rule);
    const ok = expect ? rules.includes(expect) : rules.length === 0;
    if (!ok) {
      failed += 1;
      console.error("SELF-TEST FAIL", sent, "got", rules, "expect", expect);
    }
  }
  if (failed) {
    console.error(`self-test: ${failed} failed`);
    process.exit(1);
  }
  console.log("self-test: ok");
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--self-test")) {
    selfTest();
    return;
  }
  const file = argv.find((a) => !a.startsWith("-"));
  if (!file) {
    console.error(
      "用法:\n  node tools/check-en-article-grammar.mjs articles.json\n  node tools/check-en-article-grammar.mjs --self-test"
    );
    process.exit(1);
  }
  const abs = path.isAbsolute(file) ? file : path.resolve(process.cwd(), file);
  const { rows, issues } = checkArticleFile(abs);
  if (!issues.length) {
    console.log(`grammar: ok (${rows} rows)`);
    return;
  }
  console.error(`grammar: ${issues.length} issue(s) in ${rows} rows`);
  for (const hit of issues) {
    console.error(`  [${hit.rule}] ${hit.where}`);
    console.error(`    ${hit.text}`);
    console.error(`    → ${hit.hint}`);
  }
  process.exit(1);
}

const thisFile = fileURLToPath(import.meta.url);
const invoked = process.argv[1] && path.resolve(process.argv[1]) === thisFile;
if (invoked) {
  try {
    main();
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
}
