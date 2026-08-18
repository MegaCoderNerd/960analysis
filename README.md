# Chess 960 Analysis

A comprehensive Chess 960 (Fischer Random) game review website that allows users to analyze their games with Stockfish engine analysis. The UI closely resembles Chess.com's game review interface with a modern dark theme.

![Chess 960 Analysis](https://img.shields.io/badge/Chess-960-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![React](https://img.shields.io/badge/React-19.2-61dafb)
![Vite](https://img.shields.io/badge/Vite-7.2-646cff)

## Features

### Game Import Options
- **Chess.com Integration**: Fetch Chess960 games by username and monthly archive
- **Lichess Integration**: Fetch Chess960 games by username or game URL
- **Direct Import**: Import games via PGN or FEN notation

### Chess 960 Support
- All 960 Fischer Random starting positions (Scharnagl numbering; #518 is standard chess)
- Shredder-FEN (`HAha`) castling rights for Stockfish and KQkq mapping for chess.js
- Automatic detection and display of starting position number (1-960)

### Stockfish Analysis Engine
- Stockfish 18 lite single-thread WASM in a Web Worker
- Live analysis of the selected move at depth 18
- Batch game review at depth 12, with evaluations cached in IndexedDB
- Multi-PV analysis showing top engine lines

### 📊 Chess.com-Style UI
- **Interactive Chess Board**: Drag and drop pieces, arrow annotations, smooth animations
- **Evaluation Bar**: Visual representation of position evaluation
- **Move Classification**: 
  - ✨ Brilliant (cyan/teal)
  - ! Great (blue)
  - ✓ Best/Excellent (green)
  - ○ Good (light green)
  - □ Book (gray)
  - ?! Inaccuracy (yellow)
  - ? Mistake (orange)
  - ?? Blunder (red)
  - ☓ Missed Win (red)
- **Accuracy Score**: Per-player accuracy percentage based on centipawn loss
- **Move List Panel**: Scrollable, clickable move list with color-coded badges
- **Engine Lines**: Top 3 engine lines with evaluations and continuations

### ⌨️ Keyboard Shortcuts
- `←` / `→`: Previous/Next move
- `Home` / `End`: First/Last move
- `F`: Flip board

### 🎨 Design
- Dark theme matching Chess.com's aesthetic
- Smooth 60fps animations
- Responsive design (tablet/desktop)
- Modern, clean interface

## Tech Stack

- **Frontend**: React 19.2 + TypeScript 5.9
- **Build Tool**: Vite 7.2
- **Styling**: Tailwind CSS 3.4
- **Chess Logic**: chess.js for move validation
- **Board**: chessground for interactive chess board
- **Engine**: Stockfish 18 lite-single (WebAssembly)
- **APIs**: Chess.com monthly archives and Lichess game export

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository:
\`\`\`bash
git clone https://github.com/MegaCoderNerd/960analysis.git
cd 960analysis
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Run unit tests:
\`\`\`bash
npm run test
\`\`\`

4. Start the development server:
\`\`\`bash
npm run dev
\`\`\`

5. Open your browser and navigate to \`http://localhost:5173\`

### Build for Production

\`\`\`bash
npm run build
\`\`\`

The production build will be in the \`dist\` folder.

### Preview Production Build

\`\`\`bash
npm run preview
\`\`\`

## Usage

### Importing a Game

1. **Direct Import** (Recommended for testing):
   - Click the "Direct" tab
   - Select "PGN" or "FEN"
   - Paste your game notation
   - Click "Import"

2. **Lichess**:
   - Click the "Lichess" tab
   - Enter a Lichess username or game URL
   - Select from the list of Chess960 games

3. **Chess.com**:
   - Click the "Chess.com" tab
   - Enter a Chess.com username
   - Select year and month
   - Choose from the filtered Chess960 games

### Analyzing a Game

Once a game is loaded:
1. Use the navigation buttons or arrow keys to move through the game
2. The engine analyzes the selected position at depth 18
3. Click **Review** for a full-game pass at depth 12 (accuracy stays blank until then)
4. View the evaluation bar, engine lines, and move classifications

### Example PGN for Testing

\`\`\`pgn
[Event "Chess960 Game"]
[Site "Online"]
[Date "2024.01.01"]
[White "Player1"]
[Black "Player2"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7 1-0
\`\`\`

## Project Structure

\`\`\`
src/
├── components/
│   ├── Board/          # Chess board, evaluation bar, controls
│   ├── Analysis/       # Engine lines, accuracy display, move classification
│   ├── GameImport/     # Import components for different sources
│   ├── MoveList/       # Move list and move items
│   └── Layout/         # Header and footer
├── hooks/              # Custom React hooks
│   ├── useStockfish.ts    # Stockfish engine hook
│   ├── useChessGame.ts    # Chess game state management
│   └── useGameImport.ts   # Game import logic
├── services/           # API integrations
│   ├── chesscom.ts        # Chess.com API
│   ├── lichess.ts         # Lichess API
│   ├── engineSession.ts   # Stockfish UCI session
│   ├── evalCache.ts       # IndexedDB eval cache
│   └── http.ts            # fetch retry helper
├── utils/              # Utility functions
│   ├── chess960.ts        # Chess 960 position handling
│   ├── moveClassification.ts  # Move quality classification
│   ├── pgn.ts             # PGN replay
│   ├── uci.ts             # UCI parser
│   └── accuracy.ts        # Accuracy calculation
├── types/              # TypeScript type definitions
└── App.tsx            # Main application component
\`\`\`

## API Integration

### Chess.com API
- **Endpoint**: \`https://api.chess.com/pub/player/{username}/games/{YYYY}/{MM}\`
- **Documentation**: [Chess.com API Docs](https://www.chess.com/news/view/published-data-api)
- **Rate Limiting**: Respectful use recommended

### Lichess API
- **Endpoint**: \`https://lichess.org/api/games/user/{username}\`
- **Documentation**: [Lichess API Docs](https://lichess.org/api)
- **Rate Limiting**: 10 requests per minute for game export

## Performance Notes

- Analysis of the selected move runs in a Web Worker
- Full-game review uses a small engine pool and IndexedDB caching
- Chessground provides board rendering
- Stockfish WASM is copied into `public/stockfish/` when the app starts

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support (WebAssembly required)
- Mobile browsers: ⚠️ Limited support (desktop recommended)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License for application code. Stockfish WASM is GPLv3; see `docs/stockfish.md`.

## Acknowledgments

- [Stockfish](https://stockfishchess.org/) - The powerful chess engine
- [chess.js](https://github.com/jhlywa/chess.js) - Chess move validation
- [chessground](https://github.com/lichess-org/chessground) - Interactive chess board
- [Chess.com](https://www.chess.com/) - UI design inspiration
- [Lichess](https://lichess.org/) - Open-source chess platform

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

Made with ♟️ by MegaCoderNerd
