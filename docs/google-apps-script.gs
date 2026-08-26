/**
 * 貼到「同一個」Google 試算表：擴充功能 → Apps Script
 *
 * 部署 → 新增部署作業 → 網頁應用程式
 *   執行身分：我
 *   存取權：任何人
 *
 * 產生的網址填到 js/config.site.js：
 *   SCORE_LOG_URL = "https://script.google.com/macros/s/...../exec"
 *
 * 第一次記錄成績會自動建立「成績」工作表；造訪會自動建立「造訪」工作表。
 * 「英文文章」寫入見 docs/英文文章寫入試算表.md（需 Script Properties：EN_ARTICLE_WRITE_TOKEN）
 */
const SHEET_ZH = "國語";
const SHEET_SCORES = "成績";
const SHEET_VISITS = "造訪";
const SHEET_EN_ARTICLES = "英文文章";
const QUIZ_TYPES = ["生字"];

const EN_ARTICLE_HEADERS = [
  "日期",
  "序號",
  "類別",
  "主題關鍵字",
  "標題",
  "body_l1",
  "body_l2",
  "body_l3",
  "vocab_json",
  "source_title",
  "source_url",
  "狀態",
  "產文備註",
];

function doGet(e) {
  const p = e && e.parameter ? e.parameter : {};
  if (p.action === "logScore") {
    return appendScoreRow(p);
  }
  if (p.action === "logVisit") {
    return appendVisitRow(p);
  }
  if (p.action === "listEnArticles") {
    return listEnArticles(p);
  }
  if (p.action === "synthesizeZh") {
    return synthesizeZh(p);
  }
  return loadZhJson();
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.action === "logScore") {
      return appendScoreRow(data);
    }
    if (data.action === "logVisit") {
      return appendVisitRow(data);
    }
    if (data.action === "appendEnArticles") {
      return appendEnArticles(data);
    }
    if (data.action === "replaceEnArticlesForDate") {
      return replaceEnArticlesForDate(data);
    }
    if (data.action === "listEnArticles") {
      return listEnArticles(data);
    }
    if (data.action === "synthesizeZh") {
      return synthesizeZh(data);
    }
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
  return jsonOut({ ok: false, error: "unknown action" });
}

/**
 * 中文神經網路語音（ttsmp3 / Amazon Polly Zhiyu）
 * POST/GET: action=synthesizeZh&text=...
 * 回傳 { ok, url } 供前端 <audio> 播放（比百度／Google 翻譯音自然很多）
 */
function synthesizeZh(p) {
  const text = String(p.text || "")
    .trim()
    .slice(0, 240);
  if (!text) {
    return jsonOut({ ok: false, error: "缺少 text" });
  }

  const cache = CacheService.getScriptCache();
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.MD5,
    text,
    Utilities.Charset.UTF_8
  );
  const key =
    "zh6_" +
    Utilities.base64EncodeWebSafe(digest).replace(/=+$/, "").slice(0, 28);
  const cachedUrl = cache.get(key);
  if (cachedUrl) {
    return jsonOut({ ok: true, url: cachedUrl, cached: true });
  }

  try {
    const res = UrlFetchApp.fetch("https://ttsmp3.com/makemp3_new.php", {
      method: "post",
      contentType: "application/x-www-form-urlencoded",
      payload:
        "msg=" +
        encodeURIComponent(text) +
        "&lang=Zhiyu&source=ttsmp3",
      muteHttpExceptions: true,
      followRedirects: true,
    });
    const raw = res.getContentText();
    const data = JSON.parse(raw);
    if (data && Number(data.Error) === 0 && data.URL) {
      cache.put(key, String(data.URL), 21600);
      return jsonOut({
        ok: true,
        url: String(data.URL),
        speaker: String(data.Speaker || "Zhiyu"),
      });
    }
    return jsonOut({
      ok: false,
      error: "ttsmp3 失敗",
      detail: String(raw).slice(0, 180),
    });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function appendScoreRow(p) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_SCORES);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_SCORES);
    sheet.appendRow([
      "時間",
      "小孩",
      "科目",
      "課次",
      "模式",
      "答對",
      "總題",
      "待確認",
    ]);
    sheet.setFrozenRows(1);
  }

  const tz = Session.getScriptTimeZone();
  let when = new Date();
  if (p.at) {
    const parsed = new Date(p.at);
    if (!isNaN(parsed.getTime())) when = parsed;
  }
  const timeStr = Utilities.formatDate(when, tz, "yyyy-MM-dd HH:mm:ss");

  sheet.appendRow([
    timeStr,
    String(p.child || ""),
    String(p.subject || ""),
    String(p.lesson || "全部"),
    String(p.mode || ""),
    Number(p.correct) || 0,
    Number(p.total) || 0,
    Number(p.pending) || 0,
  ]);

  return jsonOut({ ok: true });
}

function appendVisitRow(p) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_VISITS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_VISITS);
    sheet.appendRow(["時間", "IP", "訪客識別", "頁面", "版本", "裝置"]);
    sheet.setFrozenRows(1);
  }

  const tz = Session.getScriptTimeZone();
  let when = new Date();
  if (p.at) {
    const parsed = new Date(p.at);
    if (!isNaN(parsed.getTime())) when = parsed;
  }
  const timeStr = Utilities.formatDate(when, tz, "yyyy-MM-dd HH:mm:ss");

  sheet.appendRow([
    timeStr,
    String(p.ip || ""),
    String(p.visitorId || ""),
    String(p.page || ""),
    String(p.version || ""),
    String(p.device || ""),
  ]);

  return jsonOut({ ok: true });
}

/** 驗證英文文章寫入 token（Script 屬性 EN_ARTICLE_WRITE_TOKEN） */
function requireEnArticleToken(p) {
  const expected = PropertiesService.getScriptProperties().getProperty(
    "EN_ARTICLE_WRITE_TOKEN"
  );
  if (!expected) {
    return {
      ok: false,
      error:
        "尚未設定 Script Properties：EN_ARTICLE_WRITE_TOKEN（見 docs/英文文章寫入試算表.md）",
    };
  }
  if (String(p.token || "") !== expected) {
    return { ok: false, error: "unauthorized" };
  }
  return { ok: true };
}

function getOrCreateEnArticleSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_EN_ARTICLES);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_EN_ARTICLES);
    sheet.appendRow(EN_ARTICLE_HEADERS.slice());
    sheet.setFrozenRows(1);
    return sheet;
  }
  const lastCol = Math.max(sheet.getLastColumn(), EN_ARTICLE_HEADERS.length);
  const header = sheet
    .getRange(1, 1, 1, lastCol)
    .getValues()[0]
    .map(String);
  if (!String(header[0] || "").trim()) {
    sheet.getRange(1, 1, 1, EN_ARTICLE_HEADERS.length).setValues([EN_ARTICLE_HEADERS]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function normalizeArticleDate(v) {
  if (v instanceof Date && !isNaN(v.getTime())) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  if (Object.prototype.toString.call(v) === "[object Date]" && !isNaN(v.getTime())) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  const s = String(v || "").trim();
  if (!s) return "";
  // Apps Script / JSON 偶發把 Date 變成長字串
  if (s.indexOf("GMT") >= 0 || s.indexOf("台北") >= 0) {
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) {
      return Utilities.formatDate(parsed, Session.getScriptTimeZone(), "yyyy-MM-dd");
    }
  }
  const m = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
  if (m) {
    const y = m[1];
    const mo = ("0" + m[2]).slice(-2);
    const d = ("0" + m[3]).slice(-2);
    return y + "-" + mo + "-" + d;
  }
  return s;
}

function vocabToCell(v) {
  if (v == null || v === "") return "";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch (err) {
    return String(v);
  }
}

function rowObjectToValues(row) {
  return [
    normalizeArticleDate(row.date || row["日期"]),
    row.seq != null ? Number(row.seq) : Number(row["序號"]) || "",
    String(row.category || row["類別"] || "").trim(),
    String(row.topic_key || row.topicKey || row["主題關鍵字"] || "").trim(),
    String(row.title || row["標題"] || "").trim(),
    String(row.body_l1 || row.bodyL1 || "").trim(),
    String(row.body_l2 || row.bodyL2 || "").trim(),
    String(row.body_l3 || row.bodyL3 || "").trim(),
    vocabToCell(row.vocab_json != null ? row.vocab_json : row.vocab),
    String(row.source_title || row.sourceTitle || "").trim(),
    String(row.source_url || row.sourceUrl || "").trim(),
    String(row.status || row["狀態"] || "draft").trim() || "draft",
    String(row.note || row["產文備註"] || "").trim(),
  ];
}

/**
 * 寫入多列英文文章
 * POST JSON: { action:"appendEnArticles", token:"...", rows:[...] }
 */
function appendEnArticles(p) {
  const auth = requireEnArticleToken(p);
  if (!auth.ok) return jsonOut(auth);

  const rows = p.rows;
  if (!rows || !rows.length) {
    return jsonOut({ ok: false, error: "rows 不可為空" });
  }

  const sheet = getOrCreateEnArticleSheet();
  const values = [];
  for (let i = 0; i < rows.length; i++) {
    const vals = rowObjectToValues(rows[i]);
    if (!vals[0]) {
      return jsonOut({ ok: false, error: "第 " + (i + 1) + " 列缺少日期" });
    }
    if (!vals[2] || !vals[5]) {
      return jsonOut({
        ok: false,
        error: "第 " + (i + 1) + " 列缺少類別或 body_l1",
      });
    }
    values.push(vals);
  }

  sheet
    .getRange(sheet.getLastRow() + 1, 1, values.length, EN_ARTICLE_HEADERS.length)
    .setValues(values);

  return jsonOut({ ok: true, appended: values.length });
}

/**
 * 覆蓋某日：刪該日所有列後再寫入
 * POST JSON: { action:"replaceEnArticlesForDate", token, date, rows }
 */
function replaceEnArticlesForDate(p) {
  const auth = requireEnArticleToken(p);
  if (!auth.ok) return jsonOut(auth);

  const dateKey = normalizeArticleDate(p.date);
  if (!dateKey) {
    return jsonOut({ ok: false, error: "缺少 date" });
  }

  const sheet = getOrCreateEnArticleSheet();
  const data = sheet.getDataRange().getValues();
  let removed = 0;
  // 由下往上刪，避免索引錯位
  for (let r = data.length - 1; r >= 1; r--) {
    const cellDate = normalizeArticleDate(data[r][0]);
    if (cellDate === dateKey) {
      sheet.deleteRow(r + 1);
      removed++;
    }
  }

  const appendResult = appendEnArticles(p);
  const parsed = JSON.parse(appendResult.getContent());
  if (!parsed.ok) return appendResult;

  return jsonOut({
    ok: true,
    removed: removed,
    appended: parsed.appended,
    date: dateKey,
  });
}

/**
 * 列出近期／指定日文章（產文前去重用；需 token）
 * GET/POST: action=listEnArticles&token=...&days=7
 * 或 date=yyyy-MM-dd
 */
function listEnArticles(p) {
  const auth = requireEnArticleToken(p);
  if (!auth.ok) return jsonOut(auth);

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
    SHEET_EN_ARTICLES
  );
  if (!sheet || sheet.getLastRow() < 2) {
    return jsonOut({ ok: true, items: [] });
  }

  const data = sheet.getDataRange().getValues();
  const wantDate = p.date ? normalizeArticleDate(p.date) : "";
  const days = Number(p.days) || 0;
  let minDate = "";
  if (!wantDate && days > 0) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    minDate = Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }

  const items = [];
  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    const date = normalizeArticleDate(row[0]);
    if (wantDate && date !== wantDate) continue;
    if (minDate && date && date < minDate) continue;
    items.push({
      date: date,
      seq: row[1],
      category: String(row[2] || ""),
      topic_key: String(row[3] || ""),
      title: String(row[4] || ""),
      status: String(row[11] || ""),
      note: String(row[12] || ""),
    });
  }

  return jsonOut({ ok: true, items: items });
}

function loadZhJson() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_ZH);
  if (!sheet) {
    return jsonOut({ error: "找不到工作表：" + SHEET_ZH });
  }
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return jsonOut({ items: [] });
  }
  const header = values[0].map(String);
  const idx = {
    lesson: colIndex(header, ["課次"]),
    type: colIndex(header, ["類型"]),
    word: colIndex(header, ["國字或詞", "國字", "字詞"]),
    zhuyin: colIndex(header, ["注音"]),
    sentence: colIndex(header, ["例句", "句子", "課文例句"]),
  };
  if (idx.word < 0 || idx.zhuyin < 0) {
    return jsonOut({ error: "缺少欄位：國字或詞、注音" });
  }
  const typeSet = new Set(QUIZ_TYPES);
  const items = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const type = String(row[idx.type] || "").trim();
    if (typeSet.size && !typeSet.has(type)) continue;
    const word = String(row[idx.word] || "").trim();
    const zhuyin = String(row[idx.zhuyin] || "").trim();
    if (!word || !zhuyin) continue;
    items.push({
      lesson: String(row[idx.lesson] || "").trim(),
      type,
      word,
      zhuyin,
      sentence: idx.sentence >= 0 ? String(row[idx.sentence] || "").trim() : "",
    });
  }
  return jsonOut({ items });
}

function colIndex(header, names) {
  for (let i = 0; i < header.length; i++) {
    const h = String(header[i]).trim();
    if (names.indexOf(h) >= 0) return i;
  }
  return -1;
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
