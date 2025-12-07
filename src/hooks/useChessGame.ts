import { useState, useCallback } from 'react';
import { Chess } from 'chess.js';
import type { ChessGame, AnalyzedMove, GameInfo } from '../types';
import { identifyChess960Position } from '../utils/chess960';

interface UseChessGameReturn {
  game: Chess;
  currentMoveIndex: number;
  gameData: ChessGame | null;
  loadGame: (pgn: string, startFen?: string) => boolean;
  goToMove: (index: number) => void;
  nextMove: () => void;
  previousMove: () => void;
  firstMove: () => void;
  lastMove: () => void;
  getCurrentFen: () => string;
  flipBoard: () => void;
  boardOrientation: 'white' | 'black';
}

export function useChessGame(): UseChessGameReturn {
  const [game] = useState(() => new Chess());
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [gameData, setGameData] = useState<ChessGame | null>(null);
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');
  const [moves, setMoves] = useState<AnalyzedMove[]>([]);

  const loadGame = useCallback(
    (pgn: string, startFen?: string): boolean => {
      try {
        const newGame = new Chess();
        
        if (startFen) {
          newGame.load(startFen);
        }

        // Load the PGN
        newGame.loadPgn(pgn);

        // Extract game info from PGN headers
        const headers = newGame.header();
        const gameInfo: GameInfo = {
          white: headers.White || 'Unknown',
          black: headers.Black || 'Unknown',
          result: headers.Result || '*',
          date: headers.Date || new Date().toISOString().split('T')[0],
          event: headers.Event || undefined,
          site: headers.Site || undefined,
        };

        // Identify Chess960 position if applicable
        if (startFen) {
          const posNum = identifyChess960Position(startFen);
          if (posNum) {
            gameInfo.startPos = posNum;
          }
        }

        // Extract all moves
        const history = newGame.history({ verbose: true });
        const analyzedMoves: AnalyzedMove[] = history.map((move) => ({
          san: move.san,
          fen: move.after,
          evaluation: null,
          isCheck: move.san.includes('+'),
          isCheckmate: move.san.includes('#'),
        }));

        setGameData({
          pgn,
          info: gameInfo,
          moves: analyzedMoves,
          startFen,
        });

        setMoves(analyzedMoves);
        
        // Reset to starting position
        game.reset();
        if (startFen) {
          game.load(startFen);
        }
        setCurrentMoveIndex(-1);

        return true;
      } catch (error) {
        console.error('Failed to load game:', error);
        return false;
      }
    },
    [game]
  );

  const goToMove = useCallback(
    (index: number) => {
      if (!gameData) return;

      game.reset();
      if (gameData.startFen) {
        game.load(gameData.startFen);
      }

      // Replay moves up to the specified index
      for (let i = 0; i <= index && i < moves.length; i++) {
        const move = moves[i];
        try {
          game.move(move.san);
        } catch (error) {
          console.error('Error replaying move:', error);
          break;
        }
      }

      setCurrentMoveIndex(index);
    },
    [game, gameData, moves]
  );

  const nextMove = useCallback(() => {
    if (currentMoveIndex < moves.length - 1) {
      goToMove(currentMoveIndex + 1);
    }
  }, [currentMoveIndex, moves.length, goToMove]);

  const previousMove = useCallback(() => {
    if (currentMoveIndex >= 0) {
      goToMove(currentMoveIndex - 1);
    }
  }, [currentMoveIndex, goToMove]);

  const firstMove = useCallback(() => {
    goToMove(-1);
  }, [goToMove]);

  const lastMove = useCallback(() => {
    if (moves.length > 0) {
      goToMove(moves.length - 1);
    }
  }, [moves.length, goToMove]);

  const getCurrentFen = useCallback((): string => {
    return game.fen();
  }, [game]);

  const flipBoard = useCallback(() => {
    setBoardOrientation((prev) => (prev === 'white' ? 'black' : 'white'));
  }, []);

  return {
    game,
    currentMoveIndex,
    gameData,
    loadGame,
    goToMove,
    nextMove,
    previousMove,
    firstMove,
    lastMove,
    getCurrentFen,
    flipBoard,
    boardOrientation,
  };
}
