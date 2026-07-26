/** 國際象棋規則：白先、FEN、易位／過路兵／升變、將軍將死逼和 */

export const ROWS = 8;
export const COLS = 8;

/** @typedef {"white"|"black"} ChessSide */
/** @typedef {{ from:[number,number], to:[number,number], promotion?: string, capture?: string, castle?: "K"|"Q"|"k"|"q", enPassant?: boolean }} ChessMove */

export const PIECE_NAME_ZH = {
  K: "王",
  Q: "后",
  R: "車",
  B: "象",
  N: "馬",
  P: "兵",
  k: "王",
  q: "后",
  r: "車",
  b: "象",
  n: "馬",
  p: "兵",
};

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/**
 * @typedef {object} ChessPosition
 * @property {string[][]} board
 * @property {ChessSide} turn
 * @property {{ K:boolean, Q:boolean, k:boolean, q:boolean }} castling
 * @property {[number,number]|null} epTarget
 * @property {number} halfmove
 * @property {number} fullmove
 */

export function createPosition() {
  return positionFromFen(START_FEN);
}

export function clonePosition(pos) {
  return {
    board: pos.board.map((row) => [...row]),
    turn: pos.turn,
    castling: { ...pos.castling },
    epTarget: pos.epTarget ? /** @type {[number,number]} */ ([pos.epTarget[0], pos.epTarget[1]]) : null,
    halfmove: pos.halfmove,
    fullmove: pos.fullmove,
  };
}

export function sideOfPiece(piece) {
  if (!piece) return null;
  return piece === piece.toUpperCase() ? "white" : "black";
}

export function opponent(side) {
  return side === "white" ? "black" : "white";
}

export function shouldFlipBoardForSide(side) {
  return side === "black";
}

function onBoard(r, c) {
  return r >= 0 && r < ROWS && c >= 0 && c < COLS;
}

export function findKing(board, side) {
  const king = side === "white" ? "K" : "k";
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] === king) return /** @type {[number,number]} */ ([r, c]);
    }
  }
  return null;
}

/**
 * @param {string} fen
 * @returns {ChessPosition}
 */
export function positionFromFen(fen) {
  const parts = fen.trim().split(/\s+/);
  const rows = parts[0].split("/");
  const board = Array.from({ length: ROWS }, () => Array(COLS).fill(""));
  for (let r = 0; r < 8; r++) {
    let c = 0;
    for (const ch of rows[r] || "") {
      if (ch >= "1" && ch <= "8") {
        c += Number(ch);
      } else {
        board[r][c] = ch;
        c += 1;
      }
    }
  }
  const turn = parts[1] === "b" ? "black" : "white";
  const castleStr = parts[2] || "-";
  const castling = {
    K: castleStr.includes("K"),
    Q: castleStr.includes("Q"),
    k: castleStr.includes("k"),
    q: castleStr.includes("q"),
  };
  let epTarget = null;
  if (parts[3] && parts[3] !== "-") {
    const file = parts[3].charCodeAt(0) - 97;
    const rank = Number(parts[3][1]);
    const row = 8 - rank;
    if (onBoard(row, file)) epTarget = [row, file];
  }
  return {
    board,
    turn,
    castling,
    epTarget,
    halfmove: Number(parts[4] || 0),
    fullmove: Number(parts[5] || 1),
  };
}

/**
 * @param {ChessPosition} pos
 */
export function positionToFen(pos) {
  const rows = [];
  for (let r = 0; r < 8; r++) {
    let empty = 0;
    let line = "";
    for (let c = 0; c < 8; c++) {
      const p = pos.board[r][c];
      if (!p) {
        empty += 1;
      } else {
        if (empty) {
          line += String(empty);
          empty = 0;
        }
        line += p;
      }
    }
    if (empty) line += String(empty);
    rows.push(line);
  }
  let castle = "";
  if (pos.castling.K) castle += "K";
  if (pos.castling.Q) castle += "Q";
  if (pos.castling.k) castle += "k";
  if (pos.castling.q) castle += "q";
  if (!castle) castle = "-";
  let ep = "-";
  if (pos.epTarget) {
    const [r, c] = pos.epTarget;
    ep = `${String.fromCharCode(97 + c)}${8 - r}`;
  }
  return `${rows.join("/")} ${pos.turn === "white" ? "w" : "b"} ${castle} ${ep} ${pos.halfmove} ${pos.fullmove}`;
}

function squareAttacked(board, r, c, bySide) {
  const enemyPawn = bySide === "white" ? "P" : "p";
  const pawnDir = bySide === "white" ? 1 : -1;
  for (const dc of [-1, 1]) {
    const pr = r + pawnDir;
    const pc = c + dc;
    if (onBoard(pr, pc) && board[pr][pc] === enemyPawn) return true;
  }

  for (const [dr, dc] of [
    [-2, -1],
    [-2, 1],
    [-1, -2],
    [-1, 2],
    [1, -2],
    [1, 2],
    [2, -1],
    [2, 1],
  ]) {
    const nr = r + dr;
    const nc = c + dc;
    if (!onBoard(nr, nc)) continue;
    const p = board[nr][nc];
    if (p && sideOfPiece(p) === bySide && p.toLowerCase() === "n") return true;
  }

  for (const [dr, dc] of [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ]) {
    const nr = r + dr;
    const nc = c + dc;
    if (!onBoard(nr, nc)) continue;
    const p = board[nr][nc];
    if (p && sideOfPiece(p) === bySide && p.toLowerCase() === "k") return true;
  }

  const rays = [
    [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ],
    [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ],
  ];
  for (let ri = 0; ri < 2; ri++) {
    for (const [dr, dc] of rays[ri]) {
      let nr = r + dr;
      let nc = c + dc;
      while (onBoard(nr, nc)) {
        const p = board[nr][nc];
        if (p) {
          if (sideOfPiece(p) === bySide) {
            const t = p.toLowerCase();
            if (t === "q") return true;
            if (ri === 0 && t === "r") return true;
            if (ri === 1 && t === "b") return true;
          }
          break;
        }
        nr += dr;
        nc += dc;
      }
    }
  }
  return false;
}

export function isInCheck(board, side) {
  const king = findKing(board, side);
  if (!king) return false;
  return squareAttacked(board, king[0], king[1], opponent(side));
}

function addSlide(board, r, c, side, deltas, moves) {
  for (const [dr, dc] of deltas) {
    let nr = r + dr;
    let nc = c + dc;
    while (onBoard(nr, nc)) {
      const t = board[nr][nc];
      if (!t) {
        moves.push({ from: [r, c], to: [nr, nc] });
      } else {
        if (sideOfPiece(t) !== side) moves.push({ from: [r, c], to: [nr, nc], capture: t });
        break;
      }
      nr += dr;
      nc += dc;
    }
  }
}

function genPseudoMoves(pos, r, c) {
  const piece = pos.board[r][c];
  if (!piece) return [];
  const side = sideOfPiece(piece);
  if (!side || side !== pos.turn) return [];
  /** @type {ChessMove[]} */
  const moves = [];
  const type = piece.toLowerCase();
  const board = pos.board;

  if (type === "p") {
    const dir = side === "white" ? -1 : 1;
    const startRow = side === "white" ? 6 : 1;
    const promoRow = side === "white" ? 0 : 7;
    const oneR = r + dir;
    if (onBoard(oneR, c) && !board[oneR][c]) {
      pushPawnMoves(moves, r, c, oneR, c, promoRow, side);
      const twoR = r + dir * 2;
      if (r === startRow && onBoard(twoR, c) && !board[twoR][c]) {
        moves.push({ from: [r, c], to: [twoR, c] });
      }
    }
    for (const dc of [-1, 1]) {
      const nr = r + dir;
      const nc = c + dc;
      if (!onBoard(nr, nc)) continue;
      const t = board[nr][nc];
      if (t && sideOfPiece(t) !== side) {
        pushPawnMoves(moves, r, c, nr, nc, promoRow, side, t);
      } else if (pos.epTarget && pos.epTarget[0] === nr && pos.epTarget[1] === nc) {
        moves.push({
          from: [r, c],
          to: [nr, nc],
          enPassant: true,
          capture: side === "white" ? "p" : "P",
        });
      }
    }
    return moves;
  }

  if (type === "n") {
    for (const [dr, dc] of [
      [-2, -1],
      [-2, 1],
      [-1, -2],
      [-1, 2],
      [1, -2],
      [1, 2],
      [2, -1],
      [2, 1],
    ]) {
      const nr = r + dr;
      const nc = c + dc;
      if (!onBoard(nr, nc)) continue;
      const t = board[nr][nc];
      if (!t) moves.push({ from: [r, c], to: [nr, nc] });
      else if (sideOfPiece(t) !== side) moves.push({ from: [r, c], to: [nr, nc], capture: t });
    }
    return moves;
  }

  if (type === "b") {
    addSlide(
      board,
      r,
      c,
      side,
      [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ],
      moves,
    );
    return moves;
  }

  if (type === "r") {
    addSlide(
      board,
      r,
      c,
      side,
      [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ],
      moves,
    );
    return moves;
  }

  if (type === "q") {
    addSlide(
      board,
      r,
      c,
      side,
      [
        [-1, -1],
        [-1, 0],
        [-1, 1],
        [0, -1],
        [0, 1],
        [1, -1],
        [1, 0],
        [1, 1],
      ],
      moves,
    );
    return moves;
  }

  if (type === "k") {
    for (const [dr, dc] of [
      [-1, -1],
      [-1, 0],
      [-1, 1],
      [0, -1],
      [0, 1],
      [1, -1],
      [1, 0],
      [1, 1],
    ]) {
      const nr = r + dr;
      const nc = c + dc;
      if (!onBoard(nr, nc)) continue;
      const t = board[nr][nc];
      if (!t) moves.push({ from: [r, c], to: [nr, nc] });
      else if (sideOfPiece(t) !== side) moves.push({ from: [r, c], to: [nr, nc], capture: t });
    }
    // castling
    if (!isInCheck(board, side)) {
      if (side === "white" && r === 7 && c === 4) {
        if (pos.castling.K && !board[7][5] && !board[7][6] && board[7][7] === "R") {
          if (!squareAttacked(board, 7, 5, "black") && !squareAttacked(board, 7, 6, "black")) {
            moves.push({ from: [7, 4], to: [7, 6], castle: "K" });
          }
        }
        if (pos.castling.Q && !board[7][3] && !board[7][2] && !board[7][1] && board[7][0] === "R") {
          if (!squareAttacked(board, 7, 3, "black") && !squareAttacked(board, 7, 2, "black")) {
            moves.push({ from: [7, 4], to: [7, 2], castle: "Q" });
          }
        }
      }
      if (side === "black" && r === 0 && c === 4) {
        if (pos.castling.k && !board[0][5] && !board[0][6] && board[0][7] === "r") {
          if (!squareAttacked(board, 0, 5, "white") && !squareAttacked(board, 0, 6, "white")) {
            moves.push({ from: [0, 4], to: [0, 6], castle: "k" });
          }
        }
        if (pos.castling.q && !board[0][3] && !board[0][2] && !board[0][1] && board[0][0] === "r") {
          if (!squareAttacked(board, 0, 3, "white") && !squareAttacked(board, 0, 2, "white")) {
            moves.push({ from: [0, 4], to: [0, 2], castle: "q" });
          }
        }
      }
    }
  }
  return moves;
}

function pushPawnMoves(moves, fr, fc, tr, tc, promoRow, side, capture) {
  if (tr === promoRow) {
    for (const promo of side === "white" ? ["Q", "R", "B", "N"] : ["q", "r", "b", "n"]) {
      moves.push({ from: [fr, fc], to: [tr, tc], promotion: promo, capture });
    }
  } else {
    moves.push({ from: [fr, fc], to: [tr, tc], capture });
  }
}

/**
 * @param {ChessPosition} pos
 * @param {ChessMove} move
 * @returns {ChessPosition}
 */
export function applyMove(pos, move) {
  const next = clonePosition(pos);
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;
  const piece = next.board[fr][fc];
  const side = sideOfPiece(piece);

  next.board[fr][fc] = "";
  if (move.enPassant) {
    const capR = side === "white" ? tr + 1 : tr - 1;
    next.board[capR][tc] = "";
  }
  if (move.castle === "K") {
    next.board[7][7] = "";
    next.board[7][5] = "R";
  } else if (move.castle === "Q") {
    next.board[7][0] = "";
    next.board[7][3] = "R";
  } else if (move.castle === "k") {
    next.board[0][7] = "";
    next.board[0][5] = "r";
  } else if (move.castle === "q") {
    next.board[0][0] = "";
    next.board[0][3] = "r";
  }

  const placed = move.promotion || piece;
  next.board[tr][tc] = placed;

  // castling rights
  if (piece === "K") {
    next.castling.K = false;
    next.castling.Q = false;
  }
  if (piece === "k") {
    next.castling.k = false;
    next.castling.q = false;
  }
  if (fr === 7 && fc === 0) next.castling.Q = false;
  if (fr === 7 && fc === 7) next.castling.K = false;
  if (fr === 0 && fc === 0) next.castling.q = false;
  if (fr === 0 && fc === 7) next.castling.k = false;
  if (tr === 7 && tc === 0) next.castling.Q = false;
  if (tr === 7 && tc === 7) next.castling.K = false;
  if (tr === 0 && tc === 0) next.castling.q = false;
  if (tr === 0 && tc === 7) next.castling.k = false;

  // en passant target
  next.epTarget = null;
  if (piece?.toLowerCase() === "p" && Math.abs(tr - fr) === 2) {
    next.epTarget = [(fr + tr) / 2, fc];
  }

  const captured = move.capture || move.enPassant;
  if (piece?.toLowerCase() === "p" || captured) next.halfmove = 0;
  else next.halfmove += 1;

  if (side === "black") next.fullmove += 1;
  next.turn = opponent(/** @type {ChessSide} */ (side));
  return next;
}

function isLegalMove(pos, move) {
  const next = applyMove(pos, move);
  return !isInCheck(next.board, pos.turn);
}

/**
 * @param {ChessPosition} pos
 * @param {number} [fromR]
 * @param {number} [fromC]
 * @returns {ChessMove[]}
 */
export function getLegalMoves(pos, fromR, fromC) {
  /** @type {ChessMove[]} */
  const out = [];
  const scan = (r, c) => {
    for (const m of genPseudoMoves(pos, r, c)) {
      if (isLegalMove(pos, m)) out.push(m);
    }
  };
  if (fromR != null && fromC != null) {
    scan(fromR, fromC);
  } else {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = pos.board[r][c];
        if (p && sideOfPiece(p) === pos.turn) scan(r, c);
      }
    }
  }
  return out;
}

export function getLegalMovesFrom(pos, r, c) {
  return getLegalMoves(pos, r, c);
}

/**
 * @param {ChessPosition} pos
 * @returns {{ winner: ChessSide|null, reason: string } | null}
 */
export function gameResult(pos) {
  const moves = getLegalMoves(pos);
  const inCheck = isInCheck(pos.board, pos.turn);
  if (moves.length === 0) {
    if (inCheck) {
      return {
        winner: opponent(pos.turn),
        reason: "將死",
      };
    }
    return { winner: null, reason: "逼和（無子可走）" };
  }
  if (pos.halfmove >= 100) {
    return { winner: null, reason: "和棋（50 步規則）" };
  }
  return null;
}

export function pieceValue(piece) {
  const map = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  return map[piece?.toLowerCase()] || 0;
}
