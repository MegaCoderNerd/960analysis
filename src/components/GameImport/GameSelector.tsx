import { useState } from 'react';
import { ChessComImport } from './ChessComImport';
import { LichessImport } from './LichessImport';
import { DirectImport } from './DirectImport';
import type { ChessComGame } from '../../services/chesscom';
import type { LichessGame } from '../../services/lichess';

interface GameSelectorProps {
  onGameSelected: (pgn: string, startFen?: string) => void;
  chessComGames: ChessComGame[];
  lichessGames: LichessGame[];
  onFetchChessCom: (username: string, year: number, month: number) => void;
  onFetchLichess: (username: string, since?: number, until?: number) => void;
  onFetchLichessUrl: (url: string) => Promise<string | null>;
  isLoading: boolean;
}

export function GameSelector({
  onGameSelected,
  chessComGames,
  lichessGames,
  onFetchChessCom,
  onFetchLichess,
  onFetchLichessUrl,
  isLoading,
}: GameSelectorProps) {
  const [activeTab, setActiveTab] = useState<'chesscom' | 'lichess' | 'direct'>('direct');

  const handleChessComSelect = (game: ChessComGame) => {
    onGameSelected(game.pgn);
  };

  const handleLichessSelect = (game: LichessGame) => {
    if (game.pgn) {
      onGameSelected(game.pgn);
    }
  };

  const handleLichessUrlFetch = async (url: string) => {
    const pgn = await onFetchLichessUrl(url);
    if (pgn) {
      onGameSelected(pgn);
    }
  };

  const handlePGNImport = (pgn: string) => {
    onGameSelected(pgn);
  };

  const handleFENImport = (fen: string) => {
    // Create a minimal PGN with FEN as starting position
    const pgn = `[FEN "${fen}"]\n[SetUp "1"]\n\n`;
    onGameSelected(pgn, fen);
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
          <DirectImport onImportPGN={handlePGNImport} onImportFEN={handleFENImport} />
        )}
        {activeTab === 'lichess' && (
          <LichessImport
            onFetchGames={onFetchLichess}
            onFetchGameUrl={handleLichessUrlFetch}
            games={lichessGames}
            onSelectGame={handleLichessSelect}
            isLoading={isLoading}
          />
        )}
        {activeTab === 'chesscom' && (
          <ChessComImport
            onFetchGames={onFetchChessCom}
            games={chessComGames}
            onSelectGame={handleChessComSelect}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}
