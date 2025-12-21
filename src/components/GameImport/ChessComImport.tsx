import { useState } from 'react';
import type { ChessComGame } from '../../services/chesscom';
import type { ToastType } from '../UI/Toast';

interface ChessComImportProps {
  onFetchGames: (username: string, year: number, month: number) => void;
  games: ChessComGame[];
  onSelectGame: (game: ChessComGame) => void;
  isLoading: boolean;
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

export function ChessComImport({
  onFetchGames,
  games,
  onSelectGame,
  isLoading,
  showToast,
}: ChessComImportProps) {
  const [username, setUsername] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const handleFetch = () => {
    if (!username.trim()) {
      showToast('Please enter a username', 'warning');
      return;
    }
    showToast('Fetching Chess.com games...', 'info');
    onFetchGames(username, year, month);
  };

  return (
    <div className="bg-chess-darker rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4 text-white">Chess.com Import</h3>

      {/* Username input */}
      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-2">Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter Chess.com username"
          className="w-full px-3 py-2 bg-chess-dark text-white rounded border border-gray-600 focus:border-chess-green focus:outline-none"
        />
      </div>

      {/* Date picker */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">Year</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            min="2000"
            max={new Date().getFullYear()}
            className="w-full px-3 py-2 bg-chess-dark text-white rounded border border-gray-600 focus:border-chess-green focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-2">Month</label>
          <input
            type="number"
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            min="1"
            max="12"
            className="w-full px-3 py-2 bg-chess-dark text-white rounded border border-gray-600 focus:border-chess-green focus:outline-none"
          />
        </div>
      </div>

      {/* Fetch button */}
      <button
        onClick={handleFetch}
        disabled={!username.trim() || isLoading}
        className="w-full px-4 py-2 bg-chess-green text-black font-semibold rounded hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-4"
      >
        {isLoading ? 'Loading...' : 'Fetch Games'}
      </button>

      {/* Games list */}
      {games.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-gray-400 mb-2">
            Found {games.length} Chess960 game(s)
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {games.map((game, index) => (
              <button
                key={index}
                onClick={() => onSelectGame(game)}
                className="w-full text-left px-3 py-2 bg-chess-dark hover:bg-opacity-80 hover:border-chess-green border border-gray-600 rounded transition-all duration-200 group"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white group-hover:text-chess-green transition-colors">
                    {game.white.username} vs {game.black.username}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(game.end_time * 1000).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {game.time_control} • {game.white.result}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
