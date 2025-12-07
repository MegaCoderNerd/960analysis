import { formatAccuracy } from '../../utils/accuracy';

interface AccuracyDisplayProps {
  whiteAccuracy: number;
  blackAccuracy: number;
  whiteAvgCPLoss: number;
  blackAvgCPLoss: number;
  whiteName: string;
  blackName: string;
}

export function AccuracyDisplay({
  whiteAccuracy,
  blackAccuracy,
  whiteAvgCPLoss,
  blackAvgCPLoss,
  whiteName,
  blackName,
}: AccuracyDisplayProps) {
  return (
    <div className="space-y-3">
      {/* White player */}
      <div className="bg-chess-darker rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-white">{whiteName}</span>
          <span className="text-gray-400 text-sm">White</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-green-400">
            {formatAccuracy(whiteAccuracy)}
          </span>
          <span className="text-sm text-gray-500">
            Avg loss: {whiteAvgCPLoss.toFixed(1)} cp
          </span>
        </div>
      </div>

      {/* Black player */}
      <div className="bg-chess-darker rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-white">{blackName}</span>
          <span className="text-gray-400 text-sm">Black</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-green-400">
            {formatAccuracy(blackAccuracy)}
          </span>
          <span className="text-sm text-gray-500">
            Avg loss: {blackAvgCPLoss.toFixed(1)} cp
          </span>
        </div>
      </div>
    </div>
  );
}
