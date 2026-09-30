/**
 * 前置鏡頭看手臂揮動。往一個方向揮過才記，舉著不動不算。
 * 小孩面對鏡頭：畫面左邊是小孩的右邊。
 */

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const MIN_VIS = 0.5;
const WAVE_TRAVEL = 0.18;
const WAVE_MIN_MS = 350;

/**
 * 要揮夠遠、夠久，而且手停下來才算一次。揮回去的那段不算。
 * @returns {{ push: (sample: { dx: number, dy: number, t: number } | null) => "up"|"right"|"down"|"left"|null }}
 */
export function createWaveTracker() {
  /** @type {{ dx: number, dy: number, t: number } | null} */
  let origin = null;
  /** @type {{ dx: number, dy: number, t: number } | null} */
  let prev = null;
  let peakX = 0;
  let peakY = 0;
  let still = 0;
  let waitStill = true;

  const reset = (sample) => {
    origin = sample;
    prev = sample;
    peakX = 0;
    peakY = 0;
    still = 0;
  };

  return {
    push(sample) {
      if (!sample) {
        reset(null);
        waitStill = true;
        return null;
      }
      if (!prev) {
        reset(sample);
        return null;
      }
      const step = Math.hypot(sample.dx - prev.dx, sample.dy - prev.dy);
      prev = sample;
      const quiet = step < 0.015;
      if (waitStill) {
        if (quiet) still += 1;
        else still = 0;
        if (still >= 4) {
          waitStill = false;
          reset(sample);
        }
        return null;
      }
      if (!origin) {
        reset(sample);
        return null;
      }
      const mx = sample.dx - origin.dx;
      const my = sample.dy - origin.dy;
      if (Math.abs(mx) > Math.abs(peakX)) peakX = mx;
      if (Math.abs(my) > Math.abs(peakY)) peakY = my;
      if (quiet) still += 1;
      else still = 0;
      const travel = Math.hypot(peakX, peakY);
      if (travel < WAVE_TRAVEL || sample.t - origin.t < WAVE_MIN_MS || still < 4) {
        if (still >= 5 && travel < WAVE_TRAVEL) reset(sample);
        return null;
      }
      let dir = null;
      if (Math.abs(peakX) > Math.abs(peakY) * 1.4) dir = peakX > 0 ? "right" : "left";
      else if (Math.abs(peakY) > Math.abs(peakX) * 1.4) dir = peakY > 0 ? "down" : "up";
      waitStill = true;
      still = 0;
      origin = null;
      prev = sample;
      peakX = 0;
      peakY = 0;
      return dir;
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
  const tracker = createWaveTracker();

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
    const dir = tracker.push(sample);
    if (!dir) {
      hooks.onStatus("慢慢往開口揮，揮完停一下");
      return;
    }
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
    hooks.onStatus("慢慢往開口揮，揮完停一下");
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
