/// <reference lib="webworker" />

/**
 * Stockfish Web Worker
 * Uses the stockfish.js package as a nested worker
 */

let stockfishWorker: Worker | null = null;
let isReady = false;

/**
 * Initialize Stockfish engine by creating a nested worker
 */
async function initEngine(): Promise<void> {
  try {
    // Create a nested worker from the stockfish.js package
    // The stockfish.wasm.js file from the package is designed to be used as a Worker
    stockfishWorker = new Worker('/stockfish.wasm.js');
    
    // Set up message handler to forward UCI messages
    stockfishWorker.onmessage = (event) => {
      const message = event.data;
      
      // Parse and forward info and bestmove messages appropriately
      if (typeof message === 'string') {
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
      }
    };
    
    stockfishWorker.onerror = (error) => {
      self.postMessage({ type: 'error', message: error.message || 'Stockfish worker error' });
    };

    // Initialize UCI protocol
    stockfishWorker.postMessage('uci');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to load Stockfish: ${errorMessage}`);
  }
}

/**
 * Handle analyze message
 */
function handleAnalyze(fen: string, options?: { depth?: number; multiPV?: number; threads?: number }): void {
  if (!stockfishWorker || !isReady) {
    return;
  }

  // Set options if provided
  if (options?.threads) {
    stockfishWorker.postMessage(`setoption name Threads value ${options.threads}`);
  }
  
  if (options?.multiPV) {
    stockfishWorker.postMessage(`setoption name MultiPV value ${options.multiPV}`);
  }

  // Set position
  stockfishWorker.postMessage(`position fen ${fen}`);

  // Start analysis
  const depth = options?.depth || 20;
  stockfishWorker.postMessage(`go depth ${depth}`);
}

/**
 * Handle stop message
 */
function handleStop(): void {
  if (!stockfishWorker) {
    return;
  }
  
  stockfishWorker.postMessage('stop');
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
