import { useState } from 'react';

interface DirectImportProps {
  onImportPGN: (pgn: string) => void;
  onImportFEN: (fen: string) => void;
}

export function DirectImport({ onImportPGN, onImportFEN }: DirectImportProps) {
  const [importType, setImportType] = useState<'pgn' | 'fen'>('pgn');
  const [inputValue, setInputValue] = useState('');

  const handleImport = () => {
    if (!inputValue.trim()) return;

    if (importType === 'pgn') {
      onImportPGN(inputValue);
    } else {
      onImportFEN(inputValue);
    }

    setInputValue('');
  };

  return (
    <div className="bg-chess-darker rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4 text-white">Direct Import</h3>

      {/* Import type selector */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setImportType('pgn')}
          className={`px-4 py-2 rounded transition-colors ${
            importType === 'pgn'
              ? 'bg-chess-green text-black font-semibold'
              : 'bg-chess-dark text-white hover:bg-chess-dark'
          }`}
        >
          PGN
        </button>
        <button
          onClick={() => setImportType('fen')}
          className={`px-4 py-2 rounded transition-colors ${
            importType === 'fen'
              ? 'bg-chess-green text-black font-semibold'
              : 'bg-chess-dark text-white hover:bg-chess-dark'
          }`}
        >
          FEN
        </button>
      </div>

      {/* Input area */}
      <div className="mb-4">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={
            importType === 'pgn'
              ? 'Paste PGN notation here...\n\n[Event "Chess960"]\n[White "Player1"]\n[Black "Player2"]\n\n1. e4 e5 2. Nf3 Nc6...'
              : 'Paste FEN string here...\n\ne.g., rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
          }
          className="w-full h-40 px-3 py-2 bg-chess-dark text-white rounded border border-gray-600 focus:border-chess-green focus:outline-none resize-none font-mono text-sm"
        />
      </div>

      {/* Import button */}
      <button
        onClick={handleImport}
        disabled={!inputValue.trim()}
        className="w-full px-4 py-2 bg-chess-green text-black font-semibold rounded hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Import {importType.toUpperCase()}
      </button>
    </div>
  );
}
