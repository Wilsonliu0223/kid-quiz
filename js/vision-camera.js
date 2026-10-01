/**
 * 前置鏡頭看手臂停住的方向。同一方向維持 2 秒才記一次。
 * 小孩面對鏡頭：畫面左邊是小孩的右邊。
 */

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const MIN_VIS = 0.5;
const MIN_EXTEND = 0.12;
const HOLD_MS = 2000;
const DIR_ANGLES = {
  up: -90,
  left: 180,
  right: 0,
  upRight: -45,
  upLeft: -135,
  downRight: 45,
  downLeft: 135,
};

export function directionOf(dx, dy) {
  const dist = Math.hypot(dx, dy);
  if (dist < MIN_EXTEND) return null;
  const deg = (Math.atan2(dy, dx) * 180) / Math.PI;
  let best = null;
  let bestDiff = 180;
  for (const [id, target] of Object.entries(DIR_ANGLES)) {
    let diff = Math.abs(deg - target);
    if (diff > 180) diff = 360 - diff;
    if (diff < bestDiff) {
      bestDiff = diff;
      best = id;
    }
  }
  if (bestDiff > 24) return null;
  return best;
}

export function createHoldTracker() {
  let dir = null;
  let since = 0;
  let locked = false;
  return {
    push(sample) {
      const nowDir =
        sample && sample.dist >= MIN_EXTEND ? directionOf(sample.dx, sample.dy) : null;
      if (!nowDir) {
        dir = null;
        since = 0;
        locked = false;
        return { dir: null, ms: 0, fire: false };
      }
      if (nowDir !== dir) {
        dir = nowDir;
        since = sample.t;
        locked = false;
        return { dir: nowDir, ms: 0, fire: false };
      }
      const ms = sample.t - since;
      if (locked) return { dir: nowDir, ms, fire: false };
      if (ms >= HOLD_MS) {
        locked = true;
        return { dir: nowDir, ms, fire: true };
      }
      return { dir: nowDir, ms, fire: false };
    },
  };
}

function armSample(landmarks, t) {
  if (!landmarks || landmarks.length < 17) return null;
  let best = null;
  for (const [shoulderI, wristI] of [
    [11, 15],
    [12, 16],
  ]) {
    const shoulder = landmarks[shoulderI];
    const wrist = landmarks[wristI];
    if (!shoulder || !wrist) continue;
    const vis = Math.min(shoulder.visibility ?? 1, wrist.visibility ?? 1);
    if (vis < MIN_VIS) continue;
    const dx = shoulder.x - wrist.x;
    const dy = wrist.y - shoulder.y;
    const dist = Math.hypot(dx, dy);
    if (!best || dist > best.dist) best = { dx, dy, dist, t };
  }
  return best;
}

async function createLandmarker() {
  const { PoseLandmarker, FilesetResolver } = await import(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14"
  );
  const files = await FilesetResolver.forVisionTasks(WASM);
  const base = {
    modelAssetPath: MODEL,
  };
  try {
    return await PoseLandmarker.createFromOptions(files, {
      baseOptions: { ...base, delegate: "GPU" },
      runningMode: "VIDEO",
      numPoses: 1,
    });
  } catch {
    return PoseLandmarker.createFromOptions(files, {
      baseOptions: { ...base, delegate: "CPU" },
      runningMode: "VIDEO",
      numPoses: 1,
    });
  }
}

/**
 * @param {HTMLVideoElement} video
 * @param {{ onStatus: (text: string) => void, onDirection: (dir: string) => void }} hooks
 */
export function startArmCamera(video, hooks) {
  let stopped = false;
  let raf = 0;
  /** @type {MediaStream | null} */
  let stream = null;
  /** @type {{ close?: () => void, detectForVideo: Function } | null} */
  let landmarker = null;
  const tracker = createHoldTracker();

  const stopTracks = () => {
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    if (video) video.srcObject = null;
  };

  let lastDetect = 0;
  const loop = () => {
    if (stopped) return;
    raf = requestAnimationFrame(loop);
    if (!landmarker || !video.videoWidth) return;
    const now = performance.now();
    if (now - lastDetect < 80) return;
    lastDetect = now;
    let sample = null;
    try {
      const result = landmarker.detectForVideo(video, now);
      sample = armSample(result?.landmarks?.[0], now);
    } catch {
      return;
    }
    const state = tracker.push(sample);
    hooks.onProgress?.(state.dir ? state.ms : 0);
    if (!state.dir) {
      hooks.onStatus("把手停在開口方向");
      return;
    }
    if (state.fire) {
      hooks.onStatus("可以換方向了");
      hooks.onDirection(state.dir);
      return;
    }
    hooks.onStatus(`停住 ${(state.ms / 1000).toFixed(1)} 秒`);
  };

  const run = async () => {
    hooks.onStatus("正在打開鏡頭…");
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
    } catch {
      hooks.onStatus("鏡頭沒打開，請改按綠圈或紅叉");
      return;
    }
    if (stopped) {
      stopTracks();
      return;
    }
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    try {
      await video.play();
    } catch {
      hooks.onStatus("鏡頭沒打開，請改按綠圈或紅叉");
      return;
    }
    hooks.onStatus("正在載入辨識…");
    try {
      landmarker = await createLandmarker();
    } catch {
      hooks.onStatus("辨識載入失敗，請改按綠圈或紅叉");
      return;
    }
    if (stopped) return;
    hooks.onStatus("把手停在開口方向 2 秒");
    raf = requestAnimationFrame(loop);
  };

  void run();

  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
    try {
      landmarker?.close?.();
    } catch {
      /* already closed */
    }
    landmarker = null;
    stopTracks();
  };
}
