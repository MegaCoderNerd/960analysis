import { useState, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import type { ChessGame, AnalyzedMove, GameInfo } from '../types';
import { parsePgnToPositions } from '../utils/pgn';
import { toChessJsFen } from '../utils/chess960';

interface UseChessGameReturn {
  game: Chess;
  currentMoveIndex: number;
  gameData: ChessGame | null;
  chess960: boolean;
  loadGame: (pgn: string, startFen?: string) => { success: boolean; error?: string };
  goToMove: (index: number) => void;
  nextMove: () => void;
  previousMove: () => void;
  firstMove: () => void;
  lastMove: () => void;
  getCurrentFen: () => string;
  getLastMoveUci: () => string | null;
  flipBoard: () => void;
  boardOrientation: 'white' | 'black';
  updateMove: (index: number, data: Partial<AnalyzedMove>) => void;
  replaceMoves: (moves: AnalyzedMove[]) => void;
}

export function useChessGame(): UseChessGameReturn {
  const [game] = useState(() => new Chess());
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [gameData, setGameData] = useState<ChessGame | null>(null);
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');
  const [chess960, setChess960] = useState(false);
  const fenPositionsRef = useRef<string[]>([]);

  const loadFenOntoBoard = useCallback(
    (fen: string, is960: boolean) => {
      game.load(toChessJsFen(fen), { skipValidation: is960 });
    },
    [game]
  );

  const updateMove = useCallback((index: number, data: Partial<AnalyzedMove>) => {
    setGameData((prev) => {
      if (!prev) return null;
      const newMoves = [...prev.moves];
      if (newMoves[index]) {
        newMoves[index] = { ...newMoves[index], ...data };
      }
      return { ...prev, moves: newMoves };
    });
  }, []);

  const replaceMoves = useCallback((moves: AnalyzedMove[]) => {
    setGameData((prev) => (prev ? { ...prev, moves } : null));
  }, []);

  const loadGame = useCallback(
    (pgn: string, startFen?: string): { success: boolean; error?: string } => {
      try {
        const parsed = parsePgnToPositions(pgn);
        if (parsed.error) {
          return { success: false, error: parsed.error };
        }
        if (parsed.positions.length === 0) {
          return { success: false, error: 'No positions found in PGN' };
        }

        const is960 = parsed.chess960;
        const start = startFen ?? parsed.startFen ?? parsed.positions[0].fen;
        const analyzedMoves: AnalyzedMove[] = parsed.positions.slice(1).map((pos) => ({
          san: pos.san,
          fen: pos.fen,
          uci: pos.uci,
          evaluation: undefined,
        }));

        fenPositionsRef.current = parsed.positions.map((pos) => pos.fen);

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

        setGameData({
          pgn,
          info: gameInfo,
          moves: analyzedMoves,
          startFen: start,
        });
        setChess960(is960);
        loadFenOntoBoard(parsed.positions[0].fen, is960);
        setCurrentMoveIndex(-1);
        return { success: true };
      } catch (e) {
        console.error('Failed to load game:', e);
        return {
          success: false,
          error: e instanceof Error ? e.message : 'Failed to load game',
        };
      }
    },
    [loadFenOntoBoard]
  );

  const goToMove = useCallback(
    (index: number) => {
      if (!gameData) return;
      const fenIndex = index + 1;
      if (fenIndex >= 0 && fenIndex < fenPositionsRef.current.length) {
        loadFenOntoBoard(fenPositionsRef.current[fenIndex], chess960);
        setCurrentMoveIndex(index);
      }
    },
    [gameData, chess960, loadFenOntoBoard]
  );

  const nextMove = useCallback(() => {
    if (gameData && currentMoveIndex < gameData.moves.length - 1) {
      goToMove(currentMoveIndex + 1);
    }
  }, [currentMoveIndex, gameData, goToMove]);

  const previousMove = useCallback(() => {
    if (currentMoveIndex >= 0) {
      goToMove(currentMoveIndex - 1);
    }
  }, [currentMoveIndex, goToMove]);

  const firstMove = useCallback(() => {
    goToMove(-1);
  }, [goToMove]);

  const lastMove = useCallback(() => {
    if (gameData && gameData.moves.length > 0) {
      goToMove(gameData.moves.length - 1);
    }
  }, [gameData, goToMove]);

  const getCurrentFen = useCallback((): string => {
    const fenIndex = currentMoveIndex + 1;
    return fenPositionsRef.current[fenIndex] ?? game.fen();
  }, [currentMoveIndex, game]);

  const getLastMoveUci = useCallback((): string | null => {
    if (!gameData || currentMoveIndex < 0) return null;
    return gameData.moves[currentMoveIndex]?.uci || null;
  }, [gameData, currentMoveIndex]);

  const flipBoard = useCallback(() => {
    setBoardOrientation((prev) => (prev === 'white' ? 'black' : 'white'));
  }, []);

  return {
    game,
    currentMoveIndex,
    gameData,
    chess960,
    loadGame,
    goToMove,
    nextMove,
    previousMove,
    firstMove,
    lastMove,
    getCurrentFen,
    getLastMoveUci,
    flipBoard,
    boardOrientation,
    updateMove,
    replaceMoves,
  };
}
