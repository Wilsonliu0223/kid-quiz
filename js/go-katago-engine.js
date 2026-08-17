/**
 * 瀏覽器版 KataGo（移植自 web-katrain MIT 引擎 + 官方小網路 b6c96）。
 * 非完整本機 KataGo 二進位；棋力見 GO_AI_LEVELS 說明。
 */
import { BLACK, komiForSize } from "./go-core.js?v=go-v1";

export const NIRVANA_LEVEL = 6;

/** @type {{ loading: boolean, progress: number, label: string, ready: boolean, failReason: string, backend: string, strengthNote: string }} */
export const katagoLoadState = {
  loading: false,
  progress: 0,
  label: "",
  ready: false,
  failReason: "",
  backend: "",
  strengthNote: "KataGo 小網路 b6c96（約 3.6 MB）＋搜尋；約業餘高段～職業入門量級（視裝置與思考時間）",
};

/** @type {Worker | null} */
let worker = null;
let ready = false;
let initPromise = null;
let requestSeq = 0;

function enginesKatagoRoot() {
  // Worker 與模型放在 engines/katago/
  return new URL("../engines/katago/", import.meta.url);
}

function modelUrl() {
  return new URL("models/katago-small.bin.gz", enginesKatagoRoot()).href;
}

function workerUrl() {
  return new URL("../engines/katago/katago-worker.js", import.meta.url);
}

/**
 * @param {import('./go-core.js').GoPosition} pos
 * @returns {'black'|'white'|null[][]}
 */
function toBoardState(pos) {
  /** @type {(null|'black'|'white')[][]} */
  const board = [];
  for (let y = 0; y < pos.size; y++) {
    /** @type {(null|'black'|'white')[]} */
    const row = [];
    for (let x = 0; x < pos.size; x++) {
      const v = pos.board[y][x];
      row.push(v === BLACK ? "black" : v === 0 ? null : "white");
    }
    board.push(row);
  }
  return board;
}

export function terminateKatagoEngine() {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  ready = false;
  initPromise = null;
  katagoLoadState.loading = false;
  katagoLoadState.progress = 0;
  katagoLoadState.label = "";
  katagoLoadState.ready = false;
  katagoLoadState.backend = "";
}

function getWorker() {
  if (!worker) {
    worker = new Worker(workerUrl(), { type: "module" });
  }
  return worker;
}

export function ensureKatagoReady() {
  if (ready) return Promise.resolve();
  if (initPromise) return initPromise;

  katagoLoadState.loading = true;
  katagoLoadState.progress = 0.05;
  katagoLoadState.label = "載入 KataGo 網路（約 3.6 MB）…";
  katagoLoadState.failReason = "";
  katagoLoadState.ready = false;

  const w = getWorker();
  initPromise = new Promise((resolve, reject) => {
    const onMessage = (event) => {
      const msg = event.data || {};
      if (msg.type !== "katago:init_result") return;
      w.removeEventListener("message", onMessage);
      w.removeEventListener("error", onError);
      if (!msg.ok) {
        initPromise = null;
        katagoLoadState.loading = false;
        katagoLoadState.failReason = msg.error || "KataGo 初始化失敗";
        katagoLoadState.label = "";
        reject(new Error(katagoLoadState.failReason));
        return;
      }
      ready = true;
      katagoLoadState.loading = false;
      katagoLoadState.progress = 1;
      katagoLoadState.label = "";
      katagoLoadState.ready = true;
      katagoLoadState.backend = msg.backend || "";
      resolve();
    };
    const onError = (err) => {
      w.removeEventListener("message", onMessage);
      w.removeEventListener("error", onError);
      initPromise = null;
      katagoLoadState.loading = false;
      katagoLoadState.failReason = err?.message || "KataGo Worker 錯誤";
      katagoLoadState.label = "";
      reject(err instanceof Error ? err : new Error(String(err)));
    };
    w.addEventListener("message", onMessage);
    w.addEventListener("error", onError);
    // 優先 WebGPU；失敗由引擎內部退回 wasm／cpu
    w.postMessage({
      type: "katago:init",
      modelUrl: modelUrl(),
      backend: "webgpu",
    });
    // 粗估進度（真實下載在 worker 內）
    let p = 0.05;
    const tick = window.setInterval(() => {
      if (!katagoLoadState.loading || ready) {
        window.clearInterval(tick);
        return;
      }
      p = Math.min(0.9, p + 0.05);
      katagoLoadState.progress = p;
      katagoLoadState.label = `載入 KataGo… ${Math.round(p * 100)}%`;
    }, 400);
  });

  return initPromise;
}

/**
 * @param {import('./go-core.js').GoPosition} pos
 * @returns {Promise<[number,number]|null>} null = 停著
 */
export async function requestKatagoMove(pos) {
  await ensureKatagoReady();
  const w = getWorker();
  const id = ++requestSeq;
  const board = toBoardState(pos);
  const currentPlayer = pos.turn === BLACK ? "black" : "white";
  const visits = pos.size <= 9 ? 96 : pos.size <= 13 ? 64 : 48;
  const maxTimeMs = pos.size <= 9 ? 2500 : pos.size <= 13 ? 3500 : 4500;

  return new Promise((resolve, reject) => {
    const onMessage = (event) => {
      const msg = event.data || {};
      if (msg.type === "katago:analyze_update" && msg.id === id) return;
      if (msg.type !== "katago:analyze_result" || msg.id !== id) return;
      w.removeEventListener("message", onMessage);
      w.removeEventListener("error", onError);
      if (msg.backend) katagoLoadState.backend = msg.backend;
      if (!msg.ok || !msg.analysis) {
        reject(new Error(msg.error || "KataGo 分析失敗"));
        return;
      }
      const moves = Array.isArray(msg.analysis.moves) ? [...msg.analysis.moves] : [];
      moves.sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || (b.visits || 0) - (a.visits || 0));
      const best = moves[0];
      if (!best || best.x < 0 || best.y < 0) {
        resolve(null);
        return;
      }
      // web-katrain: x=欄, y=列（上到下）＝本站 c,r
      resolve([best.y, best.x]);
    };
    const onError = (err) => {
      w.removeEventListener("message", onMessage);
      w.removeEventListener("error", onError);
      reject(err instanceof Error ? err : new Error(String(err)));
    };
    w.addEventListener("message", onMessage);
    w.addEventListener("error", onError);
    w.postMessage({
      type: "katago:analyze",
      id,
      modelUrl: modelUrl(),
      board,
      currentPlayer,
      moveHistory: [],
      komi: komiForSize(pos.size),
      rules: "chinese",
      visits,
      maxTimeMs,
      topK: 8,
      analysisPvLen: 4,
      ownershipMode: "none",
      wideRootNoise: 0.04,
      nnRandomize: false,
      conservativePass: true,
    });
  });
}
