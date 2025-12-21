import type { AnalyzedMove } from '../../types';
import {
  getMoveClassificationColor,
  getMoveClassificationIcon,
} from '../../utils/moveClassification';

interface MoveItemProps {
  move: AnalyzedMove;
  moveNumber: number;
  isWhite: boolean;
  isActive: boolean;
  onClick: () => void;
}

export function MoveItem({
  move,
  moveNumber,
  isWhite,
  isActive,
  onClick,
}: MoveItemProps) {
  const classificationColor = move.classification
    ? getMoveClassificationColor(move.classification)
    : '';
  const classificationIcon = move.classification
    ? getMoveClassificationIcon(move.classification)
    : '';

  return (
    <button
      onClick={onClick}
      className={`
        px-2 py-1 rounded text-left hover:bg-chess-dark transition-colors
        ${isActive ? 'bg-chess-green text-black font-semibold' : ''}
      `}
    >
      <span className="inline-flex items-center gap-1">
        {isWhite && <span className="text-gray-500">{moveNumber}.</span>}
        <span>{move.san}</span>
        {classificationIcon && (
          <span className={`text-xs ${classificationColor}`}>
            {classificationIcon}
          </span>
        )}
      </span>
    </button>
  );
}
