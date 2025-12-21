import { useState, useCallback } from 'react';
import { Chess } from 'chess.js';
import type { ChessGame, AnalyzedMove, GameInfo } from '../types';
import { identifyChess960Position } from '../utils/chess960';
import { extractFenFromPGN, extractMovesFromPGN, normalizeChess960Castling } from '../utils/pgn';

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
        // Extract FEN from PGN if not provided
        let fenToUse = startFen;
        if (!fenToUse) {
          const extractedFen = extractFenFromPGN(pgn);
          if (extractedFen) {
            fenToUse = extractedFen;
          }
        }

        // Normalize Chess960 castling rights (HAha -> KQkq)
        if (fenToUse) {
          fenToUse = normalizeChess960Castling(fenToUse);
        }

        const newGame = new Chess();
        
        // For Chess960 or games with custom starting positions, we need to:
        // 1. Load the FEN first
        // 2. Then manually apply each move from the PGN
        if (fenToUse) {
          newGame.load(fenToUse);
          
          // Extract moves and apply them one by one
          const movesOnly = extractMovesFromPGN(pgn);
          if (movesOnly) {
            // Parse the moves - handle standard algebraic notation including castling
            // Matches: regular moves (e4, Nf3, Bxe5), captures (exd5), promotions (e8=Q), castling (O-O, O-O-O)
            const moveMatches = movesOnly.match(/\b(?:O-O-O|O-O|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?)[+#]?\b/g);
            if (moveMatches) {
              for (const moveStr of moveMatches) {
                try {
                  newGame.move(moveStr);
                } catch (moveError) {
                  console.warn('Failed to apply move:', moveStr, moveError);
                  // Continue with other moves even if one fails
                }
              }
            }
          }
        } else {
          // Standard chess starting position - use loadPgn directly
          newGame.loadPgn(pgn);
        }

        // Extract game info from PGN headers (parse manually since we might not have used loadPgn)
        const whiteMatch = pgn.match(/\[White\s+"([^"]+)"\]/);
        const blackMatch = pgn.match(/\[Black\s+"([^"]+)"\]/);
        const resultMatch = pgn.match(/\[Result\s+"([^"]+)"\]/);
        const dateMatch = pgn.match(/\[Date\s+"([^"]+)"\]/);
        const eventMatch = pgn.match(/\[Event\s+"([^"]+)"\]/);
        const siteMatch = pgn.match(/\[Site\s+"([^"]+)"\]/);

        const gameInfo: GameInfo = {
          white: whiteMatch ? whiteMatch[1] : 'Unknown',
          black: blackMatch ? blackMatch[1] : 'Unknown',
          result: resultMatch ? resultMatch[1] : '*',
          date: dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0],
          event: eventMatch ? eventMatch[1] : undefined,
          site: siteMatch ? siteMatch[1] : undefined,
        };

        // Identify Chess960 position if applicable
        if (fenToUse) {
          const posNum = identifyChess960Position(fenToUse);
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
          startFen: fenToUse,
        });

        setMoves(analyzedMoves);
        
        // Reset to starting position
        game.reset();
        if (fenToUse) {
          game.load(fenToUse);
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
