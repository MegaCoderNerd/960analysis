import type { MoveClassification } from '../types';
import {
  calculateCentipawnLoss,
  classifyMove,
  detectSacrifice,
} from './moveClassification';
import { isTheoreticalBookMove } from './openingBook';

/**
 * One reviewed ply. Engine scores are side-to-move UCI centipawns:
 * `evalBefore` is from the mover, `evalAfterSideToMove` is from the opponent
 * after the move. `fenBefore` and `ply` are the position the mover played from
 * (ply 1 is the first move) so opening-book labels can be decided here.
 */
export interface EngineMoveInput {
  evalBefore: number;
  evalAfterSideToMove: number;
  san: string;
  uci: string;
  bestUci: string;
  fenBefore: string;
  ply: number;
}

export interface ClassifiedEngineMove {
  evaluation: number;
  classification: MoveClassification | undefined;
  centipawnLoss: number;
  bestMove: string;
}

export function classifyEngineMove(input: EngineMoveInput): ClassifiedEngineMove {
  const evalBefore = input.evalBefore;
  const evalAfter = -input.evalAfterSideToMove;
  const bestMoveEval = evalBefore;
  const wasBestMove =
    input.bestUci === input.uci || Math.abs(evalBefore - evalAfter) <= 10;
  const isSacrifice = detectSacrifice(input.san, evalBefore, evalAfter);
  const centipawnLoss = calculateCentipawnLoss(evalAfter, evalBefore, bestMoveEval);
  const classification = classifyMove(
    evalAfter,
    evalBefore,
    bestMoveEval,
    isTheoreticalBookMove(input.fenBefore, input.san, input.ply),
    input.ply,
    wasBestMove,
    input.san,
    input.bestUci,
    isSacrifice
  );

  return {
    evaluation: evalAfter,
    classification,
    centipawnLoss,
    bestMove: input.bestUci,
  };
}
