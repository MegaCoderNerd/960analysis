/**
 * Lichess API integration
 * https://lichess.org/api
 */

export interface LichessGame {
  id: string;
  rated: boolean;
  variant: string;
  speed: string;
  perf: string;
  createdAt: number;
  lastMoveAt: number;
  status: string;
  players: {
    white: {
      user: {
        name: string;
        id: string;
      };
      rating: number;
    };
    black: {
      user: {
        name: string;
        id: string;
      };
      rating: number;
    };
  };
  pgn?: string;
}

export async function fetchLichessGames(
  username: string,
  since?: number,
  until?: number,
  max: number = 50
): Promise<LichessGame[]> {
  const params = new URLSearchParams({
    variant: 'chess960',
    max: max.toString(),
    pgnInJson: 'true',
  });

  if (since) params.append('since', since.toString());
  if (until) params.append('until', until.toString());

  const url = `https://lichess.org/api/games/user/${username}?${params}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/x-ndjson',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch games: ${response.statusText}`);
    }

    const text = await response.text();
    const lines = text.trim().split('\n');
    const games: LichessGame[] = lines
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter((game): game is LichessGame => game !== null);

    return games;
  } catch (error) {
    console.error('Error fetching Lichess games:', error);
    throw error;
  }
}

export async function fetchLichessGameByUrl(gameUrl: string): Promise<string | null> {
  try {
    // Extract game ID from URL
    // Example: https://lichess.org/abc123def
    const parts = gameUrl.split('/');
    const gameId = parts[parts.length - 1].split('?')[0];

    const url = `https://lichess.org/game/export/${gameId}`;

    const response = await fetch(url, {
      headers: {
        Accept: 'application/x-chess-pgn',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch game: ${response.statusText}`);
    }

    return await response.text();
  } catch (error) {
    console.error('Error fetching Lichess game:', error);
    return null;
  }
}

export async function fetchLichessGameById(gameId: string): Promise<string | null> {
  try {
    const url = `https://lichess.org/game/export/${gameId}`;

    const response = await fetch(url, {
      headers: {
        Accept: 'application/x-chess-pgn',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch game: ${response.statusText}`);
    }

    return await response.text();
  } catch (error) {
    console.error('Error fetching Lichess game:', error);
    return null;
  }
}

export function parseLichessGameUrl(url: string): string | null {
  // Extract game ID from Lichess URL
  const match = url.match(/lichess\.org\/([a-zA-Z0-9]{8,12})/);
  return match ? match[1] : null;
}
