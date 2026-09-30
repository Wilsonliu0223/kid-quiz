/**
 * 前置鏡頭看手臂揮動。往一個方向揮過才記，舉著不動不算。
 * 小孩面對鏡頭：畫面左邊是小孩的右邊。
 */

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const MIN_VIS = 0.5;
const WAVE_WINDOW = 560;
const WAVE_TRAVEL = 0.07;

/**
 * @param {{ dx: number, dy: number, t: number }[]} samples
 * @returns {"up"|"right"|"down"|"left"|null}
 */
export function waveDirection(samples) {
  if (!samples || samples.length < 4) return null;
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (last.t - first.t < 180) return null;
  const mx = last.dx - first.dx;
  const my = last.dy - first.dy;
  if (Math.hypot(mx, my) < WAVE_TRAVEL) return null;
  if (Math.abs(mx) > Math.abs(my) * 1.35) return mx > 0 ? "right" : "left";
  if (Math.abs(my) > Math.abs(mx) * 1.35) return my > 0 ? "down" : "up";
  return null;
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
  /** @type {{ dx: number, dy: number, t: number }[]} */
  let samples = [];
  let cooldown = 0;

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
    if (!sample) {
      samples = [];
      if (now >= cooldown) hooks.onStatus("往 E 的開口揮手");
      return;
    }
    samples.push(sample);
    samples = samples.filter((item) => now - item.t <= WAVE_WINDOW);
    if (now < cooldown) return;
    const dir = waveDirection(samples);
    if (!dir) {
      hooks.onStatus("往 E 的開口揮手");
      return;
    }
    samples = [];
    cooldown = now + 900;
    hooks.onDirection(dir);
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
    hooks.onStatus("往 E 的開口揮手");
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
