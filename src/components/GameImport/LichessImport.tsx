import { useState } from 'react';
import type { LichessGame } from '../../services/lichess';
import { playerName } from '../../services/lichess';
import type { ToastType } from '../UI/Toast';

interface LichessImportProps {
  onFetchGames: (username: string, since?: number, until?: number) => void;
  onFetchGameUrl: (url: string) => void;
  games: LichessGame[];
  onSelectGame: (game: LichessGame) => void;
  isLoading: boolean;
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

export function LichessImport({
  onFetchGames,
  onFetchGameUrl,
  games,
  onSelectGame,
  isLoading,
  showToast,
}: LichessImportProps) {
  const [username, setUsername] = useState('');
  const [gameUrl, setGameUrl] = useState('');
  const [importType, setImportType] = useState<'username' | 'url'>('username');

  const handleFetchByUsername = () => {
    if (!username.trim()) {
      showToast('Please enter a username', 'warning');
      return;
    }
    // Fetch games from last 30 days by default
    const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
    showToast('Fetching Lichess games...', 'info');
    onFetchGames(username, since);
  };

  const handleFetchByUrl = () => {
    if (!gameUrl.trim()) {
      showToast('Please enter a game URL', 'warning');
      return;
    }
    
    // Validate URL format - must be a valid Lichess URL
    try {
      const url = new URL(gameUrl);
      if (url.hostname !== 'lichess.org') {
        showToast('Invalid Lichess URL. Must be from lichess.org domain', 'error');
        return;
      }
    } catch {
      showToast('Invalid URL format', 'error');
      return;
    }
    
    onFetchGameUrl(gameUrl);
    setGameUrl(''); // Clear URL after fetch
  };

  return (
    <div className="bg-chess-darker rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4 text-white">Lichess Import</h3>

      {/* Import type selector */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setImportType('username')}
          className={`px-4 py-2 rounded transition-colors ${
            importType === 'username'
              ? 'bg-chess-green text-black font-semibold'
              : 'bg-chess-dark text-white hover:bg-chess-dark'
          }`}
        >
          By Username
        </button>
        <button
          onClick={() => setImportType('url')}
          className={`px-4 py-2 rounded transition-colors ${
            importType === 'url'
              ? 'bg-chess-green text-black font-semibold'
              : 'bg-chess-dark text-white hover:bg-chess-dark'
          }`}
        >
          By URL
        </button>
      </div>

      {/* Username import */}
      {importType === 'username' && (
        <>
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter Lichess username"
              className="w-full px-3 py-2 bg-chess-dark text-white rounded border border-gray-600 focus:border-chess-green focus:outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Will fetch Chess960 games from last 30 days
            </p>
          </div>

          <button
            onClick={handleFetchByUsername}
            disabled={!username.trim() || isLoading}
            className="w-full px-4 py-2 bg-chess-green text-black font-semibold rounded hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Loading...' : 'Fetch Games'}
          </button>
        </>
      )}

      {/* URL import */}
      {importType === 'url' && (
        <>
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">Game URL</label>
            <input
              type="text"
              value={gameUrl}
              onChange={(e) => setGameUrl(e.target.value)}
              placeholder="https://lichess.org/abc123def"
              className="w-full px-3 py-2 bg-chess-dark text-white rounded border border-gray-600 focus:border-chess-green focus:outline-none"
            />
          </div>

          <button
            onClick={handleFetchByUrl}
            disabled={!gameUrl.trim() || isLoading}
            className="w-full px-4 py-2 bg-chess-green text-black font-semibold rounded hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Loading...' : 'Fetch Game'}
          </button>
        </>
      )}

      {/* Games list */}
      {games.length > 0 && importType === 'username' && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-gray-400 mb-2">
            Found {games.length} Chess960 game(s)
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {games.map((game) => (
              <button
                key={game.id}
                onClick={() => onSelectGame(game)}
                className="w-full text-left px-3 py-2 bg-chess-dark hover:bg-opacity-80 hover:border-chess-green border border-gray-600 rounded transition-all duration-200"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white">
                    {playerName(game.players.white)} vs {playerName(game.players.black)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(game.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {game.speed} • {game.status}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
