/**
 * Chess 960 (Fischer Random) utilities using FIDE / Scharnagl numbering.
 * Position 518 is the standard chess starting array RNBQKBNR.
 */

export type BoardSquare = string | null;
export type Board = BoardSquare[][];

const FILE_LETTERS = 'abcdefgh';
const KNIGHT_COMBOS: Array<[number, number]> = [
  [0, 1], [0, 2], [0, 3], [0, 4],
  [1, 2], [1, 3], [1, 4],
  [2, 3], [2, 4],
  [3, 4],
];

const LIGHT_BISHOP_FILES = [1, 3, 5, 7];
const DARK_BISHOP_FILES = [0, 2, 4, 6];

let cachedPositions: string[] | null = null;

export function getChess960StartingPosition(positionNumber: number): string {
  if (positionNumber < 1 || positionNumber > 960) {
    throw new Error('Position number must be between 1 and 960');
  }
  // Scharnagl N is 0-959. Display IDs are 1-960 with 960 wrapping to N=0.
  // Position 518 is the standard chess array.
  return getAllChess960Boards()[positionNumber % 960];
}

export function identifyChess960Position(fen: string): number | null {
  const board = fen.split(' ')[0];
  const index = getAllChess960Boards().indexOf(board);
  if (index < 0) return null;
  return index === 0 ? 960 : index;
}

export function isStandardStartingPosition(fen: string): boolean {
  const board = fen.split(' ')[0];
  return board === 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
}

export function isChess960Fen(fen: string): boolean {
  const parts = fen.split(' ');
  const rights = parts[2] || '';
  if (/[A-Ha-h]/.test(rights) && !/^[KQkq-]+$/.test(rights)) {
    return true;
  }
  const id = identifyChess960Position(fen);
  return id !== null && id !== 518;
}

export function isChess960Pgn(pgn: string): boolean {
  if (
    /Variant\s+"Chess960"/i.test(pgn) ||
    /Chess960/i.test(pgn) ||
    /fischerandom/i.test(pgn)
  ) {
    return true;
  }
  const fenMatch = pgn.match(/\[FEN\s+"([^"]+)"\]/);
  if (!fenMatch) return false;
  return isChess960Fen(fenMatch[1]);
}

function getAllChess960Boards(): string[] {
  if (cachedPositions) return cachedPositions;
  const positions: string[] = [];
  for (let n = 0; n < 960; n++) {
    positions.push(scharnaglBoard(n));
  }
  cachedPositions = positions;
  return positions;
}

function scharnaglBoard(n: number): string {
  const pieces = ['', '', '', '', '', '', '', ''];
  const nB = n % 16;
  const nQ = Math.floor(n / 16) % 6;
  const nN = Math.floor(n / 96);

  pieces[LIGHT_BISHOP_FILES[nB % 4]] = 'B';
  pieces[DARK_BISHOP_FILES[Math.floor(nB / 4)]] = 'B';

  const emptyAfterBishops = emptyIndices(pieces);
  pieces[emptyAfterBishops[nQ]] = 'Q';

  const emptyAfterQueen = emptyIndices(pieces);
  const [n1, n2] = KNIGHT_COMBOS[nN];
  pieces[emptyAfterQueen[n1]] = 'N';
  pieces[emptyAfterQueen[n2]] = 'N';

  const remaining = emptyIndices(pieces);
  pieces[remaining[0]] = 'R';
  pieces[remaining[1]] = 'K';
  pieces[remaining[2]] = 'R';

  const rank1 = pieces.join('');
  const rank8 = rank1.toLowerCase();
  return `${rank8}/pppppppp/8/8/8/8/PPPPPPPP/${rank1}`;
}

function emptyIndices(pieces: string[]): number[] {
  return pieces.map((p, i) => (p === '' ? i : -1)).filter((i) => i >= 0);
}

export interface FenParts {
  board: Board;
  turn: 'w' | 'b';
  castling: string;
  ep: string;
  halfmove: string;
  fullmove: string;
}

export function parseFen(fen: string): FenParts {
  const parts = fen.trim().split(/\s+/);
  const rows = parts[0].split('/');
  const board: Board = rows.map((row) => {
    const squares: BoardSquare[] = [];
    for (const char of row) {
      if (/\d/.test(char)) {
        for (let i = 0; i < Number.parseInt(char, 10); i++) squares.push(null);
      } else {
        squares.push(char);
      }
    }
    while (squares.length < 8) squares.push(null);
    return squares.slice(0, 8);
  });
  while (board.length < 8) board.push(Array(8).fill(null));
  return {
    board,
    turn: parts[1] === 'b' ? 'b' : 'w',
    castling: parts[2] || '-',
    ep: parts[3] || '-',
    halfmove: parts[4] || '0',
    fullmove: parts[5] || '1',
  };
}

export function fenToString(parts: FenParts): string {
  const rows = parts.board.map((row) => {
    let out = '';
    let empty = 0;
    for (const square of row) {
      if (!square) {
        empty++;
      } else {
        if (empty > 0) {
          out += empty;
          empty = 0;
        }
        out += square;
      }
    }
    if (empty > 0) out += empty;
    return out;
  });
  return `${rows.join('/')} ${parts.turn} ${parts.castling} ${parts.ep} ${parts.halfmove} ${parts.fullmove}`;
}

export interface CastlingRooks {
  wK: number | null;
  wQ: number | null;
  bK: number | null;
  bQ: number | null;
}

function findKingFile(board: Board, white: boolean): number {
  const row = white ? 7 : 0;
  const king = white ? 'K' : 'k';
  return board[row].findIndex((p) => p === king);
}

function rookFiles(board: Board, white: boolean): number[] {
  const row = white ? 7 : 0;
  const rook = white ? 'R' : 'r';
  const files: number[] = [];
  for (let f = 0; f < 8; f++) {
    if (board[row][f] === rook) files.push(f);
  }
  return files;
}

export function parseCastlingRooks(fen: string): CastlingRooks {
  const parts = parseFen(fen);
  const rights = parts.castling;
  const result: CastlingRooks = { wK: null, wQ: null, bK: null, bQ: null };
  if (!rights || rights === '-') return result;

  const wKing = findKingFile(parts.board, true);
  const bKing = findKingFile(parts.board, false);
  const wRooks = rookFiles(parts.board, true);
  const bRooks = rookFiles(parts.board, false);

  const assignFromLetter = (letter: string) => {
    const isWhite = letter === letter.toUpperCase();
    const file = FILE_LETTERS.indexOf(letter.toLowerCase());
    if (file < 0) return;
    const row = isWhite ? 7 : 0;
    const rook = isWhite ? 'R' : 'r';
    if (parts.board[row][file] !== rook) return;
    const king = isWhite ? wKing : bKing;
    if (file > king) {
      if (isWhite) result.wK = file;
      else result.bK = file;
    } else {
      if (isWhite) result.wQ = file;
      else result.bQ = file;
    }
  };

  if (/^[KQkq]+$/.test(rights)) {
    if (rights.includes('K')) result.wK = wRooks.filter((f) => f > wKing).pop() ?? null;
    if (rights.includes('Q')) result.wQ = wRooks.filter((f) => f < wKing)[0] ?? null;
    if (rights.includes('k')) result.bK = bRooks.filter((f) => f > bKing).pop() ?? null;
    if (rights.includes('q')) result.bQ = bRooks.filter((f) => f < bKing)[0] ?? null;
    return result;
  }

  for (const letter of rights) {
    if (letter === 'K') result.wK = wRooks.filter((f) => f > wKing).pop() ?? null;
    else if (letter === 'Q') result.wQ = wRooks.filter((f) => f < wKing)[0] ?? null;
    else if (letter === 'k') result.bK = bRooks.filter((f) => f > bKing).pop() ?? null;
    else if (letter === 'q') result.bQ = bRooks.filter((f) => f < bKing)[0] ?? null;
    else assignFromLetter(letter);
  }
  return result;
}

/** Convert KQkq X-FEN rights to Shredder-FEN file letters for Stockfish. */
export function toShredderFen(fen: string): string {
  const parts = parseFen(fen);
  if (!parts.castling || parts.castling === '-') return fenToString(parts);
  if (!/^[KQkq]+$/.test(parts.castling)) return fenToString(parts);

  const rooks = parseCastlingRooks(fen);
  let shredder = '';
  if (rooks.wK !== null) shredder += FILE_LETTERS[rooks.wK].toUpperCase();
  if (rooks.wQ !== null) shredder += FILE_LETTERS[rooks.wQ].toUpperCase();
  if (rooks.bK !== null) shredder += FILE_LETTERS[rooks.bK];
  if (rooks.bQ !== null) shredder += FILE_LETTERS[rooks.bQ];
  parts.castling = shredder || '-';
  return fenToString(parts);
}

/** Convert Shredder-FEN file letters to KQkq for chess.js. */
export function toChessJsFen(fen: string): string {
  const parts = parseFen(fen);
  if (!parts.castling || parts.castling === '-' || /^[KQkq]+$/.test(parts.castling)) {
    return fenToString(parts);
  }
  const rooks = parseCastlingRooks(fen);
  let rights = '';
  if (rooks.wK !== null) rights += 'K';
  if (rooks.wQ !== null) rights += 'Q';
  if (rooks.bK !== null) rights += 'k';
  if (rooks.bQ !== null) rights += 'q';
  parts.castling = rights || '-';
  return fenToString(parts);
}

export function squareName(file: number, row: number): string {
  return FILE_LETTERS[file] + String(8 - row);
}

/**
 * Chess960 UCI castling is king-from + rook-from (e.g. e1h1), not king dest.
 */
export function getChess960CastlingUci(fen: string, kingside: boolean): string | null {
  const parts = parseFen(fen);
  const white = parts.turn === 'w';
  const kingFile = findKingFile(parts.board, white);
  if (kingFile < 0) return null;
  const rooks = parseCastlingRooks(fen);
  const rookFile = white
    ? kingside ? rooks.wK : rooks.wQ
    : kingside ? rooks.bK : rooks.bQ;
  if (rookFile === null) return null;
  const row = white ? 7 : 0;
  return squareName(kingFile, row) + squareName(rookFile, row);
}

export function applyChess960Castling(fen: string, isKingside: boolean): string | null {
  const parts = parseFen(fen);
  const white = parts.turn === 'w';
  const row = white ? 7 : 0;
  const kingChar = white ? 'K' : 'k';
  const rookChar = white ? 'R' : 'r';
  const kingFile = findKingFile(parts.board, white);
  if (kingFile < 0) return null;

  const rooks = parseCastlingRooks(fen);
  const rookFile = white
    ? isKingside ? rooks.wK : rooks.wQ
    : isKingside ? rooks.bK : rooks.bQ;
  if (rookFile === null) return null;
  if (parts.board[row][rookFile] !== rookChar) return null;

  const kingDest = isKingside ? 6 : 2;
  const rookDest = isKingside ? 5 : 3;

  const pathVacant = (from: number, to: number) => {
    const start = Math.min(from, to);
    const end = Math.max(from, to);
    for (let f = start; f <= end; f++) {
      if (f === from || f === kingFile || f === rookFile) continue;
      if (parts.board[row][f]) return false;
    }
    return true;
  };
  if (!pathVacant(kingFile, kingDest) || !pathVacant(rookFile, rookDest)) return null;

  const opponentWhite = !white;
  if (isSquareAttacked(parts.board, kingFile, row, opponentWhite)) return null;
  for (const file of betweenInclusive(kingFile, kingDest)) {
    if (isSquareAttacked(parts.board, file, row, opponentWhite)) return null;
  }

  parts.board[row][kingFile] = null;
  parts.board[row][rookFile] = null;
  parts.board[row][kingDest] = kingChar;
  parts.board[row][rookDest] = rookChar;

  parts.turn = white ? 'b' : 'w';
  parts.ep = '-';
  parts.halfmove = String(Number.parseInt(parts.halfmove, 10) + 1);
  if (!white) {
    parts.fullmove = String(Number.parseInt(parts.fullmove, 10) + 1);
  }

  const remaining = parseCastlingRooks(fen);
  if (white) {
    remaining.wK = null;
    remaining.wQ = null;
  } else {
    remaining.bK = null;
    remaining.bQ = null;
  }
  parts.castling = encodeShredderRights(remaining);
  return fenToString(parts);
}

function encodeShredderRights(rooks: CastlingRooks): string {
  let rights = '';
  if (rooks.wK !== null) rights += FILE_LETTERS[rooks.wK].toUpperCase();
  if (rooks.wQ !== null) rights += FILE_LETTERS[rooks.wQ].toUpperCase();
  if (rooks.bK !== null) rights += FILE_LETTERS[rooks.bK];
  if (rooks.bQ !== null) rights += FILE_LETTERS[rooks.bQ];
  return rights || '-';
}

function parseSquare(square: string): { file: number; row: number } | null {
  if (square.length < 2) return null;
  const file = FILE_LETTERS.indexOf(square[0]);
  const rank = Number.parseInt(square[1], 10);
  if (file < 0 || Number.isNaN(rank) || rank < 1 || rank > 8) return null;
  return { file, row: 8 - rank };
}

/**
 * chess.js assumes a/h rooks for KQkq, so it drops 960 rights after any move.
 * Keep Shredder file letters ourselves: clear a right only if that king/rook
 * moved or the rook was captured.
 */
export function rightsAfterStandardMove(
  beforeFen: string,
  from: string,
  to: string
): CastlingRooks {
  const rights = parseCastlingRooks(beforeFen);
  const fromSq = parseSquare(from);
  const toSq = parseSquare(to);
  if (!fromSq || !toSq) return rights;

  const before = parseFen(beforeFen);
  const piece = before.board[fromSq.row][fromSq.file];
  if (!piece) return rights;

  const isWhite = piece === piece.toUpperCase();
  const role = piece.toLowerCase();

  const clearRookAt = (row: number, file: number) => {
    if (row === 7) {
      if (rights.wK === file) rights.wK = null;
      if (rights.wQ === file) rights.wQ = null;
    }
    if (row === 0) {
      if (rights.bK === file) rights.bK = null;
      if (rights.bQ === file) rights.bQ = null;
    }
  };

  if (role === 'k') {
    if (isWhite) {
      rights.wK = null;
      rights.wQ = null;
    } else {
      rights.bK = null;
      rights.bQ = null;
    }
  }

  if (role === 'r') {
    clearRookAt(fromSq.row, fromSq.file);
  }

  clearRookAt(toSq.row, toSq.file);
  return rights;
}

export function applyShredderRights(fen: string, rights: CastlingRooks): string {
  const parts = parseFen(fen);
  parts.castling = encodeShredderRights(rights);
  return fenToString(parts);
}

function betweenInclusive(a: number, b: number): number[] {
  const start = Math.min(a, b);
  const end = Math.max(a, b);
  const files: number[] = [];
  for (let f = start; f <= end; f++) files.push(f);
  return files;
}

const KNIGHT_DELTAS = [
  [1, 2], [2, 1], [-1, 2], [-2, 1],
  [1, -2], [2, -1], [-1, -2], [-2, -1],
];
const KING_DELTAS = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

function inBounds(file: number, row: number): boolean {
  return file >= 0 && file < 8 && row >= 0 && row < 8;
}

function isWhitePiece(piece: string): boolean {
  return piece === piece.toUpperCase();
}

export function isSquareAttacked(board: Board, file: number, row: number, byWhite: boolean): boolean {
  // White pawns sit on higher row indexes (toward rank 1); black the reverse.
  const pawnFromRow = byWhite ? row + 1 : row - 1;
  for (const df of [-1, 1]) {
    const f = file + df;
    const r = pawnFromRow;
    if (inBounds(f, r)) {
      const piece = board[r][f];
      if (piece && isWhitePiece(piece) === byWhite && piece.toLowerCase() === 'p') return true;
    }
  }

  for (const [df, dr] of KNIGHT_DELTAS) {
    const f = file + df;
    const r = row + dr;
    if (!inBounds(f, r)) continue;
    const piece = board[r][f];
    if (piece && isWhitePiece(piece) === byWhite && piece.toLowerCase() === 'n') return true;
  }

  for (const [df, dr] of KING_DELTAS) {
    const f = file + df;
    const r = row + dr;
    if (!inBounds(f, r)) continue;
    const piece = board[r][f];
    if (piece && isWhitePiece(piece) === byWhite && piece.toLowerCase() === 'k') return true;
  }

  const rays: Array<{ deltas: number[][]; pieces: string[] }> = [
    { deltas: [[1, 0], [-1, 0], [0, 1], [0, -1]], pieces: ['r', 'q'] },
    { deltas: [[1, 1], [1, -1], [-1, 1], [-1, -1]], pieces: ['b', 'q'] },
  ];
  for (const ray of rays) {
    for (const [df, dr] of ray.deltas) {
      let f = file + df;
      let r = row + dr;
      while (inBounds(f, r)) {
        const piece = board[r][f];
        if (piece) {
          if (isWhitePiece(piece) === byWhite && ray.pieces.includes(piece.toLowerCase())) {
            return true;
          }
          break;
        }
        f += df;
        r += dr;
      }
    }
  }
  return false;
}

export function getChess960CastlingDests(fen: string): Map<string, string[]> {
  const dests = new Map<string, string[]>();
  const parts = parseFen(fen);
  const white = parts.turn === 'w';
  const kingFile = findKingFile(parts.board, white);
  if (kingFile < 0) return dests;
  const row = white ? 7 : 0;
  const from = squareName(kingFile, row);
  const rooks = parseCastlingRooks(fen);
  const rookFilesForSide = white
    ? [rooks.wK, rooks.wQ]
    : [rooks.bK, rooks.bQ];
  const squares: string[] = [];
  for (const rookFile of rookFilesForSide) {
    if (rookFile === null) continue;
    squares.push(squareName(rookFile, row));
  }
  if (squares.length) dests.set(from, squares);
  return dests;
}
