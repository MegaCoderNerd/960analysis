import type { EngineLine } from '../../types';
import { formatCentipawns } from '../../utils/accuracy';

interface EngineLinesProps {
  lines: EngineLine[];
  depth: number;
}

export function EngineLines({ lines, depth }: EngineLinesProps) {
  return (
    <div className="bg-chess-darker rounded-lg p-4 overflow-anchor-none">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">Engine Analysis</h3>
        <span className="text-sm text-gray-400 tabular-nums">Depth: {depth}</span>
      </div>

      {lines.length === 0 ? (
        <div className="text-gray-500 text-sm min-h-[240px]">No analysis yet...</div>
      ) : (
        <div className="space-y-3 min-h-[240px]">
          {lines.map((line, index) => (
            <div key={index} className="bg-chess-dark rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-400">
                  Line {line.multipv}
                </span>
                <span
                  className={`text-sm font-bold tabular-nums ${
                    line.evaluation > 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {formatCentipawns(line.evaluation)}
                </span>
              </div>
              <div className="text-sm text-gray-300 font-mono leading-5 h-10 overflow-hidden">
                {line.moves.slice(0, 8).join(' ')}
                {line.moves.length > 8 && '...'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
