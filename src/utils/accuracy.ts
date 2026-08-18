import type { AnalyzedMove, AccuracyScore } from '../types';

/**
 * Game accuracy from per-move win-probability loss (Lichess / Chess.com).
 *
 * The exponential 103.1668 * exp(-0.04354 * x) - 3.1669 is fitted to win-%
 * points, not raw ACPL. Feeding average centipawn loss into it turns a
 * typical 30cp game into ~27% accuracy.
 */

function evalToWinProb(cp: number): number {
  if (Math.abs(cp) > 9000) {
    return cp > 0 ? 1.0 : 0.0;
  }
  return 1 / (1 + Math.exp(-0.00368208 * cp));
}

/**
 * Per-move accuracy from the drop in win probability vs the best move.
 * 0 win-% loss → 100; a 300cp blunder from equality is about 32%.
 */
export function calculateMoveAccuracy(cpLoss: number, evalBefore: number): number {
  if (cpLoss <= 0) return 100;

  const winProbBefore = evalToWinProb(evalBefore);
  const winProbAfter = evalToWinProb(evalBefore - cpLoss);
  const winPercentLoss = Math.max(0, winProbBefore - winProbAfter) * 100;

  const accuracy = 103.1668 * Math.exp(-0.04354 * winPercentLoss) - 3.1669;
  return Math.max(0, Math.min(100, accuracy));
}

export function calculateAccuracy(moves: AnalyzedMove[]): AccuracyScore {
  const whiteMoves: AnalyzedMove[] = [];
  const blackMoves: AnalyzedMove[] = [];

  moves.forEach((move, index) => {
    if (index % 2 === 0) {
      whiteMoves.push(move);
    } else {
      blackMoves.push(move);
    }
  });

  const whiteStats = calculatePlayerAccuracy(whiteMoves);
  const blackStats = calculatePlayerAccuracy(blackMoves);

  return {
    white: whiteStats.accuracy,
    black: blackStats.accuracy,
    whiteAvgCPLoss: whiteStats.avgCPLoss,
    blackAvgCPLoss: blackStats.avgCPLoss,
  };
}

function calculatePlayerAccuracy(moves: AnalyzedMove[]): {
  accuracy: number | null;
  avgCPLoss: number | null;
} {
  const classified = moves.filter((move) => move.centipawnLoss != null);
  if (classified.length === 0) {
    return { accuracy: null, avgCPLoss: null };
  }

  let totalMoveAccuracy = 0;
  let totalCPLoss = 0;

  for (const move of classified) {
    const cpLoss = move.centipawnLoss ?? 0;
    const evalBefore = (move.evaluation ?? 0) + cpLoss;
    totalCPLoss += cpLoss;
    totalMoveAccuracy += calculateMoveAccuracy(cpLoss, evalBefore);
  }

  return {
    accuracy: Math.round((totalMoveAccuracy / classified.length) * 10) / 10,
    avgCPLoss: Math.round((totalCPLoss / classified.length) * 10) / 10,
  };
}

export function formatAccuracy(accuracy: number | null): string {
  if (accuracy == null) return '—';
  return `${accuracy.toFixed(1)}%`;
}

export function formatCentipawns(centipawns: number): string {
  if (Math.abs(centipawns) > 9000) {
    const mateIn = Math.abs(centipawns) - 10000;
    return centipawns > 0 ? `M${mateIn}` : `M-${mateIn}`;
  }

  const value = (centipawns / 100).toFixed(1);
  return centipawns >= 0 ? `+${value}` : value;
}

export function centipawnToAccuracy(cpLoss: number): number {
  return calculateMoveAccuracy(cpLoss, 0);
}

export function getEvaluationColor(evaluation: number): string {
  if (evaluation > 200) return 'text-green-400';
  if (evaluation > 50) return 'text-green-300';
  if (evaluation > -50) return 'text-gray-300';
  if (evaluation > -200) return 'text-orange-300';
  return 'text-red-400';
}
