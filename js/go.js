import { openDuoModePicker } from "./online-duo.js";
import {
  BLACK,
  WHITE,
  createPosition,
  playMove,
  playPass,
  isLegalMove,
  isGameOver,
  scoreChinese,
  formatScoreDetail,
  komiForSize,
  positionFromAscii,
  clonePosition,
} from "./go-core.js?v=go-v1";
import { ensureGoBoardSvg, renderGoBoardSvg } from "./go-board-ui.js?v=go-v1";
import { AI_PLAYER_ID, requestGoAiMove } from "./go-ai.js?v=go-v1";
import { renderDuoTurnStatusBar } from "./game-turn-status.js?v=go-v1";
import { getChildName } from "./children.js";
import { getSelectedChild } from "./store.js";
import {
  canStartDuoBattle,
  getActiveDuoPlayerIds,
  refreshDuoBattleUI,
  renderDuoPickButtons,
} from "./duo-pick.js";
import { bindRulesGuideButtons, openRulesGuide } from "./piece-rules-guide.js?v=rules-v5";
import {
  rebindGomokuBoardZoom,
  resetGomokuBoardZoom,
  shouldSuppressGomokuCellTap,
} from "./gomoku-board-zoom.js";
import lessons from "./go/lessons.js?v=go-v3";
import drills from "./go/drills.js?v=go-v3";

/** @type {{ showView:(v:string)=>void, getChildNames:()=>Record<string,string> }|null} */
let deps = null;
let boardSize = 9;
/** @type {"local"|"ai"} */
let setupMode = "local";
let aiDifficulty = 2;
let aiMoveToken = 0;

/**
 * @typedef {object} GoGame
 * @property {"local"|"ai"} mode
 * @property {import('./go-core.js').GoPosition} position
 * @property {string} blackPlayerId
 * @property {string} whitePlayerId
 * @property {boolean} over
 * @property {1|2|null} winner
 * @property {string} [endReason]
 * @property {string} [humanPlayerId]
 * @property {number} [aiDifficulty]
 */

/** @type {GoGame|null} */
let game = null;
let lessonIndex = 0;
let lessonStep = 0;
/** @type {import('./go-core.js').GoPosition|null} */
let lessonPos = null;
let drillIndex = 0;
/** @type {import('./go-core.js').GoPosition|null} */
let drillPos = null;

const $ = (sel) => document.querySelector(sel);

export function renderGoHomePlayers() {
  refreshDuoBattleUI();
}

function showHub() {
  deps?.showView("goHub");
}

function beginFromHome() {
  showHub();
}

function colorName(c) {
  return c === BLACK ? "黑" : "白";
}

function playerName(id) {
  if (id === AI_PLAYER_ID) return "電腦";
  return getChildName(id);
}

function ensurePlayBoard() {
  return ensureGoBoardSvg($("#go-board"), onPlayPoint);
}

function renderPlay() {
  if (!game) return;
  renderGoBoardSvg(ensurePlayBoard(), game.position);
  const turn = game.position.turn === BLACK ? "black" : "white";
  const turnId = game.position.turn === BLACK ? game.blackPlayerId : game.whitePlayerId;
  renderDuoTurnStatusBar({
    theme: "go",
    leftCard: $("#go-side-black"),
    rightCard: $("#go-side-white"),
    banner: $("#go-turn-banner"),
    turnMain: $("#go-turn-main"),
    turnSub: $("#go-turn-sub"),
    leftName: playerName(game.blackPlayerId),
    rightName: playerName(game.whitePlayerId),
    turn: game.over ? null : turn,
    turnPlayerName: playerName(turnId),
    over: game.over,
    overTitle: game.endReason || "終局",
    waitingAi: game.mode === "ai" && !game.over && turnId === AI_PLAYER_ID,
    extraEl: $("#go-play-meta"),
    extraText: `${game.position.size} 路 · 貼目 ${komiForSize(game.position.size)} · 黑提 ${game.position.captured[0]} · 白提 ${game.position.captured[1]}`,
    extraVisible: true,
  });
  const passBtn = $("#btn-go-pass");
  const resignBtn = $("#btn-go-resign");
  if (passBtn) passBtn.hidden = game.over;
  if (resignBtn) resignBtn.hidden = game.over;
}

function endWithScore(reason) {
  if (!game) return;
  const score = scoreChinese(game.position);
  game.over = true;
  game.winner = score.winner;
  game.endReason = reason || "終局數子";
  const title = score.winner === BLACK ? "黑勝" : score.winner === WHITE ? "白勝" : "和棋";
  const overlay = $("#go-win-overlay");
  const t = $("#go-win-title");
  const d = $("#go-win-detail");
  if (t) t.textContent = title;
  if (d) d.textContent = formatScoreDetail(score);
  overlay?.removeAttribute("hidden");
  renderPlay();
}

function onPlayPoint(r, c) {
  if (!game || game.over) return;
  if (shouldSuppressGomokuCellTap()) return;
  if (game.mode === "ai" && currentId() === AI_PLAYER_ID) return;
  if (!isLegalMove(game.position, r, c)) return;
  game.position = playMove(game.position, r, c);
  afterHumanOrAiMove();
}

function currentId() {
  if (!game) return "";
  return game.position.turn === BLACK ? game.blackPlayerId : game.whitePlayerId;
}

function afterHumanOrAiMove() {
  if (!game) return;
  if (isGameOver(game.position)) {
    endWithScore("雙方停著");
    return;
  }
  renderPlay();
  maybeAi();
}

function maybeAi() {
  if (!game || game.over || game.mode !== "ai") return;
  if (currentId() !== AI_PLAYER_ID) return;
  const token = ++aiMoveToken;
  requestGoAiMove(clonePosition(game.position), game.aiDifficulty || 2).then((mv) => {
    if (!game || token !== aiMoveToken || game.over) return;
    if (currentId() !== AI_PLAYER_ID) return;
    game.position = mv ? playMove(game.position, mv[0], mv[1]) : playPass(game.position);
    afterHumanOrAiMove();
  });
}

function startLocalGame(blackId) {
  const ids = getActiveDuoPlayerIds();
  const whiteId = ids.find((id) => id !== blackId) || ids[1];
  game = {
    mode: "local",
    position: createPosition(boardSize),
    blackPlayerId: blackId,
    whitePlayerId: whiteId,
    over: false,
    winner: null,
  };
  $("#go-win-overlay")?.setAttribute("hidden", "");
  deps?.showView("goPlay");
  rebindGomokuBoardZoom("#go-board-viewport", "#go-board-stage");
  renderPlay();
}

function startAiGame(humanBlack) {
  const human = getSelectedChild();
  game = {
    mode: "ai",
    position: createPosition(boardSize),
    blackPlayerId: humanBlack ? human : AI_PLAYER_ID,
    whitePlayerId: humanBlack ? AI_PLAYER_ID : human,
    humanPlayerId: human,
    aiDifficulty,
    over: false,
    winner: null,
  };
  $("#go-win-overlay")?.setAttribute("hidden", "");
  deps?.showView("goPlay");
  rebindGomokuBoardZoom("#go-board-viewport", "#go-board-stage");
  renderPlay();
  maybeAi();
}

function renderFirst() {
  const local = $("#go-local-setup");
  const ai = $("#go-ai-setup");
  local?.toggleAttribute("hidden", setupMode !== "local");
  ai?.toggleAttribute("hidden", setupMode !== "ai");
  $("#go-size-label") && ($("#go-size-label").textContent = `${boardSize} 路`);
  document.querySelectorAll("[data-go-size]").forEach((btn) => {
    btn.classList.toggle("is-selected", Number(btn.getAttribute("data-go-size")) === boardSize);
  });
  if (setupMode === "local") {
    refreshDuoBattleUI();
    renderDuoPickButtons("#go-pick-btns", {
      onPick: startLocalGame,
      labelSuffix: " 拿黑（先手）",
    });
  } else {
    const name = getChildName(getSelectedChild());
    const n = $("#go-ai-active-name");
    if (n) n.textContent = name;
    const wrap = $("#go-ai-start-btns");
    if (wrap) {
      wrap.innerHTML = "";
      [
        [true, `${name} 拿黑`],
        [false, "電腦拿黑"],
      ].forEach(([humanBlack, label]) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn-secondary btn-block";
        btn.textContent = label;
        btn.addEventListener("click", () => startAiGame(humanBlack));
        wrap.appendChild(btn);
      });
    }
  }
  deps?.showView("goFirst");
}

function lessonStartPos(item) {
  if (item.setup) return positionFromAscii(item.setup, item.turn || BLACK);
  return createPosition(item.size || 9);
}

function renderLesson() {
  const item = lessons[lessonIndex];
  if (!item || !lessonPos) return;
  const step = item.steps[Math.max(0, lessonStep - 1)];
  const marks = [];
  if (lessonStep < item.steps.length) {
    const nxt = item.steps[lessonStep];
    if (!nxt.pass) marks.push([nxt.r, nxt.c]);
  }
  renderGoBoardSvg(ensureGoBoardSvg($("#go-lesson-board"), () => {}), lessonPos, { marks });
  $("#go-lesson-title").textContent = `${lessonIndex + 1}/${lessons.length} ${item.title}`;
  $("#go-lesson-intro").textContent = lessonStep === 0 ? item.intro : step?.say || item.intro;
  $("#go-lesson-progress").textContent = `第 ${lessonStep} / ${item.steps.length} 手`;
}

function openLesson(i) {
  lessonIndex = i;
  lessonStep = 0;
  lessonPos = lessonStartPos(lessons[i]);
  deps?.showView("goLesson");
  renderLesson();
}

function lessonNext() {
  const item = lessons[lessonIndex];
  if (!item || !lessonPos) return;
  if (lessonStep >= item.steps.length) {
    if (item.showScore) {
      const sc = scoreChinese(lessonPos);
      $("#go-lesson-intro").textContent = formatScoreDetail(sc);
    }
    return;
  }
  const s = item.steps[lessonStep];
  lessonPos = s.pass ? playPass(lessonPos) : playMove(lessonPos, s.r, s.c);
  lessonStep += 1;
  renderLesson();
  if (lessonStep >= item.steps.length && item.showScore) {
    const sc = scoreChinese(lessonPos);
    $("#go-lesson-intro").textContent = `${lessons[lessonIndex].steps[lessonStep - 1]?.say || ""}\n\n${formatScoreDetail(sc)}`;
  }
}

function lessonPrev() {
  if (lessonStep <= 0) return;
  const item = lessons[lessonIndex];
  lessonPos = lessonStartPos(item);
  const target = lessonStep - 1;
  lessonStep = 0;
  for (let i = 0; i < target; i++) {
    const s = item.steps[i];
    lessonPos = s.pass ? playPass(lessonPos) : playMove(lessonPos, s.r, s.c);
    lessonStep++;
  }
  renderLesson();
}

const KIND_LABEL = {
  capture: "吃子",
  life: "死活",
  joseki: "定式",
  fuseki: "初步布局",
};

const KIND_ORDER = ["capture", "life", "joseki", "fuseki"];

function renderLessonList() {
  const box = $("#go-lesson-list");
  if (!box) return;
  box.innerHTML = "";
  const groups = [
    { key: "rule", title: "規則怎麼走" },
    { key: "tesuji", title: "吃子手筋" },
    { key: "life", title: "死活" },
    { key: "joseki", title: "常見定式" },
    { key: "fuseki", title: "初步布局" },
  ];
  for (const g of groups) {
    const h = document.createElement("p");
    h.className = "home-zone-title";
    h.textContent = g.title;
    box.appendChild(h);
    lessons.forEach((item, i) => {
      const chap = item.chapter || "rule";
      if (chap !== g.key) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-secondary btn-block";
      btn.textContent = item.title;
      btn.addEventListener("click", () => openLesson(i));
      box.appendChild(btn);
    });
  }
}

function renderDrillList() {
  const box = $("#go-drill-list");
  if (!box) return;
  box.innerHTML = "";
  for (const kind of KIND_ORDER) {
    const items = drills.map((d, i) => ({ d, i })).filter((x) => x.d.kind === kind);
    if (!items.length) continue;
    const h = document.createElement("p");
    h.className = "home-zone-title";
    h.textContent = KIND_LABEL[kind];
    box.appendChild(h);
    for (const { d, i } of items) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-secondary btn-block";
      btn.textContent = d.title;
      btn.addEventListener("click", () => openDrill(i));
      box.appendChild(btn);
    }
  }
}

function openDrill(i) {
  drillIndex = i;
  const d = drills[i];
  drillPos = positionFromAscii(d.setup, d.turn || BLACK);
  $("#go-drill-feedback").textContent = d.prompt || "點正確的交叉點。";
  deps?.showView("goDrillPlay");
  renderGoBoardSvg(ensureGoBoardSvg($("#go-drill-board"), onDrillPoint), drillPos, { marks: [] });
  $("#go-drill-play-title").textContent = d.title;
}

function onDrillPoint(r, c) {
  const d = drills[drillIndex];
  if (!d || !drillPos) return;
  const ok = d.answers.some(([ar, ac]) => ar === r && ac === c);
  if (!ok) {
    $("#go-drill-feedback").textContent = "不是這裡。再想想。";
    return;
  }
  if (isLegalMove(drillPos, r, c)) drillPos = playMove(drillPos, r, c);
  renderGoBoardSvg(ensureGoBoardSvg($("#go-drill-board"), onDrillPoint), drillPos, { marks: [[r, c]] });
  $("#go-drill-feedback").textContent = `答對！${d.explain}`;
}

export function beginGoLocal() {
  if (!canStartDuoBattle()) {
    alert("請在首頁選「誰在練習」，並在對戰設定中挑選對戰對象（至少需要兩位）");
    return;
  }
  setupMode = "local";
  renderFirst();
}

export function beginGoAi() {
  setupMode = "ai";
  renderFirst();
}

export function initGo(d) {
  deps = d;
  bind();
}

function bind() {
  if (bind.done) return;
  bind.done = true;
  $("#btn-start-go")?.addEventListener("click", (e) => {
    e.preventDefault();
    beginFromHome();
  });
  $("#btn-go-hub-back")?.addEventListener("click", () => deps?.showView("home"));
  $("#btn-go-hub-rules")?.addEventListener("click", () => openRulesGuide("go"));
  $("#btn-go-hub-lesson")?.addEventListener("click", () => {
    renderLessonList();
    deps?.showView("goLessonList");
  });
  $("#btn-go-hub-drill")?.addEventListener("click", () => {
    renderDrillList();
    deps?.showView("goDrill");
  });
  $("#btn-go-hub-play")?.addEventListener("click", () => {
    openDuoModePicker({
      game: "go",
      title: "圍棋",
      backView: "goHub",
      localStart: () => beginGoLocal(),
      aiStart: () => beginGoAi(),
    });
  });
  $("#btn-go-first-back")?.addEventListener("click", () => deps?.showView("duoMode"));
  document.querySelectorAll("[data-go-size]").forEach((btn) => {
    btn.addEventListener("click", () => {
      boardSize = Number(btn.getAttribute("data-go-size")) || 9;
      renderFirst();
    });
  });
  bindRulesGuideButtons("go", ["#btn-go-first-rules", "#btn-go-rules"]);
  $("#btn-go-play-back")?.addEventListener("click", () => {
    if (confirm("離開棋局？進度不會儲存。")) {
      aiMoveToken += 1;
      game = null;
      resetGomokuBoardZoom();
      deps?.showView("goHub");
    }
  });
  $("#btn-go-pass")?.addEventListener("click", () => {
    if (!game || game.over) return;
    if (game.mode === "ai" && currentId() === AI_PLAYER_ID) return;
    game.position = playPass(game.position);
    afterHumanOrAiMove();
  });
  $("#btn-go-resign")?.addEventListener("click", () => {
    if (!game || game.over) return;
    const loser = currentId();
    game.over = true;
    game.winner = loser === game.blackPlayerId ? WHITE : BLACK;
    game.endReason = `${playerName(loser)} 認輸`;
    const overlay = $("#go-win-overlay");
    $("#go-win-title").textContent = `${colorName(game.winner)}勝`;
    $("#go-win-detail").textContent = game.endReason;
    overlay?.removeAttribute("hidden");
    renderPlay();
  });
  $("#btn-go-win-dismiss")?.addEventListener("click", () => $("#go-win-overlay")?.setAttribute("hidden", ""));
  $("#btn-go-win-home")?.addEventListener("click", () => {
    game = null;
    deps?.showView("goHub");
  });
  $("#btn-go-win-replay")?.addEventListener("click", () => {
    if (!game) return;
    if (game.mode === "ai") startAiGame(game.blackPlayerId !== AI_PLAYER_ID);
    else startLocalGame(game.blackPlayerId);
  });
  $("#btn-go-lesson-back")?.addEventListener("click", () => {
    renderLessonList();
    deps?.showView("goLessonList");
  });
  $("#btn-go-lesson-list-back")?.addEventListener("click", () => deps?.showView("goHub"));
  $("#btn-go-lesson-next")?.addEventListener("click", () => lessonNext());
  $("#btn-go-lesson-prev")?.addEventListener("click", () => lessonPrev());
  $("#btn-go-lesson-again")?.addEventListener("click", () => openLesson(lessonIndex));
  $("#btn-go-lesson-skip")?.addEventListener("click", () => {
    if (lessonIndex < lessons.length - 1) openLesson(lessonIndex + 1);
    else {
      renderLessonList();
      deps?.showView("goLessonList");
    }
  });
  $("#btn-go-drill-back")?.addEventListener("click", () => deps?.showView("goHub"));
  $("#btn-go-drill-play-back")?.addEventListener("click", () => {
    renderDrillList();
    deps?.showView("goDrill");
  });
}
