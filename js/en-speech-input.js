/**
 * 英文語音作答（Web Speech API）。不支援時 isSupported() 為 false。
 */

function getRecognitionCtor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function isEnSpeechInputSupported() {
  return Boolean(getRecognitionCtor());
}

/**
 * @param {{ lang?: string, onPartial?: (text: string) => void }} [opts]
 * @returns {{ stop: () => Promise<string>, abort: () => void } | null}
 */
export function startEnSpeechInput(opts = {}) {
  const Ctor = getRecognitionCtor();
  if (!Ctor) return null;

  const recognition = new Ctor();
  recognition.lang = opts.lang || "en-US";
  recognition.interimResults = true;
  // 句子較長：連續聽，由使用者再點一次結束
  recognition.continuous = true;
  recognition.maxAlternatives = 1;

  let finalText = "";
  let lastPartial = "";
  let settled = false;

  const finishWith = (text) => {
    if (settled) return;
    settled = true;
    resolveDone(String(text || "").replace(/\s+/g, " ").trim());
  };

  let resolveDone = /** @type {(v: string) => void} */ (() => {});
  const done = new Promise((resolve) => {
    resolveDone = resolve;
  });

  recognition.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const piece = event.results[i][0]?.transcript || "";
      if (event.results[i].isFinal) finalText += `${piece} `;
      else interim += piece;
    }
    lastPartial = `${finalText}${interim}`.replace(/\s+/g, " ").trim();
    opts.onPartial?.(lastPartial);
  };

  recognition.onerror = () => {
    finishWith(finalText.trim() || lastPartial);
  };

  recognition.onend = () => {
    finishWith(finalText.trim() || lastPartial);
  };

  try {
    recognition.start();
  } catch {
    return null;
  }

  return {
    stop: async () => {
      try {
        recognition.stop();
      } catch (_) {}
      const text = await Promise.race([
        done,
        new Promise((resolve) => {
          setTimeout(() => {
            try {
              recognition.abort();
            } catch (_) {}
            resolve(finalText.trim() || lastPartial);
          }, 1800);
        }),
      ]);
      settled = true;
      return String(text || "").replace(/\s+/g, " ").trim();
    },
    abort: () => {
      try {
        recognition.abort();
      } catch (_) {}
      finishWith(finalText.trim() || lastPartial);
    },
  };
}
