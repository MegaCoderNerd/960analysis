import { useState, useCallback } from 'react';
import { fetchChessComGames, type ChessComGame } from '../services/chesscom';
import { fetchLichessGames, fetchLichessGameByUrl, type LichessGame } from '../services/lichess';

interface UseGameImportReturn {
  isLoading: boolean;
  error: string | null;
  chessComGames: ChessComGame[];
  lichessGames: LichessGame[];
  fetchFromChessCom: (username: string, year: number, month: number) => Promise<void>;
  fetchFromLichess: (username: string, since?: number, until?: number) => Promise<void>;
  fetchLichessGameUrl: (url: string) => Promise<string | null>;
  importPGN: (pgn: string) => { success: boolean; pgn: string; error?: string };
  importFEN: (fen: string) => { success: boolean; fen: string; error?: string };
  clearError: () => void;
}

export function useGameImport(): UseGameImportReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chessComGames, setChessComGames] = useState<ChessComGame[]>([]);
  const [lichessGames, setLichessGames] = useState<LichessGame[]>([]);

  const fetchFromChessCom = useCallback(
    async (username: string, year: number, month: number) => {
      setIsLoading(true);
      setError(null);

      try {
        const games = await fetchChessComGames(username, year, month);
        setChessComGames(games);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch games');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const fetchFromLichess = useCallback(
    async (username: string, since?: number, until?: number) => {
      setIsLoading(true);
      setError(null);

      try {
        const games = await fetchLichessGames(username, since, until);
        setLichessGames(games);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch games');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const fetchLichessGameUrl = useCallback(async (url: string): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const pgn = await fetchLichessGameByUrl(url);
      return pgn;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch game');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const importPGN = useCallback((pgn: string): { success: boolean; pgn: string; error?: string } => {
    try {
      // Basic PGN validation
      if (!pgn.trim()) {
        return { success: false, pgn: '', error: 'PGN is empty' };
      }

      // Check if PGN has at least one move or game information
      if (!pgn.includes('[') && !pgn.match(/\d+\./)) {
        return { success: false, pgn: '', error: 'Invalid PGN format' };
      }

      return { success: true, pgn: pgn.trim() };
    } catch (err) {
      return {
        success: false,
        pgn: '',
        error: err instanceof Error ? err.message : 'Failed to parse PGN',
      };
    }
  }, []);

  const importFEN = useCallback((fen: string): { success: boolean; fen: string; error?: string } => {
    try {
      // Basic FEN validation
      if (!fen.trim()) {
        return { success: false, fen: '', error: 'FEN is empty' };
      }

      const parts = fen.trim().split(' ');
      if (parts.length < 4) {
        return { success: false, fen: '', error: 'Invalid FEN format' };
      }

      return { success: true, fen: fen.trim() };
    } catch (err) {
      return {
        success: false,
        fen: '',
        error: err instanceof Error ? err.message : 'Failed to parse FEN',
      };
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    chessComGames,
    lichessGames,
    fetchFromChessCom,
    fetchFromLichess,
    fetchLichessGameUrl,
    importPGN,
    importFEN,
    clearError,
  };
}
