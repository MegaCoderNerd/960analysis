import { useState, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import type { ChessGame, AnalyzedMove, GameInfo } from '../types';
import { identifyChess960Position } from '../utils/chess960';
import { extractFenFromPGN, extractMovesFromPGN, normalizeChess960Castling, cleanPGN, applyChess960Castling } from '../utils/pgn';

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
  updateMove: (index: number, data: Partial<AnalyzedMove>) => void;
}

export function useChessGame(): UseChessGameReturn {
  const [game] = useState(() => new Chess());
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [gameData, setGameData] = useState<ChessGame | null>(null);
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');
  const [moves, setMoves] = useState<AnalyzedMove[]>([]);
  
  // Store all FEN positions for direct access (no replay needed)
  const fenPositionsRef = useRef<string[]>([]);

  const updateMove = useCallback((index: number, data: Partial<AnalyzedMove>) => {
    setMoves((prev) => {
      const newMoves = [...prev];
      if (newMoves[index]) {
        newMoves[index] = { ...newMoves[index], ...data };
      }
      return newMoves;
    });
    
    setGameData((prev) => {
      if (!prev) return null;
      const newMoves = [...prev.moves];
      if (newMoves[index]) {
        newMoves[index] = { ...newMoves[index], ...data };
      }
      return { ...prev, moves: newMoves };
    });
  }, []);

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

        // Check if this is a Chess960 game
        const originalFen = fenToUse;
        const isChess960Game = fenToUse 
          ? /[A-Ha-h]/.test(fenToUse.split(' ')[2] || '') || pgn.toLowerCase().includes('chess960')
          : pgn.toLowerCase().includes('chess960');

        // For Chess960, normalize castling rights
        if (fenToUse && isChess960Game) {
          fenToUse = normalizeChess960Castling(fenToUse);
        }
        
        // Reset FEN positions array - index 0 will be starting position
        const fenPositions: string[] = [];
        
        // Create a temporary game to parse moves
        const tempGame = new Chess();
        
        if (fenToUse) {
          // Load starting FEN with skipValidation for Chess960
          tempGame.load(fenToUse, { skipValidation: true });
        }
        
        // Store starting position FEN
        fenPositions.push(tempGame.fen());

        // Parse and apply moves
        const analyzedMoves: AnalyzedMove[] = [];
        
        if (fenToUse) {
          // Extract moves and apply them one by one
          const movesOnly = extractMovesFromPGN(pgn);
          if (movesOnly) {
            const moveTokens = cleanPGN(movesOnly);
            
            for (const token of moveTokens) {
              let moveApplied = false;
              const currentFen = tempGame.fen();
              
              // For Chess960 castling, use our manual FEN manipulation
              if (isChess960Game && (token === 'O-O' || token === 'O-O-O')) {
                const isKingside = token === 'O-O';
                const newFen = applyChess960Castling(currentFen, isKingside);
                
                if (newFen) {
                  tempGame.load(newFen, { skipValidation: true });
                  fenPositions.push(newFen);
                  
                  // Check if the move results in check
                  const isCheck = tempGame.inCheck();
                  
                  analyzedMoves.push({
                    san: token,
                    fen: newFen,
                    evaluation: null,
                    isCheck: isCheck,
                    isCheckmate: tempGame.isCheckmate(),
                  });
                  moveApplied = true;
                }
              }
              
              // Try standard move
              if (!moveApplied) {
                try {
                  const result = tempGame.move(token);
                  if (result) {
                    const newFen = tempGame.fen();
                    fenPositions.push(newFen);
                    
                    analyzedMoves.push({
                      san: result.san,
                      fen: newFen,
                      evaluation: null,
                      isCheck: result.san.includes('+'),
                      isCheckmate: result.san.includes('#'),
                    });
                    moveApplied = true;
                  }
                } catch {
                  // Standard move failed
                }
              }
              
              if (!moveApplied) {
                console.warn(`Failed to apply move ${analyzedMoves.length + 1}: ${token}`);
              }
            }
          }
        } else {
          // Standard chess - use loadPgn
          tempGame.loadPgn(pgn);
          const history = tempGame.history({ verbose: true });
          
          // Rebuild FEN positions
          const replayGame = new Chess();
          fenPositions.length = 0;
          fenPositions.push(replayGame.fen());
          
          for (const move of history) {
            replayGame.move(move.san);
            const newFen = replayGame.fen();
            fenPositions.push(newFen);
            
            analyzedMoves.push({
              san: move.san,
              fen: newFen,
              evaluation: null,
              isCheck: move.san.includes('+'),
              isCheckmate: move.san.includes('#'),
            });
          }
        }

        // Store FEN positions for direct access
        fenPositionsRef.current = fenPositions;

        // Extract game info from PGN headers
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
        if (originalFen) {
          const posNum = identifyChess960Position(originalFen);
          if (posNum) {
            gameInfo.startPos = posNum;
          }
        }

        console.log(`Loaded game: ${analyzedMoves.length} moves parsed from PGN`);

        setGameData({
          pgn,
          info: gameInfo,
          moves: analyzedMoves,
          startFen: fenToUse,
        });

        setMoves(analyzedMoves);
        
        // Set game to starting position
        game.reset();
        if (fenToUse) {
          game.load(fenToUse, { skipValidation: true });
        }
        
        setCurrentMoveIndex(-1);

        return true;
      } catch (e) {
        console.error('Failed to load game:', e);
        return false;
      }
    },
    [game]
  );

  const goToMove = useCallback(
    (index: number) => {
      if (!gameData) return;
      
      // Use stored FEN positions for instant navigation
      // index -1 = starting position (fenPositions[0])
      // index 0 = after first move (fenPositions[1])
      // etc.
      const fenIndex = index + 1;
      
      if (fenIndex >= 0 && fenIndex < fenPositionsRef.current.length) {
        const targetFen = fenPositionsRef.current[fenIndex];
        game.load(targetFen, { skipValidation: true });
        setCurrentMoveIndex(index);
      }
    },
    [game, gameData]
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
    updateMove,
  };
}
