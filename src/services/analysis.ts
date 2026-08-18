import type { AnalyzedMove } from '../types';
import { classifyMove, calculateCentipawnLoss } from '../utils/moveClassification';

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

  const previousEval =
    moveIndex > 0 ? updatedMoves[moveIndex - 1].evaluation : null;

  const cpLoss = calculateCentipawnLoss(
    evaluation ?? 0,
    previousEval ?? 0,
    bestMoveEvaluation ?? 0
  );

  const classification = classifyMove(
    evaluation ?? 0,
    previousEval ?? 0,
    bestMoveEvaluation ?? 0,
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
