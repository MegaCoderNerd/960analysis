/**
 * TypeScript declarations for Stockfish browser/WASM build
 * 
 * Stockfish is a free, open-source UCI chess engine licensed under the GPLv3.
 * https://stockfishchess.org/
 */

/**
 * Stockfish engine interface
 */
export interface StockfishEngine {
  /**
   * Send a UCI command to the engine
   */
  postMessage(command: string): void;

  /**
   * Register a listener for engine output messages
   */
  addMessageListener(listener: (message: string) => void): void;

  /**
   * Remove a message listener
   */
  removeMessageListener(listener: (message: string) => void): void;

  /**
   * Terminate the engine
   */
  terminate?(): void;
}

/**
 * Stockfish factory function exposed by the loader script
 */
export type StockfishFactory = () => Promise<StockfishEngine>;

/**
 * Message types for UCI communication
 */
export interface EngineMessage {
  type: 'uci' | 'ready' | 'error';
  message: string;
}

/**
 * Analyze request message
 */
export interface AnalyzeMessage {
  type: 'analyze';
  fen: string;
  options?: {
    depth?: number;
    multiPV?: number;
    threads?: number;
  };
}

/**
 * Stop request message
 */
export interface StopMessage {
  type: 'stop';
}

/**
 * Worker message types
 */
export type WorkerMessage = AnalyzeMessage | StopMessage;

/**
 * Global declarations for Stockfish loader
 */
declare global {
  /**
   * Stockfish factory - available after importing stockfish.wasm.js
   */
  const Stockfish: StockfishFactory;
  
  /**
   * Alternative lowercase factory name (some builds use this)
   */
  const stockfish: StockfishFactory;
}

export {};
