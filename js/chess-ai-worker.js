import { computeChessAiMove } from "./chess-ai-core.js";

self.onmessage = (event) => {
  const { requestId, position, aiSide, level } = event.data || {};
  try {
    const move = computeChessAiMove(position, aiSide, level ?? 4);
    self.postMessage({ requestId, move });
  } catch (err) {
    self.postMessage({ requestId, error: String(err?.message || err) });
  }
};
