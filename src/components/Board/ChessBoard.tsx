import { useEffect, useRef } from 'react';
import { Chessground } from 'chessground';
import type { Api } from 'chessground/api';
import type { Key } from 'chessground/types';
import { Chess } from 'chess.js';
import 'chessground/assets/chessground.base.css';
import 'chessground/assets/chessground.brown.css';
import 'chessground/assets/chessground.cburnett.css';

interface ChessBoardProps {
  game: Chess;
  orientation: 'white' | 'black';
  onMove?: (from: string, to: string) => void;
  highlightLastMove?: boolean;
  bestMove?: string | null;
  width?: number;
  height?: number;
}

export function ChessBoard({
  game,
  orientation,
  onMove,
  highlightLastMove = true,
  bestMove,
  width = 600,
  height = 600,
}: ChessBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const chessgroundRef = useRef<Api | null>(null);

  useEffect(() => {
    if (!boardRef.current) return;

    const config = {
      fen: game.fen(),
      orientation,
      movable: {
        free: false,
        color: 'both' as const,
        dests: getValidMoves(game),
        events: {
          after: (orig: string, dest: string) => {
            if (onMove) {
              onMove(orig, dest);
            }
          },
        },
      },
      draggable: {
        enabled: true,
        showGhost: true,
      },
      highlight: {
        lastMove: highlightLastMove,
        check: true,
      },
      animation: {
        enabled: true,
        duration: 200,
      },
      premovable: {
        enabled: false,
      },
    };

    chessgroundRef.current = Chessground(boardRef.current, config);

    return () => {
      chessgroundRef.current?.destroy();
    };
  }, []);

  // Update board when game state changes
  useEffect(() => {
    if (!chessgroundRef.current) return;

    chessgroundRef.current.set({
      fen: game.fen(),
      movable: {
        dests: getValidMoves(game),
      },
      turnColor: game.turn() === 'w' ? 'white' : 'black',
      check: game.inCheck(),
    });

    // Highlight last move
    const history = game.history({ verbose: true });
    if (history.length > 0 && highlightLastMove) {
      const lastMove = history[history.length - 1];
      chessgroundRef.current.set({
        lastMove: [lastMove.from, lastMove.to],
      });
    }
  }, [game, highlightLastMove]);

  // Update orientation
  useEffect(() => {
    if (!chessgroundRef.current) return;
    chessgroundRef.current.set({ orientation });
  }, [orientation]);

  // Draw best move arrow
  useEffect(() => {
    if (!chessgroundRef.current || !bestMove) return;

    // Parse best move (e.g., "e2e4" -> from: e2, to: e4)
    if (bestMove.length >= 4) {
      const from = bestMove.slice(0, 2);
      const to = bestMove.slice(2, 4);

      chessgroundRef.current.setShapes([
        {
          orig: from as any,
          dest: to as any,
          brush: 'green',
        },
      ]);
    }
  }, [bestMove]);

  return (
    <div
      ref={boardRef}
      style={{ width: `${width}px`, height: `${height}px` }}
      className="chess-board"
    />
  );
}

// Helper function to get valid moves for chessground
function getValidMoves(game: Chess): Map<Key, Key[]> {
  const dests = new Map<Key, Key[]>();
  const moves = game.moves({ verbose: true });

  for (const move of moves) {
    if (!dests.has(move.from as Key)) {
      dests.set(move.from as Key, []);
    }
    dests.get(move.from as Key)!.push(move.to as Key);
  }

  return dests;
}
