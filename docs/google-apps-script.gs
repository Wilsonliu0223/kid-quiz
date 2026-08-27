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
 * 版本標記：EN_ARTICLE_API_VERSION（部署後可用 pingEnArticles 確認）
 */
const SHEET_ZH = "國語";
const SHEET_SCORES = "成績";
const SHEET_VISITS = "造訪";
const SHEET_EN_ARTICLES = "英文文章";
const QUIZ_TYPES = ["生字"];
const EN_ARTICLE_API_VERSION = "2026-08-27-dialogue-v1";

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
  "quiz_json",
  "dialogue_json",
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
  if (p.action === "pingEnArticles") {
    return pingEnArticles(p);
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
    if (data.action === "pingEnArticles") {
      return pingEnArticles(data);
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
 * 中文神經網路語音
 * 優先 Microsoft Edge（雲希等）→ 失敗再用 ttsmp3 Zhiyu
 * POST/GET: action=synthesizeZh&text=...&voice=zh-CN-YunxiNeural
 * 回傳 { ok, audioBase64, mime } 或 { ok, url }
 */
function synthesizeZh(p) {
  const text = String(p.text || "")
    .trim()
    .slice(0, 240);
  if (!text) {
    return jsonOut({ ok: false, error: "缺少 text" });
  }
  const voice = String(p.voice || "zh-CN-YunxiNeural").trim();

  const cache = CacheService.getScriptCache();
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.MD5,
    voice + "|" + text,
    Utilities.Charset.UTF_8
  );
  const key =
    "zhE_" +
    Utilities.base64EncodeWebSafe(digest).replace(/=+$/, "").slice(0, 28);
  const cachedB64 = cache.get(key);
  if (cachedB64) {
    return jsonOut({
      ok: true,
      audioBase64: cachedB64,
      mime: "audio/mpeg",
      speaker: voice,
      cached: true,
    });
  }

  // 1) Edge 神經語音代理
  try {
    const edgeRes = UrlFetchApp.fetch(
      "https://tts.wangwangit.com/v1/audio/speech",
      {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify({
          input: text,
          voice: voice,
          speed: 1,
        }),
        muteHttpExceptions: true,
        followRedirects: true,
      }
    );
    if (edgeRes.getResponseCode() === 200) {
      const bytes = edgeRes.getContent();
      if (bytes && bytes.length > 200) {
        const b64 = Utilities.base64Encode(bytes);
        try {
          cache.put(key, b64, 3600);
        } catch (cacheErr) {
          // base64 可能超過 Cache 上限，忽略
        }
        return jsonOut({
          ok: true,
          audioBase64: b64,
          mime: "audio/mpeg",
          speaker: voice,
        });
      }
    }
  } catch (edgeErr) {
    // fall through
  }

  // 2) 舊備援 Zhiyu
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
      return jsonOut({
        ok: true,
        url: String(data.URL),
        speaker: String(data.Speaker || "Zhiyu"),
      });
    }
    return jsonOut({
      ok: false,
      error: "中文 TTS 失敗",
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

/** 確認部署版本：POST/GET { action:"pingEnArticles", token } */
function pingEnArticles(p) {
  const auth = requireEnArticleToken(p);
  if (!auth.ok) return jsonOut(auth);
  return jsonOut({
    ok: true,
    version: EN_ARTICLE_API_VERSION,
    sheet: SHEET_EN_ARTICLES,
    headers: EN_ARTICLE_HEADERS.slice(),
  });
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
  } else {
    ensureEnArticleColumn(sheet, header, "quiz_json");
    const lastCol2 = Math.max(sheet.getLastColumn(), EN_ARTICLE_HEADERS.length);
    const header2 = sheet
      .getRange(1, 1, 1, lastCol2)
      .getValues()[0]
      .map(String);
    ensureEnArticleColumn(sheet, header2, "dialogue_json");
  }
  return sheet;
}

function ensureEnArticleColumn(sheet, header, name) {
  let col = -1;
  for (let i = 0; i < header.length; i++) {
    if (String(header[i] || "").trim() === name) {
      col = i;
      break;
    }
  }
  if (col < 0) {
    for (let i = 0; i < header.length; i++) {
      if (!String(header[i] || "").trim()) {
        col = i;
        break;
      }
    }
  }
  if (col >= 0) {
    sheet.getRange(1, col + 1).setValue(name);
  } else {
    const colNew = Math.max(sheet.getLastColumn(), header.length) + 1;
    sheet.getRange(1, colNew).setValue(name);
  }
}

function normalizeArticleDate(v) {
  // Apps Script 裡 Date 有時 instanceof 會失敗，改用 duck-typing
  if (v && typeof v === "object" && typeof v.getTime === "function") {
    const t = v.getTime();
    if (!isNaN(t)) {
      return Utilities.formatDate(new Date(t), Session.getScriptTimeZone(), "yyyy-MM-dd");
    }
  }
  const s = String(v || "").trim();
  if (!s) return "";
  const iso = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
  if (iso) {
    return (
      iso[1] +
      "-" +
      ("0" + iso[2]).slice(-2) +
      "-" +
      ("0" + iso[3]).slice(-2)
    );
  }
  // "Wed Aug 26 2026 00:00:00 GMT+0800 (台北標準時間)"
  const mon = s.match(
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})\s+(\d{4})\b/i
  );
  if (mon) {
    const map = {
      jan: "01",
      feb: "02",
      mar: "03",
      apr: "04",
      may: "05",
      jun: "06",
      jul: "07",
      aug: "08",
      sep: "09",
      oct: "10",
      nov: "11",
      dec: "12",
    };
    const mm = map[mon[1].slice(0, 3).toLowerCase()];
    if (mm) {
      return mon[3] + "-" + mm + "-" + ("0" + mon[2]).slice(-2);
    }
  }
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return Utilities.formatDate(parsed, Session.getScriptTimeZone(), "yyyy-MM-dd");
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
    vocabToCell(row.quiz_json != null ? row.quiz_json : row.quiz),
    vocabToCell(
      row.dialogue_json != null ? row.dialogue_json : row.dialogue
    ),
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
