export function Footer() {
  return (
    <footer className="bg-chess-dark border-t border-gray-700 py-4 px-6 mt-auto">
      <div className="max-w-7xl mx-auto text-center text-sm text-gray-400">
        <p>
          Powered by{' '}
          <a
            href="https://stockfishchess.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-chess-green hover:underline"
          >
            Stockfish
          </a>
          ,{' '}
          <a
            href="https://github.com/jhlywa/chess.js"
            target="_blank"
            rel="noopener noreferrer"
            className="text-chess-green hover:underline"
          >
            chess.js
          </a>
          , and{' '}
          <a
            href="https://github.com/lichess-org/chessground"
            target="_blank"
            rel="noopener noreferrer"
            className="text-chess-green hover:underline"
          >
            chessground
          </a>
        </p>
        <p className="mt-1">© 2024 Chess 960 Analysis. All rights reserved.</p>
      </div>
    </footer>
  );
}
