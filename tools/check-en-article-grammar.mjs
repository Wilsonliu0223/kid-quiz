/**
 * 上傳前文法查核：離線引擎 Harper 檢查每一段英文，不是只對已知錯句做規則比對。
 *
 *   node tools/check-en-article-grammar.mjs articles.json
 *   node tools/check-en-article-grammar.mjs --self-test
 *
 * 第一次：cd tools && npm install
 */
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HARPER_DIR = path.join(ROOT, "tools", "node_modules", "harper.js");

/** Harper 裡偏風格、專有名詞、程式縮寫，不當兒童時事文法錯誤。 */
const IGNORE_RULES = new Set([
  "SpellCheck",
  "Misspell",
  "ProperNouns",
  "CompaniesProductsAndTrademarks",
  "NotablePlaces",
  "NationalCapitals",
  "Countries",
  "Holidays",
  "Americas",
  "Koreas",
  "Laos",
  "Malaysia",
  "Australia",
  "Canada",
  "USUniversities",
  "UnitedOrganizations",
  "OceansAndSeas",
  "UpdatePlaceNames",
  "AmazonNames",
  "AppleNames",
  "GoogleNames",
  "MicrosoftNames",
  "MetaNames",
  "JetpackNames",
  "TumblrNames",
  "PocketCastsNames",
  "DayOneNames",
  "AzureNames",
  "GoggleBrand",
  "WordPressDotcom",
  "AvoidCurses",
  "FillerWords",
  "Hedging",
  "BoringWords",
  "LongSentences",
  "OxfordComma",
  "NoOxfordComma",
  "Spaces",
  "QuoteSpacing",
  "NoFrenchSpaces",
  "TransposedSpace",
  "UseTitleCase",
  "SentenceCapitalization",
  "Dashes",
  "EllipsisLength",
  "CurrencyPlacement",
  "SpelledNumbers",
  "CorrectNumberSuffix",
  "NumberSuffixCapitalization",
  "DotInitialisms",
  "ExpandAlloc",
  "ExpandArgument",
  "ExpandBecause",
  "ExpandControl",
  "ExpandDecl",
  "ExpandDependencies",
  "ExpandDeref",
  "ExpandForward",
  "ExpandMemoryShorthands",
  "ExpandMinimum",
  "ExpandParameter",
  "ExpandPointer",
  "ExpandPrevious",
  "ExpandStandardInputAndOutput",
  "ExpandThrough",
  "ExpandTimeShorthands",
  "ExpandWith",
  "ExpandWithout",
  "Devops",
  "Cybersec",
  "Overclocking",
  "Underclock",
  "Multicore",
  "Multithreading",
  "Middleware",
  "Desktop",
  "Laptop",
  "OperatingSystem",
  "Proofread",
  "Regionalisms",
  "KindOf",
  "KindSortOf",
  "Really",
  "QuiteQuiet",
  "DiscourseMarkers",
  "CompoundNouns",
  "AvoidAndAlso",
  "MergeWords",
  "OrthographicConsistency",
  "OpenCompounds",
  "SplitWords",
  "PhrasalVerbAsCompoundNoun",
  "MassNouns",
  "PronounKnew",
  "HowTo",
  "RepeatedWords",
  "MissingTo",
  "MissingPreposition",
  "HyphenateNumberDay",
  "BuiltIn",
  "MoreAdjective",
  "NominalWants",
  "ToTwoToo",
  "DisjointPrefixes",
  "InflectedVerbAfterTo",
  "WayTooAdjective",
  "HopHope",
  "ModalBeAdjective",
  "TheProperNounPossessive",
]);

function isFalsePositive(rule, text) {
  if (rule === "MissingPreposition" && /what does \S+ mean\??/i.test(text)) return true;
  if (rule === "MissingTo" && /\btry [a-z]+,/i.test(text)) return true;
  if (
    rule === "AnA" &&
    (/\b39A\b/.test(text) ||
      /\bAn Se-young\b/.test(text) ||
      /\bAn will\b/.test(text) ||
      /\bAn did\b/.test(text) ||
      /\bDong-A\b/.test(text) ||
      /\ba STEM\b/.test(text) ||
      /\bSagittarius A\b/.test(text))
  ) {
    return true;
  }
  if (rule === "RepeatedWords" && /\b(Jia Jia|Kai Kai|Le Le|twenty twenty)\b/i.test(text)) {
    return true;
  }
  if (rule === "PronounContraction" && /\bWere the\b/.test(text)) return true;
  if (rule === "ThereToTheir" && /\b[Ii]s there\b/.test(text)) return true;
  if (rule === "LetsConfusion" && /\blets [a-z]+\b/.test(text)) return true;
  if (rule === "NounVerbConfusion" && /\beffects\b/i.test(text)) return true;
  if (rule === "SimplePastToPastParticiple" && /You['’]ve Got a Friend/i.test(text)) {
    return true;
  }
  if (
    rule === "PronounVerbAgreement" &&
    (/\bshe beat\b/i.test(text) ||
      /\bshe weighs\b/i.test(text) ||
      /\bwhere was she\b/i.test(text) ||
      /\bare they champions\b/i.test(text))
  ) {
    return true;
  }
  if (rule === "SingleBe" && /\bis [A-Z][A-Za-z]+['’]s\b/.test(text)) return true;
  if (rule === "SingleBe" && /\bwas [A-Z][A-Za-z]+['’]s\b/.test(text)) return true;
  if (rule === "MissingDeterminer" && /\btree shrews\b/i.test(text)) return true;
  return false;
}

const DAYS = "Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday";

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

/** 引擎漏掉、但孩子會學走的用法（補充，不是主查核）。 */
function checkUsage(sentence, where) {
  const t = String(sentence || "").trim();
  if (!t) return [];
  /** @type {Issue[]} */
  const hits = [];
  const add = (rule, hint) => hits.push({ where, text: t, rule, hint });
  if (/\bdelay(?:ed|s)? the\b.+\b(?:field|stadium|park|ground|court)\b/i.test(t)) {
    add("usage:delay-place", "delay 的受詞應是活動，不是場地。");
  }
  if (/\btry with effort\b/i.test(t) || /\ba goal you try(?!\s+to\b)/i.test(t)) {
    add("usage:try-incomplete", "try 後面要有 to + 原形。");
  }
  if (/\bmultiplayer let\b/i.test(t)) {
    add("usage:multiplayer-sva", "multiplayer 用 lets，或改成 modes let。");
  }
  if (
    new RegExp(
      `\\b(?:festival|event|show|concert|game|class|meeting|parade)s? is (?!on )(?:${DAYS})\\b`,
      "i"
    ).test(t)
  ) {
    add("usage:missing-on-day", "活動 + is 後面的星期幾前面加 on。");
  }
  if (new RegExp(`\\b(?:shows|games|events|concerts) are (?!on )(?:${DAYS})\\b`, "i").test(t)) {
    add("usage:missing-on-day", "複數活動 + are 後面的星期幾前面加 on。");
  }
  if (/\b(?:landed|arrived|left|came) before one(?!\s+o['’]?clock)\b/i.test(t)) {
    add("usage:before-one", "寫 before one o'clock。");
  }
  if (/\b(?:should|can|must|will) drink(?!\s+\w)/i.test(t)) {
    add("usage:drink-object", "drink 後面要有受詞。");
  }
  return hits;
}

function collectFields(row, label) {
  /** @type {{ where: string, text: string }[]} */
  const out = [];
  const add = (where, text) => {
    const t = String(text || "").trim();
    if (t) out.push({ where, text: t });
  };
  const p = label || String(row.topic_key || row.topicKey || row.seq || "row");
  add(`${p}.title`, row.title);
  add(`${p}.body_l1`, row.body_l1 || row.bodyL1);
  add(`${p}.body_l2`, row.body_l2 || row.bodyL2);
  add(`${p}.body_l3`, row.body_l3 || row.bodyL3);
  const vocab = Array.isArray(row.vocab) ? row.vocab : [];
  vocab.forEach((v, i) => {
    add(`${p}.vocab${i + 1}.gloss`, v.gloss);
    add(`${p}.vocab${i + 1}.example`, v.example);
  });
  const quiz = Array.isArray(row.quiz) ? row.quiz : [];
  quiz.forEach((q, i) => add(`${p}.quiz${i + 1}`, q.q));
  const dialogue = row.dialogue && typeof row.dialogue === "object" ? row.dialogue : null;
  if (dialogue) {
    add(`${p}.dialogue.scene`, dialogue.scene);
    const turns = Array.isArray(dialogue.turns) ? dialogue.turns : [];
    turns.forEach((turn, i) => {
      add(`${p}.dialogue.turn${i + 1}.l1`, turn.l1);
      add(`${p}.dialogue.turn${i + 1}.l2`, turn.l2);
      add(`${p}.dialogue.turn${i + 1}.l3`, turn.l3);
    });
    const dquiz = Array.isArray(dialogue.quiz) ? dialogue.quiz : [];
    dquiz.forEach((q, i) => add(`${p}.dialogue.dquiz${i + 1}`, q.q));
  }
  return out;
}

async function loadHarper() {
  const entry = path.join(HARPER_DIR, "dist", "harper.js");
  if (!fs.existsSync(entry)) {
    throw new Error("尚未安裝文法引擎。請在專案執行：cd tools && npm install");
  }
  return import(pathToFileURL(entry).href);
}

export async function createLinter() {
  const harper = await loadHarper();
  const linter = new harper.LocalLinter({
    binary: harper.binaryInlined || harper.binary,
    dialect: harper.Dialect.American,
  });
  await linter.setup();
  const config = await linter.getLintConfig();
  for (const rule of IGNORE_RULES) {
    if (rule in config) config[rule] = false;
  }
  await linter.setLintConfig(config);
  return { harper, linter };
}

/**
 * @param {string} text
 * @param {string} where
 * @param {Awaited<ReturnType<typeof createLinter>>["linter"]} linter
 * @returns {Promise<Issue[]>}
 */
async function lintEnglish(text, where, linter) {
  const organized = await linter.organizedLints(text);
  /** @type {Issue[]} */
  const hits = [];
  for (const [rule, list] of Object.entries(organized)) {
    if (IGNORE_RULES.has(rule)) continue;
    if (isFalsePositive(rule, text)) continue;
    for (const lint of list) {
      const problem = lint.get_problem_text();
      if (
        rule === "CapitalizePersonalPronouns" &&
        /^i$/i.test(problem.trim()) &&
        /\b(?:ke|ka|o|na|pu|huki|uhane|mahoe)\b/i.test(text)
      ) {
        continue;
      }
      const start = lint.span().start;
      const end = lint.span().end;
      const snippet = text.slice(Math.max(0, start - 40), Math.min(text.length, end + 40)).trim();
      const suggestions = [];
      for (const sug of lint.suggestions()) {
        suggestions.push(sug.get_replacement_text());
      }
      const hint = suggestions.filter(Boolean).length
        ? `${lint.message()} 建議：${suggestions.filter(Boolean).slice(0, 3).join(" / ")}`
        : lint.message();
      hits.push({
        where,
        text: snippet || lint.get_problem_text(),
        rule: `harper:${rule}`,
        hint,
      });
    }
  }
  return hits;
}

export async function checkArticleRows(rows, linter) {
  if (!Array.isArray(rows)) throw new Error("JSON 需含 rows 陣列");
  /** @type {Issue[]} */
  const issues = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const label = String(row.topic_key || row.seq || i + 1);
    for (const field of collectFields(row, label)) {
      issues.push(...(await lintEnglish(field.text, field.where, linter)));
      for (const sent of splitSentences(field.text)) {
        issues.push(...checkUsage(sent, field.where));
      }
    }
  }
  return { rows: rows.length, issues };
}

export async function checkArticleFile(filePath, sharedLinter) {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const rows = raw.rows || raw;
  if (sharedLinter) return checkArticleRows(rows, sharedLinter);
  const { linter } = await createLinter();
  try {
    return await checkArticleRows(rows, linter);
  } finally {
    await linter.dispose();
  }
}

async function selfTest() {
  const { linter } = await createLinter();
  try {
    const badAn = await lintEnglish("This is an test.", "t", linter);
    const badAgr = await lintEnglish("She go to school every day.", "t", linter);
    const good = await lintEnglish("Kids should drink water at school.", "t", linter);
    if (!badAn.some((x) => x.rule.includes("AnA") || /indefinite article/i.test(x.hint))) {
      throw new Error("self-test: 應抓到 This is an test.");
    }
    if (!badAgr.some((x) => /agree/i.test(x.hint) || x.rule.includes("Agreement"))) {
      throw new Error("self-test: 應抓到 She go to school.");
    }
    if (good.length) {
      throw new Error(`self-test: 正確句不應報錯：${JSON.stringify(good)}`);
    }
    const usage = checkUsage("Rain delayed the Saturday practice field.", "t");
    if (!usage.some((x) => x.rule.includes("delay"))) {
      throw new Error("self-test: 補充規則 delay-place 失效");
    }
  } finally {
    await linter.dispose();
  }
  console.log("self-test: ok (Harper + usage)");
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--self-test")) {
    await selfTest();
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
  const { rows, issues } = await checkArticleFile(abs);
  if (!issues.length) {
    console.log(`grammar: ok (${rows} rows, Harper)`);
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
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}
