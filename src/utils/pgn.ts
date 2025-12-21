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

/**
 * Clean PGN string and return array of move tokens
 * Removes comments, move numbers, results, NAGs, variations, and annotations
 */
export function cleanPGN(pgn: string): string[] {
  let result = '';
  let depth = 0; // for ()
  let commentDepth = 0; // for {}
  
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
    
    // Only process parentheses if we are not inside a comment
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

  // Remove comments starting with ; until newline
  cleaned = cleaned.replace(/;[^\n]*/g, ' ');

  // Remove move numbers 1. 1...
  cleaned = cleaned.replace(/\d+\.+/g, ' ');

  // Remove results
  cleaned = cleaned.replace(/(?:1-0|0-1|1\/2-1\/2|\*)/g, ' ');

  // Remove NAGs $1, $2...
  cleaned = cleaned.replace(/\$\d+/g, ' ');
  
  // Remove annotation glyphs !, ?
  cleaned = cleaned.replace(/[!?]+/g, '');

  // Replace newlines and multiple spaces with single space
  cleaned = cleaned.replace(/\s+/g, ' ');

  // Split by space and filter empty tokens
  return cleaned.trim().split(' ').filter(m => m.length > 0);
}

/**
 * Apply Chess960 castling to a FEN string manually
 * Returns the new FEN after castling, or null if castling is not valid
 */
export function applyChess960Castling(fen: string, isKingside: boolean): string | null {
  const parts = fen.split(' ');
  const board = parts[0];
  const turn = parts[1];
  const rank = turn === 'w' ? 0 : 7; // 0 = rank 1 (white), 7 = rank 8 (black)
  
  // Parse board into 2D array
  const rows = board.split('/');
  const boardArray: (string | null)[][] = rows.map(row => {
    const squares: (string | null)[] = [];
    for (const char of row) {
      if (/\d/.test(char)) {
        for (let i = 0; i < parseInt(char); i++) {
          squares.push(null);
        }
      } else {
        squares.push(char);
      }
    }
    return squares;
  });
  
  // Find king and rooks on the relevant rank
  const targetRank = turn === 'w' ? 7 : 0; // Array index (0 = rank 8, 7 = rank 1)
  const kingChar = turn === 'w' ? 'K' : 'k';
  const rookChar = turn === 'w' ? 'R' : 'r';
  
  let kingFile = -1;
  const rookFiles: number[] = [];
  
  for (let f = 0; f < 8; f++) {
    const piece = boardArray[targetRank][f];
    if (piece === kingChar) kingFile = f;
    if (piece === rookChar) rookFiles.push(f);
  }
  
  if (kingFile === -1 || rookFiles.length === 0) {
    return null;
  }
  
  // Determine which rook to use
  let rookFile: number;
  if (isKingside) {
    // Kingside: use rook to the right of king (higher file index)
    const kingsideRooks = rookFiles.filter(f => f > kingFile);
    if (kingsideRooks.length === 0) return null;
    rookFile = Math.min(...kingsideRooks);
  } else {
    // Queenside: use rook to the left of king (lower file index)
    const queensideRooks = rookFiles.filter(f => f < kingFile);
    if (queensideRooks.length === 0) return null;
    rookFile = Math.max(...queensideRooks);
  }
  
  // Chess960 castling destination squares
  const kingDest = isKingside ? 6 : 2; // g-file or c-file
  const rookDest = isKingside ? 5 : 3; // f-file or d-file
  
  // Clear king and rook from original squares
  boardArray[targetRank][kingFile] = null;
  boardArray[targetRank][rookFile] = null;
  
  // Place king and rook on destination squares
  boardArray[targetRank][kingDest] = kingChar;
  boardArray[targetRank][rookDest] = rookChar;
  
  // Convert board array back to FEN
  const newRows = boardArray.map(row => {
    let rowStr = '';
    let emptyCount = 0;
    for (const square of row) {
      if (square === null) {
        emptyCount++;
      } else {
        if (emptyCount > 0) {
          rowStr += emptyCount;
          emptyCount = 0;
        }
        rowStr += square;
      }
    }
    if (emptyCount > 0) {
      rowStr += emptyCount;
    }
    return rowStr;
  });
  
  // Update FEN parts
  parts[0] = newRows.join('/');
  parts[1] = turn === 'w' ? 'b' : 'w'; // Switch turn
  
  // Update castling rights - remove castling rights for the side that just castled
  let castling = parts[2];
  if (turn === 'w') {
    castling = castling.replace(/[KQ]/g, '');
  } else {
    castling = castling.replace(/[kq]/g, '');
  }
  if (castling === '') castling = '-';
  parts[2] = castling;
  
  // Reset en passant
  parts[3] = '-';
  
  // Increment halfmove clock
  parts[4] = String(parseInt(parts[4] || '0') + 1);
  
  // Increment fullmove number if black just moved
  if (turn === 'b') {
    parts[5] = String(parseInt(parts[5] || '1') + 1);
  }
  
  return parts.join(' ');
}
