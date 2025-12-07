/// <reference lib="webworker" />

let stockfish: any = null;

// Initialize Stockfish
const initStockfish = async () => {
  try {
    // Dynamically import Stockfish
    const Stockfish = await import('stockfish.js');
    stockfish = await Stockfish.default();

    stockfish.addMessageListener((message: string) => {
      if (message.startsWith('info')) {
        self.postMessage({ type: 'info', data: message });
      } else if (message.startsWith('bestmove')) {
        const parts = message.split(' ');
        self.postMessage({ type: 'bestmove', data: parts[1] });
      } else if (message.includes('uciok')) {
        self.postMessage({ type: 'ready' });
      }
    });

    stockfish.postMessage('uci');
  } catch (error) {
    console.error('Failed to initialize Stockfish:', error);
  }
};

// Initialize on worker start
initStockfish();

self.onmessage = (e: MessageEvent) => {
  const { type, fen, options } = e.data;

  if (!stockfish) {
    console.error('Stockfish not initialized');
    return;
  }

  switch (type) {
    case 'analyze':
      // Stop any ongoing analysis
      stockfish.postMessage('stop');

      // Set options
      if (options) {
        if (options.threads) {
          stockfish.postMessage(`setoption name Threads value ${options.threads}`);
        }
        if (options.multiPv) {
          stockfish.postMessage(`setoption name MultiPV value ${options.multiPv}`);
        }
      }

      // Start analysis
      stockfish.postMessage(`position fen ${fen}`);
      stockfish.postMessage(`go depth ${options?.depth || 18}`);
      break;

    case 'stop':
      stockfish.postMessage('stop');
      break;
  }
};

export {};
