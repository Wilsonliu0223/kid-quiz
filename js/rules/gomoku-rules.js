/** 五子棋連珠：黑棋禁手圖鑑 */

export const GOMOKU_RULES = {
  gameId: "gomoku",
  title: "五子棋小教室（連珠）",
  piecesTab: "禁手",
  how: [
    {
      title: "怎麼算贏？",
      lines: [
        "15×15 棋盤，交叉點落子。黑先。",
        "先把五顆同色連成一線（直、橫、斜）就贏。",
      ],
    },
    {
      title: "為什麼黑棋有禁手？",
      lines: [
        "黑先手太強，連珠規則規定：黑不能下「三三、四四、長連」。",
        "白棋沒有禁手，這些形都可以下。",
      ],
      tip: "本站沒有「開局交換」等比賽開局法，只有這三種黑棋禁手。",
    },
    {
      title: "五連優先",
      lines: [
        "如果黑這一手已經連成剛好五子，就算贏。",
        "不會因為同時像禁手而被判輸。",
      ],
    },
  ],
  pieces: [
    {
      id: "33",
      name: "三三",
      badge: "三三",
      how: "黑一子同時做出兩個「活三」（兩邊都能長成四的三）。",
      limit: "假三、被擋住的三不算。盤上禁手格會標 ✕。",
      tip: "兩個活三太厲害，所以黑不能同時做。",
      grid: {
        rows: 5,
        cols: 5,
        cells: [
          { r: 2, c: 2, piece: "●", mark: "from" },
          { r: 2, c: 1, piece: "●" },
          { r: 2, c: 3, piece: "●" },
          { r: 1, c: 2, piece: "●" },
          { r: 3, c: 2, piece: "●" },
          { r: 2, c: 0, mark: "bad" },
          { r: 2, c: 4, mark: "bad" },
          { r: 0, c: 2, mark: "bad" },
          { r: 4, c: 2, mark: "bad" },
        ],
      },
    },
    {
      id: "44",
      name: "四四",
      badge: "四四",
      how: "黑一子同時做出兩個「四」（差一顆就五連）。",
      limit: "活四、衝四都算「四」。白棋可以四四。",
      tip: "兩個四等於必勝，所以只禁黑。",
      grid: {
        rows: 5,
        cols: 5,
        cells: [
          { r: 2, c: 2, piece: "●", mark: "from" },
          { r: 2, c: 0, piece: "●" },
          { r: 2, c: 1, piece: "●" },
          { r: 2, c: 3, piece: "●" },
          { r: 0, c: 2, piece: "●" },
          { r: 1, c: 2, piece: "●" },
          { r: 3, c: 2, piece: "●" },
        ],
      },
    },
    {
      id: "overline",
      name: "長連",
      badge: "六+",
      how: "黑連成六顆或更多（同一直線）＝長連禁手，這手無效。",
      limit: "剛好五連是贏。六連以上才禁。白棋長連仍可算連五贏。",
      tip: "黑只要五，不要六。",
      grid: {
        rows: 3,
        cols: 7,
        cells: [
          { r: 1, c: 0, piece: "●" },
          { r: 1, c: 1, piece: "●" },
          { r: 1, c: 2, piece: "●" },
          { r: 1, c: 3, piece: "●", mark: "from" },
          { r: 1, c: 4, piece: "●" },
          { r: 1, c: 5, piece: "●" },
          { r: 1, c: 6, mark: "bad" },
        ],
      },
    },
  ],
  specials: [
    {
      id: "white",
      name: "白棋無禁手",
      badge: "白",
      how: "白可以三三、四四、長連。先連五就贏。",
      limit: "只有黑要避開 ✕ 格。",
      tip: "所以執白比較好守、也可以用禁手逼黑。",
      grid: {
        rows: 3,
        cols: 3,
        cells: [
          { r: 1, c: 1, piece: "○", mark: "from" },
          { r: 1, c: 0, mark: "dot" },
          { r: 1, c: 2, mark: "dot" },
          { r: 0, c: 1, mark: "dot" },
          { r: 2, c: 1, mark: "dot" },
        ],
      },
    },
  ],
};

export const GOMOKU_PIECE_HINT = {};
