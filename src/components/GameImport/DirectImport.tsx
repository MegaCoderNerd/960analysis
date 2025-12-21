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
[White "Kine"]
[Black "Sparky"]
[Result "0-1"]
[FEN "rqkbnnbr/pppppppp/8/8/8/8/PPPPPPPP/RQKBNNBR w HAha - 0 1"]
[SetUp "1"]
[Variant "Chess960"]

1. f4 Nd6 2. e3 b6 3. Nf3 c6 4. Be2 Ng6 5. Ne5 Nxe5 6. fxe5 Nf5 7. c3 e6 8. g4 Ne7 9. e4 f6 10. Qc2 Bf7 11. exf6 gxf6 12. Ne3 d5 13. exd5 cxd5 14. O-O-O Bc7 15. c4 O-O 16. cxd5 Rc8 17. Kb1 exd5 18. Bd3 Kg7 19. Bxh7 Be5 20. Qd3 Bg6 21. Bxg6 Nxg6 22. Nf5+ Kf7 23. Qxd5+ Kf8 24. Qd7 Qc7 25. Qxc7 Rxc7 26. Be3 Re8 27. Bh6+ Kf7 28. Rhe1 Rc5 29. g5 fxg5 30. Bxg5 Ke6 31. Nh6 Kd5 32. Nf7 Rec8 33. Nxe5 Nxe5 34. Bf6 Rc4 35. Rxe5+ Kd6 0-1`;
    setInputValue(examplePGN);
    showToast('Example Chess960 PGN loaded', 'info', 2000);
  };

  const handleExampleFEN = () => {
    const exampleFEN = 'rqkbnnbr/pppppppp/8/8/8/8/PPPPPPPP/RQKBNNBR w HAha - 0 1';
    setInputValue(exampleFEN);
    showToast('Example Chess960 FEN loaded', 'info', 2000);
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
