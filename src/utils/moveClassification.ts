import type { MoveClassification } from '../types';

/**
 * Chess.com Move Classification System
 * 
 * Based on extensive community research, Chess.com uses these approximate thresholds:
 * 
 * - Best: 0-5 cp loss (played the engine's top choice or equivalent)
 * - Excellent: 5-25 cp loss
 * - Good: 25-75 cp loss  
 * - Inaccuracy: 75-150 cp loss
 * - Mistake: 150-300 cp loss
 * - Blunder: 300+ cp loss OR turning clearly winning into losing/equal
 * - Missed Win: Had forced mate but didn't play it
 * - Brilliant: Best move that's a sacrifice and only good option (very rare)
 * - Great: Best move in critical position that's hard to find (rare)
 * - Book: Opening theory move
 * 
 * KEY INSIGHT: Chess.com's system is almost entirely based on CENTIPAWN LOSS.
 * Brilliant/Great are special cases that require sacrifice detection or position complexity.
 */

// Thresholds (centipawns) - Calibrated to match Chess.com's analysis
// Based on the annotations in PGN: $6=inaccuracy, $2=mistake, $4=blunder, $1=great, $3=brilliant
const THRESHOLD_BEST = 5;        // 0-5 cp = best
const THRESHOLD_EXCELLENT = 15;  // 5-15 cp = excellent  
const THRESHOLD_GOOD = 30;       // 15-30 cp = good
const THRESHOLD_INACCURACY = 90; // 30-90 cp = inaccuracy ($6)
const THRESHOLD_MISTAKE = 200;   // 90-200 cp = mistake ($2)
// Above THRESHOLD_MISTAKE = blunder ($4) (200+ cp loss)

export function classifyMove(
  evalAfterMove: number | null,
  evalBeforeMove: number | null,
  bestMoveEval: number | null,
  isBookMove: boolean = false,
  moveNumber: number = 0,
  wasBestMove: boolean = false,
  playedMoveSan?: string,
  engineBestMoveSan?: string,
  isSacrifice: boolean = false
): MoveClassification | undefined {
  // Book moves in opening
  if (isBookMove) {
    return 'book';
  }

  // Can't classify without evaluations
  if (evalAfterMove === null || evalBeforeMove === null) {
    return undefined;
  }

  // Normalize evaluations (cap extreme values at ~15 pawns)
  const evalBefore = normalizeEval(evalBeforeMove);
  const evalAfter = normalizeEval(evalAfterMove);
  
  // The best eval is what you would have if you played the engine's best move
  const bestEval = bestMoveEval !== null ? normalizeEval(bestMoveEval) : evalBefore;

  // === CENTIPAWN LOSS CALCULATION ===
  // This is the core of Chess.com's system
  // CP Loss = Best possible eval - What you actually got
  const cpLoss = Math.max(0, bestEval - evalAfter);

  // === MISSED WIN DETECTION ===
  // Had a forced mate but played something else and lost the mate
  if (evalBeforeMove > 9000 && evalAfterMove < 9000 && evalAfterMove < 500) {
    return 'missed-win';
  }

  // === BLUNDER DETECTION ===
  // Chess.com blunders:
  // 1. 300+ cp loss (losing 3+ pawns worth of advantage)
  // 2. OR turning a clearly winning position (+300) into losing (-100)
  
  const wasWinning = evalBefore >= 300;      // +3 pawns = clearly winning
  const isNowLosing = evalAfter <= -100;     // Losing
  
  // Major position flip: clearly winning to losing
  if (wasWinning && isNowLosing) {
    return 'blunder';
  }
  
  // Pure CP loss blunder
  if (cpLoss >= THRESHOLD_MISTAKE) {
    return 'blunder';
  }

  // === MISTAKE DETECTION ===
  // 90-200 cp loss
  if (cpLoss >= THRESHOLD_INACCURACY) {
    return 'mistake';
  }

  // === INACCURACY DETECTION ===
  // 30-90 cp loss
  if (cpLoss >= THRESHOLD_GOOD) {
    return 'inaccuracy';
  }

  // === POSITIVE MOVE CLASSIFICATIONS ===
  // From here, cpLoss < 30, so it's a good move
  
  // Check if player actually played the best move (within 5 cp)
  const playedBestMove = wasBestMove || cpLoss <= THRESHOLD_BEST;

  // === BRILLIANT MOVE ===
  // Chess.com's brilliant is extremely rare and requires:
  // 1. The move must be the BEST move
  // 2. It must involve a sacrifice
  // 3. Position was bad/equal and this was the only way to improve
  // Without sacrifice detection, we can only approximate
  if (isSacrifice && playedBestMove && evalBefore <= 50 && evalAfter >= evalBefore + 50) {
    return 'brilliant';
  }

  // === GREAT MOVE ===
  // Chess.com's great move is rare:
  // 1. Best move in a critical defensive position
  // 2. Finding the only good move when position was difficult
  // Approximate: best move that prevented collapse from bad position
  if (playedBestMove && evalBefore <= -100 && evalAfter >= -50) {
    return 'great';
  }

  // === BEST MOVE ===
  // Played the engine's top choice (within 5 cp)
  if (playedBestMove) {
    return 'best';
  }

  // === EXCELLENT ===
  // Very close to best (5-15 cp loss)
  if (cpLoss <= THRESHOLD_EXCELLENT) {
    return 'excellent';
  }

  // === GOOD ===
  // Reasonable move (15-30 cp loss)
  return 'good';
}

/**
 * Detect if a move is a sacrifice based on the SAN notation
 * A sacrifice is when you give up material (piece captured on a square
 * where your piece can also be captured, or pawn promotion sacrifice, etc.)
 * 
 * Simple heuristic: Look for captures that result in material loss
 * This is an approximation - true sacrifice detection requires position analysis
 */
export function detectSacrifice(moveSan: string, evalBefore: number, evalAfter: number): boolean {
  // Must be a capture
  if (!moveSan.includes('x')) {
    return false;
  }
  
  // The move should be good (best or excellent) despite appearing to lose material
  // If eval stayed same or improved after a capture, it might be a sacrifice
  // that the opponent "has to" accept
  
  // Check if this looks like a sacrifice:
  // 1. It's a capture
  // 2. Position was worse or equal before
  // 3. Position improved or stayed good after
  // 4. The improvement is significant (not just a normal good capture)
  
  const wasInTrouble = evalBefore <= 100; // Was losing or equal
  const improvedPosition = evalAfter > evalBefore + 30; // Got significantly better
  const isStillGood = evalAfter >= -50; // Didn't make things worse
  
  // Queen sacrifices are most likely to be "brilliant"
  const isQueenMove = moveSan.startsWith('Q') && moveSan.includes('x');
  
  // Rook sacrifices
  const isRookMove = moveSan.startsWith('R') && moveSan.includes('x');
  
  // Knight/Bishop sacrifices on key squares
  const isMinorPieceSac = (moveSan.startsWith('N') || moveSan.startsWith('B')) && moveSan.includes('x');
  
  // A sacrifice is likely if:
  // 1. Major piece capture that improves a bad position
  // 2. Or any capture that significantly improves position from bad/equal
  if (isQueenMove && wasInTrouble && isStillGood) {
    return true;
  }
  
  if (isRookMove && wasInTrouble && improvedPosition) {
    return true;
  }
  
  if (isMinorPieceSac && wasInTrouble && improvedPosition && evalAfter >= 50) {
    return true;
  }
  
  // Pawn push or capture that sets up a tactic
  // This is harder to detect without full position analysis
  
  return false;
}

export function calculateCentipawnLoss(
  evalAfterMove: number,
  evalBeforeMove: number | null,
  bestMoveEval: number
): number {
  if (evalBeforeMove === null) {
    return 0;
  }

  // Normalize evaluations
  const normAfter = normalizeEval(evalAfterMove);
  const normBest = normalizeEval(bestMoveEval);

  // CP loss = how much worse the move is compared to the best
  return Math.max(0, normBest - normAfter);
}

function normalizeEval(score: number): number {
  // Cap evaluations at reasonable bounds
  // Mate scores are typically > 9000 or < -9000
  if (Math.abs(score) > 9000) {
    // Convert mate in N to a high centipawn value
    // Mate in 1 = 9999, Mate in 2 = 9998, etc.
    const sign = score > 0 ? 1 : -1;
    return sign * 1500; // Cap mate advantage at +/- 15 pawns
  }
  
  // Cap normal evaluations to prevent extreme swings from dominating
  return Math.max(-1500, Math.min(1500, score));
}

export function getMoveClassificationColor(
  classification: MoveClassification
): string {
  const colors: Record<MoveClassification, string> = {
    brilliant: 'text-cyan-400',
    great: 'text-blue-400',
    best: 'text-green-500',
    excellent: 'text-green-400',
    good: 'text-lime-400',
    book: 'text-gray-400',
    inaccuracy: 'text-yellow-400',
    mistake: 'text-orange-400',
    blunder: 'text-red-500',
    'missed-win': 'text-red-600',
  };
  return colors[classification];
}

export function getMoveClassificationIcon(
  classification: MoveClassification
): string {
  const icons: Record<MoveClassification, string> = {
    brilliant: '!!',
    great: '!',
    best: '★',
    excellent: '✓',
    good: '',
    book: '📖',
    inaccuracy: '?!',
    mistake: '?',
    blunder: '??',
    'missed-win': '×',
  };
  return icons[classification];
}

export function getMoveClassificationLabel(
  classification: MoveClassification
): string {
  const labels: Record<MoveClassification, string> = {
    brilliant: 'Brilliant',
    great: 'Great',
    best: 'Best',
    excellent: 'Excellent',
    good: 'Good',
    book: 'Book',
    inaccuracy: 'Inaccuracy',
    mistake: 'Mistake',
    blunder: 'Blunder',
    'missed-win': 'Missed Win',
  };
  return labels[classification];
}

export function getMoveClassificationBgColor(
  classification: MoveClassification
): string {
  const colors: Record<MoveClassification, string> = {
    brilliant: 'bg-cyan-500',
    great: 'bg-blue-500',
    best: 'bg-green-600',
    excellent: 'bg-green-500',
    good: 'bg-lime-600',
    book: 'bg-gray-600',
    inaccuracy: 'bg-yellow-500',
    mistake: 'bg-orange-500',
    blunder: 'bg-red-600',
    'missed-win': 'bg-red-700',
  };
  return colors[classification];
}
