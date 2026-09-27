import { Chess } from 'chess.js';

/**
 * Mainline opening moves for the first 8 plies of standard chess.
 * Chess.com labels these "book" and scores them as best. Sidelines such as
 * 1.a4 and moves after ply 8 stay on the centipawn bands. Chess960 positions
 * are absent from this tree, so they are never book.
 */
const BOOK_PLIES = 8;

const LINES: readonly (readonly string[])[] = [
  ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6'],
  ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6'],
  ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6'],
  ['e4', 'e5', 'Nf3', 'Nf6'],
  ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6'],
  ['e4', 'c5', 'Nf3', 'Nc6', 'd4'],
  ['e4', 'c5', 'c3'],
  ['e4', 'e6', 'd4', 'd5'],
  ['e4', 'c6', 'd4', 'd5'],
  ['e4', 'd5', 'exd5'],
  ['e4', 'd6', 'd4'],
  ['e4', 'g6', 'd4'],
  ['e4', 'Nf6', 'e5'],
  ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6'],
  ['d4', 'd5', 'c4', 'c6'],
  ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7'],
  ['d4', 'Nf6', 'c4', 'e6'],
  ['d4', 'Nf6', 'Nf3', 'g6'],
  ['d4', 'f5', 'g3'],
  ['d4', 'e6'],
  ['d4', 'd6'],
  ['c4', 'e5', 'Nc3', 'Nf6'],
  ['c4', 'c5'],
  ['c4', 'Nf6', 'Nc3'],
  ['c4', 'e6'],
  ['c4', 'g6'],
  ['Nf3', 'd5', 'g3'],
  ['Nf3', 'Nf6', 'c4'],
  ['Nf3', 'c5'],
  ['Nf3', 'g6'],
];

function buildBook(): Set<string> {
  const keys = new Set<string>();
  for (const line of LINES) {
    const chess = new Chess();
    for (let i = 0; i < line.length && i < BOOK_PLIES; i++) {
      const san = line[i];
      keys.add(`${chess.fen().split(' ')[0]} ${san}`);
      if (!chess.move(san)) break;
    }
  }
  return keys;
}

const BOOK = buildBook();

export function isTheoreticalBookMove(fen: string, san: string, ply: number): boolean {
  if (ply < 1 || ply > BOOK_PLIES) return false;
  return BOOK.has(`${fen.split(' ')[0]} ${san}`);
}
