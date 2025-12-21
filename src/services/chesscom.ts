/**
 * Chess.com API integration
 * https://www.chess.com/news/view/published-data-api
 */

export interface ChessComGame {
  url: string;
  pgn: string;
  time_control: string;
  end_time: number;
  rules: string;
  white: {
    username: string;
    rating: number;
    result: string;
  };
  black: {
    username: string;
    rating: number;
    result: string;
  };
}

export interface ChessComArchive {
  games: ChessComGame[];
}

export async function fetchChessComGames(
  username: string,
  year: number,
  month: number
): Promise<ChessComGame[]> {
  const url = `https://api.chess.com/pub/player/${username}/games/${year}/${String(month).padStart(2, '0')}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch games: ${response.statusText}`);
    }

    const data: ChessComArchive = await response.json();
    
    // Filter for Chess960 games
    return data.games.filter((game) => game.rules === 'chess960');
  } catch (error) {
    console.error('Error fetching Chess.com games:', error);
    throw error;
  }
}

export async function fetchChessComGamesByUrl(): Promise<ChessComGame | null> {
  // Note: Chess.com doesn't have a direct API endpoint for a single game
  // This function is not implemented - use the archive method instead
  return null;
}

export function parseChessComPGN(pgn: string): {
  white: string;
  black: string;
  result: string;
  date: string;
} {
  const lines = pgn.split('\n');
  let white = 'Unknown';
  let black = 'Unknown';
  let result = '*';
  let date = '';

  for (const line of lines) {
    if (line.startsWith('[White ')) {
      white = line.match(/"(.+?)"/)?.[1] || 'Unknown';
    } else if (line.startsWith('[Black ')) {
      black = line.match(/"(.+?)"/)?.[1] || 'Unknown';
    } else if (line.startsWith('[Result ')) {
      result = line.match(/"(.+?)"/)?.[1] || '*';
    } else if (line.startsWith('[Date ')) {
      date = line.match(/"(.+?)"/)?.[1] || '';
    }
  }

  return { white, black, result, date };
}
