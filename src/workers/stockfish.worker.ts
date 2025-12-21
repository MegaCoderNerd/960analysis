/// <reference lib="webworker" />

// Import Stockfish types
import type { StockfishEngine } from '../types/stockfish';

let engine: StockfishEngine | null = null;
let isReady = false;

/**
 * Load Stockfish WASM loader script
 * Tries local path first, falls back to official site
 */
async function loadStockfish(): Promise<void> {
  try {
    // Try loading from local public directory first
    importScripts('/stockfish/stockfish.wasm.js');
  } catch {
    // Fallback to official Stockfish site
    try {
      importScripts('https://stockfishchess.org/stockfish.wasm.js');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to load Stockfish from both local and remote sources: ${errorMessage}`);
    }
  }
}

/**
 * Initialize Stockfish engine
 */
async function initEngine(): Promise<void> {
  await loadStockfish();
  
  // The Stockfish loader exposes a factory function (commonly named Stockfish or stockfish)
  const StockfishFactory = (self as any).Stockfish || (self as any).stockfish;
  
  if (!StockfishFactory) {
    throw new Error('Stockfish factory not found after loading script');
  }

  // Instantiate the engine
  engine = await StockfishFactory();
  
  if (!engine) {
    throw new Error('Failed to instantiate Stockfish engine');
  }

  // Set up message handler to forward UCI messages
  engine.addMessageListener((message: string) => {
    // Parse and forward info and bestmove messages appropriately
    if (message.startsWith('info ')) {
      self.postMessage({ type: 'info', data: message });
    } else if (message.startsWith('bestmove ')) {
      const bestmoveMatch = message.match(/bestmove\s+(\S+)/);
      if (bestmoveMatch) {
        self.postMessage({ type: 'bestmove', data: bestmoveMatch[1] });
      }
    }
    
    // Check for uciok to mark engine as ready
    if (message === 'uciok') {
      isReady = true;
      self.postMessage({ type: 'ready' });
    }
  });

  // Initialize UCI protocol
  engine.postMessage('uci');
}

/**
 * Handle analyze message
 */
function handleAnalyze(fen: string, options?: { depth?: number; multiPV?: number; threads?: number }): void {
  if (!engine || !isReady) {
    return;
  }

  // Set options if provided
  if (options?.threads) {
    engine.postMessage(`setoption name Threads value ${options.threads}`);
  }
  
  if (options?.multiPV) {
    engine.postMessage(`setoption name MultiPV value ${options.multiPV}`);
  }

  // Set position
  engine.postMessage(`position fen ${fen}`);

  // Start analysis
  const depth = options?.depth || 20;
  engine.postMessage(`go depth ${depth}`);
}

/**
 * Handle stop message
 */
function handleStop(): void {
  if (!engine) {
    return;
  }
  
  engine.postMessage('stop');
}

// Listen for messages from main thread
self.addEventListener('message', (event: MessageEvent) => {
  const { type, fen, options } = event.data;

  switch (type) {
    case 'analyze':
      handleAnalyze(fen, options);
      break;
    case 'stop':
      handleStop();
      break;
  }
});

// Initialize engine on worker startup
initEngine().catch((error) => {
  self.postMessage({ type: 'error', message: error.message });
});
