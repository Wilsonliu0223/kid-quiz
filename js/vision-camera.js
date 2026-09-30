/**
 * 前置鏡頭看整隻手臂。伸直才算，不確定就不記分。
 * 小孩面對鏡頭：畫面左邊是小孩的右邊。
 */

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const MIN_EXTEND = 0.15;
const MIN_VIS = 0.55;

/**
 * @param {{ x: number, y: number, visibility?: number }[] | undefined} landmarks
 * @returns {"up"|"right"|"down"|"left"|null}
 */
export function armDirection(landmarks) {
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
    if (!best || dist > best.dist) best = { dx, dy, dist };
  }
  if (!best || best.dist < MIN_EXTEND) return null;
  const deg = (Math.atan2(best.dy, best.dx) * 180) / Math.PI;
  if (deg >= -45 && deg < 45) return "right";
  if (deg >= 45 && deg < 135) return "down";
  if (deg >= -135 && deg < -45) return "up";
  return "left";
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
  let armed = false;
  let downStreak = 0;
  let lastDir = "";
  let streak = 0;

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
    let dir = null;
    try {
      const result = landmarker.detectForVideo(video, now);
      dir = armDirection(result?.landmarks?.[0]);
    } catch {
      return;
    }
    if (!armed) {
      if (!dir) downStreak += 1;
      else downStreak = 0;
      if (downStreak >= 3) {
        armed = true;
        hooks.onStatus("看到人了。手臂伸直，離開身體");
      }
      return;
    }
    if (!dir) {
      streak = 0;
      lastDir = "";
      hooks.onStatus("把手臂伸直，離開身體");
      return;
    }
    if (dir === lastDir) streak += 1;
    else {
      lastDir = dir;
      streak = 1;
    }
    const label = { up: "上", right: "右", down: "下", left: "左" }[dir];
    hooks.onStatus(`看到往${label}`);
    if (streak < 5) return;
    streak = 0;
    lastDir = "";
    armed = false;
    downStreak = 0;
    hooks.onStatus("手臂先放下");
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
      hooks.onStatus("鏡頭沒打開，請改按 ✓ ✕");
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
      hooks.onStatus("鏡頭沒打開，請改按 ✓ ✕");
      return;
    }
    hooks.onStatus("正在載入辨識…");
    try {
      landmarker = await createLandmarker();
    } catch {
      hooks.onStatus("辨識載入失敗，請改按 ✓ ✕");
      return;
    }
    if (stopped) return;
    hooks.onStatus("把手臂放下，再伸直擺方向");
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
