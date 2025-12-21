import type { AnalyzedMove } from '../../types';
import { MoveItem } from './MoveItem';

interface MoveListProps {
  moves: AnalyzedMove[];
  currentMoveIndex: number;
  onMoveClick: (index: number) => void;
}

export function MoveList({ moves, currentMoveIndex, onMoveClick }: MoveListProps) {
  // Group moves into pairs (white, black)
  const movePairs: Array<{ white: AnalyzedMove; black?: AnalyzedMove; moveNumber: number }> = [];

  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push({
      white: moves[i],
      black: moves[i + 1],
      moveNumber: Math.floor(i / 2) + 1,
    });
  }

  return (
    <div className="h-[600px] overflow-y-auto bg-chess-darker rounded-lg p-3">
      <h3 className="text-lg font-semibold mb-3 text-white sticky top-0 bg-chess-darker z-10 pb-2">Moves</h3>
      <div className="space-y-1">
        {movePairs.map((pair, pairIndex) => (
          <div key={pairIndex} className="flex items-center gap-2">
            <MoveItem
              move={pair.white}
              moveNumber={pair.moveNumber}
              isWhite={true}
              isActive={currentMoveIndex === pairIndex * 2}
              onClick={() => onMoveClick(pairIndex * 2)}
            />
            {pair.black && (
              <MoveItem
                move={pair.black}
                moveNumber={pair.moveNumber}
                isWhite={false}
                isActive={currentMoveIndex === pairIndex * 2 + 1}
                onClick={() => onMoveClick(pairIndex * 2 + 1)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
