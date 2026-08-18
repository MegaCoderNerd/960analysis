export type MoveClassification =
  | 'brilliant'
  | 'great'
  | 'best'
  | 'excellent'
  | 'good'
  | 'book'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder'
  | 'missed-win';

export interface AnalyzedMove {
  san: string;
  uci: string;
  fen: string;
  evaluation?: number;
  classification?: MoveClassification;
  centipawnLoss?: number;
  bestMove?: string;
}

export interface EngineLine {
  multipv: number;
  depth: number;
  evaluation: number;
  mate?: number;
  moves: string[];
}

export interface GameInfo {
  white: string;
  black: string;
  result: string;
  date?: string;
  event?: string;
  site?: string;
}

export interface ChessGame {
  pgn: string;
  startFen?: string;
  info: GameInfo;
  moves: AnalyzedMove[];
}

export interface AccuracyScore {
  white: number | null;
  black: number | null;
  whiteAvgCPLoss: number | null;
  blackAvgCPLoss: number | null;
}

export type EngineStatus = 'booting' | 'ready' | 'error';

export interface StockfishOptions {
  depth?: number;
  multiPv?: number;
  threads?: number;
}

export interface AnalysisResult {
  evaluation: number;
  mate?: number;
  bestMove: string;
  ponderMove?: string;
  lines: EngineLine[];
  depth: number;
}