/// <reference lib="webworker" />

let stockfish: any = null;

// Initialize Stockfish
const initStockfish = async () => {
  try {
    // Use a simpler mock Stockfish for now since stockfish.js has issues with the worker
    // In production, you would use the actual Stockfish.js library
    
    stockfish = {
      postMessage: (msg: string) => {
        // Mock Stockfish responses for demo purposes
        if (msg === 'uci') {
          setTimeout(() => {
            self.postMessage({ type: 'ready' });
          }, 100);
        } else if (msg.startsWith('position')) {
          // Position set
        } else if (msg.startsWith('go')) {
          // Send mock analysis
          setTimeout(() => {
            self.postMessage({ 
              type: 'info', 
              data: 'info depth 18 score cp 25 pv e2e4 e7e5 g1f3 b8c6'
            });
            setTimeout(() => {
              self.postMessage({ type: 'bestmove', data: 'e2e4' });
            }, 500);
          }, 200);
        }
      }
    };

    // Trigger ready message
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
      // Set options
      if (options) {
        // Mock option setting
      }

      // Start analysis with mock response
      stockfish.postMessage(`position fen ${fen}`);
      stockfish.postMessage(`go depth ${options?.depth || 18}`);
      break;

    case 'stop':
      // Stop analysis
      break;
  }
};

export {};
