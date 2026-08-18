/**
 * Typed UCI line parser for Stockfish output.
 * Walks tokens instead of using greedy regex so mate scores, MultiPV,
 * and bound flags are handled correctly.
 */

export type UciScoreType = 'cp' | 'mate';
export type UciBound = 'lowerbound' | 'upperbound';

export interface UciInfo {
  kind: 'info';
  depth?: number;
  seldepth?: number;
  multipv?: number;
  scoreType?: UciScoreType;
  scoreValue?: number;
  bound?: UciBound;
  pv?: string[];
  /** Centipawn (or synthetic mate) eval. Omitted for bound scores. */
  evaluation?: number;
  mate?: number;
}

export interface UciBestMove {
  kind: 'bestmove';
  bestMove: string;
  ponder?: string;
}

export interface UciControl {
  kind: 'uciok' | 'readyok';
}

export interface UciOther {
  kind: 'other';
  raw: string;
}

export type ParsedUci = UciInfo | UciBestMove | UciControl | UciOther;

const MATE_OFFSET = 10000;

export function scoreToEvaluation(type: UciScoreType, value: number): number {
  if (type === 'mate') {
    if (value === 0) return 0;
    return value > 0 ? MATE_OFFSET + value : -MATE_OFFSET + value;
  }
  return value;
}

export function parseUciLine(line: string): ParsedUci {
  const trimmed = line.trim();
  if (!trimmed) return { kind: 'other', raw: line };

  if (trimmed === 'uciok' || trimmed === 'readyok') {
    return { kind: trimmed };
  }

  if (trimmed.startsWith('bestmove')) {
    const parts = trimmed.split(/\s+/);
    const bestMove = parts[1] ?? '(none)';
    let ponder: string | undefined;
    const ponderIdx = parts.indexOf('ponder');
    if (ponderIdx >= 0 && parts[ponderIdx + 1]) {
      ponder = parts[ponderIdx + 1];
    }
    return { kind: 'bestmove', bestMove, ponder };
  }

  if (trimmed.startsWith('info ')) {
    return parseInfoLine(trimmed);
  }

  return { kind: 'other', raw: trimmed };
}

function parseInfoLine(line: string): UciInfo {
  const tokens = line.split(/\s+/);
  const info: UciInfo = { kind: 'info' };

  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];
    const next = tokens[i + 1];

    if (token === 'depth' && next !== undefined) {
      info.depth = Number.parseInt(next, 10);
      i++;
    } else if (token === 'seldepth' && next !== undefined) {
      info.seldepth = Number.parseInt(next, 10);
      i++;
    } else if (token === 'multipv' && next !== undefined) {
      info.multipv = Number.parseInt(next, 10);
      i++;
    } else if (token === 'score' && next !== undefined) {
      if (next === 'cp' || next === 'mate') {
        info.scoreType = next;
        const valueToken = tokens[i + 2];
        if (valueToken !== undefined) {
          info.scoreValue = Number.parseInt(valueToken, 10);
          i += 2;
          const bound = tokens[i + 1];
          if (bound === 'lowerbound' || bound === 'upperbound') {
            info.bound = bound;
            i++;
          }
        }
      }
    } else if (token === 'pv') {
      info.pv = tokens.slice(i + 1);
      break;
    }
  }

  if (
    info.scoreType &&
    info.scoreValue !== undefined &&
    !Number.isNaN(info.scoreValue) &&
    !info.bound
  ) {
    info.evaluation = scoreToEvaluation(info.scoreType, info.scoreValue);
    if (info.scoreType === 'mate') {
      info.mate = info.scoreValue;
    }
  }

  return info;
}
