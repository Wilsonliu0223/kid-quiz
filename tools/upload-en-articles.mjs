/**
 * 上傳／列出「英文文章」到 Google Apps Script
 *
 * 用法：
 *   node tools/upload-en-articles.mjs articles.json
 *   node tools/upload-en-articles.mjs --list --days 7
 *   node tools/upload-en-articles.mjs --list --date 2026-08-26
 *
 * 機密：.local/en-article-secrets.env
 *   SCORE_LOG_URL=...
 *   EN_ARTICLE_WRITE_TOKEN=...
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SECRETS = path.join(ROOT, ".local", "en-article-secrets.env");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

function getConfig() {
  const fileEnv = loadEnvFile(SECRETS);
  const url =
    process.env.SCORE_LOG_URL ||
    fileEnv.SCORE_LOG_URL ||
    "";
  const token =
    process.env.EN_ARTICLE_WRITE_TOKEN ||
    fileEnv.EN_ARTICLE_WRITE_TOKEN ||
    "";
  if (!url) {
    throw new Error(
      `缺少 SCORE_LOG_URL。請建立 ${SECRETS}（見 .local/en-article-secrets.env.example）`
    );
  }
  if (!token) {
    throw new Error(
      `缺少 EN_ARTICLE_WRITE_TOKEN。請在 Apps Script 指令碼屬性設定，並寫入 ${SECRETS}`
    );
  }
  return { url, token };
}

async function postJson(url, body) {
  const payload = JSON.stringify(body);
  const headers = { "Content-Type": "text/plain;charset=utf-8" };

  // Apps Script：POST /exec → 302 → 必須用 GET 取回結果（再 POST 會 405）
  const res1 = await fetch(url, {
    method: "POST",
    headers,
    body: payload,
    redirect: "manual",
  });
  if (!(res1.status >= 300 && res1.status < 400)) {
    const textDirect = await res1.text();
    try {
      return JSON.parse(textDirect);
    } catch {
      throw new Error(
        `非 JSON 回應 (${res1.status}): ${textDirect.slice(0, 300)}`
      );
    }
  }
  const loc = res1.headers.get("location");
  if (!loc) {
    throw new Error(`轉向但沒有 Location（${res1.status}）`);
  }
  const res2 = await fetch(loc, { method: "GET", redirect: "follow" });
  const text = await res2.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`非 JSON 回應 (${res2.status}): ${text.slice(0, 300)}`);
  }
}

function parseArgs(argv) {
  const args = { list: false, days: 7, date: "", file: "" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--list") args.list = true;
    else if (a === "--days") args.days = Number(argv[++i]) || 7;
    else if (a === "--date") args.date = String(argv[++i] || "");
    else if (!a.startsWith("-")) args.file = a;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { url, token } = getConfig();

  if (args.list) {
    const body = {
      action: "listEnArticles",
      token,
    };
    if (args.date) body.date = args.date;
    else body.days = args.days;
    const data = await postJson(url, body);
    console.log(JSON.stringify(data, null, 2));
    if (!data.ok) process.exit(1);
    return;
  }

  if (!args.file) {
    console.error(
      "用法:\n  node tools/upload-en-articles.mjs articles.json\n  node tools/upload-en-articles.mjs --list --days 7"
    );
    process.exit(1);
  }

  const abs = path.isAbsolute(args.file)
    ? args.file
    : path.resolve(process.cwd(), args.file);
  const raw = JSON.parse(fs.readFileSync(abs, "utf8"));
  const rows = raw.rows || raw;
  if (!Array.isArray(rows) || !rows.length) {
    throw new Error("JSON 需含 rows 陣列");
  }

  const date =
    raw.date ||
    rows[0].date ||
    rows[0]["日期"] ||
    "";
  const replace = raw.replace !== false; // 預設覆蓋該日

  let data;
  if (replace && date) {
    data = await postJson(url, {
      action: "replaceEnArticlesForDate",
      token,
      date,
      rows,
    });
  } else {
    data = await postJson(url, {
      action: "appendEnArticles",
      token,
      rows,
    });
  }

  console.log(JSON.stringify(data, null, 2));
  if (!data.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
