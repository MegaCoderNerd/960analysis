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
  fen: string;
  evaluation: number | null;
  bestMove?: string;
  classification?: MoveClassification;
  centipawnLoss?: number;
  isCheck?: boolean;
  isCheckmate?: boolean;
}

export interface EngineLine {
  moves: string[];
  evaluation: number;
  depth: number;
  multipv: number;
}

export interface GameInfo {
  white: string;
  black: string;
  result: string;
  date: string;
  event?: string;
  site?: string;
  startPos?: number; // Chess 960 starting position (1-960)
}

export interface ChessGame {
  pgn: string;
  info: GameInfo;
  moves: AnalyzedMove[];
  startFen?: string;
}

export interface AccuracyScore {
  white: number;
  black: number;
  whiteAvgCPLoss: number;
  blackAvgCPLoss: number;
}

export interface StockfishOptions {
  depth: number;
  multiPv: number;
  threads: number;
}
