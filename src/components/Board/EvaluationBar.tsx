import { useEffect, useState } from 'react';
import { formatCentipawns } from '../../utils/accuracy';
import type { EngineStatus } from '../../types';

interface EvaluationBarProps {
  evaluation: number | null;
  status?: EngineStatus;
  isAnalyzing?: boolean;
  height?: number;
}

export function EvaluationBar({
  evaluation,
  status = 'ready',
  isAnalyzing = false,
  height = 600,
}: EvaluationBarProps) {
  const [displayEval, setDisplayEval] = useState(evaluation);
  const waiting = evaluation === null && (status === 'booting' || isAnalyzing || status === 'error');
  const percentage =
    displayEval === null
      ? 50
      : ((Math.max(-1000, Math.min(1000, displayEval)) + 1000) / 2000) * 100;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayEval(evaluation);
    }, 100);
    return () => clearTimeout(timer);
  }, [evaluation]);

  const label = () => {
    if (status === 'error') return '!';
    if (waiting) return '…';
    if (displayEval !== null) return formatCentipawns(displayEval);
    return '…';
  };

  return (
    <div
      className="relative bg-black rounded overflow-hidden"
      style={{ width: '40px', height: `${height}px` }}
    >
      <div
        className="absolute bottom-0 left-0 right-0 bg-white transition-all duration-300 ease-out"
        style={{ height: `${percentage}%` }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={`text-xs font-bold px-1 py-0.5 rounded ${
            percentage > 50 ? 'bg-black text-white' : 'bg-white text-black'
          }`}
        >
          {label()}
        </div>
      </div>
      <div className="absolute left-0 right-0 h-px bg-gray-500" style={{ top: '50%' }} />
    </div>
  );
}
