import { CONFIG } from "./config.site.js";
import { DEMO_ZH_ITEMS } from "./demo-data.js";
import { DEMO_EN_ITEMS } from "./demo-en.js";
import { enLessonFilterAliases, normalizeEnLesson } from "./exam-books.js";

const COL_ZH = {
  lesson: ["課次"],
  type: ["類型"],
  word: ["國字或詞", "國字", "字詞"],
  zhuyin: ["注音"],
  sentence: ["例句", "句子", "課文例句"],
};

const COL_EN = {
  lesson: ["課次"],
  type: ["類型"],
  chinese: ["中文", "中文提示", "意思"],
  hint: ["提示", "音標", "拼音", "KK"],
  english: ["英文", "英語", "答案", "單字"],
};

function cellNorm(s) {
  return String(s ?? "").trim();
}

function pickCol(labels, headerRow) {
  for (const label of labels) {
    const i = headerRow.findIndex((h) => {
      const t = cellNorm(h);
      return t === label || t.split(/\s+/)[0] === label;
    });
    if (i >= 0) return i;
  }
  return -1;
}

function parseGvizRaw(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("試算表回應格式錯誤");
  return JSON.parse(text.slice(start, end + 1));
}

function rowLooksLikeEnData(cells) {
  if (!cells || cells.length < 5) return false;
  const t = cellNorm(cells[1]);
  return (t === "單字" || t === "生字") && cellNorm(cells[2]) && cellNorm(cells[4]);
}

function rowLooksLikeZhData(cells) {
  if (!cells || cells.length < 4) return false;
  const t = cellNorm(cells[1]);
  return (t === "生字" || t === "單字") && cellNorm(cells[2]) && cellNorm(cells[3]);
}

function getHeaderAndRows(table) {
  const rows = table.rows || [];
  if (!rows.length) return { headerRow: [], dataRows: [] };

  const first = rowCells(rows[0]);
  if (cellNorm(first[0]) === "課次" && cellNorm(first[1]) === "類型") {
    return { headerRow: first, dataRows: rows.slice(1) };
  }

  if (rowLooksLikeEnData(first) || rowLooksLikeZhData(first)) {
    return {
      headerRow: ["課次", "類型", "中文", "提示", "英文"],
      dataRows: rows,
    };
  }

  const headerCells = table.cols?.map((c) => String(c.label ?? "")) ?? [];
  const headerIsBroken = headerCells.some((h) => cellNorm(h).split(/\s+/).length > 3);
  if (headerIsBroken && rows.some((r) => rowLooksLikeEnData(rowCells(r)))) {
    return {
      headerRow: ["課次", "類型", "中文", "提示", "英文"],
      dataRows: rows.filter((r) => {
        const cells = rowCells(r);
        const t = cellNorm(cells[1]);
        const english = cellNorm(cells[4]);
        return english && (t === "單字" || t === "生字" || t === "");
      }),
    };
  }

  const headerRow =
    headerCells.length > 0 && headerCells.some(Boolean) ? headerCells : first;
  const dataRows =
    cellNorm(first[0]) === "課次" ? rows.slice(1) : rows;
  return { headerRow, dataRows };
}

function resolveZhColIdx(headerRow, dataRows) {
  const idx = {
    lesson: pickCol(COL_ZH.lesson, headerRow),
    type: pickCol(COL_ZH.type, headerRow),
    word: pickCol(COL_ZH.word, headerRow),
    zhuyin: pickCol(COL_ZH.zhuyin, headerRow),
    sentence: pickCol(COL_ZH.sentence, headerRow),
  };
  if (idx.word >= 0 && idx.zhuyin >= 0) return idx;

  const sample = dataRows[0] ? rowCells(dataRows[0]) : [];
  if (rowLooksLikeZhData(sample) || (cellNorm(sample[1]) === "生字" && sample.length >= 4)) {
    return {
      lesson: 0,
      type: 1,
      word: 2,
      zhuyin: 3,
      sentence: sample.length > 4 ? 4 : -1,
    };
  }
  return idx;
}

function lessonFromHeaderLabel(label) {
  const parts = cellNorm(label).split(/\s+/).filter(Boolean);
  const i = parts[0] === "課次" ? 1 : 0;
  const book = parts[i];
  const unit = parts[i + 1];
  if (book && unit) return normalizeEnLesson(`${book} ${unit}`);
  return normalizeEnLesson(book || "TJ3 Unit21考試");
}

/** 第 1 列標題貼到同一格時，從欄位標題救回前面幾個單字 */
function recoverEnItemsFromBrokenColLabels(table) {
  const cols = table.cols || [];
  if (cols.length < 5) return [];

  const labels = cols.map((c) => cellNorm(c.label));
  const broken = labels.some((h) => h.split(/\s+/).length > 3);
  if (!broken) return [];

  const splitField = (text, skipFirst) => {
    const parts = cellNorm(text).split(/\s+/).filter(Boolean);
    return skipFirst && parts[0]?.length <= 4 ? parts.slice(1) : parts;
  };

  const chinese = splitField(labels[2], true);
  const english = splitField(labels[4], true);
  const hintsRaw = splitField(labels[3], labels[3]?.startsWith("提示"));
  const lesson = lessonFromHeaderLabel(labels[0]);

  const n = Math.min(chinese.length, english.length);
  const items = [];
  for (let i = 0; i < n; i++) {
    if (!chinese[i] || !english[i]) continue;
    items.push({
      lesson: normalizeEnLesson(lesson),
      type: "單字",
      chinese: chinese[i],
      hint: hintsRaw[i] || english[i],
      english: english[i],
    });
  }
  return items;
}

function resolveEnColIdx(headerRow, dataRows) {
  const idx = {
    lesson: pickCol(COL_EN.lesson, headerRow),
    type: pickCol(COL_EN.type, headerRow),
    chinese: pickCol(COL_EN.chinese, headerRow),
    hint: pickCol(COL_EN.hint, headerRow),
    english: pickCol(COL_EN.english, headerRow),
  };
  if (idx.chinese >= 0 && idx.english >= 0) return idx;

  const sample = dataRows[0] ? rowCells(dataRows[0]) : [];
  if (rowLooksLikeEnData(sample)) {
    return { lesson: 0, type: 1, chinese: 2, hint: 3, english: 4 };
  }
  return idx;
}

function rowCells(row) {
  return row.c?.map((c) => (c?.v != null ? String(c.v) : "")) ?? [];
}

function rowToZhItem(cells, idx) {
  const word = String(cells[idx.word] ?? "").trim();
  const zhuyin = String(cells[idx.zhuyin] ?? "").trim();
  if (!word || !zhuyin) return null;
  return {
    lesson: cells[idx.lesson] ?? "",
    type: cells[idx.type] ?? "",
    word,
    zhuyin,
    sentence: idx.sentence >= 0 ? String(cells[idx.sentence] ?? "").trim() : "",
  };
}

function enRowChineseAndHint(cells, idx, english) {
  let chinese = String(cells[idx.chinese] ?? "").trim();
  const hint = idx.hint >= 0 ? String(cells[idx.hint] ?? "").trim() : "";
  if (chinese) return { chinese, hint };

  const numPrefix = hint.match(/^(\d+)\s*[\/／]/);
  if (numPrefix) return { chinese: numPrefix[1], hint };

  const fromHint = hint
    .replace(/^\d+\s*/, "")
    .replace(/^\/(.+)\/$/, "$1")
    .trim();
  return { chinese: fromHint || english, hint };
}

function rowToEnItem(cells, idx) {
  const english = String(cells[idx.english] ?? "").trim();
  if (!english) return null;
  const { chinese, hint } = enRowChineseAndHint(cells, idx, english);
  if (!chinese) return null;
  return {
    lesson: normalizeEnLesson(cells[idx.lesson] ?? ""),
    type: cells[idx.type] ?? "",
    chinese,
    hint,
    english,
  };
}

function enItemDedupeKey(item) {
  return [
    normalizeEnLesson(item.lesson),
    String(item.chinese ?? "").trim(),
    String(item.english ?? "").trim(),
  ]
    .join("\t")
    .toLowerCase();
}

function filterByTypes(items, types) {
  const set = new Set(types.map((t) => String(t).trim()));
  return items.filter((it) => {
    if (!set.size) return true;
    return set.has(String(it.type || "").trim());
  });
}

async function fetchSheetRows(sheetName) {
  const id = (CONFIG.SPREADSHEET_ID || "").trim();
  if (!id) return null;
  const sheet = encodeURIComponent(sheetName);
  const url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json&sheet=${sheet}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`無法讀取工作表「${sheetName}」(${res.status})`);
  const json = parseGvizRaw(await res.text());
  return json.table;
}

export async function loadZhItems() {
  const types = CONFIG.QUIZ_TYPES_ZH || CONFIG.QUIZ_TYPES || ["生字"];

  if (CONFIG.SHEETS_JSON_URL) {
    const res = await fetch(CONFIG.SHEETS_JSON_URL);
    if (!res.ok) throw new Error(`無法讀取題庫 (${res.status})`);
    const data = await res.json();
    const items = Array.isArray(data) ? data : data.zhItems ?? data.items ?? [];
    return filterByTypes(items, types);
  }

  const table = await fetchSheetRows(CONFIG.SHEET_ZH || "國語");
  if (!table?.rows?.length) return filterByTypes([...DEMO_ZH_ITEMS], types);

  const { headerRow, dataRows } = getHeaderAndRows(table);
  const idx = resolveZhColIdx(headerRow, dataRows);
  if (idx.word < 0 || idx.zhuyin < 0) {
    throw new Error("國語：找不到「國字或詞」或「注音」欄");
  }

  const items = [];
  for (const row of dataRows) {
    const item = rowToZhItem(rowCells(row), idx);
    if (item) items.push(item);
  }
  return filterByTypes(items.length ? items : [...DEMO_ZH_ITEMS], types);
}

export async function loadEnItems() {
  const types = CONFIG.QUIZ_TYPES_EN || ["單字"];

  if (CONFIG.SHEETS_JSON_URL) {
    const res = await fetch(CONFIG.SHEETS_JSON_URL);
    if (!res.ok) throw new Error(`無法讀取題庫 (${res.status})`);
    const data = await res.json();
    const items = (data.enItems ?? []).map((item) =>
      item
        ? {
            ...item,
            lesson: normalizeEnLesson(item.lesson),
          }
        : item,
    );
    return filterByTypes(items, types);
  }

  try {
    const table = await fetchSheetRows(CONFIG.SHEET_EN || "英語");
    if (!table?.rows?.length) return filterByTypes([...DEMO_EN_ITEMS], types);

    const { headerRow, dataRows } = getHeaderAndRows(table);
    const idx = resolveEnColIdx(headerRow, dataRows);
    if (idx.english < 0 || idx.chinese < 0) {
      console.warn("英語欄位無法辨識，使用示範題庫");
      return filterByTypes([...DEMO_EN_ITEMS], types);
    }

    const items = [];
    const seen = new Set();
    const addItem = (item) => {
      if (!item) return;
      const key = enItemDedupeKey(item);
      if (seen.has(key)) return;
      seen.add(key);
      items.push({
        ...item,
        lesson: normalizeEnLesson(item.lesson),
      });
    };

    for (const row of recoverEnItemsFromBrokenColLabels(table)) {
      addItem(row);
    }
    for (const row of dataRows) {
      addItem(rowToEnItem(rowCells(row), idx));
    }
    if (!items.length) {
      console.warn("英語工作表無有效列，使用示範題庫");
      return filterByTypes([...DEMO_EN_ITEMS], types);
    }
    return filterByTypes(items, types);
  } catch (e) {
    console.warn("英語工作表讀取失敗，使用示範題庫", e);
    return filterByTypes([...DEMO_EN_ITEMS], types);
  }
}

export function uniqueLessons(items) {
  const set = new Set(items.map((i) => i.lesson).filter(Boolean));
  return ["全部", ...[...set].sort()];
}

function gvizCell(row, index) {
  const c = row?.c?.[index];
  if (!c) return "";
  // 長文字（如 vocab_json）優先用完整 v，f 常被截斷
  if (c.v != null && c.v !== "") return c.v;
  if (c.f != null && String(c.f).trim() !== "") return String(c.f).trim();
  return "";
}

function parseArticleDate(raw) {
  if (raw == null || raw === "") return "";
  if (typeof raw === "string") {
    const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if (iso) return iso[1];
    const gviz = raw.match(/Date\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (gviz) {
      const y = gviz[1];
      const mo = String(Number(gviz[2]) + 1).padStart(2, "0");
      const d = String(Number(gviz[3])).padStart(2, "0");
      return `${y}-${mo}-${d}`;
    }
    const slash = raw.match(/^(\d{4})[\/.](\d{1,2})[\/.](\d{1,2})/);
    if (slash) {
      return `${slash[1]}-${String(slash[2]).padStart(2, "0")}-${String(slash[3]).padStart(2, "0")}`;
    }
  }
  if (typeof raw === "object" && raw instanceof Date && !isNaN(raw.getTime())) {
    const y = raw.getFullYear();
    const mo = String(raw.getMonth() + 1).padStart(2, "0");
    const d = String(raw.getDate()).padStart(2, "0");
    return `${y}-${mo}-${d}`;
  }
  return String(raw).slice(0, 10);
}

function parseVocabJson(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  const s = String(raw).trim();
  if (!s) return [];
  try {
    const parsed = JSON.parse(s);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseQuizJson(raw) {
  return parseVocabJson(raw);
}

function parseDialogueJson(raw) {
  if (!raw) return null;
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;
  const s = String(raw).trim();
  if (!s) return null;
  try {
    const parsed = JSON.parse(s);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

/** 從列中取出 quiz JSON（相容表頭錯位／空白欄） */
function pickQuizRaw(row, idxQuiz, colCount) {
  if (idxQuiz >= 0) {
    const direct = gvizCell(row, idxQuiz);
    if (String(direct || "").trim()) return direct;
  }
  const n = Math.max(colCount || 0, row?.c?.length || 0);
  for (let i = 0; i < n; i++) {
    const v = String(gvizCell(row, i) || "").trim();
    if (v.startsWith("[{") && /"type"\s*:/.test(v)) return v;
  }
  return "";
}

function pickDialogueRaw(row, idxDialogue, colCount) {
  if (idxDialogue >= 0) {
    const direct = gvizCell(row, idxDialogue);
    if (String(direct || "").trim()) return direct;
  }
  const n = Math.max(colCount || 0, row?.c?.length || 0);
  for (let i = 0; i < n; i++) {
    const v = String(gvizCell(row, i) || "").trim();
    if (v.startsWith("{") && /"turns"\s*:/.test(v)) return v;
  }
  return "";
}

/**
 * 讀取「英文文章」工作表。
 * @param {{ includeDraft?: boolean }} [opts] includeDraft 預設 true（方便草稿測試）
 * @returns {Promise<Array<{
 *   id: string, date: string, seq: number, category: string, topicKey: string,
 *   title: string, titleZh?: string, bodyL1: string, bodyL2: string, bodyL3: string,
 *   vocab: object[], quiz: object[], dialogue: object|null, sourceTitle: string, sourceUrl: string, status: string, note: string
 * }>>}
 */
export async function loadEnArticles(opts = {}) {
  const includeDraft = opts.includeDraft !== false;
  try {
    const table = await fetchSheetRows(CONFIG.SHEET_EN_ARTICLE || "英文文章");
    if (!table?.rows?.length) return [];

    const labels = (table.cols || []).map((c) => String(c.label || "").trim());
    const idxOf = (...names) => {
      for (const n of names) {
        const i = labels.findIndex((l) => l === n || l.startsWith(n));
        if (i >= 0) return i;
      }
      return -1;
    };
    let idx = {
      date: idxOf("日期"),
      seq: idxOf("序號"),
      category: idxOf("類別"),
      topicKey: idxOf("主題關鍵字"),
      title: idxOf("標題"),
      titleZh: idxOf("title_zh", "中文標題", "標題中文"),
      bodyL1: idxOf("body_l1"),
      bodyL2: idxOf("body_l2"),
      bodyL3: idxOf("body_l3"),
      vocab: idxOf("vocab_json"),
      sourceTitle: idxOf("source_title"),
      sourceUrl: idxOf("source_url"),
      status: idxOf("狀態"),
      note: idxOf("產文備註"),
      quiz: idxOf("quiz_json"),
      dialogue: idxOf("dialogue_json"),
    };
    // 欄位辨識失敗時依規劃固定欄序
    if (idx.date < 0 || idx.bodyL1 < 0) {
      idx = {
        date: 0,
        seq: 1,
        category: 2,
        topicKey: 3,
        title: 4,
        titleZh: -1,
        bodyL1: 5,
        bodyL2: 6,
        bodyL3: 7,
        vocab: 8,
        sourceTitle: 9,
        sourceUrl: 10,
        status: 11,
        note: 12,
        quiz: 13,
        dialogue: 14,
      };
    }

    const items = [];
    for (const row of table.rows) {
      const date = parseArticleDate(gvizCell(row, idx.date));
      const bodyL1 = String(gvizCell(row, idx.bodyL1) || "").trim();
      const title = String(gvizCell(row, idx.title) || "").trim();
      if (!date || (!bodyL1 && !title)) continue;
      const status = String(gvizCell(row, idx.status) || "draft")
        .trim()
        .toLowerCase();
      if (!includeDraft && status !== "published") continue;
      if (status && status !== "published" && status !== "draft") continue;

      const seq = Number(gvizCell(row, idx.seq)) || items.length + 1;
      const dialogue = parseDialogueJson(
        pickDialogueRaw(row, idx.dialogue, (table.cols || []).length)
      );
      const titleZh = String(
        (idx.titleZh >= 0 ? gvizCell(row, idx.titleZh) : "") ||
          dialogue?.title_zh ||
          ""
      ).trim();
      items.push({
        id: `${date}-${seq}-${String(gvizCell(row, idx.category) || "")}`,
        date,
        seq,
        category: String(gvizCell(row, idx.category) || "").trim(),
        topicKey: String(gvizCell(row, idx.topicKey) || "").trim(),
        title: title || bodyL1.slice(0, 40),
        titleZh,
        bodyL1,
        bodyL2: String(gvizCell(row, idx.bodyL2) || "").trim(),
        bodyL3: String(gvizCell(row, idx.bodyL3) || "").trim(),
        vocab: parseVocabJson(gvizCell(row, idx.vocab)),
        quiz: parseQuizJson(
          pickQuizRaw(row, idx.quiz, (table.cols || []).length)
        ),
        dialogue,
        sourceTitle: String(gvizCell(row, idx.sourceTitle) || "").trim(),
        sourceUrl: String(gvizCell(row, idx.sourceUrl) || "").trim(),
        status,
        note: String(gvizCell(row, idx.note) || "").trim(),
      });
    }

    items.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return a.seq - b.seq;
    });

    // 同日同序號若有 draft+published 重複，保留 published
    const deduped = [];
    const seen = new Map();
    for (const item of items) {
      const key = `${item.date}|${item.seq}|${item.category}`;
      const prevIdx = seen.get(key);
      if (prevIdx == null) {
        seen.set(key, deduped.length);
        deduped.push(item);
        continue;
      }
      if (
        item.status === "published" &&
        deduped[prevIdx].status !== "published"
      ) {
        deduped[prevIdx] = item;
      }
    }
    return deduped;
  } catch (e) {
    console.warn("英文文章工作表讀取失敗", e);
    return [];
  }
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * @param {number} count 目標題數；0 或 ≥ 題庫數 → 該範圍內全部題目隨機一輪（不重複）
 */
export function pickRandomQuestions(items, count = 10, lessonFilter = "全部") {
  let pool = items;
  if (lessonFilter && lessonFilter !== "全部") {
    const aliases = enLessonFilterAliases(lessonFilter);
    pool =
      aliases.length > 1
        ? items.filter((i) => aliases.includes(i.lesson))
        : items.filter((i) => i.lesson === lessonFilter);
  }
  if (!pool.length) return [];

  const shuffled = shuffleArray([...pool]);
  const wantAll = !count || count <= 0 || count >= pool.length;
  const n = wantAll ? pool.length : count;
  return shuffled.slice(0, n);
}
