import { computeChessAiMove, GRANDMASTER_LEVEL, MASTER_WORKER_LEVEL, NIRVANA_LEVEL } from "./chess-ai-core.js?v=chess-v2";

export const AI_PLAYER_ID = "__chess_ai__";
export { GRANDMASTER_LEVEL, MASTER_WORKER_LEVEL, NIRVANA_LEVEL };

/** @type {Worker | null} */
let aiWorker = null;
let reqSeq = 0;

function getWorker() {
  if (aiWorker) return aiWorker;
  aiWorker = new Worker(new URL("./chess-ai-worker.js", import.meta.url), { type: "module" });
  return aiWorker;
}

export function terminateChessAiWorker() {
  if (aiWorker) {
    aiWorker.terminate();
    aiWorker = null;
  }
}

/**
 * @param {object} opts
 * @param {import('./chess-core.js').ChessPosition} opts.position
 * @param {import('./chess-core.js').ChessSide} opts.aiSide
 * @param {number} opts.level
 */
export function requestChessAiMove(opts) {
  const { position, aiSide, level } = opts;
  if (level < MASTER_WORKER_LEVEL || typeof Worker === "undefined") {
    return Promise.resolve(computeChessAiMove(position, aiSide, level));
  }

  const requestId = ++reqSeq;
  const worker = getWorker();
  return new Promise((resolve, reject) => {
    const onMessage = (event) => {
      if (event.data?.requestId !== requestId) return;
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      if (event.data?.error) {
        reject(new Error(event.data.error));
        return;
      }
      resolve(event.data?.move ?? null);
    };
    const onError = (err) => {
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      reject(err);
    };
    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
    worker.postMessage({
      requestId,
      fen: null,
      position,
      aiSide,
      level,
    });
  });
}
