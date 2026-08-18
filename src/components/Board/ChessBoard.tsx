import { useEffect, useRef } from 'react';
import { Chessground } from 'chessground';
import type { Api } from 'chessground/api';
import type { Key } from 'chessground/types';
import { Chess } from 'chess.js';
import { getChess960CastlingDests } from '../../utils/chess960';
import 'chessground/assets/chessground.base.css';
import 'chessground/assets/chessground.brown.css';
import 'chessground/assets/chessground.cburnett.css';

interface ChessBoardProps {
  game: Chess;
  fen: string;
  orientation: 'white' | 'black';
  onMove?: (from: string, to: string) => void;
  highlightLastMove?: boolean;
  bestMove?: string | null;
  lastMoveUci?: string | null;
  chess960?: boolean;
  width?: number;
  height?: number;
}

export function ChessBoard({
  game,
  fen,
  orientation,
  onMove,
  highlightLastMove = true,
  bestMove,
  lastMoveUci,
  chess960 = false,
  width = 600,
  height = 600,
}: ChessBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const chessgroundRef = useRef<Api | null>(null);

  useEffect(() => {
    if (!boardRef.current) return;

    chessgroundRef.current = Chessground(boardRef.current, {
      fen: game.fen(),
      orientation,
      movable: {
        free: false,
        color: 'both',
        dests: getValidMoves(game, fen, chess960),
        rookCastle: !chess960,
        events: {
          after: (orig: string, dest: string) => {
            onMove?.(orig, dest);
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
    });

    return () => {
      chessgroundRef.current?.destroy();
    };
    // Chessground is created once; later effects update fen/orientation/dests.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!chessgroundRef.current) return;

    const lastMove = parseUciMove(lastMoveUci);

    chessgroundRef.current.set({
      fen,
      movable: {
        dests: getValidMoves(game, fen, chess960),
        rookCastle: !chess960,
      },
      turnColor: game.turn() === 'w' ? 'white' : 'black',
      check: game.inCheck(),
      lastMove: highlightLastMove && lastMove ? lastMove : undefined,
    });
  }, [game, fen, highlightLastMove, lastMoveUci, chess960]);

  useEffect(() => {
    if (!chessgroundRef.current) return;
    chessgroundRef.current.set({ orientation });
  }, [orientation]);

  useEffect(() => {
    if (!chessgroundRef.current) return;
    if (!bestMove || bestMove.length < 4) {
      chessgroundRef.current.setShapes([]);
      return;
    }
    chessgroundRef.current.setShapes([
      {
        orig: bestMove.slice(0, 2) as Key,
        dest: bestMove.slice(2, 4) as Key,
        brush: 'green',
      },
    ]);
  }, [bestMove]);

  return (
    <div
      ref={boardRef}
      style={{ width: `${width}px`, height: `${height}px` }}
      className="chess-board"
    />
  );
}

function parseUciMove(uci?: string | null): [Key, Key] | undefined {
  if (!uci || uci.length < 4) return undefined;
  return [uci.slice(0, 2) as Key, uci.slice(2, 4) as Key];
}

function getValidMoves(game: Chess, fen: string, chess960: boolean): Map<Key, Key[]> {
  const dests = new Map<Key, Key[]>();
  const moves = game.moves({ verbose: true });

  for (const move of moves) {
    const from = move.from as Key;
    const to = move.to as Key;
    if (!dests.has(from)) dests.set(from, []);
    dests.get(from)!.push(to);
  }

  if (chess960) {
    const castleDests = getChess960CastlingDests(fen);
    for (const [from, tos] of castleDests) {
      const existing = dests.get(from as Key) ?? [];
      dests.set(from as Key, [...new Set([...existing, ...(tos as Key[])])]);
    }
  }

  return dests;
}
