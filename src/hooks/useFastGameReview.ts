import { useState, useRef, useCallback } from 'react';
import { getStockfishPool } from '../workers/stockfishPool';
import { classifyMove, calculateCentipawnLoss, detectSacrifice } from '../utils/moveClassification';
import { calculateAccuracy } from '../utils/accuracy';
import type { AnalyzedMove, AccuracyScore } from '../types';
import { parsePgnToPositions } from '../utils/pgn';
import { GAME_CACHE_SCHEMA, getCachedGame, setCachedGame } from '../services/evalCache';
import { ENGINE_ID } from '../services/engineSession';

interface ReviewProgress {
  current: number;
  total: number;
  phase: 'idle' | 'parsing' | 'analyzing' | 'classifying';
  estimatedTimeLeft: number;
}

interface ReviewOptions {
  depth?: number;
}

export interface FastReviewResult {
  moves: AnalyzedMove[];
  accuracy: AccuracyScore;
}

export function useFastGameReview() {
  const [isReviewing, setIsReviewing] = useState(false);
  const [progress, setProgress] = useState<ReviewProgress>({
    current: 0,
    total: 0,
    phase: 'idle',
    estimatedTimeLeft: 0,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const reviewGame = useCallback(
    async (pgn: string, options: ReviewOptions = {}): Promise<FastReviewResult | null> => {
      const { depth = 12 } = options;
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;
      setIsReviewing(true);

      try {
        const cached = await getCachedGame(pgn);
        if (
          cached &&
          cached.engineId === ENGINE_ID &&
          cached.moves.some((move) => move.centipawnLoss != null)
        ) {
          return { moves: cached.moves, accuracy: calculateAccuracy(cached.moves) };
        }

        setProgress({
          current: 0,
          total: 0,
          phase: 'parsing',
          estimatedTimeLeft: 0,
        });

        const parsed = parsePgnToPositions(pgn);
        if (parsed.error || parsed.positions.length === 0) {
          throw new Error(parsed.error || 'Failed to parse PGN');
        }

        const positions = parsed.positions;
        const totalPositions = positions.length;

        setProgress({
          current: 0,
          total: totalPositions,
          phase: 'analyzing',
          estimatedTimeLeft: totalPositions * 200,
        });

        if (signal.aborted) return null;

        const pool = getStockfishPool();
        const startTime = Date.now();
        const positionData = positions.map((pos, index) => ({
          fen: pos.fen,
          moveIndex: index,
        }));

        const analysisResults = await pool.analyzeBatch(
          positionData,
          depth,
          (completed, total) => {
            if (signal.aborted) return;
            const elapsed = Date.now() - startTime;
            const avgTimePerPos = elapsed / Math.max(completed, 1);
            const remaining = (total - completed) * avgTimePerPos;
            setProgress({
              current: completed,
              total,
              phase: 'analyzing',
              estimatedTimeLeft: remaining,
            });
          },
          signal
        );

        if (signal.aborted) return null;

        setProgress((prev) => ({ ...prev, phase: 'classifying' }));

        const analyzedMoves: AnalyzedMove[] = [];
        for (let i = 1; i < positions.length; i++) {
          const position = positions[i];
          const analysisBefore = analysisResults.get(i - 1);
          const analysisAfter = analysisResults.get(i);

          if (!analysisBefore || !analysisAfter) {
            analyzedMoves.push({
              san: position.san,
              uci: position.uci,
              fen: position.fen,
            });
            continue;
          }

          const evalBefore = analysisBefore.evaluation;
          const evalAfter = -analysisAfter.evaluation;
          const bestMoveEval = evalBefore;
          const wasBestMove =
            analysisBefore.bestMove === position.uci ||
            Math.abs(evalBefore - evalAfter) <= 10;
          const isSacrifice = detectSacrifice(position.san, evalBefore, evalAfter);
          const cpLoss = calculateCentipawnLoss(evalAfter, evalBefore, bestMoveEval);
          const classification = classifyMove(
            evalAfter,
            evalBefore,
            bestMoveEval,
            false,
            i,
            wasBestMove,
            position.san,
            analysisBefore.bestMove,
            isSacrifice
          );

          analyzedMoves.push({
            san: position.san,
            uci: position.uci,
            fen: position.fen,
            evaluation: evalAfter,
            classification,
            centipawnLoss: cpLoss,
            bestMove: analysisBefore.bestMove,
          });
        }

        if (signal.aborted) return null;

        const accuracy = calculateAccuracy(analyzedMoves);
        const result = { moves: analyzedMoves, accuracy };
        await setCachedGame(pgn, {
          schemaVersion: GAME_CACHE_SCHEMA,
          engineId: ENGINE_ID,
          moves: analyzedMoves,
          accuracy,
        });
        return result;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return null;
        }
        console.error('Fast review error:', error);
        throw error;
      } finally {
        setIsReviewing(false);
        setProgress({
          current: 0,
          total: 0,
          phase: 'idle',
          estimatedTimeLeft: 0,
        });
        abortControllerRef.current = null;
      }
    },
    []
  );

  const cancelReview = useCallback(async () => {
    abortControllerRef.current?.abort();
    const pool = getStockfishPool();
    await pool.terminate();
    setIsReviewing(false);
    setProgress({
      current: 0,
      total: 0,
      phase: 'idle',
      estimatedTimeLeft: 0,
    });
  }, []);

  return {
    reviewGame,
    cancelReview,
    progress,
    isReviewing,
  };
}
