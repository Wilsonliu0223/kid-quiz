/** 西洋棋：兒童規則圖鑑內容 */

/** @typedef {{ r:number, c:number, piece?:string, mark?:'dot'|'block'|'from'|'x' }} RulesCell */
/** @typedef {{ title:string, lines:string[], tip?:string }} RulesHowCard */
/** @typedef {{ id:string, name:string, badge:string, how:string, limit:string, tip?:string, grid:{rows:number,cols:number,cells:RulesCell[]} }} RulesPiece */

/** @type {{ gameId:'chess', title:string, how:RulesHowCard[], pieces:RulesPiece[] }} */
export const CHESS_RULES = {
  gameId: "chess",
  title: "西洋棋小教室",
  how: [
    {
      title: "誰先走？",
      lines: ["白方先走，然後黑方，再輪流下。", "一次只能動一顆棋。"],
    },
    {
      title: "怎麼算贏？",
      lines: [
        "把對方的「王」將軍到沒有任何方法逃，叫做將死，你就贏了。",
        "如果輪到的人沒有任何合法步可走，但王沒被將軍，叫做逼和（平手）。",
      ],
      tip: "目標不是吃光棋，是「將死」對方的王（西洋棋不會真的把王吃掉）。",
    },
    {
      title: "吃子怎麼吃？",
      lines: [
        "走到對方棋子的格子上，就把那顆棋吃掉（換成你的位置）。",
        "不能走到自己棋子的格子上。",
      ],
    },
    {
      title: "特別招式（先記住名字）",
      lines: [
        "兵走到對方底線：一定要升變成后／車／象／馬（大多選后）。",
        "王車易位：王向車的方向一次走兩格，車跳到王的另一側；中間要空著，王和車都還沒動過，而且王不能被將軍、也不能經過被攻擊的格子。",
        "吃過路兵（進階）：對方兵剛從原位走兩格，停在你兵旁邊時，你可以斜走進它「剛跳過」的那格，把它吃掉。",
      ],
    },
  ],
  pieces: [
    {
      id: "K",
      name: "王",
      badge: "♔",
      how: "周圍八個方向，每次只走一格。",
      limit: "不能走到會被對方攻擊的格子；符合條件時可「王車易位」。",
      tip: "最重要的棋，要好好保護！",
      grid: {
        rows: 3,
        cols: 3,
        cells: [
          { r: 1, c: 1, piece: "♔", mark: "from" },
          { r: 0, c: 0, mark: "dot" },
          { r: 0, c: 1, mark: "dot" },
          { r: 0, c: 2, mark: "dot" },
          { r: 1, c: 0, mark: "dot" },
          { r: 1, c: 2, mark: "dot" },
          { r: 2, c: 0, mark: "dot" },
          { r: 2, c: 1, mark: "dot" },
          { r: 2, c: 2, mark: "dot" },
        ],
      },
    },
    {
      id: "Q",
      name: "后",
      badge: "♕",
      how: "直、橫、斜都可以，想走多遠都行。",
      limit: "路中間不能有棋擋住。",
      tip: "最厲害的棋，像車＋象合體！",
      grid: {
        rows: 5,
        cols: 5,
        cells: [
          { r: 2, c: 2, piece: "♕", mark: "from" },
          { r: 0, c: 2, mark: "dot" },
          { r: 1, c: 2, mark: "dot" },
          { r: 3, c: 2, mark: "dot" },
          { r: 4, c: 2, mark: "dot" },
          { r: 2, c: 0, mark: "dot" },
          { r: 2, c: 1, mark: "dot" },
          { r: 2, c: 3, mark: "dot" },
          { r: 2, c: 4, mark: "dot" },
          { r: 0, c: 0, mark: "dot" },
          { r: 1, c: 1, mark: "dot" },
          { r: 3, c: 3, mark: "dot" },
          { r: 4, c: 4, mark: "dot" },
          { r: 0, c: 4, mark: "dot" },
          { r: 1, c: 3, mark: "dot" },
          { r: 3, c: 1, mark: "dot" },
          { r: 4, c: 0, mark: "dot" },
        ],
      },
    },
    {
      id: "R",
      name: "車",
      badge: "♖",
      how: "直的或橫的，想走多遠都可以。",
      limit: "中間不能擋；符合條件時可跟王一起易位。",
      tip: "像城堡塔樓，走直線。",
      grid: {
        rows: 5,
        cols: 5,
        cells: [
          { r: 2, c: 2, piece: "♖", mark: "from" },
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
      id: "B",
      name: "象",
      badge: "♗",
      how: "只走斜斜的，想走多遠都行。",
      limit: "路中間不能擋；永遠待在同一種顏色格子上。",
      tip: "斜線專家！",
      grid: {
        rows: 5,
        cols: 5,
        cells: [
          { r: 2, c: 2, piece: "♗", mark: "from" },
          { r: 0, c: 0, mark: "dot" },
          { r: 1, c: 1, mark: "dot" },
          { r: 3, c: 3, mark: "dot" },
          { r: 4, c: 4, mark: "dot" },
          { r: 0, c: 4, mark: "dot" },
          { r: 1, c: 3, mark: "dot" },
          { r: 3, c: 1, mark: "dot" },
          { r: 4, c: 0, mark: "dot" },
        ],
      },
    },
    {
      id: "N",
      name: "馬",
      badge: "♘",
      how: "走「L」形：兩格直再一格橫（或兩橫再一直）。",
      limit: "可以跳過其他棋！這點跟象棋的馬不一樣。",
      tip: "西洋棋的馬會飛：前面有棋也能跳過去。",
      grid: {
        rows: 5,
        cols: 5,
        cells: [
          { r: 2, c: 2, piece: "♘", mark: "from" },
          { r: 0, c: 1, mark: "dot" },
          { r: 0, c: 3, mark: "dot" },
          { r: 1, c: 0, mark: "dot" },
          { r: 1, c: 4, mark: "dot" },
          { r: 3, c: 0, mark: "dot" },
          { r: 3, c: 4, mark: "dot" },
          { r: 4, c: 1, mark: "dot" },
          { r: 4, c: 3, mark: "dot" },
        ],
      },
    },
    {
      id: "P",
      name: "兵",
      badge: "♙",
      how: "只能往前走：平常一格；還在原位時第一次可以走兩格。",
      limit: "前面有棋就不能直走。吃子只能斜前方一格。走到對方底線一定要升變。",
      tip: "記住口訣：直走、斜吃。",
      grid: {
        rows: 5,
        cols: 5,
        cells: [
          { r: 3, c: 2, piece: "♙", mark: "from" },
          { r: 2, c: 2, mark: "dot" },
          { r: 1, c: 2, mark: "dot" },
          { r: 2, c: 1, piece: "♟", mark: "x" },
          { r: 2, c: 3, piece: "♟", mark: "x" },
        ],
      },
    },
  ],
};

export const CHESS_PIECE_HINT = {
  K: "王：周圍一格，不能走進被攻擊的格子",
  k: "王：周圍一格，不能走進被攻擊的格子",
  Q: "后：直橫斜都能走很遠",
  q: "后：直橫斜都能走很遠",
  R: "車：直橫走，中間不能擋",
  r: "車：直橫走，中間不能擋",
  B: "象：只走斜線，中間不能擋",
  b: "象：只走斜線，中間不能擋",
  N: "馬：走 L 形，可以跳過棋子",
  n: "馬：走 L 形，可以跳過棋子",
  P: "兵：直走斜吃；原位可走兩格；到底升變",
  p: "兵：直走斜吃；原位可走兩格；到底升變",
};
