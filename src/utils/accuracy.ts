import type { AnalyzedMove, AccuracyScore } from '../types';

/**
 * Calculate player accuracy based on Chess.com's formula
 * Accuracy is based on centipawn loss per move, with adjustments:
 * - Best moves followed by blunders/mistakes get reduced credit
 * - Consistency matters for accuracy
 */

export function calculateAccuracy(moves: AnalyzedMove[]): AccuracyScore {
  const whiteMoves: AnalyzedMove[] = [];
  const blackMoves: AnalyzedMove[] = [];

  // Separate moves by player (white = even indices, black = odd indices)
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
  accuracy: number;
  avgCPLoss: number;
} {
  if (moves.length === 0) {
    return { accuracy: 100, avgCPLoss: 0 };
  }

  // Chess.com calculates accuracy per-move then averages
  // Each move gets a score from 0-100 based on how close it was to best
  let totalMoveAccuracy = 0;
  let totalCPLoss = 0;

  for (let i = 0; i < moves.length; i++) {
    const currentMove = moves[i];
    const cpLoss = currentMove.centipawnLoss ?? 0;
    
    totalCPLoss += cpLoss;
    
    // Per-move accuracy using Chess.com's win% model approximation
    // Formula: moveAccuracy = 103.1668 * exp(-0.04354 * cpLoss) - 3.1668
    // But we need to scale it properly
    // Simpler approach: softer curve so bad moves don't crush accuracy
    // 0 cp = 100%, 50 cp ≈ 90%, 100 cp ≈ 75%, 200 cp ≈ 50%, 300 cp ≈ 35%
    
    let moveAccuracy: number;
    if (cpLoss <= 0) {
      moveAccuracy = 100;
    } else if (cpLoss <= 10) {
      // Best move range: 100-98%
      moveAccuracy = 100 - (cpLoss * 0.2);
    } else if (cpLoss <= 25) {
      // Excellent range: 98-94%
      moveAccuracy = 98 - ((cpLoss - 10) * 0.27);
    } else if (cpLoss <= 50) {
      // Good range: 94-90%
      moveAccuracy = 94 - ((cpLoss - 25) * 0.16);
    } else if (cpLoss <= 100) {
      // Inaccuracy range: 90-75%
      moveAccuracy = 90 - ((cpLoss - 50) * 0.3);
    } else if (cpLoss <= 200) {
      // Mistake range: 75-50%
      moveAccuracy = 75 - ((cpLoss - 100) * 0.25);
    } else if (cpLoss <= 300) {
      // Blunder range: 50-35%
      moveAccuracy = 50 - ((cpLoss - 200) * 0.15);
    } else {
      // Severe blunder: 35-25% (never drop below 0)
      moveAccuracy = Math.max(0, 35 - ((cpLoss - 300) * 0.1));
    }
    
    totalMoveAccuracy += Math.max(0, Math.min(100, moveAccuracy));
  }

  const avgCPLoss = totalCPLoss / moves.length;
  const accuracy = totalMoveAccuracy / moves.length;

  return {
    accuracy: Math.round(accuracy * 10) / 10,
    avgCPLoss: Math.round(avgCPLoss * 10) / 10,
  };
}

export function formatAccuracy(accuracy: number): string {
  return `${accuracy.toFixed(1)}%`;
}

export function formatCentipawns(centipawns: number): string {
  if (Math.abs(centipawns) > 9000) {
    // Mate score
    const mateIn = Math.abs(centipawns) - 10000;
    return centipawns > 0 ? `M${mateIn}` : `M-${mateIn}`;
  }
  
  const value = (centipawns / 100).toFixed(1);
  return centipawns >= 0 ? `+${value}` : value;
}

export function getEvaluationColor(evaluation: number): string {
  if (evaluation > 200) return 'text-green-400';
  if (evaluation > 50) return 'text-green-300';
  if (evaluation > -50) return 'text-gray-300';
  if (evaluation > -200) return 'text-orange-300';
  return 'text-red-400';
}
