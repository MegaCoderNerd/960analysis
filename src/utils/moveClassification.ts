import type { MoveClassification } from '../types';

/**
 * Classify moves based on centipawn loss and position characteristics
 * Following Chess.com's classification system
 */

export function classifyMove(
  currentEval: number | null,
  previousEval: number | null,
  bestMoveEval: number | null,
  isBookMove: boolean = false,
  moveNumber: number = 0
): MoveClassification | undefined {
  // Book moves in opening
  if (isBookMove || moveNumber <= 10) {
    return 'book';
  }

  // Can't classify without evaluations
  if (currentEval === null || previousEval === null || bestMoveEval === null) {
    return undefined;
  }

  // Calculate centipawn loss
  const cpLoss = calculateCentipawnLoss(currentEval, previousEval, bestMoveEval);

  // Determine if position is winning/losing
  const isWinningPosition = Math.abs(bestMoveEval) > 300;
  const isMateScore = Math.abs(bestMoveEval) > 9000;

  // Missed win detection
  if (isMateScore && Math.abs(currentEval) < 500) {
    return 'missed-win';
  }

  // Brilliant move: exceptional move that's hard to find
  if (cpLoss < -50 && isWinningPosition) {
    return 'brilliant';
  }

  // Classification based on centipawn loss
  if (cpLoss <= 15) {
    // Best/Excellent moves
    if (cpLoss <= 5) return 'best';
    if (cpLoss <= 10) return 'excellent';
    return 'good';
  } else if (cpLoss <= 50) {
    return 'inaccuracy';
  } else if (cpLoss <= 150) {
    return 'mistake';
  } else {
    return 'blunder';
  }
}

export function calculateCentipawnLoss(
  actualEval: number,
  previousEval: number | null,
  bestEval: number
): number {
  // If no previous eval, use the actual eval as baseline
  if (previousEval === null) {
    return 0;
  }

  // Normalize mate scores
  const normActual = normalizeMateScore(actualEval);
  const normBest = normalizeMateScore(bestEval);

  // CP loss is difference between the evaluation drop from previous position
  // A good move should maintain or improve the position
  // From white's perspective: higher is better
  // Loss = best - actual (how much worse the move is compared to best)
  return Math.max(0, normBest - normActual);
}

function normalizeMateScore(score: number): number {
  // Mate scores are typically > 9000 or < -9000
  if (Math.abs(score) > 9000) {
    // Convert mate in N to a high centipawn value
    const mateIn = Math.abs(score) - 10000;
    return score > 0 ? 10000 - mateIn * 100 : -10000 + mateIn * 100;
  }
  return score;
}

export function getMoveClassificationColor(
  classification: MoveClassification
): string {
  const colors: Record<MoveClassification, string> = {
    brilliant: 'text-chess-cyan',
    great: 'text-chess-blue',
    best: 'text-green-500',
    excellent: 'text-green-400',
    good: 'text-green-300',
    book: 'text-gray-400',
    inaccuracy: 'text-chess-yellow',
    mistake: 'text-chess-orange',
    blunder: 'text-chess-red',
    'missed-win': 'text-chess-red',
  };
  return colors[classification];
}

export function getMoveClassificationIcon(
  classification: MoveClassification
): string {
  const icons: Record<MoveClassification, string> = {
    brilliant: '✨',
    great: '!',
    best: '✓',
    excellent: '✓',
    good: '○',
    book: '□',
    inaccuracy: '?!',
    mistake: '?',
    blunder: '??',
    'missed-win': '☓',
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
