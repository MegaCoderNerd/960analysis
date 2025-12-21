/**
 * PGN parsing utilities
 * Handles PGN format operations including Chess960 support
 */

/**
 * Extract FEN from PGN headers
 * Looks for [FEN "..."] header tag
 */
export function extractFenFromPGN(pgn: string): string | null {
  const fenMatch = pgn.match(/\[FEN\s+"([^"]+)"\]/);
  return fenMatch ? fenMatch[1] : null;
}

/**
 * Extract only the moves from a PGN string, removing all headers
 */
export function extractMovesFromPGN(pgn: string): string {
  const lines = pgn.split('\n');
  const moveLines = lines.filter(line => {
    const trimmed = line.trim();
    // Skip empty lines and header lines (starting with [)
    return trimmed.length > 0 && !trimmed.startsWith('[');
  });
  return moveLines.join(' ').trim();
}

/**
 * Normalize Chess960 castling rights to KQkq format
 * Converts file-based notation (like HAha) to standard KQkq format
 * chess.js only accepts KQkq, not the Chess960 file-based notation
 */
export function normalizeChess960Castling(fen: string): string {
  const parts = fen.split(' ');
  if (parts.length < 3) {
    return fen;
  }

  const castling = parts[2];
  
  // If castling is already in standard format or empty, return as is
  if (castling === '-' || /^[KQkq]+$/.test(castling)) {
    return fen;
  }

  // Convert file-based Chess960 castling to standard KQkq
  // In Chess960, castling rights can be specified by file letters (A-H for white, a-h for black)
  // We convert this to the more widely supported KQkq format
  let normalized = '';
  
  // Check for white kingside/queenside based on presence of uppercase letters
  if (/[A-H]/.test(castling)) {
    // If there are uppercase letters, assume both kingside and queenside are available
    normalized += 'KQ';
  }
  
  // Check for black kingside/queenside based on presence of lowercase letters  
  if (/[a-h]/.test(castling)) {
    // If there are lowercase letters, assume both kingside and queenside are available
    normalized += 'kq';
  }
  
  // If no castling rights detected, use '-'
  if (!normalized) {
    normalized = '-';
  }

  parts[2] = normalized;
  return parts.join(' ');
}

/**
 * Check if a PGN string represents a Chess960 game
 */
export function isChess960PGN(pgn: string): boolean {
  return (
    pgn.includes('Chess960') ||
    pgn.includes('Variant "Chess960"') ||
    pgn.includes('SetUp "1"') ||
    extractFenFromPGN(pgn) !== null
  );
}

/**
 * Create a minimal PGN from a FEN string
 */
export function createPGNFromFEN(fen: string): string {
  const normalizedFen = normalizeChess960Castling(fen);
  return `[FEN "${normalizedFen}"]\n[SetUp "1"]\n\n`;
}
