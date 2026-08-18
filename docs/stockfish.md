# Stockfish Integration

This project runs **Stockfish 18 lite single-thread** in the browser as a Web Worker. The single-thread build does not need Cross-Origin Isolation headers.

Stockfish is licensed under **GPLv3**. Shipping the WASM binary means this app must keep the GPL notice and provide access to Stockfish source.

## Files

Vite copies / downloads these into `public/stockfish/` on `npm run dev` and `npm run build`:

```
public/stockfish/
├── stockfish-18-lite-single.js
└── stockfish-18-lite-single.wasm
```

The JS loader comes from the `stockfish` npm package (`node_modules/stockfish/bin/`). The WASM file is fetched from the [stockfish.js v18.0.0 release](https://github.com/nmrugg/stockfish.js/releases/download/v18.0.0/stockfish-18-lite-single.wasm) if it is not already present. WASM is gitignored.

There is no CDN fallback at runtime. If the worker cannot boot within 8 seconds, the UI shows an engine error.

## Engine protocol

`src/services/engineSession.ts` talks UCI directly to the Stockfish worker:

1. Feature-detect `Worker` and `WebAssembly`
2. `uci` → `uciok`
3. `setoption name UCI_Chess960 value true`
4. `isready` → `readyok`
5. Analyze: `stop` (if searching) → `position fen <Shredder-FEN>` → `go depth N`

Live eval uses one session at depth 18. Full-game review uses a pool of sessions at depth 12. Request generations drop stale `info` / `bestmove` lines.

## Resources

- Official engine: https://stockfishchess.org/
- Browser builds: https://github.com/nmrugg/stockfish.js
- UCI: https://www.chessprogramming.org/UCI
- License: https://www.gnu.org/licenses/gpl-3.0.html
