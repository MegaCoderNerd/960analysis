import type { AnalyzedMove, AccuracyScore } from '../types';

/**
 * Calculate player accuracy based on Chess.com's formula
 * Accuracy is based on centipawn loss per move
 */

export function calculateAccuracy(moves: AnalyzedMove[]): AccuracyScore {
  const whiteMoves: AnalyzedMove[] = [];
  const blackMoves: AnalyzedMove[] = [];

  // Separate moves by player
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
  let totalCPLoss = 0;
  let validMoves = 0;

  for (let i = 0; i < moves.length - 1; i++) {
    const currentMove = moves[i];
    const nextMove = moves[i + 1];

    if (
      currentMove.evaluation !== null &&
      currentMove.evaluation !== undefined &&
      nextMove.evaluation !== null &&
      nextMove.evaluation !== undefined
    ) {
      // Flip evaluation perspective for black
      const currentEval =
        i % 2 === 0 ? currentMove.evaluation : -currentMove.evaluation;
      const nextEval =
        i % 2 === 0 ? -nextMove.evaluation : nextMove.evaluation;

      const cpLoss = Math.max(0, nextEval - currentEval);
      totalCPLoss += cpLoss;
      validMoves++;
    }
  }

  const avgCPLoss = validMoves > 0 ? totalCPLoss / validMoves : 0;

  // Calculate accuracy using Chess.com's formula
  // Accuracy decreases exponentially with CP loss
  const accuracy = calculateAccuracyFromCPLoss(avgCPLoss);

  return {
    accuracy: Math.round(accuracy * 10) / 10,
    avgCPLoss: Math.round(avgCPLoss * 10) / 10,
  };
}

function calculateAccuracyFromCPLoss(avgCPLoss: number): number {
  // Chess.com's accuracy formula approximation
  // Perfect play (0 CP loss) = 100%
  // Larger CP loss exponentially decreases accuracy
  
  if (avgCPLoss === 0) return 100;
  
  // Formula: accuracy = 100 - (cpLoss / scaling_factor)
  // The scaling factor determines how quickly accuracy drops
  const scalingFactor = 5; // Tune this for sensitivity
  
  const accuracy = 100 * Math.exp(-avgCPLoss / (100 * scalingFactor));
  
  return Math.max(0, Math.min(100, accuracy));
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
