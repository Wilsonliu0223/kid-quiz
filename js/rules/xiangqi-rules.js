/** 象棋明棋：兒童規則圖鑑內容 */

/** @typedef {{ r:number, c:number, piece?:string, mark?:'dot'|'block'|'from'|'x' }} RulesCell */
/** @typedef {{ title:string, lines:string[], tip?:string }} RulesHowCard */
/** @typedef {{ id:string, name:string, badge:string, how:string, limit:string, tip?:string, grid:{rows:number,cols:number,cells:RulesCell[]} }} RulesPiece */

/** @type {{ gameId:'xiangqi', title:string, how:RulesHowCard[], pieces:RulesPiece[] }} */
export const XIANGQI_RULES = {
  gameId: "xiangqi",
  title: "象棋小教室",
  how: [
    {
      title: "誰先走？",
      lines: ["紅方先走，然後黑方，再輪流下。", "同一時間，只有輪到的人可以動棋。"],
    },
    {
      title: "怎麼算贏？",
      lines: [
        "把對方的「將／帥」將軍到沒辦法逃，你就贏了。",
        "被將軍時，一定要先救自己的將／帥。",
      ],
      tip: "將軍＝對方的王被攻擊了，要立刻解！",
    },
    {
      title: "棋盤小知識",
      lines: [
        "棋盤中間有「楚河漢界」，象不能過河。",
        "將／帥和士只能待在「九宮」小格子裡。",
        "兩個將／帥不能面對面（中間沒有棋擋著）。",
      ],
    },
  ],
  pieces: [
    {
      id: "K",
      name: "將／帥",
      badge: "帥",
      how: "只在九宮裡，直的或橫的走一格。",
      limit: "不能離開九宮；也不能跟對方將／帥面對面。",
      tip: "像小房子裡的王，走得很小心。",
      grid: {
        rows: 4,
        cols: 3,
        cells: [
          { r: 2, c: 1, piece: "帥", mark: "from" },
          { r: 1, c: 1, mark: "dot" },
          { r: 2, c: 0, mark: "dot" },
          { r: 2, c: 2, mark: "dot" },
          { r: 3, c: 1, mark: "dot" },
        ],
      },
    },
    {
      id: "A",
      name: "士／仕",
      badge: "仕",
      how: "只在九宮裡，斜斜走一格。",
      limit: "不能離開九宮，也不能直走。",
      tip: "貼著王旁邊保護他。",
      grid: {
        rows: 4,
        cols: 3,
        cells: [
          { r: 2, c: 1, piece: "仕", mark: "from" },
          { r: 1, c: 0, mark: "dot" },
          { r: 1, c: 2, mark: "dot" },
          { r: 3, c: 0, mark: "dot" },
          { r: 3, c: 2, mark: "dot" },
        ],
      },
    },
    {
      id: "B",
      name: "象／相",
      badge: "相",
      how: "斜斜走兩格（像畫一個「田」）。",
      limit: "田中間有棋就不能走；也不能過河。",
      tip: "大象站這邊守護，不過河去玩。",
      grid: {
        rows: 5,
        cols: 5,
        cells: [
          { r: 3, c: 2, piece: "相", mark: "from" },
          { r: 1, c: 0, mark: "dot" },
          { r: 1, c: 4, mark: "dot" },
          { r: 2, c: 1, mark: "block" },
          { r: 2, c: 3, mark: "block" },
        ],
      },
    },
    {
      id: "N",
      name: "馬／傌",
      badge: "傌",
      how: "走一個「日」字：先直一格，再斜一格。",
      limit: "正前方（或正側）有棋擋住＝蹩馬腿，不能跳。",
      tip: "馬不能飛，前面有擋就不能走。",
      grid: {
        rows: 5,
        cols: 5,
        cells: [
          { r: 2, c: 2, piece: "傌", mark: "from" },
          { r: 0, c: 1, mark: "dot" },
          { r: 0, c: 3, mark: "dot" },
          { r: 1, c: 0, mark: "dot" },
          { r: 1, c: 4, mark: "dot" },
          { r: 3, c: 0, mark: "dot" },
          { r: 3, c: 4, mark: "dot" },
          { r: 4, c: 1, mark: "dot" },
          { r: 4, c: 3, mark: "dot" },
          { r: 1, c: 2, mark: "block" },
        ],
      },
    },
    {
      id: "R",
      name: "車／俥",
      badge: "俥",
      how: "直的或橫的，想走多遠都可以。",
      limit: "路中間不能有棋擋住；吃子停在對方棋上。",
      tip: "最直的火車軌道！",
      grid: {
        rows: 5,
        cols: 5,
        cells: [
          { r: 2, c: 2, piece: "俥", mark: "from" },
          { r: 0, c: 2, mark: "dot" },
          { r: 1, c: 2, mark: "dot" },
          { r: 3, c: 2, mark: "dot" },
          { r: 4, c: 2, mark: "dot" },
          { r: 2, c: 0, mark: "dot" },
          { r: 2, c: 1, mark: "dot" },
          { r: 2, c: 3, mark: "dot" },
          { r: 2, c: 4, mark: "dot" },
        ],
      },
    },
    {
      id: "C",
      name: "炮／包",
      badge: "炮",
      how: "平常走路跟車一樣：直橫走。",
      limit: "要吃子時，中間一定要隔一顆棋當「炮架」。",
      tip: "走路自由；吃人要隔一座橋。",
      grid: {
        rows: 5,
        cols: 5,
        cells: [
          { r: 2, c: 0, piece: "炮", mark: "from" },
          { r: 2, c: 1, mark: "dot" },
          { r: 2, c: 2, piece: "兵", mark: "block" },
          { r: 2, c: 4, piece: "卒", mark: "x" },
        ],
      },
    },
    {
      id: "P",
      name: "兵／卒",
      badge: "兵",
      how: "沒過河：只能往前走一格。過河後：可以往前或左右。",
      limit: "永遠不能後退。",
      tip: "過河的小兵變勇敢，可以左右移動。",
      grid: {
        rows: 5,
        cols: 5,
        cells: [
          { r: 3, c: 2, piece: "兵", mark: "from" },
          { r: 2, c: 2, mark: "dot" },
          { r: 1, c: 1, piece: "兵", mark: "from" },
          { r: 0, c: 1, mark: "dot" },
          { r: 1, c: 0, mark: "dot" },
          { r: 1, c: 2, mark: "dot" },
        ],
      },
    },
  ],
};

/** 選子時一句話（對局提示） */
export const XIANGQI_PIECE_HINT = {
  K: "將／帥：九宮裡直橫一格",
  k: "將／帥：九宮裡直橫一格",
  A: "士：九宮裡斜走一格",
  a: "士：九宮裡斜走一格",
  B: "象：斜兩格，不過河、不塞眼",
  b: "象：斜兩格，不過河、不塞眼",
  N: "馬：走日，前面擋住就不能跳",
  n: "馬：走日，前面擋住就不能跳",
  R: "車：直橫走，中間不能擋",
  r: "車：直橫走，中間不能擋",
  C: "炮：走路像車，吃子要隔一子",
  c: "炮：走路像車，吃子要隔一子",
  P: "兵：未過河向前；過河可左右，不退",
  p: "卒：未過河向前；過河可左右，不退",
};
