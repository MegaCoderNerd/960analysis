import { useState } from 'react';
import { ChessComImport } from './ChessComImport';
import { LichessImport } from './LichessImport';
import { DirectImport } from './DirectImport';
import type { ChessComGame } from '../../services/chesscom';
import type { LichessGame } from '../../services/lichess';
import type { ToastType } from '../UI/Toast';
import { extractFenFromPGN } from '../../utils/pgn';

interface GameSelectorProps {
  onGameSelected: (pgn: string, startFen?: string) => void;
  chessComGames: ChessComGame[];
  lichessGames: LichessGame[];
  onFetchChessCom: (username: string, year: number, month: number) => void;
  onFetchLichess: (username: string, since?: number, until?: number) => void;
  onFetchLichessUrl: (url: string) => Promise<string | null>;
  isLoading: boolean;
  importPGN: (pgn: string) => { success: boolean; pgn: string; error?: string };
  importFEN: (fen: string) => { success: boolean; fen: string; error?: string };
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

export function GameSelector({
  onGameSelected,
  chessComGames,
  lichessGames,
  onFetchChessCom,
  onFetchLichess,
  onFetchLichessUrl,
  isLoading,
  importPGN,
  importFEN,
  showToast,
}: GameSelectorProps) {
  const [activeTab, setActiveTab] = useState<'chesscom' | 'lichess' | 'direct'>('direct');

  const handleChessComSelect = (game: ChessComGame) => {
    console.log('Chess.com game selected:', game.url);
    showToast('Loading Chess.com game...', 'info', 2000);
    const fen = extractFenFromPGN(game.pgn);
    onGameSelected(game.pgn, fen || undefined);
  };

  const handleLichessSelect = (game: LichessGame) => {
    if (game.pgn) {
      console.log('Lichess game selected:', game.id);
      showToast('Loading Lichess game...', 'info', 2000);
      const fen = extractFenFromPGN(game.pgn);
      onGameSelected(game.pgn, fen || undefined);
    } else {
      showToast('Game PGN not available', 'error');
    }
  };

  const handleLichessUrlFetch = async (url: string) => {
    showToast('Fetching game from URL...', 'info');
    const pgn = await onFetchLichessUrl(url);
    if (pgn) {
      console.log('Lichess URL game fetched successfully');
      const fen = extractFenFromPGN(pgn);
      onGameSelected(pgn, fen || undefined);
    } else {
      showToast('Failed to fetch game from URL', 'error');
    }
  };

  const handlePGNImport = (pgn: string) => {
    const result = importPGN(pgn);
    if (result.success) {
      console.log('PGN imported successfully');
      const fen = extractFenFromPGN(result.pgn);
      onGameSelected(result.pgn, fen || undefined);
    } else {
      showToast(result.error || 'Failed to import PGN', 'error');
    }
  };

  const handleFENImport = (fen: string) => {
    const result = importFEN(fen);
    if (result.success) {
      console.log('FEN imported successfully');
      // Create a minimal PGN with normalized FEN as starting position
      const pgn = `[FEN "${result.fen}"]\n[SetUp "1"]\n\n`;
      onGameSelected(pgn, result.fen);
    } else {
      showToast(result.error || 'Failed to import FEN', 'error');
    }
  };

  return (
    <div className="bg-chess-dark rounded-lg p-4">
      <h2 className="text-xl font-bold mb-4 text-white">Import Game</h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-gray-600">
        <button
          onClick={() => setActiveTab('direct')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'direct'
              ? 'text-chess-green border-b-2 border-chess-green'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Direct
        </button>
        <button
          onClick={() => setActiveTab('lichess')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'lichess'
              ? 'text-chess-green border-b-2 border-chess-green'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Lichess
        </button>
        <button
          onClick={() => setActiveTab('chesscom')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'chesscom'
              ? 'text-chess-green border-b-2 border-chess-green'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Chess.com
        </button>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'direct' && (
          <DirectImport 
            onImportPGN={handlePGNImport} 
            onImportFEN={handleFENImport}
            showToast={showToast}
          />
        )}
        {activeTab === 'lichess' && (
          <LichessImport
            onFetchGames={onFetchLichess}
            onFetchGameUrl={handleLichessUrlFetch}
            games={lichessGames}
            onSelectGame={handleLichessSelect}
            isLoading={isLoading}
            showToast={showToast}
          />
        )}
        {activeTab === 'chesscom' && (
          <ChessComImport
            onFetchGames={onFetchChessCom}
            games={chessComGames}
            onSelectGame={handleChessComSelect}
            isLoading={isLoading}
            showToast={showToast}
          />
        )}
      </div>
    </div>
  );
}
