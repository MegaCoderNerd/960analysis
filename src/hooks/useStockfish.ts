import { useEffect, useRef, useState, useCallback } from 'react';
import type { EngineLine, StockfishOptions } from '../types';

interface UseStockfishReturn {
  analyze: (fen: string, options?: Partial<StockfishOptions>) => void;
  stop: () => void;
  isAnalyzing: boolean;
  currentEvaluation: number | null;
  bestMove: string | null;
  engineLines: EngineLine[];
  depth: number;
}

export function useStockfish(): UseStockfishReturn {
  const workerRef = useRef<Worker | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentEvaluation, setCurrentEvaluation] = useState<number | null>(null);
  const [bestMove, setBestMove] = useState<string | null>(null);
  const [engineLines, setEngineLines] = useState<EngineLine[]>([]);
  const [depth, setDepth] = useState(0);

  // Initialize Stockfish worker
  useEffect(() => {
    // Create worker with Stockfish
    const worker = new Worker(
      new URL('../workers/stockfish.worker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current = worker;

    const handleInfoMessage = (info: string) => {
      // Parse UCI info string
      const depthMatch = info.match(/depth (\d+)/);
      const scoreMatch = info.match(/score (cp|mate) (-?\d+)/);
      const pvMatch = info.match(/pv (.+)/);
      const multipvMatch = info.match(/multipv (\d+)/);

      if (depthMatch) {
        setDepth(parseInt(depthMatch[1]));
      }

      if (scoreMatch && pvMatch) {
        const scoreType = scoreMatch[1];
        const scoreValue = parseInt(scoreMatch[2]);
        const pv = pvMatch[1].split(' ');
        const multipv = multipvMatch ? parseInt(multipvMatch[1]) : 1;

        let evaluation: number;
        if (scoreType === 'mate') {
          // Convert mate score to centipawns
          evaluation = scoreValue > 0 ? 10000 + scoreValue : -10000 + scoreValue;
        } else {
          evaluation = scoreValue;
        }

        setCurrentEvaluation(evaluation);

        setEngineLines((prev) => {
          const newLines = [...prev];
          const lineIndex = multipv - 1;
          newLines[lineIndex] = {
            moves: pv,
            evaluation,
            depth: parseInt(depthMatch?.[1] || '0'),
            multipv,
          };
          return newLines.slice(0, 3); // Keep top 3 lines
        });
      }
    };

    worker.onmessage = (e) => {
      const { type, data } = e.data;

      switch (type) {
        case 'info':
          handleInfoMessage(data);
          break;
        case 'bestmove':
          setBestMove(data);
          setIsAnalyzing(false);
          break;
        case 'ready':
          // Stockfish is ready to analyze
          break;
      }
    };

    return () => {
      worker.terminate();
    };
  }, []);

  const analyze = useCallback(
    (fen: string, options: Partial<StockfishOptions> = {}) => {
      const defaultOptions: StockfishOptions = {
        depth: 18,
        multiPv: 3,
        threads: navigator.hardwareConcurrency || 1,
      };

      const finalOptions = { ...defaultOptions, ...options };

      setIsAnalyzing(true);
      setEngineLines([]);
      setCurrentEvaluation(null);
      setBestMove(null);
      setDepth(0);

      if (workerRef.current) {
        workerRef.current.postMessage({
          type: 'analyze',
          fen,
          options: finalOptions,
        });
      }
    },
    []
  );

  const stop = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'stop' });
      setIsAnalyzing(false);
    }
  }, []);

  return {
    analyze,
    stop,
    isAnalyzing,
    currentEvaluation,
    bestMove,
    engineLines,
    depth,
  };
}
