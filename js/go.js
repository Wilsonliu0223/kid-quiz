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
import { ensureGoBoardSvg, renderGoBoardSvg } from "./go-board-ui.js?v=go-v2";
import {
  AI_PLAYER_ID,
  GO_AI_LEVELS,
  NIRVANA_LEVEL,
  katagoLoadState,
  ensureKatagoReady,
  terminateKatagoEngine,
  requestGoAiMove,
} from "./go-ai.js?v=go-v3";
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
import lessons from "./go/lessons.js?v=go-v5";
import drills from "./go/drills.js?v=go-v5";

/** @type {{ showView:(v:string)=>void, getChildNames:()=>Record<string,string> }|null} */
let deps = null;
let boardSize = 9;
/** @type {"local"|"ai"} */
let setupMode = "local";
let aiDifficulty = 3;
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
/** 本步是否已選對（有 choices 的步驟） */
let lessonAnswered = false;
/** @type {{r:number,c:number,label:string,state:string,why:string,ok?:boolean}[]} */
let lessonChoiceMarks = [];
/** @type {string} */
let lessonFeedback = "";
/** @type {import('./go-core.js').GoPosition|null} */
let lessonPos = null;
let drillIndex = 0;
/** @type {import('./go-core.js').GoPosition|null} */
let drillPos = null;
let drillAnswered = false;
/** @type {{r:number,c:number,label:string,state:string,why:string,ok?:boolean}[]} */
let drillChoiceMarks = [];
/** @type {string} */
let drillFeedback = "";

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
  if (id === AI_PLAYER_ID) {
    if (game?.mode === "ai") {
      const label = GO_AI_LEVELS.find((d) => d.level === (game.aiDifficulty ?? aiDifficulty))?.label;
      return label ? `電腦（${label}）` : "電腦";
    }
    return "電腦";
  }
  return getChildName(id);
}

function aiLevelLabel(level) {
  return GO_AI_LEVELS.find((d) => d.level === level)?.label || "";
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
    extraText: formatGoPlayMeta(turnId),
    extraVisible: true,
  });
  const passBtn = $("#btn-go-pass");
  const resignBtn = $("#btn-go-resign");
  if (passBtn) passBtn.hidden = game.over;
  if (resignBtn) resignBtn.hidden = game.over;
}

function formatGoPlayMeta(turnId) {
  if (!game) return "";
  const base = `${game.position.size} 路 · 貼目 ${komiForSize(game.position.size)} · 黑提 ${game.position.captured[0]} · 白提 ${game.position.captured[1]}`;
  if (game.mode !== "ai") return base;
  const lv = game.aiDifficulty ?? aiDifficulty;
  const info = GO_AI_LEVELS.find((d) => d.level === lv);
  const strength = info?.strength ? ` · ${info.strength}` : "";
  if (lv >= NIRVANA_LEVEL) {
    if (katagoLoadState.loading) {
      return `${base}\nKataGo 載入中… ${Math.round((katagoLoadState.progress || 0) * 100)}%`;
    }
    if (katagoLoadState.failReason) {
      return `${base}\nKataGo 載入失敗，改用宗師啟發式 · ${katagoLoadState.failReason}`;
    }
    if (turnId === AI_PLAYER_ID && !game.over) {
      const be = katagoLoadState.backend ? `（${katagoLoadState.backend}）` : "";
      return `${base}\n涅槃・KataGo 思考中${be}${strength}`;
    }
    return `${base}\n${strength}${katagoLoadState.backend ? ` · 後端 ${katagoLoadState.backend}` : ""}`;
  }
  if (turnId === AI_PLAYER_ID && !game.over) {
    return `${base}\n電腦思考中${strength}`;
  }
  return `${base}${strength}`;
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
  requestGoAiMove(clonePosition(game.position), game.aiDifficulty ?? aiDifficulty).then((mv) => {
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
  const level = aiDifficulty;
  game = {
    mode: "ai",
    position: createPosition(boardSize),
    blackPlayerId: humanBlack ? human : AI_PLAYER_ID,
    whitePlayerId: humanBlack ? AI_PLAYER_ID : human,
    humanPlayerId: human,
    aiDifficulty: level,
    over: false,
    winner: null,
  };
  $("#go-win-overlay")?.setAttribute("hidden", "");
  deps?.showView("goPlay");
  rebindGomokuBoardZoom("#go-board-viewport", "#go-board-stage");
  renderPlay();
  if (level >= NIRVANA_LEVEL) {
    const poll = window.setInterval(() => {
      if (!game || game.mode !== "ai") {
        window.clearInterval(poll);
        return;
      }
      renderPlay();
      if (!katagoLoadState.loading) window.clearInterval(poll);
    }, 400);
    ensureKatagoReady()
      .catch(() => {})
      .finally(() => {
        renderPlay();
        maybeAi();
      });
    return;
  }
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
    const chips = $("#go-ai-difficulty-chips");
    if (chips) {
      chips.innerHTML = "";
      for (const d of GO_AI_LEVELS) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `xiangqi-ai-card${aiDifficulty === d.level ? " is-selected" : ""}`;
        btn.innerHTML = `<strong>${d.label}</strong><span class="go-ai-strength">${d.strength || ""}</span><span>${d.desc}</span>`;
        btn.addEventListener("click", () => {
          aiDifficulty = d.level;
          if (d.level >= NIRVANA_LEVEL) {
            ensureKatagoReady().catch(() => {});
          }
          renderFirst();
        });
        chips.appendChild(btn);
      }
    }
    const wrap = $("#go-ai-start-btns");
    if (wrap) {
      wrap.innerHTML = "";
      const aiLabel = aiLevelLabel(aiDifficulty) || "電腦";
      [
        [true, `${name} 拿黑（先手）`],
        [false, `電腦拿黑（${aiLabel}）`],
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

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function stepCorrectChoice(step) {
  return step?.choices?.find((c) => c.ok) || null;
}

/** 重播到指定步驟開始（尚未回答） */
function rebuildLessonTo(targetStep) {
  const item = lessons[lessonIndex];
  if (!item) return;
  lessonPos = lessonStartPos(item);
  for (let i = 0; i < targetStep; i++) {
    applyLessonStepSilent(item.steps[i]);
  }
  lessonStep = targetStep;
  lessonAnswered = false;
  lessonFeedback = "";
  prepareLessonChoices();
}

function applyLessonStepSilent(step) {
  if (!lessonPos || !step) return;
  if (step.pass) {
    lessonPos = playPass(lessonPos);
    return;
  }
  if (step.choices) {
    if (step.place === false) return;
    const ok = stepCorrectChoice(step);
    if (ok && isLegalMove(lessonPos, ok.r, ok.c)) {
      lessonPos = playMove(lessonPos, ok.r, ok.c);
    }
    return;
  }
  if (step.r != null && step.c != null && isLegalMove(lessonPos, step.r, step.c)) {
    lessonPos = playMove(lessonPos, step.r, step.c);
  }
}

function prepareLessonChoices() {
  const item = lessons[lessonIndex];
  const step = item?.steps?.[lessonStep];
  lessonChoiceMarks = [];
  if (!step?.choices || lessonAnswered) return;
  const labels = ["A", "B", "C", "D"];
  const list = step.choices.map((c, i) => ({
    r: c.r,
    c: c.c,
    why: c.why,
    ok: !!c.ok,
    label: labels[i] || String(i + 1),
    state: "idle",
  }));
  shuffleInPlace(list);
  list.forEach((c, i) => {
    c.label = labels[i] || String(i + 1);
  });
  lessonChoiceMarks = list;
}

function renderLesson() {
  const item = lessons[lessonIndex];
  if (!item || !lessonPos) return;
  const step = item.steps[lessonStep];
  const total = item.steps.length;
  const atEnd = lessonStep >= total;

  /** @type {{r:number,c:number,label:string,state?:string}[]} */
  let choiceMarks = [];
  if (!atEnd && step?.choices && !lessonAnswered) {
    choiceMarks = lessonChoiceMarks;
  }

  renderGoBoardSvg(ensureGoBoardSvg($("#go-lesson-board"), onLessonPoint), lessonPos, {
    choiceMarks,
    lastMove: lessonPos.lastMove,
  });

  $("#go-lesson-title").textContent = `${lessonIndex + 1}/${lessons.length} ${item.title}`;

  const introEl = $("#go-lesson-intro");
  const progressEl = $("#go-lesson-progress");
  const nextBtn = $("#btn-go-lesson-next");

  if (atEnd) {
    let endText = "這一局學完了。可以按「下一局」或「重來」。";
    if (item.showScore) {
      endText = `${formatScoreDetail(scoreChinese(lessonPos))}\n\n${endText}`;
    }
    introEl.textContent = endText;
    progressEl.textContent = `完成 ${total} / ${total}`;
    if (nextBtn) {
      nextBtn.disabled = true;
      nextBtn.textContent = "已結束";
    }
    return;
  }

  if (step.pass) {
    introEl.textContent = step.say || item.intro;
    progressEl.textContent = `說明 ${lessonStep + 1} / ${total}`;
    if (nextBtn) {
      nextBtn.disabled = false;
      nextBtn.textContent = "下一步";
    }
    return;
  }

  if (step.choices) {
    if (!lessonAnswered) {
      introEl.textContent = `${step.ask || "哪裡比較好？"}\n點選盤上 A／B／C。`;
      if (lessonFeedback) introEl.textContent += `\n\n${lessonFeedback}`;
      progressEl.textContent = `猜一猜 ${lessonStep + 1} / ${total}`;
      if (nextBtn) {
        nextBtn.disabled = true;
        nextBtn.textContent = "先選位置";
      }
    } else {
      introEl.textContent = lessonFeedback || stepCorrectChoice(step)?.why || "";
      progressEl.textContent = `答對了 ${lessonStep + 1} / ${total}`;
      if (nextBtn) {
        nextBtn.disabled = false;
        nextBtn.textContent = lessonStep + 1 >= total ? "看結果" : "下一步";
      }
    }
    return;
  }

  introEl.textContent = step.say || item.intro;
  progressEl.textContent = `第 ${lessonStep + 1} / ${total}`;
  if (nextBtn) {
    nextBtn.disabled = false;
    nextBtn.textContent = "下一步";
  }
}

function onLessonPoint(r, c) {
  const item = lessons[lessonIndex];
  const step = item?.steps?.[lessonStep];
  if (!step?.choices || lessonAnswered || !lessonPos) return;
  const hit = lessonChoiceMarks.find((x) => x.r === r && x.c === c);
  if (!hit) {
    lessonFeedback = "請點有字母的位置。";
    renderLesson();
    return;
  }
  if (hit.ok) {
    lessonChoiceMarks = lessonChoiceMarks.map((x) => ({
      ...x,
      state: x.ok ? "ok" : "idle",
    }));
    if (step.place !== false && isLegalMove(lessonPos, r, c)) {
      lessonPos = playMove(lessonPos, r, c);
    }
    lessonAnswered = true;
    lessonFeedback = `答對！${hit.why}`;
    renderLesson();
    return;
  }
  lessonChoiceMarks = lessonChoiceMarks.map((x) => ({
    ...x,
    state: x.r === r && x.c === c ? "bad" : "idle",
  }));
  lessonFeedback = `還不是。${hit.why}`;
  renderLesson();
}

function openLesson(i) {
  lessonIndex = i;
  lessonStep = 0;
  lessonAnswered = false;
  lessonFeedback = "";
  lessonPos = lessonStartPos(lessons[i]);
  prepareLessonChoices();
  deps?.showView("goLesson");
  renderLesson();
}

function lessonNext() {
  const item = lessons[lessonIndex];
  if (!item || !lessonPos) return;
  const step = item.steps[lessonStep];

  if (lessonStep >= item.steps.length) return;

  if (step?.choices && !lessonAnswered) return;

  if (step?.pass) {
    lessonPos = playPass(lessonPos);
  }

  lessonStep += 1;
  lessonAnswered = false;
  lessonFeedback = "";

  if (lessonStep >= item.steps.length) {
    renderLesson();
    return;
  }
  prepareLessonChoices();
  renderLesson();
}

function lessonPrev() {
  if (lessonStep <= 0 && !lessonAnswered) return;
  if (lessonAnswered) {
    rebuildLessonTo(lessonStep);
    renderLesson();
    return;
  }
  rebuildLessonTo(lessonStep - 1);
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

function wrongWhyForKind(kind) {
  if (kind === "capture") return "這裡提不到／叫吃不到。再看別的字母。";
  if (kind === "life") return "這裡不是做眼／破眼的要點。";
  if (kind === "joseki") return "不是這個定式常見應手。";
  if (kind === "fuseki") return "這一手大場不在這裡。";
  return "還不是。再試試別的字母。";
}

/**
 * 練習關卡：優先用資料裡的 choices；否則自動產生 1 個正解 + 2 個干擾點。
 * @param {any} d
 * @param {import('./go-core.js').GoPosition} pos
 */
function buildDrillChoiceList(d, pos) {
  const labels = ["A", "B", "C", "D"];
  if (d.choices?.length) {
    const list = d.choices.map((c) => ({
      r: c.r,
      c: c.c,
      ok: !!c.ok,
      why: c.why || (c.ok ? d.explain : wrongWhyForKind(d.kind)),
      label: "A",
      state: "idle",
    }));
    shuffleInPlace(list);
    list.forEach((c, i) => {
      c.label = labels[i] || String(i + 1);
    });
    return list;
  }

  const answerSet = new Set((d.answers || []).map(([r, c]) => `${r},${c}`));
  const [ar, ac] = d.answers[0];
  const ok = {
    r: ar,
    c: ac,
    ok: true,
    why: d.explain || "答對了。",
    label: "A",
    state: "idle",
  };

  /** @type {[number,number][]} */
  const pool = [];
  for (let r = 0; r < pos.size; r++) {
    for (let c = 0; c < pos.size; c++) {
      if (pos.board[r][c] !== 0) continue;
      if (answerSet.has(`${r},${c}`)) continue;
      pool.push([r, c]);
    }
  }
  const near = [];
  const far = [];
  for (const [r, c] of pool) {
    const dist = Math.abs(r - ar) + Math.abs(c - ac);
    if (dist > 0 && dist <= 3) near.push([r, c]);
    else far.push([r, c]);
  }
  shuffleInPlace(near);
  shuffleInPlace(far);
  const picks = [...near, ...far].slice(0, 2);
  const wrongs = picks.map(([r, c]) => ({
    r,
    c,
    ok: false,
    why: wrongWhyForKind(d.kind),
    label: "A",
    state: "idle",
  }));

  const list = [ok, ...wrongs];
  shuffleInPlace(list);
  list.forEach((c, i) => {
    c.label = labels[i] || String(i + 1);
  });
  return list;
}

function renderDrillPlay() {
  const d = drills[drillIndex];
  if (!d || !drillPos) return;
  const choiceMarks = drillAnswered ? [] : drillChoiceMarks;
  renderGoBoardSvg(ensureGoBoardSvg($("#go-drill-board"), onDrillPoint), drillPos, {
    choiceMarks,
    lastMove: drillPos.lastMove,
  });
  $("#go-drill-play-title").textContent = d.title;
  const fb = $("#go-drill-feedback");
  if (!fb) return;
  if (drillAnswered) {
    fb.textContent = drillFeedback;
  } else {
    fb.textContent = `${d.prompt || "哪裡比較好？"}\n點選盤上 A／B／C。${
      drillFeedback ? `\n\n${drillFeedback}` : ""
    }`;
  }
}

function openDrill(i) {
  drillIndex = i;
  const d = drills[i];
  drillPos = positionFromAscii(d.setup, d.turn || BLACK);
  drillAnswered = false;
  drillFeedback = "";
  drillChoiceMarks = buildDrillChoiceList(d, drillPos);
  deps?.showView("goDrillPlay");
  renderDrillPlay();
}

function onDrillPoint(r, c) {
  const d = drills[drillIndex];
  if (!d || !drillPos || drillAnswered) return;
  const hit = drillChoiceMarks.find((x) => x.r === r && x.c === c);
  if (!hit) {
    drillFeedback = "請點有字母的位置。";
    renderDrillPlay();
    return;
  }
  if (hit.ok) {
    if (isLegalMove(drillPos, r, c)) drillPos = playMove(drillPos, r, c);
    drillAnswered = true;
    drillFeedback = `答對！${hit.why}`;
    renderDrillPlay();
    return;
  }
  drillChoiceMarks = drillChoiceMarks.map((x) => ({
    ...x,
    state: x.r === r && x.c === c ? "bad" : "idle",
  }));
  drillFeedback = `還不是。${hit.why}`;
  renderDrillPlay();
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
      terminateKatagoEngine();
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
    terminateKatagoEngine();
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
