/**
 * 英文字首／字根：Wiktionary 詞源拆法 + 國小常見字族。
 * 只處理較長、能穩拆的字；冷門或容易拆錯的不顯示。
 */

const MIN_LEN = 6;

/** 表面像字首、拆了會教錯 */
const NEVER_SPLIT = new Set([
  "uncle",
  "under",
  "until",
  "unless",
  "unique",
  "union",
  "unit",
  "united",
  "uniform",
  "university",
  "understand",
  "instead",
  "into",
  "info",
  "income",
  "another",
  "around",
  "always",
  "every",
  "other",
  "after",
  "about",
  "above",
  "along",
  "among",
  "again",
]);

/** @type {{ form: string, kind: 'prefix'|'root', zh: string, examples: string[] }[]} */
const AFFIXES = [
  { form: "un", kind: "prefix", zh: "不、相反", examples: ["unhappy", "unfair", "unkind", "unlock", "unable", "unknown", "unusual", "unpack"] },
  { form: "re", kind: "prefix", zh: "再、重新", examples: ["replay", "rewrite", "rebuild", "return", "review", "restart", "reread", "reuse"] },
  { form: "dis", kind: "prefix", zh: "不、分開", examples: ["dislike", "disappear", "disagree", "discover", "disconnect", "dishonest"] },
  { form: "pre", kind: "prefix", zh: "在前、預先", examples: ["preview", "preheat", "prepay", "preschool", "prepare", "prevent"] },
  { form: "mis", kind: "prefix", zh: "錯、誤", examples: ["mistake", "misspell", "misplace", "mismatch", "mislead"] },
  { form: "over", kind: "prefix", zh: "過度、在上", examples: ["oversleep", "overheat", "overeat", "overcook", "overcome"] },
  { form: "non", kind: "prefix", zh: "非、不", examples: ["nonsense", "nonstop", "nonfiction"] },
  { form: "in", kind: "prefix", zh: "不／向內", examples: ["incomplete", "invisible", "incorrect", "independent", "inspect", "include"] },
  { form: "im", kind: "prefix", zh: "不", examples: ["impossible", "impolite", "impatient", "immature"] },
  { form: "il", kind: "prefix", zh: "不", examples: ["illegal", "illogical"] },
  { form: "ir", kind: "prefix", zh: "不", examples: ["irregular", "irresponsible"] },
  { form: "inter", kind: "prefix", zh: "之間", examples: ["internet", "international", "interview", "interrupt"] },
  { form: "trans", kind: "prefix", zh: "穿過、轉移", examples: ["transport", "translate", "transfer", "transform"] },
  { form: "sub", kind: "prefix", zh: "下面、次", examples: ["subway", "subtract", "submarine", "subtitle"] },
  { form: "super", kind: "prefix", zh: "超、極", examples: ["supermarket", "superhero", "superstar"] },
  { form: "auto", kind: "prefix", zh: "自己、自動", examples: ["autograph", "autopilot"] },
  { form: "co", kind: "prefix", zh: "一起", examples: ["coworker", "coauthor", "cooperate"] },
  { form: "de", kind: "prefix", zh: "去掉、向下", examples: ["defrost", "decode", "decrease", "depart"] },
  { form: "ex", kind: "prefix", zh: "出、前", examples: ["export", "exit", "exhale"] },
  { form: "tele", kind: "prefix", zh: "遠", examples: ["telephone", "television", "telescope"] },
  { form: "bi", kind: "prefix", zh: "兩個", examples: ["bicycle", "bilingual", "bimonthly"] },
  { form: "tri", kind: "prefix", zh: "三", examples: ["triangle", "tricycle", "triple"] },
  { form: "multi", kind: "prefix", zh: "多", examples: ["multiplex", "multicolor", "multimedia"] },
  { form: "mid", kind: "prefix", zh: "中間", examples: ["midnight", "midday", "midweek"] },
  { form: "post", kind: "prefix", zh: "之後", examples: ["postpone", "postwar", "postgame"] },
  { form: "semi", kind: "prefix", zh: "半", examples: ["semicircle", "semifinal"] },
  { form: "anti", kind: "prefix", zh: "反、抗", examples: ["antivirus", "antifreeze"] },
  { form: "out", kind: "prefix", zh: "出、超過", examples: ["outside", "outdoor", "outline", "outplay"] },
  { form: "fore", kind: "prefix", zh: "前面、預先", examples: ["forecast", "forehead", "foresee"] },
  { form: "en", kind: "prefix", zh: "使、放入", examples: ["enjoy", "enlarge", "enable", "encourage"] },
  { form: "spect", kind: "root", zh: "看", examples: ["inspect", "respect", "expect", "spectator", "suspect"] },
  { form: "port", kind: "root", zh: "帶、運", examples: ["transport", "export", "import", "report", "portable"] },
  { form: "dict", kind: "root", zh: "說", examples: ["dictionary", "predict", "dictate", "dictator"] },
  { form: "vis", kind: "root", zh: "看", examples: ["visible", "visit", "vision", "visual", "revise"] },
  { form: "scrib", kind: "root", zh: "寫", examples: ["describe", "scribble"] },
  { form: "script", kind: "root", zh: "寫", examples: ["script", "subscribe", "transcript"] },
  { form: "ject", kind: "root", zh: "投、拋", examples: ["project", "reject", "subject", "inject"] },
  { form: "struct", kind: "root", zh: "建造", examples: ["construct", "instruct", "structure", "destroy"] },
  { form: "tract", kind: "root", zh: "拉", examples: ["attract", "subtract", "tractor", "extract"] },
  { form: "form", kind: "root", zh: "形狀", examples: ["transform", "reform", "inform", "format"] },
  { form: "graph", kind: "root", zh: "寫、畫", examples: ["photograph", "paragraph", "autograph"] },
  { form: "phon", kind: "root", zh: "聲音", examples: ["telephone", "microphone", "headphones"] },
  { form: "bio", kind: "root", zh: "生命", examples: ["biology", "biography"] },
  { form: "geo", kind: "root", zh: "土地", examples: ["geography", "geology"] },
  { form: "cycle", kind: "root", zh: "輪、循環", examples: ["bicycle", "recycle", "motorcycle"] },
  { form: "scope", kind: "root", zh: "看", examples: ["telescope", "microscope"] },
  { form: "press", kind: "root", zh: "壓", examples: ["express", "impress", "pressure", "compress"] },
  { form: "duc", kind: "root", zh: "引導", examples: ["produce", "educate", "reduce", "conduct"] },
  { form: "mit", kind: "root", zh: "送", examples: ["transmit", "permit", "admit", "submit"] },
];

const PREFIXES = AFFIXES.filter((a) => a.kind === "prefix").sort(
  (a, b) => b.form.length - a.form.length
);
const ROOTS = AFFIXES.filter((a) => a.kind === "root").sort(
  (a, b) => b.form.length - a.form.length
);

const morphCache = new Map();

function normWord(word) {
  return String(word || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function findAffix(kind, form) {
  const key = String(form || "")
    .replace(/-/g, "")
    .toLowerCase();
  if (!key) return null;
  return AFFIXES.find((a) => a.kind === kind && a.form === key) || null;
}

function cleanPart(raw) {
  let s = String(raw || "").trim();
  if (!s || s.includes("=") || s.startsWith(":")) return "";
  s = s.replace(/\[\[([^|\]]+)\|[^\]]*\]\]/g, "$1");
  s = s.replace(/\[\[([^\]]+)\]\]/g, "$1");
  s = s.replace(/^[']+|[']+$/g, "");
  s = s.replace(/-/g, "").toLowerCase();
  if (!/^[a-z]{2,14}$/.test(s)) return "";
  return s;
}

function extractTemplates(text) {
  const out = [];
  const src = String(text || "");
  let i = 0;
  while (i < src.length) {
    if (src[i] === "{" && src[i + 1] === "{") {
      let depth = 1;
      let j = i + 2;
      while (j < src.length - 1 && depth) {
        if (src[j] === "{" && src[j + 1] === "{") {
          depth += 1;
          j += 2;
          continue;
        }
        if (src[j] === "}" && src[j + 1] === "}") {
          depth -= 1;
          j += 2;
          continue;
        }
        j += 1;
      }
      out.push(src.slice(i + 2, j - 2));
      i = j;
      continue;
    }
    i += 1;
  }
  return out;
}

function englishEtymology(wikitext) {
  const all = String(wikitext || "");
  const en = all.match(/^==English==\s*\n([\s\S]*?)(?=\n==[^=]|$)/);
  const body = en ? en[1] : all;
  const ety = body.match(/===Etymology(?: \d+)?===\s*\n([\s\S]*?)(?=\n===|$)/);
  return ety ? ety[1] : "";
}

function dropLangArg(args) {
  const list = Array.isArray(args) ? [...args] : [];
  if (list[0] && /^(en|enm|ang|la|lat|grc|fr|de|it|es|pt|nl)$/i.test(list[0])) {
    list.shift();
  }
  return list;
}

function partsFromTemplate(inner) {
  const bits = String(inner || "").split("|");
  const name = String(bits[0] || "")
    .trim()
    .toLowerCase();
  const args = dropLangArg(bits.slice(1).map((a) => a.trim()));
  if (name === "ety") {
    const afAt = args.findIndex((a) => /^:af$/i.test(a));
    if (afAt < 0) return null;
    const parts = args
      .slice(afAt + 1)
      .map(cleanPart)
      .filter(Boolean);
    return parts.length >= 2 ? { name: "af", parts } : null;
  }
  if (!/^(prefix|pre|suffix|confix|affix|af)$/.test(name)) return null;
  const parts = args.map(cleanPart).filter(Boolean);
  return parts.length >= 2 ? { name, parts } : null;
}

/**
 * @param {string} wikitext
 * @returns {{ prefix?: string, stem?: string, root?: string, suffix?: string } | null}
 */
export function parseEtymology(wikitext) {
  const ety = englishEtymology(wikitext);
  if (!ety) return null;
  for (const inner of extractTemplates(ety)) {
    const hit = partsFromTemplate(inner);
    if (!hit) continue;
    const [a, b, c] = hit.parts;
    if (hit.name === "suffix") {
      return { stem: a, suffix: b };
    }
    const prefix = a;
    const second = b;
    const rootHit = findAffix("root", second);
    const out = {
      prefix,
      stem: rootHit ? "" : second,
      root: rootHit ? rootHit.form : "",
    };
    if (c) {
      const asRoot = findAffix("root", c);
      if (asRoot) out.root = asRoot.form;
      else out.suffix = c;
    }
    if (out.prefix || out.root) return out;
  }
  return null;
}

function worthTrying(word) {
  const w = normWord(word);
  if (w.length < MIN_LEN) return false;
  if (NEVER_SPLIT.has(w)) return false;
  return true;
}

/** 夠長、值得查字首／字根（不保證拆得出來） */
export function mayHaveMorph(word) {
  return worthTrying(word);
}

function localGuess(word) {
  const w = normWord(word);
  if (!worthTrying(w)) return null;
  for (const pre of PREFIXES) {
    if (!w.startsWith(pre.form) || w.length - pre.form.length < 3) continue;
    const rest = w.slice(pre.form.length);
    const known = pre.examples.some((ex) => normWord(ex) === w);
    const restRoot = ROOTS.find((r) => rest === r.form || rest.startsWith(r.form));
    if (!known && !restRoot) continue;
    return {
      prefix: pre.form,
      stem: restRoot ? "" : rest,
      root: restRoot ? restRoot.form : "",
    };
  }
  for (const root of ROOTS) {
    if (!w.includes(root.form) || w.length < root.form.length + 2) continue;
    if (root.examples.some((ex) => normWord(ex) === w)) {
      return { root: root.form };
    }
  }
  return null;
}

async function fetchWikiEtymology(word) {
  const w = normWord(word);
  if (!w) return "";
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 7000);
  try {
    const url =
      `https://en.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(w)}` +
      `&prop=wikitext&format=json&origin=*&redirects=1`;
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return "";
    const data = await res.json();
    return String(data?.parse?.wikitext?.["*"] || "");
  } catch {
    return "";
  } finally {
    clearTimeout(t);
  }
}

function decorate(parsed, word) {
  if (!parsed) return null;
  const w = normWord(word);
  const prefix = parsed.prefix ? findAffix("prefix", parsed.prefix) : null;
  const root = parsed.root ? findAffix("root", parsed.root) : null;
  const stem = String(parsed.stem || "").toLowerCase();
  if (!prefix && !root) return null;
  if (prefix && !root && stem && stem.length < 3) return null;

  const bits = [];
  if (prefix) bits.push(`${prefix.form}-（${prefix.zh}）`);
  if (root) bits.push(`${root.form}（${root.zh}）`);
  else if (stem) bits.push(stem);
  if (parsed.suffix) bits.push(`-${parsed.suffix}`);
  if (bits.length < 2) return null;

  return {
    word: w,
    combo: `${bits.join(" + ")} → ${w}`,
    prefix: prefix
      ? { form: prefix.form, label: `${prefix.form}-`, zh: prefix.zh }
      : null,
    root: root ? { form: root.form, label: root.form, zh: root.zh } : null,
    stem: stem || "",
  };
}

export function getAffixFamily(kind, form) {
  return findAffix(kind, form);
}

export function familyMembers(kind, form, extraWords = [], currentWord = "") {
  const aff = findAffix(kind, form);
  if (!aff) return [];
  const seen = new Set();
  const out = [];
  const add = (raw) => {
    const w = normWord(raw);
    if (!w || seen.has(w) || NEVER_SPLIT.has(w)) return;
    seen.add(w);
    out.push(w);
  };
  add(currentWord);
  for (const ex of aff.examples) add(ex);
  for (const extra of extraWords || []) add(extra);
  return out.slice(0, 8);
}

export function wordMatchesAffix(word, kind, form) {
  const w = normWord(word);
  const key = String(form || "")
    .replace(/-/g, "")
    .toLowerCase();
  if (!w || !key) return false;
  if (kind === "prefix") return w.startsWith(key) && w.length > key.length + 2;
  if (kind === "root") return w.includes(key);
  return false;
}

/**
 * @returns {Promise<{ word: string, combo: string, prefix: object|null, root: object|null, stem: string } | null>}
 */
export async function analyzeEnglishMorph(word) {
  const w = normWord(word);
  if (!worthTrying(w)) return null;
  if (morphCache.has(w)) return morphCache.get(w);

  const wiki = await fetchWikiEtymology(w);
  const parsed = wiki ? parseEtymology(wiki) : null;
  const result = decorate(parsed, w) || decorate(localGuess(w), w);
  morphCache.set(w, result);
  return result;
}
