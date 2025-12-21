import { useState } from 'react';
import type { ToastType } from '../UI/Toast';

interface DirectImportProps {
  onImportPGN: (pgn: string) => void;
  onImportFEN: (fen: string) => void;
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

export function DirectImport({ onImportPGN, onImportFEN, showToast }: DirectImportProps) {
  const [importType, setImportType] = useState<'pgn' | 'fen'>('pgn');
  const [inputValue, setInputValue] = useState('');

  const handleImport = () => {
    if (!inputValue.trim()) {
      showToast('Please enter some content to import', 'warning');
      return;
    }

    if (importType === 'pgn') {
      onImportPGN(inputValue);
      setInputValue('');
    } else {
      onImportFEN(inputValue);
      setInputValue('');
    }
  };

  const handleExamplePGN = () => {
    const examplePGN = `[Event "Rated Chess960 game"]
[Site "https://lichess.org/abc123"]
[White "Player1"]
[Black "Player2"]
[Result "1-0"]
[FEN "nrkbbqrn/pppppppp/8/8/8/8/PPPPPPPP/NRKBBQRN w KQkq - 0 1"]
[SetUp "1"]
[Variant "Chess960"]

1. e4 e5 2. Nf3 Nf6 3. Bc4 Bc5 4. O-O O-O 5. d3 d6 6. c3 Nc6 1-0`;
    setInputValue(examplePGN);
    showToast('Example PGN loaded', 'info', 2000);
  };

  const handleExampleFEN = () => {
    const exampleFEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    setInputValue(exampleFEN);
    showToast('Example FEN loaded', 'info', 2000);
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
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm text-gray-400">
            {importType === 'pgn' ? 'PGN Notation' : 'FEN String'}
          </label>
          <button
            onClick={importType === 'pgn' ? handleExamplePGN : handleExampleFEN}
            className="text-xs text-chess-green hover:underline"
          >
            Load Example
          </button>
        </div>
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
