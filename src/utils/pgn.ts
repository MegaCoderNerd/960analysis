/**
 * PGN parsing utilities including Chess960 replay.
 */

import { Chess } from 'chess.js';
import {
  applyChess960Castling,
  applyShredderRights,
  getChess960CastlingUci,
  isChess960Fen,
  isChess960Pgn,
  rightsAfterStandardMove,
  toChessJsFen,
  toShredderFen,
} from './chess960';

export function extractPlayerElo(pgn: string, color: 'white' | 'black'): number | undefined {
  const names = color === 'white' ? ['WhiteElo', 'WhiteRating'] : ['BlackElo', 'BlackRating'];
  for (const name of names) {
    const match = pgn.match(new RegExp(`\\[${name}\\s+"(-?\\d+(?:\\.\\d+)?)"\\]`));
    if (!match) continue;
    const value = Number(match[1]);
    if (Number.isFinite(value)) return Math.round(value);
  }
  return undefined;
}

export function extractFenFromPGN(pgn: string): string | null {
  const fenMatch = pgn.match(/\[FEN\s+"([^"]+)"\]/);
  return fenMatch ? fenMatch[1] : null;
}

export function extractMovesFromPGN(pgn: string): string {
  const lines = pgn.split('\n');
  const moveLines = lines.filter((line) => {
    const trimmed = line.trim();
    return trimmed.length > 0 && !trimmed.startsWith('[');
  });
  return moveLines.join(' ').trim();
}

export function isChess960PGN(pgn: string): boolean {
  return isChess960Pgn(pgn);
}

export function createPGNFromFEN(fen: string): string {
  return `[FEN "${fen}"]\n[SetUp "1"]\n\n`;
}

export function cleanPGN(pgn: string): string[] {
  let result = '';
  let depth = 0;
  let commentDepth = 0;

  for (let i = 0; i < pgn.length; i++) {
    const char = pgn[i];

    if (char === '{') {
      commentDepth++;
      continue;
    }
    if (char === '}') {
      if (commentDepth > 0) commentDepth--;
      continue;
    }

    if (commentDepth === 0) {
      if (char === '(') {
        depth++;
        continue;
      }
      if (char === ')') {
        if (depth > 0) depth--;
        continue;
      }
    }

    if (depth === 0 && commentDepth === 0) {
      result += char;
    }
  }

  let cleaned = result;
  cleaned = cleaned.replace(/;[^\n]*/g, ' ');
  cleaned = cleaned.replace(/\d+\.+/g, ' ');
  cleaned = cleaned.replace(/(?:1-0|0-1|1\/2-1\/2|\*)/g, ' ');
  cleaned = cleaned.replace(/\$\d+/g, ' ');
  cleaned = cleaned.replace(/[+#!?]+/g, '');
  cleaned = cleaned.replace(/\s+/g, ' ');

  return cleaned.trim().split(' ').filter((m) => m.length > 0);
}

export interface ParsedPosition {
  fen: string;
  san: string;
  uci: string;
}

export function parsePgnToPositions(pgn: string): {
  positions: ParsedPosition[];
  error?: string;
  startFen?: string;
  chess960: boolean;
} {
  const extractedFen = extractFenFromPGN(pgn);
  const chess960 = isChess960Pgn(pgn) || (extractedFen ? isChess960Fen(extractedFen) : false);

  if (!extractedFen && !chess960) {
    try {
      const tempGame = new Chess();
      tempGame.loadPgn(pgn);
      const history = tempGame.history({ verbose: true });
      const positions: ParsedPosition[] = [];
      const replay = new Chess();
      positions.push({ fen: replay.fen(), san: '', uci: '' });
      for (const move of history) {
        replay.move(move.san);
        positions.push({
          fen: replay.fen(),
          san: move.san,
          uci: move.from + move.to + (move.promotion || ''),
        });
      }
      return { positions, chess960: false, startFen: positions[0]?.fen };
    } catch (error) {
      return {
        positions: [],
        chess960: false,
        error: error instanceof Error ? error.message : 'Failed to parse PGN',
      };
    }
  }

  const startFen = extractedFen ?? new Chess().fen();
  const currentFen = chess960 ? toShredderFen(startFen) : startFen;
  const game = new Chess();
  try {
    game.load(toChessJsFen(currentFen), { skipValidation: chess960 });
  } catch (error) {
    return {
      positions: [],
      chess960,
      error: error instanceof Error ? error.message : 'Invalid starting FEN',
      startFen,
    };
  }

  const positions: ParsedPosition[] = [
    { fen: currentFen, san: '', uci: '' },
  ];

  const movesOnly = extractMovesFromPGN(pgn);
  const tokens = movesOnly ? cleanPGN(movesOnly) : [];
  let fen = currentFen;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    let applied = false;
    let nextFen: string | null = null;
    let san = token;
    let uci = '';

    const castleSide = chess960 ? parseCastleToken(token, fen) : null;
    if (castleSide) {
      const kingside = castleSide === 'O-O';
      nextFen = applyChess960Castling(fen, kingside);
      const castleUci = getChess960CastlingUci(fen, kingside);
      if (nextFen) {
        uci = castleUci ?? '';
        san = kingside ? 'O-O' : 'O-O-O';
        applied = true;
      }
    }

    if (!applied) {
      try {
        game.load(toChessJsFen(fen), { skipValidation: chess960 });
        const result = game.move(token);
        if (result) {
          if (chess960) {
            const rights = rightsAfterStandardMove(fen, result.from, result.to);
            nextFen = applyShredderRights(game.fen(), rights);
          } else {
            nextFen = game.fen();
          }
          san = result.san;
          uci = result.from + result.to + (result.promotion || '');
          applied = true;
        }
      } catch {
        applied = false;
      }
    }

    if (!applied || !nextFen) {
      return {
        positions,
        chess960,
        startFen,
        error: `Invalid move ${i + 1}: ${token}`,
      };
    }

    fen = nextFen;
    positions.push({ fen, san, uci });
  }

  return { positions, chess960, startFen };
}

function parseCastleToken(token: string, fen: string): 'O-O' | 'O-O-O' | null {
  const normalized = token.replace(/[–—−]/g, '-');
  if (normalized === 'O-O' || normalized === '0-0') return 'O-O';
  if (normalized === 'O-O-O' || normalized === '0-0-0') return 'O-O-O';
  if (/^[a-h][18][a-h][18]$/.test(normalized)) {
    if (getChess960CastlingUci(fen, true) === normalized) return 'O-O';
    if (getChess960CastlingUci(fen, false) === normalized) return 'O-O-O';
  }
  return null;
}
