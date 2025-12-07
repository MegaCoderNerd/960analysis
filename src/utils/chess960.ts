import { Chess } from 'chess.js';

/**
 * Chess 960 starting positions
 * Validates and identifies Fischer Random starting positions
 */

// Generate a Chess960 starting position for a given number (1-960)
export function getChess960StartingPosition(positionNumber: number): string {
  if (positionNumber < 1 || positionNumber > 960) {
    throw new Error('Position number must be between 1 and 960');
  }

  // All 960 positions have:
  // - Bishops on opposite colors
  // - King between rooks
  // - Specific arrangement based on position number
  
  const positions = generateAllChess960Positions();
  return positions[positionNumber - 1];
}

// Identify if a FEN is a Chess960 starting position
export function identifyChess960Position(fen: string): number | null {
  const positions = generateAllChess960Positions();
  const fenParts = fen.split(' ');
  const board = fenParts[0];
  
  const index = positions.indexOf(board);
  return index >= 0 ? index + 1 : null;
}

// Check if a position is a standard chess starting position
export function isStandardStartingPosition(fen: string): boolean {
  const standardFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  return fen.split(' ').slice(0, 2).join(' ') === standardFen.split(' ').slice(0, 2).join(' ');
}

// Generate all 960 Chess960 starting positions
function generateAllChess960Positions(): string[] {
  const positions: string[] = [];
  
  // Generate all valid arrangements
  for (let b1 = 0; b1 < 4; b1++) {
    for (let b2 = 0; b2 < 4; b2++) {
      for (let q = 0; q < 6; q++) {
        for (let n = 0; n < 10; n++) {
          const pos = generatePosition(b1, b2, q, n);
          if (pos) positions.push(pos);
        }
      }
    }
  }
  
  return positions;
}

function generatePosition(b1: number, b2: number, q: number, n: number): string | null {
  const pieces = ['', '', '', '', '', '', '', ''];
  
  // Place bishops on opposite color squares
  pieces[b1 * 2 + 1] = 'b'; // Light square bishop
  pieces[b2 * 2] = 'b'; // Dark square bishop
  
  // Place queen in remaining squares
  let emptySquares = pieces.map((p, i) => p === '' ? i : -1).filter(i => i >= 0);
  if (q >= emptySquares.length) return null;
  pieces[emptySquares[q]] = 'q';
  
  // Place knights
  emptySquares = pieces.map((p, i) => p === '' ? i : -1).filter(i => i >= 0);
  
  const n1 = Math.floor(n / (emptySquares.length - 1));
  const n2 = n % (emptySquares.length - 1);
  
  if (n1 >= emptySquares.length) return null;
  pieces[emptySquares[n1]] = 'n';
  
  emptySquares = pieces.map((p, i) => p === '' ? i : -1).filter(i => i >= 0);
  if (n2 >= emptySquares.length) return null;
  pieces[emptySquares[n2]] = 'n';
  
  // Place rooks and king (king must be between rooks)
  emptySquares = pieces.map((p, i) => p === '' ? i : -1).filter(i => i >= 0);
  if (emptySquares.length !== 3) return null;
  
  pieces[emptySquares[0]] = 'r';
  pieces[emptySquares[1]] = 'k';
  pieces[emptySquares[2]] = 'r';
  
  return pieces.join('').toUpperCase() + '/pppppppp/8/8/8/8/PPPPPPPP/' + pieces.join('');
}

// Parse Chess960 castling rights from FEN
export function parseChess960Castling(fen: string): {
  whiteKingside: boolean;
  whiteQueenside: boolean;
  blackKingside: boolean;
  blackQueenside: boolean;
} {
  const parts = fen.split(' ');
  const castling = parts[2] || '-';
  
  return {
    whiteKingside: castling.includes('K'),
    whiteQueenside: castling.includes('Q'),
    blackKingside: castling.includes('k'),
    blackQueenside: castling.includes('q'),
  };
}

// Create a Chess instance with Chess960 support
export function createChess960Game(startFen?: string): Chess {
  if (startFen) {
    return new Chess(startFen);
  }
  return new Chess();
}
