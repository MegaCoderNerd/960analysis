import { useEffect, useRef, useState } from 'react';
import { Chessground } from 'chessground';
import type { Api } from 'chessground/api';
import type { Key } from 'chessground/types';
import { Chess } from 'chess.js';
import type { MoveClassification } from '../../types';
import { getChess960CastlingDests } from '../../utils/chess960';
import {
  getMoveClassificationBgColor,
  getMoveClassificationIcon,
  getMoveClassificationLabel,
} from '../../utils/moveClassification';
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
  playedMove?: {
    uci: string;
    san?: string;
    classification?: MoveClassification;
  } | null;
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
  playedMove,
  chess960 = false,
  width = 600,
  height = 600,
}: ChessBoardProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const chessgroundRef = useRef<Api | null>(null);
  const prevBoardRef = useRef<string | null>(null);
  const [badgeBox, setBadgeBox] = useState<{ left: number; top: number } | null>(null);

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
        enabled: false,
      },
      premovable: {
        enabled: false,
      },
    });

    requestAnimationFrame(() => {
      boardRef.current?.classList.add('piece-anim');
    });

    return () => {
      chessgroundRef.current?.destroy();
    };
    // Chessground is created once; later effects update fen/orientation/dests.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const cg = chessgroundRef.current;
    const boardEl = boardRef.current;
    if (!cg || !boardEl) return;

    const lastMove = highlightLastMove ? parseUciMove(playedMove?.uci) : undefined;
    const board = fen.split(' ')[0];
    const previous = prevBoardRef.current;
    prevBoardRef.current = board;
    const changes = previous === null ? 64 : pieceChanges(previous, board);
    const singleStep = changes > 0 && changes <= 4;

    if (!singleStep) {
      boardEl.classList.remove('piece-anim');
      void boardEl.offsetWidth;
    }

    const custom = new Map<Key, string>();
    if (lastMove) {
      custom.set(lastMove[0], 'move-from');
      custom.set(lastMove[1], 'move-to');
    }

    cg.set({
      fen,
      animation: { enabled: false },
      lastMove,
      turnColor: game.turn() === 'w' ? 'white' : 'black',
      check: game.inCheck(),
      highlight: {
        lastMove: highlightLastMove,
        check: true,
        custom,
      },
      movable: {
        dests: getValidMoves(game, fen, chess960),
        rookCastle: !chess960,
      },
    });

    if (singleStep) boardEl.classList.add('piece-anim');
    setBadgeBox(measureBadge(hostRef.current, lastMove?.[1], orientation));
  }, [game, fen, highlightLastMove, playedMove, chess960, orientation]);

  useEffect(() => {
    chessgroundRef.current?.set({ orientation });
  }, [orientation]);

  useEffect(() => {
    const cg = chessgroundRef.current;
    if (!cg) return;
    // Drawing an arrow redraws every piece. Wait until the slide has finished
    // so that redraw cannot interrupt it.
    const timeout = window.setTimeout(() => {
      if (!bestMove || bestMove.length < 4) {
        if (cg.state.drawable.shapes.length > 0) cg.setShapes([]);
        return;
      }
      cg.setShapes([
        {
          orig: bestMove.slice(0, 2) as Key,
          dest: bestMove.slice(2, 4) as Key,
          brush: 'green',
        },
      ]);
    }, 180);
    return () => window.clearTimeout(timeout);
  }, [bestMove]);

  const classification = playedMove?.classification;
  const icon = classification ? getMoveClassificationIcon(classification) : '';
  const badgeText = icon || playedMove?.san || '';

  return (
    <div
      ref={hostRef}
      className="relative chess-board shrink-0"
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      <div ref={boardRef} className="h-full w-full" />
      {badgeBox && badgeText && (
        <div
          className={`pointer-events-none absolute z-20 flex items-center justify-center whitespace-nowrap rounded-full border border-black/40 px-1 text-[10px] font-bold leading-none text-white shadow ${
            classification ? getMoveClassificationBgColor(classification) : 'bg-gray-800'
          }`}
          style={{
            minWidth: 22,
            height: 22,
            left: badgeBox.left,
            top: badgeBox.top,
          }}
          title={
            classification
              ? `${playedMove?.san ?? ''} ${getMoveClassificationLabel(classification)}`.trim()
              : playedMove?.san
          }
        >
          {badgeText}
        </div>
      )}
    </div>
  );
}

function measureBadge(
  host: HTMLDivElement | null,
  square: string | undefined,
  orientation: 'white' | 'black'
): { left: number; top: number } | null {
  if (!host || !square) return null;
  const board = host.querySelector('cg-board');
  if (!board) return null;
  const boardRect = board.getBoundingClientRect();
  const hostRect = host.getBoundingClientRect();
  const squareSize = boardRect.width / 8;
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]) - 1;
  const x = orientation === 'white' ? file : 7 - file;
  const y = orientation === 'white' ? 7 - rank : rank;
  return {
    left: boardRect.left - hostRect.left + (x + 1) * squareSize - 18,
    top: boardRect.top - hostRect.top + y * squareSize + 2,
  };
}

function pieceChanges(before: string, after: string): number {
  const left = expandBoard(before);
  const right = expandBoard(after);
  let changes = 0;
  for (let i = 0; i < 64; i++) {
    if (left[i] !== right[i]) changes++;
  }
  return changes;
}

function expandBoard(board: string): string[] {
  const squares: string[] = [];
  for (const row of board.split('/')) {
    for (const char of row) {
      if (/\d/.test(char)) {
        for (let i = 0; i < Number(char); i++) squares.push('');
      } else {
        squares.push(char);
      }
    }
  }
  return squares;
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
