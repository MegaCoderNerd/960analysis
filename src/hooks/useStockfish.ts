import { useCallback, useEffect, useRef, useState } from 'react';
import type { EngineLine, StockfishOptions } from '../types';
import {
  EngineSession,
  type EngineStatus,
} from '../services/engineSession';
import type { UciInfo } from '../utils/uci';

interface UseStockfishReturn {
  analyze: (fen: string, options?: Partial<StockfishOptions>) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  isAnalyzing: boolean;
  currentEvaluation: number | null;
  bestMove: string | null;
  engineLines: EngineLine[];
  depth: number;
  status: EngineStatus;
  error: string | null;
}

export function useStockfish(): UseStockfishReturn {
  const sessionRef = useRef<EngineSession | null>(null);
  const requestIdRef = useRef(0);
  const pausedRef = useRef(false);
  const lastAnalyzeRef = useRef<{ fen: string; options: Partial<StockfishOptions> } | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentEvaluation, setCurrentEvaluation] = useState<number | null>(null);
  const [bestMove, setBestMove] = useState<string | null>(null);
  const [engineLines, setEngineLines] = useState<EngineLine[]>([]);
  const [depth, setDepth] = useState(0);
  const [status, setStatus] = useState<EngineStatus>('booting');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = new EngineSession();
    sessionRef.current = session;

    session.onStatusChange = (nextStatus, nextError) => {
      setStatus(nextStatus);
      setError(nextError);
      if (nextStatus === 'error') {
        setIsAnalyzing(false);
      }
    };

    session.onInfo = (info: UciInfo, requestId: number) => {
      if (requestId !== requestIdRef.current) return;
      if (info.bound) return;

      if (info.depth !== undefined) {
        setDepth(info.depth);
      }

      if (info.evaluation !== undefined && info.pv) {
        const multipv = info.multipv ?? 1;
        setCurrentEvaluation((prev) => (multipv === 1 ? info.evaluation! : prev));
        setEngineLines((prev) => {
          const next = [...prev];
          next[multipv - 1] = {
            moves: info.pv!,
            evaluation: info.evaluation!,
            depth: info.depth ?? 0,
            multipv,
            mate: info.mate,
          };
          return next.filter(Boolean).slice(0, 3);
        });
      }
    };

    session.onBestMove = (move, _ponder, requestId) => {
      if (requestId !== requestIdRef.current) return;
      setBestMove(move === '(none)' ? null : move);
      setIsAnalyzing(false);
    };

    queueMicrotask(() => {
      setStatus(session.getStatus());
      setError(session.getError());
    });

    return () => {
      session.terminate();
      sessionRef.current = null;
    };
  }, []);

  const analyze = useCallback((fen: string, options: Partial<StockfishOptions> = {}) => {
    lastAnalyzeRef.current = { fen, options };
    if (pausedRef.current) return;

    setIsAnalyzing(true);
    setBestMove(null);

    const session = sessionRef.current;
    if (!session || session.getStatus() === 'error') {
      setIsAnalyzing(false);
      return;
    }

    requestIdRef.current = session.analyze(fen, {
      depth: 18,
      multiPv: 3,
      ...options,
    });
  }, []);

  const stop = useCallback(() => {
    sessionRef.current?.stop();
    setIsAnalyzing(false);
  }, []);

  const pause = useCallback(() => {
    pausedRef.current = true;
    sessionRef.current?.stop();
    setIsAnalyzing(false);
  }, []);

  const resume = useCallback(() => {
    pausedRef.current = false;
    const pending = lastAnalyzeRef.current;
    if (pending) {
      analyze(pending.fen, pending.options);
    }
  }, [analyze]);

  return {
    analyze,
    stop,
    pause,
    resume,
    isAnalyzing,
    currentEvaluation,
    bestMove,
    engineLines,
    depth,
    status,
    error,
  };
}
