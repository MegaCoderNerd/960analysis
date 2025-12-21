import { useEffect, useState } from 'react';
import { formatCentipawns } from '../../utils/accuracy';

interface EvaluationBarProps {
  evaluation: number | null;
  height?: number;
}

export function EvaluationBar({ evaluation, height = 600 }: EvaluationBarProps) {
  const [displayEval, setDisplayEval] = useState(evaluation);
  const [percentage, setPercentage] = useState(50);

  useEffect(() => {
    // Smooth transition
    const timer = setTimeout(() => {
      setDisplayEval(evaluation);
    }, 100);

    return () => clearTimeout(timer);
  }, [evaluation]);

  useEffect(() => {
    if (displayEval === null) {
      setPercentage(50);
      return;
    }

    // Convert evaluation to percentage
    // -1000 cp = 0%, 0 cp = 50%, +1000 cp = 100%
    const normalizedEval = Math.max(-1000, Math.min(1000, displayEval));
    const pct = ((normalizedEval + 1000) / 2000) * 100;
    setPercentage(pct);
  }, [displayEval]);

  return (
    <div
      className="relative bg-black rounded overflow-hidden"
      style={{ width: '40px', height: `${height}px` }}
    >
      {/* White's advantage */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-white transition-all duration-300 ease-out"
        style={{ height: `${percentage}%` }}
      />

      {/* Evaluation label */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={`text-xs font-bold px-1 py-0.5 rounded ${
            percentage > 50 ? 'bg-black text-white' : 'bg-white text-black'
          }`}
        >
          {displayEval !== null ? formatCentipawns(displayEval) : '0.0'}
        </div>
      </div>

      {/* Center line */}
      <div className="absolute left-0 right-0 h-px bg-gray-500" style={{ top: '50%' }} />
    </div>
  );
}
