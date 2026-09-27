import { useMemo } from 'react';
import type { AnalyzedMove, MoveClassification } from '../../types';
import { getMoveClassificationColor, getMoveClassificationIcon, getMoveClassificationLabel } from '../../utils/moveClassification';
import { estimateGameRating, formatAccuracy, formatGameRating } from '../../utils/accuracy';

interface GameReviewSummaryProps {
  moves: AnalyzedMove[];
  whiteAccuracy: number | null;
  blackAccuracy: number | null;
  whiteName: string;
  blackName: string;
  whiteElo?: number;
  blackElo?: number;
  onCategoryClick?: (category: MoveClassification, color: 'white' | 'black') => void;
}

export function GameReviewSummary({
  moves,
  whiteAccuracy,
  blackAccuracy,
  whiteName,
  blackName,
  whiteElo,
  blackElo,
  onCategoryClick,
}: GameReviewSummaryProps) {
  const stats = useMemo(() => {
    const whiteStats: Record<MoveClassification, number> = {
      brilliant: 0,
      great: 0,
      best: 0,
      excellent: 0,
      good: 0,
      book: 0,
      inaccuracy: 0,
      mistake: 0,
      blunder: 0,
      'missed-win': 0,
    };

    const blackStats: Record<MoveClassification, number> = {
      brilliant: 0,
      great: 0,
      best: 0,
      excellent: 0,
      good: 0,
      book: 0,
      inaccuracy: 0,
      mistake: 0,
      blunder: 0,
      'missed-win': 0,
    };

    moves.forEach((move, index) => {
      if (!move.classification) return;
      
      const isWhite = index % 2 === 0;
      if (isWhite) {
        whiteStats[move.classification]++;
      } else {
        blackStats[move.classification]++;
      }
    });

    return { whiteStats, blackStats };
  }, [moves]);

  const whiteRating = whiteAccuracy == null ? null : estimateGameRating(whiteAccuracy, whiteElo);
  const blackRating = blackAccuracy == null ? null : estimateGameRating(blackAccuracy, blackElo);

  const classifications: MoveClassification[] = [
    'brilliant',
    'great',
    'best',
    'excellent',
    'good',
    'book',
    'inaccuracy',
    'mistake',
    'blunder',
    'missed-win',
  ];

  return (
    <div className="bg-chess-dark rounded-lg p-4 shadow-lg">
      <h3 className="text-lg font-bold text-white mb-4">Game Review</h3>
      {whiteAccuracy == null && blackAccuracy == null && (
        <p className="text-sm text-gray-400 mb-4">Review game to see accuracy</p>
      )}
      
      {/* Accuracy Header */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="text-sm text-gray-400 mb-1">{whiteName}</div>
          <div className="text-2xl font-bold text-white">{formatAccuracy(whiteAccuracy)}</div>
        </div>
        <div className="flex items-center justify-center">
          <span className="text-gray-500 text-sm">Accuracy</span>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-400 mb-1">{blackName}</div>
          <div className="text-2xl font-bold text-white">{formatAccuracy(blackAccuracy)}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center text-lg font-semibold text-white">{formatGameRating(whiteRating)}</div>
        <div className="flex items-center justify-center">
          <span className="text-gray-500 text-sm" title="Estimated Chess.com rapid rating for this game">
            Game rating
          </span>
        </div>
        <div className="text-center text-lg font-semibold text-white">{formatGameRating(blackRating)}</div>
      </div>

      {/* Classification Stats */}
      <div className="space-y-1">
        {classifications.map((type) => {
          const color = getMoveClassificationColor(type);
          const icon = getMoveClassificationIcon(type);
          const label = getMoveClassificationLabel(type);
          
          // Only show rows where at least one player has this move type, or for important ones
          const hasMoves = stats.whiteStats[type] > 0 || stats.blackStats[type] > 0;
          if (!hasMoves && !['brilliant', 'great', 'blunder', 'mistake'].includes(type)) {
            return null;
          }

          return (
            <div key={type} className="grid grid-cols-[1fr_auto_1fr] items-center py-1 border-b border-gray-700 last:border-0">
              <button 
                onClick={() => onCategoryClick?.(type, 'white')}
                disabled={stats.whiteStats[type] === 0}
                className={`text-right font-mono hover:bg-gray-700 px-2 rounded transition-colors ${stats.whiteStats[type] > 0 ? 'text-white cursor-pointer' : 'text-gray-600 cursor-default'}`}
              >
                {stats.whiteStats[type]}
              </button>
              
              <div className="flex items-center gap-2 px-4 min-w-[140px] justify-center">
                <span className={`w-6 h-6 flex items-center justify-center rounded ${color.replace('text-', 'bg-').replace('300', '500').replace('400', '600').replace('500', '700')} bg-opacity-20 ${color}`}>
                  {icon}
                </span>
                <span className="text-sm text-gray-300">{label}</span>
              </div>

              <button 
                onClick={() => onCategoryClick?.(type, 'black')}
                disabled={stats.blackStats[type] === 0}
                className={`text-left font-mono hover:bg-gray-700 px-2 rounded transition-colors ${stats.blackStats[type] > 0 ? 'text-white cursor-pointer' : 'text-gray-600 cursor-default'}`}
              >
                {stats.blackStats[type]}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
