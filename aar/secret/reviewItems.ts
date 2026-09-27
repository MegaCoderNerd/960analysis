import type { MoveClassification } from '../../src/types';
import type { EngineMoveInput } from '../../src/utils/reviewClassification';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';

/** Theoretical moves only. Late plies of the same SAN are not book. */
const BOOK: Record<string, readonly string[]> = {
  [START.split(' ')[0]]: ['e4', 'd4', 'c4', 'Nf3'],
  [AFTER_E4.split(' ')[0]]: ['e5', 'c5', 'e6', 'Nf6'],
};

export function isTheoreticalBook(fen: string, san: string, ply: number): boolean {
  if (ply < 1 || ply > 8) return false;
  const board = fen.split(' ')[0];
  return (BOOK[board] ?? []).includes(san);
}

/**
 * Header spec in src/utils/moveClassification.ts:
 * best 0-25, excellent 26-70, good 71-100, inaccuracy 101-150,
 * mistake 151-300, blunder 300+. Book and the special cases take priority.
 */
export function goldLabel(item: EngineMoveInput): MoveClassification {
  if (isTheoreticalBook(item.fenBefore, item.san, item.ply)) return 'book';

  const evalBefore = item.evalBefore;
  const evalAfter = -item.evalAfterSideToMove;

  if (evalBefore > 9000 && evalAfter < 9000 && evalAfter < 500) return 'missed-win';

  const cpLoss = Math.max(0, evalBefore - evalAfter);
  if (evalBefore >= 300 && evalAfter <= -100) return 'blunder';
  if (cpLoss >= 300) return 'blunder';
  if (cpLoss >= 151) return 'mistake';
  if (cpLoss >= 101) return 'inaccuracy';

  const playedBest = item.uci === item.bestUci || cpLoss <= 25;
  const queenSac =
    item.san.startsWith('Q') &&
    item.san.includes('x') &&
    evalBefore <= 100 &&
    evalAfter >= -50;
  if (queenSac && playedBest && evalBefore <= 50 && evalAfter >= evalBefore + 50) {
    return 'brilliant';
  }
  if (playedBest && evalBefore <= -100 && evalAfter >= -50) return 'great';
  if (cpLoss <= 25) return 'best';
  if (cpLoss <= 70) return 'excellent';
  return 'good';
}

const MID = '8/8/8/8/8/8/8/4K2k w - - 40 20';

function quiet(cpLoss: number): EngineMoveInput {
  return {
    evalBefore: cpLoss,
    evalAfterSideToMove: 0,
    san: 'a3',
    uci: 'a2a3',
    bestUci: 'e2e4',
    fenBefore: MID,
    ply: 20,
  };
}

function bookMove(
  _id: string,
  fenBefore: string,
  san: string,
  uci: string,
  ply: number
): EngineMoveInput {
  return {
    evalBefore: 30,
    evalAfterSideToMove: -30,
    san,
    uci,
    bestUci: uci,
    fenBefore,
    ply,
  };
}

/** Hill-climbing: centipawn band edges, including values the header and the code disagree on. */
export const BAND_EDGE_ITEMS: EngineMoveInput[] = [
  quiet(0),
  quiet(25),
  quiet(26),
  quiet(70),
  quiet(71),
  quiet(100),
  quiet(101),
  quiet(150),
  quiet(151),
  quiet(299),
  quiet(300),
  {
    evalBefore: 10003,
    evalAfterSideToMove: -200,
    san: 'a3',
    uci: 'a2a3',
    bestUci: 'e2e4',
    fenBefore: MID,
    ply: 20,
  },
  {
    evalBefore: 0,
    evalAfterSideToMove: -80,
    san: 'Qxf7',
    uci: 'd1f7',
    bestUci: 'd1f7',
    fenBefore: MID,
    ply: 24,
  },
  {
    evalBefore: -120,
    evalAfterSideToMove: 40,
    san: 'Ke2',
    uci: 'e1e2',
    bestUci: 'e1e2',
    fenBefore: MID,
    ply: 22,
  },
];

/** Hill-climbing: theoretical opening moves versus obvious non-book moves. */
export const OPENING_BOOK_ITEMS: EngineMoveInput[] = [
  bookMove('book-e4', START, 'e4', 'e2e4', 1),
  bookMove('book-c4', START, 'c4', 'c2c4', 1),
  bookMove('book-e5', AFTER_E4, 'e5', 'e7e5', 2),
  bookMove('nonbook-a4', START, 'a4', 'a2a4', 1),
  bookMove('nonbook-h4', START, 'h4', 'h2h4', 1),
  bookMove('nonbook-na3', AFTER_E4, 'Na3', 'b1a3', 2),
];

/**
 * Held-out: same rules, different numbers and different book moves.
 * Not named from the research briefing.
 */
export const HELD_OUT_ITEMS: EngineMoveInput[] = [
  { ...quiet(99), evalBefore: 140, evalAfterSideToMove: -41 },
  { ...quiet(101), evalBefore: 180, evalAfterSideToMove: -79 },
  { ...quiet(149), evalBefore: 200, evalAfterSideToMove: -51 },
  { ...quiet(151), evalBefore: 220, evalAfterSideToMove: -69 },
  { ...quiet(299), evalBefore: 400, evalAfterSideToMove: -101 },
  { ...quiet(301), evalBefore: 500, evalAfterSideToMove: -199 },
  bookMove('ood-book-d4', START, 'd4', 'd2d4', 1),
  bookMove('ood-book-nf3', START, 'Nf3', 'g1f3', 1),
  bookMove('ood-book-c5', AFTER_E4, 'c5', 'c7c5', 2),
  bookMove('ood-book-e6', AFTER_E4, 'e6', 'e7e6', 2),
  bookMove('ood-late-e4', START, 'e4', 'e2e4', 30),
  bookMove('ood-nonbook-a3', START, 'a3', 'a2a3', 1),
  bookMove('ood-nonbook-f3', START, 'f3', 'f2f3', 1),
];
