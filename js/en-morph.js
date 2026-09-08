/**
 * 英文字首／字根／字尾：Wiktionary 詞源拆法 + 字族表。
 * 時事給大人看，能拆就盡量拆；明顯會教錯的才略過。
 */

const MIN_LEN = 5;

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
  "interest",
  "interesting",
  "interior",
  "instrument",
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
  "ready",
  "really",
  "reason",
  "result",
  "remember",
  "religion",
  "relative",
  "remain",
  "realize",
  "reality",
  "regard",
  "region",
  "regular",
  "require",
  "related",
  "relation",
  "recently",
  "receive",
  "refer",
  "pretty",
  "present",
  "president",
  "enough",
  "enter",
  "entire",
  "engine",
  "english",
  "company",
  "common",
  "complete",
  "computer",
  "country",
  "count",
  "course",
  "court",
  "color",
  "colour",
  "coffee",
  "copy",
  "could",
  "come",
  "even",
  "ever",
  "event",
  "detail",
  "dead",
  "deal",
  "dear",
  "death",
  "idea",
  "image",
  "each",
  "early",
  "easy",
  "open",
  "over",
  "only",
  "also",
  "almost",
  "already",
  "family",
  "people",
  "school",
  "teacher",
  "children",
  "because",
  "before",
  "between",
  "without",
  "together",
]);

/** @type {{ form: string, kind: 'prefix'|'root'|'suffix', zh: string, examples: string[] }[]} */
const AFFIXES = [
  { form: "un", kind: "prefix", zh: "不、相反", examples: ["unhappy", "unfair", "unkind", "unlock", "unable", "unknown", "unusual", "unpack"] },
  { form: "re", kind: "prefix", zh: "再、重新", examples: ["replay", "rewrite", "rebuild", "return", "review", "restart", "reread", "reuse", "replace"] },
  { form: "dis", kind: "prefix", zh: "不、分開", examples: ["dislike", "disappear", "disagree", "discover", "disconnect", "dishonest"] },
  { form: "pre", kind: "prefix", zh: "在前、預先", examples: ["preview", "preheat", "prepay", "preschool", "prepare", "prevent"] },
  { form: "mis", kind: "prefix", zh: "錯、誤", examples: ["mistake", "misspell", "misplace", "mismatch", "mislead"] },
  { form: "over", kind: "prefix", zh: "過度、在上", examples: ["oversleep", "overheat", "overeat", "overcook", "overcome"] },
  { form: "under", kind: "prefix", zh: "不足、在下", examples: ["underpay", "underage", "underline", "underwater"] },
  { form: "non", kind: "prefix", zh: "非、不", examples: ["nonsense", "nonstop", "nonfiction"] },
  { form: "in", kind: "prefix", zh: "不／向內", examples: ["incomplete", "invisible", "incorrect", "independent", "inspect", "include", "inside"] },
  { form: "im", kind: "prefix", zh: "不", examples: ["impossible", "impolite", "impatient", "immature"] },
  { form: "il", kind: "prefix", zh: "不", examples: ["illegal", "illogical"] },
  { form: "ir", kind: "prefix", zh: "不", examples: ["irregular", "irresponsible"] },
  { form: "inter", kind: "prefix", zh: "之間", examples: ["internet", "international", "interview", "interrupt"] },
  { form: "intra", kind: "prefix", zh: "之內", examples: ["intranet", "intrastate"] },
  { form: "trans", kind: "prefix", zh: "穿過、轉移", examples: ["transport", "translate", "transfer", "transform"] },
  { form: "sub", kind: "prefix", zh: "下面、次", examples: ["subway", "subtract", "submarine", "subtitle"] },
  { form: "super", kind: "prefix", zh: "超、極", examples: ["supermarket", "superhero", "superstar"] },
  { form: "auto", kind: "prefix", zh: "自己、自動", examples: ["autograph", "autopilot"] },
  { form: "co", kind: "prefix", zh: "一起", examples: ["coworker", "coauthor", "cooperate"] },
  { form: "com", kind: "prefix", zh: "一起", examples: ["combine", "compose", "compute"] },
  { form: "con", kind: "prefix", zh: "一起", examples: ["connect", "construct", "contain"] },
  { form: "de", kind: "prefix", zh: "去掉、向下", examples: ["defrost", "decode", "decrease", "depart"] },
  { form: "ex", kind: "prefix", zh: "出、前", examples: ["export", "exit", "exhale", "exclude"] },
  { form: "pro", kind: "prefix", zh: "向前、贊成", examples: ["progress", "protect", "provide", "protest"] },
  { form: "tele", kind: "prefix", zh: "遠", examples: ["telephone", "television", "telescope"] },
  { form: "bi", kind: "prefix", zh: "兩個", examples: ["bicycle", "bilingual", "bimonthly"] },
  { form: "tri", kind: "prefix", zh: "三", examples: ["triangle", "tricycle", "triple"] },
  { form: "multi", kind: "prefix", zh: "多", examples: ["multiplex", "multicolor", "multimedia"] },
  { form: "mono", kind: "prefix", zh: "單一", examples: ["monotone", "monologue"] },
  { form: "mini", kind: "prefix", zh: "小", examples: ["minibus", "miniskirt"] },
  { form: "micro", kind: "prefix", zh: "微、小", examples: ["microscope", "microphone"] },
  { form: "mega", kind: "prefix", zh: "巨大", examples: ["megaphone", "megacity"] },
  { form: "hyper", kind: "prefix", zh: "過度", examples: ["hyperactive", "hyperlink"] },
  { form: "hypo", kind: "prefix", zh: "不足、在下", examples: ["hypodermic"] },
  { form: "extra", kind: "prefix", zh: "以外、額外", examples: ["extraordinary", "extraterrestrial"] },
  { form: "ultra", kind: "prefix", zh: "極、超", examples: ["ultrasound", "ultraviolet"] },
  { form: "counter", kind: "prefix", zh: "反、對", examples: ["counterattack", "counterfeit"] },
  { form: "contra", kind: "prefix", zh: "反對", examples: ["contradict", "contrary"] },
  { form: "anti", kind: "prefix", zh: "反、抗", examples: ["antivirus", "antifreeze"] },
  { form: "semi", kind: "prefix", zh: "半", examples: ["semicircle", "semifinal"] },
  { form: "mid", kind: "prefix", zh: "中間", examples: ["midnight", "midday", "midweek"] },
  { form: "post", kind: "prefix", zh: "之後", examples: ["postpone", "postwar", "postgame"] },
  { form: "out", kind: "prefix", zh: "出、超過", examples: ["outside", "outdoor", "outline", "outplay"] },
  { form: "fore", kind: "prefix", zh: "前面、預先", examples: ["forecast", "forehead", "foresee"] },
  { form: "en", kind: "prefix", zh: "使、放入", examples: ["enjoy", "enlarge", "enable", "encourage"] },
  { form: "em", kind: "prefix", zh: "使、放入", examples: ["empower", "embark"] },
  { form: "be", kind: "prefix", zh: "使成為", examples: ["become", "befriend"] },
  { form: "peri", kind: "prefix", zh: "周圍", examples: ["perimeter", "periscope"] },
  { form: "para", kind: "prefix", zh: "旁、輔助", examples: ["parallel", "paramedic"] },
  { form: "poly", kind: "prefix", zh: "多", examples: ["polygon", "polyglot"] },
  { form: "neo", kind: "prefix", zh: "新", examples: ["neonatal"] },
  { form: "omni", kind: "prefix", zh: "全部", examples: ["omnivore", "omnipresent"] },
  { form: "pan", kind: "prefix", zh: "全", examples: ["panorama", "pandemic"] },
  { form: "pseudo", kind: "prefix", zh: "假", examples: ["pseudonym"] },
  { form: "retro", kind: "prefix", zh: "向後", examples: ["retroactive", "retrospect"] },
  { form: "self", kind: "prefix", zh: "自己", examples: ["selfish", "selfless"] },
  { form: "vice", kind: "prefix", zh: "副", examples: ["vicepresident"] },
  { form: "with", kind: "prefix", zh: "一起、反對", examples: ["withdraw", "withhold"] },
  { form: "spect", kind: "root", zh: "看", examples: ["inspect", "respect", "expect", "spectator", "suspect"] },
  { form: "spec", kind: "root", zh: "看", examples: ["inspect", "respect", "spectacle"] },
  { form: "port", kind: "root", zh: "帶、運", examples: ["transport", "export", "import", "report", "portable"] },
  { form: "dict", kind: "root", zh: "說", examples: ["dictionary", "predict", "dictate", "dictator"] },
  { form: "vis", kind: "root", zh: "看", examples: ["visible", "visit", "vision", "visual", "revise"] },
  { form: "vid", kind: "root", zh: "看", examples: ["video", "evidence"] },
  { form: "scrib", kind: "root", zh: "寫", examples: ["describe", "scribble"] },
  { form: "script", kind: "root", zh: "寫", examples: ["script", "subscribe", "transcript"] },
  { form: "ject", kind: "root", zh: "投、拋", examples: ["project", "reject", "subject", "inject"] },
  { form: "struct", kind: "root", zh: "建造", examples: ["construct", "instruct", "structure", "destroy"] },
  { form: "tract", kind: "root", zh: "拉", examples: ["attract", "subtract", "tractor", "extract"] },
  { form: "form", kind: "root", zh: "形狀", examples: ["transform", "reform", "inform", "format"] },
  { form: "graph", kind: "root", zh: "寫、畫", examples: ["photograph", "paragraph", "autograph"] },
  { form: "gram", kind: "root", zh: "寫、畫", examples: ["grammar", "telegram", "diagram"] },
  { form: "phon", kind: "root", zh: "聲音", examples: ["telephone", "microphone", "headphones"] },
  { form: "bio", kind: "root", zh: "生命", examples: ["biology", "biography"] },
  { form: "geo", kind: "root", zh: "土地", examples: ["geography", "geology"] },
  { form: "cycle", kind: "root", zh: "輪、循環", examples: ["bicycle", "recycle", "motorcycle"] },
  { form: "scope", kind: "root", zh: "看", examples: ["telescope", "microscope"] },
  { form: "press", kind: "root", zh: "壓", examples: ["express", "impress", "pressure", "compress"] },
  { form: "duc", kind: "root", zh: "引導", examples: ["produce", "educate", "reduce", "conduct"] },
  { form: "duct", kind: "root", zh: "引導", examples: ["conduct", "product", "aqueduct"] },
  { form: "mit", kind: "root", zh: "送", examples: ["transmit", "permit", "admit", "submit"] },
  { form: "miss", kind: "root", zh: "送", examples: ["mission", "dismiss", "promise"] },
  { form: "log", kind: "root", zh: "說、學", examples: ["logic", "dialogue", "biology"] },
  { form: "meter", kind: "root", zh: "測量", examples: ["thermometer", "diameter", "perimeter"] },
  { form: "therm", kind: "root", zh: "熱", examples: ["thermometer", "thermal"] },
  { form: "hydr", kind: "root", zh: "水", examples: ["hydrate", "hydrant", "hydrogen"] },
  { form: "aqua", kind: "root", zh: "水", examples: ["aquarium", "aquatic"] },
  { form: "mar", kind: "root", zh: "海", examples: ["marine", "submarine", "maritime"] },
  { form: "terr", kind: "root", zh: "土地", examples: ["territory", "terrain"] },
  { form: "ped", kind: "root", zh: "腳", examples: ["pedal", "pedestrian", "centipede"] },
  { form: "pod", kind: "root", zh: "腳", examples: ["tripod", "podium"] },
  { form: "man", kind: "root", zh: "手", examples: ["manual", "manage", "manuscript"] },
  { form: "capt", kind: "root", zh: "抓、拿", examples: ["capture", "captain"] },
  { form: "ceive", kind: "root", zh: "拿", examples: ["receive", "deceive", "perceive"] },
  { form: "cred", kind: "root", zh: "相信", examples: ["credit", "incredible", "credential"] },
  { form: "fac", kind: "root", zh: "做", examples: ["factory", "facile"] },
  { form: "fect", kind: "root", zh: "做", examples: ["effect", "perfect", "affect"] },
  { form: "fer", kind: "root", zh: "帶", examples: ["transfer", "offer", "prefer"] },
  { form: "flect", kind: "root", zh: "彎", examples: ["reflect", "deflect"] },
  { form: "flex", kind: "root", zh: "彎", examples: ["flexible", "reflex"] },
  { form: "flu", kind: "root", zh: "流", examples: ["fluid", "fluent", "influence"] },
  { form: "fract", kind: "root", zh: "破", examples: ["fracture", "fraction"] },
  { form: "rupt", kind: "root", zh: "破", examples: ["interrupt", "erupt", "bankrupt"] },
  { form: "grad", kind: "root", zh: "步、級", examples: ["grade", "gradual", "graduate"] },
  { form: "gress", kind: "root", zh: "走", examples: ["progress", "congress", "aggressive"] },
  { form: "jud", kind: "root", zh: "判斷", examples: ["judge", "judicial"] },
  { form: "jur", kind: "root", zh: "法、誓", examples: ["jury", "injury"] },
  { form: "lect", kind: "root", zh: "選、讀", examples: ["select", "collect", "lecture"] },
  { form: "loc", kind: "root", zh: "地方", examples: ["local", "location", "allocate"] },
  { form: "mand", kind: "root", zh: "命令", examples: ["command", "demand", "mandate"] },
  { form: "migr", kind: "root", zh: "遷移", examples: ["migrate", "immigrant"] },
  { form: "mot", kind: "root", zh: "動", examples: ["motion", "motor", "promote"] },
  { form: "mov", kind: "root", zh: "動", examples: ["move", "remove", "movement"] },
  { form: "nym", kind: "root", zh: "名", examples: ["synonym", "anonymous"] },
  { form: "pel", kind: "root", zh: "推", examples: ["propel", "expel", "compel"] },
  { form: "pend", kind: "root", zh: "掛、花費", examples: ["depend", "pending", "suspend"] },
  { form: "phil", kind: "root", zh: "愛", examples: ["philosophy", "philanthropy"] },
  { form: "phob", kind: "root", zh: "怕", examples: ["phobia"] },
  { form: "phot", kind: "root", zh: "光", examples: ["photograph", "photosynthesis"] },
  { form: "psych", kind: "root", zh: "心", examples: ["psychology", "psychic"] },
  { form: "sci", kind: "root", zh: "知", examples: ["science", "conscious"] },
  { form: "sect", kind: "root", zh: "切", examples: ["section", "insect", "intersect"] },
  { form: "sens", kind: "root", zh: "感覺", examples: ["sense", "sensitive", "sensation"] },
  { form: "sent", kind: "root", zh: "感覺", examples: ["consent", "sentence"] },
  { form: "serv", kind: "root", zh: "服務、保持", examples: ["serve", "service", "preserve"] },
  { form: "sign", kind: "root", zh: "記號", examples: ["sign", "signal", "design"] },
  { form: "sist", kind: "root", zh: "站", examples: ["assist", "resist", "consist"] },
  { form: "spir", kind: "root", zh: "呼吸", examples: ["inspire", "spirit", "respiration"] },
  { form: "strict", kind: "root", zh: "綁緊", examples: ["strict", "restrict", "district"] },
  { form: "tain", kind: "root", zh: "拿住", examples: ["contain", "maintain", "retain"] },
  { form: "tend", kind: "root", zh: "伸", examples: ["extend", "intend", "attend"] },
  { form: "tens", kind: "root", zh: "伸", examples: ["tension", "intense"] },
  { form: "ven", kind: "root", zh: "來", examples: ["invent", "prevent", "event", "venue"] },
  { form: "vent", kind: "root", zh: "來", examples: ["invent", "prevent", "adventure"] },
  { form: "vert", kind: "root", zh: "轉", examples: ["convert", "invert", "vertical"] },
  { form: "vers", kind: "root", zh: "轉", examples: ["reverse", "universe", "conversation"] },
  { form: "voc", kind: "root", zh: "聲、叫", examples: ["vocal", "vocabulary", "advocate"] },
  { form: "vok", kind: "root", zh: "叫", examples: ["invoke", "evoke"] },
  { form: "volv", kind: "root", zh: "捲", examples: ["revolve", "evolve", "involve"] },
  { form: "morph", kind: "root", zh: "形", examples: ["morphology", "metamorphosis"] },
  { form: "mort", kind: "root", zh: "死", examples: ["mortal", "immortal"] },
  { form: "path", kind: "root", zh: "感覺、病", examples: ["sympathy", "pathology"] },
  { form: "chron", kind: "root", zh: "時間", examples: ["chronic", "synchronize"] },
  { form: "dem", kind: "root", zh: "人民", examples: ["democracy", "epidemic"] },
  { form: "crat", kind: "root", zh: "統治", examples: ["democrat", "autocrat"] },
  { form: "ation", kind: "suffix", zh: "動作、狀態", examples: ["information", "education", "creation"] },
  { form: "ition", kind: "suffix", zh: "動作、狀態", examples: ["addition", "competition"] },
  { form: "tion", kind: "suffix", zh: "動作、狀態", examples: ["action", "nation", "invention"] },
  { form: "sion", kind: "suffix", zh: "動作、狀態", examples: ["decision", "television"] },
  { form: "ment", kind: "suffix", zh: "結果、動作", examples: ["movement", "government", "agreement"] },
  { form: "ness", kind: "suffix", zh: "性質", examples: ["happiness", "kindness", "darkness"] },
  { form: "able", kind: "suffix", zh: "能被…的", examples: ["readable", "washable", "portable"] },
  { form: "ible", kind: "suffix", zh: "能被…的", examples: ["visible", "flexible", "possible"] },
  { form: "ful", kind: "suffix", zh: "充滿", examples: ["helpful", "careful", "beautiful"] },
  { form: "less", kind: "suffix", zh: "沒有", examples: ["homeless", "careless", "endless"] },
  { form: "ize", kind: "suffix", zh: "使成為", examples: ["realize", "organize"] },
  { form: "ise", kind: "suffix", zh: "使成為", examples: ["organise", "recognise"] },
  { form: "ity", kind: "suffix", zh: "性質", examples: ["activity", "possibility"] },
  { form: "ous", kind: "suffix", zh: "充滿…的", examples: ["famous", "dangerous"] },
  { form: "ive", kind: "suffix", zh: "有…性質", examples: ["active", "creative"] },
  { form: "ance", kind: "suffix", zh: "狀態", examples: ["importance", "performance"] },
  { form: "ence", kind: "suffix", zh: "狀態", examples: ["difference", "science"] },
  { form: "ship", kind: "suffix", zh: "身分、狀態", examples: ["friendship", "leadership"] },
  { form: "hood", kind: "suffix", zh: "身分、時期", examples: ["childhood", "neighborhood"] },
  { form: "ward", kind: "suffix", zh: "向", examples: ["forward", "backward"] },
  { form: "ology", kind: "suffix", zh: "學問", examples: ["biology", "geology"] },
  { form: "ical", kind: "suffix", zh: "…的", examples: ["historical", "musical", "political"] },
  { form: "ial", kind: "suffix", zh: "…的", examples: ["official", "social", "editorial"] },
  { form: "ian", kind: "suffix", zh: "人、…的", examples: ["musician", "Canadian"] },
  { form: "ary", kind: "suffix", zh: "…的、地方", examples: ["dictionary", "military", "primary"] },
  { form: "ory", kind: "suffix", zh: "…的、地方", examples: ["history", "factory", "memory"] },
  { form: "ism", kind: "suffix", zh: "主義、做法", examples: ["tourism", "criticism"] },
  { form: "ist", kind: "suffix", zh: "人", examples: ["artist", "scientist"] },
  { form: "ify", kind: "suffix", zh: "使成為", examples: ["simplify", "beautify"] },
  { form: "ure", kind: "suffix", zh: "動作、狀態", examples: ["pressure", "failure"] },
  { form: "age", kind: "suffix", zh: "狀態、集合", examples: ["package", "voltage", "passage"] },
  { form: "dom", kind: "suffix", zh: "領域、狀態", examples: ["kingdom", "freedom"] },
  { form: "ant", kind: "suffix", zh: "人、…的", examples: ["assistant", "important"] },
  { form: "ent", kind: "suffix", zh: "人、…的", examples: ["student", "different"] },
  { form: "ish", kind: "suffix", zh: "有點、…的", examples: ["childish", "selfish"] },
  { form: "ess", kind: "suffix", zh: "女性", examples: ["actress", "hostess"] },
  { form: "eer", kind: "suffix", zh: "人", examples: ["engineer", "volunteer"] },
  { form: "ee", kind: "suffix", zh: "被…的人", examples: ["employee", "trainee"] },
  { form: "or", kind: "suffix", zh: "人、物", examples: ["actor", "visitor", "inventor"] },
  { form: "er", kind: "suffix", zh: "人、比較", examples: ["teacher", "player"] },
  { form: "ly", kind: "suffix", zh: "地、…的", examples: ["quickly", "slowly", "friendly"] },
  { form: "ic", kind: "suffix", zh: "…的", examples: ["historic", "public"] },
  { form: "al", kind: "suffix", zh: "…的、屬於", examples: ["national", "personal", "natural", "musical"] },
];

const PREFIXES = AFFIXES.filter((a) => a.kind === "prefix").sort(
  (a, b) => b.form.length - a.form.length
);
const ROOTS = AFFIXES.filter((a) => a.kind === "root").sort(
  (a, b) => b.form.length - a.form.length
);
const SUFFIXES = AFFIXES.filter((a) => a.kind === "suffix").sort(
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
  if (!/^[a-z]{2,16}$/.test(s)) return "";
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
  if (!/^(prefix|pre|suffix|confix|affix|af|compound|com)$/.test(name)) return null;
  const parts = args.map(cleanPart).filter(Boolean);
  return parts.length >= 2 ? { name, parts } : null;
}

/**
 * @param {string} wikitext
 * @returns {{ prefix?: string, stem?: string, root?: string, suffix?: string, compound?: string } | null}
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
    if (hit.name === "compound" || hit.name === "com") {
      return { stem: a, compound: b };
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
      const asSuf = findAffix("suffix", c);
      if (asRoot) out.root = asRoot.form;
      else if (asSuf) out.suffix = asSuf.form;
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

function stemVariants(word) {
  const w = normWord(word);
  const out = [];
  const add = (x) => {
    if (x && /^[a-z]{4,}$/.test(x)) out.push(x);
  };
  add(w);
  if (w.endsWith("ies") && w.length >= 6) add(w.slice(0, -3) + "y");
  if (w.endsWith("es") && w.length >= 5) add(w.slice(0, -2));
  if (w.endsWith("s") && !w.endsWith("ss") && w.length >= 5) add(w.slice(0, -1));
  if (w.endsWith("ing") && w.length >= 7) {
    add(w.slice(0, -3));
    add(w.slice(0, -3) + "e");
  }
  if (w.endsWith("ed") && w.length >= 6) {
    add(w.slice(0, -2));
    add(w.slice(0, -1));
    add(w.slice(0, -2) + "e");
  }
  return [...new Set(out)];
}

/** 夠長、值得查字首／字根（不保證拆得出來） */
export function mayHaveMorph(word) {
  return stemVariants(word).some((v) => worthTrying(v));
}

function localGuess(word) {
  const w = normWord(word);
  if (!worthTrying(w)) return null;

  for (const pre of PREFIXES) {
    if (!w.startsWith(pre.form) || w === pre.form) continue;
    const rest = w.slice(pre.form.length);
    const minRest = pre.form.length <= 2 ? 4 : 3;
    if (rest.length < minRest) continue;
    const known = pre.examples.some((ex) => normWord(ex) === w);
    const restRoot = ROOTS.find((r) => {
      if (rest === r.form) return true;
      if (!rest.startsWith(r.form)) return false;
      const tail = rest.slice(r.form.length);
      return !tail || Boolean(findAffix("suffix", tail));
    });
    const shortPrefix = pre.form.length <= 2;
    if (shortPrefix && !known && !restRoot) continue;
    const suf = restRoot
      ? findAffix("suffix", rest.slice(restRoot.form.length))
      : null;
    return {
      prefix: pre.form,
      stem: restRoot ? "" : rest,
      root: restRoot ? restRoot.form : "",
      suffix: suf ? suf.form : "",
    };
  }

  for (const suf of SUFFIXES) {
    if (!w.endsWith(suf.form) || w === suf.form) continue;
    const stem = w.slice(0, -suf.form.length);
    if (stem.length < 4) continue;
    return { stem, suffix: suf.form };
  }

  for (const root of ROOTS) {
    const idx = w.indexOf(root.form);
    if (idx < 0 || w.length < root.form.length + 2) continue;
    const before = w.slice(0, idx);
    const after = w.slice(idx + root.form.length);
    const pre = before ? findAffix("prefix", before) : null;
    const suf = after ? findAffix("suffix", after) : null;
    if (before && !pre && before.length < 3) continue;
    if (after && !suf) continue;
    if (!pre && !suf && !before && !after) continue;
    if (!pre && !suf) continue;
    return {
      prefix: pre ? pre.form : before.length >= 3 ? before : "",
      stem: "",
      root: root.form,
      suffix: suf ? suf.form : "",
    };
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

function affixView(kind, form) {
  const key = String(form || "")
    .replace(/-/g, "")
    .toLowerCase();
  if (!key || key.length < 2) return null;
  const known = findAffix(kind, key);
  if (kind === "prefix") {
    return { form: key, label: `${key}-`, zh: known?.zh || "" };
  }
  if (kind === "suffix") {
    return { form: key, label: `-${key}`, zh: known?.zh || "" };
  }
  return { form: key, label: key, zh: known?.zh || "" };
}

function bitText(info) {
  if (!info) return "";
  return info.zh ? `${info.label}（${info.zh}）` : info.label;
}

function decorate(parsed, word) {
  if (!parsed) return null;
  const w = normWord(word);
  const prefix = parsed.prefix ? affixView("prefix", parsed.prefix) : null;
  const suffix = parsed.suffix ? affixView("suffix", parsed.suffix) : null;
  const stem = String(parsed.stem || "").toLowerCase();
  const compound = String(parsed.compound || "").toLowerCase();
  let root = parsed.root ? affixView("root", parsed.root) : null;
  if (!root && stem && stem !== prefix?.form && stem !== suffix?.form) {
    root = affixView("root", stem);
  }

  const bits = [];
  if (prefix) bits.push(bitText(prefix));
  if (root) bits.push(bitText(root));
  if (compound && compound !== root?.form) bits.push(compound);
  if (suffix) bits.push(bitText(suffix));
  if (bits.length < 2) return null;

  return {
    word: w,
    combo: `${bits.join(" + ")} → ${w}`,
    prefix,
    root,
    suffix: suffix || null,
    stem: stem || "",
  };
}

export function refreshMorphCombo(morph) {
  if (!morph) return morph;
  const bits = [];
  if (morph.prefix) bits.push(bitText(morph.prefix));
  if (morph.root) bits.push(bitText(morph.root));
  else if (morph.stem) bits.push(morph.stem);
  if (morph.suffix) bits.push(bitText(morph.suffix));
  if (bits.length >= 2) morph.combo = `${bits.join(" + ")} → ${morph.word}`;
  return morph;
}

/** 不打網路：字族表能立刻拆出來的才算（含 -s/-ed/-ing） */
export function peekLocalMorph(word) {
  const surface = normWord(word);
  if (NEVER_SPLIT.has(surface)) return null;
  const vars = stemVariants(surface).sort((a, b) => a.length - b.length);
  for (const v of vars) {
    if (NEVER_SPLIT.has(v)) continue;
    const hit = decorate(localGuess(v), surface);
    if (hit) return hit;
  }
  return null;
}

/** 文章裡值得查 Wiktionary 的候選 */
export function couldBeAffixWord(word) {
  const w = normWord(word);
  if (!worthTrying(w)) return false;
  if (peekLocalMorph(w)) return true;
  for (const v of stemVariants(w)) {
    for (const pre of PREFIXES) {
      if (v.startsWith(pre.form) && v.length - pre.form.length >= 3) return true;
    }
    for (const root of ROOTS) {
      if (v.includes(root.form) && v.length >= root.form.length + 2) return true;
    }
    for (const suf of SUFFIXES) {
      if (v.endsWith(suf.form) && v.length - suf.form.length >= 4) return true;
    }
  }
  return w.length >= 7;
}

export function getAffixFamily(kind, form) {
  return findAffix(kind, form) || null;
}

export function familyMembers(kind, form, extraWords = [], currentWord = "") {
  const aff = findAffix(kind, form);
  const seen = new Set();
  const out = [];
  const add = (raw) => {
    const w = normWord(raw);
    if (!w || seen.has(w) || NEVER_SPLIT.has(w)) return;
    seen.add(w);
    out.push(w);
  };
  add(currentWord);
  if (aff) {
    for (const ex of aff.examples) add(ex);
  }
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
  if (kind === "suffix") return w.endsWith(key) && w.length > key.length + 2;
  return false;
}

/**
 * @returns {Promise<{ word: string, combo: string, prefix: object|null, root: object|null, stem: string } | null>}
 */
export async function analyzeEnglishMorph(word) {
  const w = normWord(word);
  if (!mayHaveMorph(w)) return null;
  if (morphCache.has(w)) return morphCache.get(w);

  let result = null;
  const vars = stemVariants(w).sort((a, b) => a.length - b.length);
  for (const v of vars) {
    if (NEVER_SPLIT.has(v)) continue;
    const wiki = await fetchWikiEtymology(v);
    const parsed = wiki ? parseEtymology(wiki) : null;
    result = decorate(parsed, w);
    if (result) break;
  }
  if (!result) result = peekLocalMorph(w);
  morphCache.set(w, result);
  return result;
}
