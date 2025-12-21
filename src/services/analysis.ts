import type { AnalyzedMove, ChessGame, AccuracyScore } from '../types';
import { classifyMove, calculateCentipawnLoss } from '../utils/moveClassification';
import { calculateAccuracy } from '../utils/accuracy';

export interface AnalysisProgress {
  current: number;
  total: number;
  percentage: number;
}

export async function analyzeGame(
  game: ChessGame,
  onProgress?: (progress: AnalysisProgress) => void
): Promise<{
  analyzedMoves: AnalyzedMove[];
  accuracy: AccuracyScore;
}> {
  const { moves } = game;
  const analyzedMoves: AnalyzedMove[] = [...moves];

  // For now, return unanalyzed moves
  // The actual Stockfish analysis will be done through the useStockfish hook
  // and applied move by move in the UI

  if (onProgress) {
    onProgress({
      current: moves.length,
      total: moves.length,
      percentage: 100,
    });
  }

  const accuracy = calculateAccuracy(analyzedMoves);

  return {
    analyzedMoves,
    accuracy,
  };
}

export function updateMoveWithAnalysis(
  moves: AnalyzedMove[],
  moveIndex: number,
  evaluation: number,
  bestMove: string,
  bestMoveEvaluation: number
): AnalyzedMove[] {
  const updatedMoves = [...moves];
  const move = updatedMoves[moveIndex];

  if (!move) return updatedMoves;

  // Get previous move evaluation for classification
  const previousEval =
    moveIndex > 0 ? updatedMoves[moveIndex - 1].evaluation : null;

  // Calculate centipawn loss
  const cpLoss = calculateCentipawnLoss(evaluation, previousEval, bestMoveEvaluation);

  // Classify the move
  const classification = classifyMove(
    evaluation,
    previousEval,
    bestMoveEvaluation,
    false,
    Math.floor(moveIndex / 2) + 1
  );

  updatedMoves[moveIndex] = {
    ...move,
    evaluation,
    bestMove,
    classification,
    centipawnLoss: cpLoss,
  };

  return updatedMoves;
}

export function exportAnalyzedPGN(game: ChessGame): string {
  const pgn = game.pgn;

  // Add analysis annotations to PGN
  // This would require parsing and rebuilding the PGN with comments
  // For now, return the original PGN
  // TODO: Implement PGN annotation export

  return pgn;
}
