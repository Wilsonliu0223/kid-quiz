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
  recognition.continuous = false;
  recognition.maxAlternatives = 1;

  let finalText = "";
  let settled = false;

  const done = new Promise((resolve) => {
    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) finalText += `${piece} `;
        else interim += piece;
      }
      const shown = `${finalText}${interim}`.replace(/\s+/g, " ").trim();
      opts.onPartial?.(shown);
    };
    recognition.onerror = () => {
      if (settled) return;
      settled = true;
      resolve(finalText.trim());
    };
    recognition.onend = () => {
      if (settled) return;
      settled = true;
      resolve(finalText.trim());
    };
  });

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
      return done;
    },
    abort: () => {
      try {
        recognition.abort();
      } catch (_) {}
    },
  };
}
