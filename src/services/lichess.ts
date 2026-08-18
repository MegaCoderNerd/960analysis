/**
 * Lichess API integration
 * https://lichess.org/api
 */

import { encodePathSegment, fetchWithRetry } from './http';

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
      user?: {
        name: string;
        id: string;
      };
      rating?: number;
    };
    black: {
      user?: {
        name: string;
        id: string;
      };
      rating?: number;
    };
  };
  pgn?: string;
}

export function playerName(player: LichessGame['players']['white']): string {
  return player.user?.name ?? 'Anonymous';
}

export async function fetchLichessGames(
  username: string,
  since?: number,
  until?: number,
  max: number = 50,
  onRetry?: (waitMs: number) => void
): Promise<LichessGame[]> {
  const params = new URLSearchParams({
    variant: 'chess960',
    max: max.toString(),
    pgnInJson: 'true',
  });

  if (since) params.append('since', since.toString());
  if (until) params.append('until', until.toString());

  const url = `https://lichess.org/api/games/user/${encodePathSegment(username)}?${params}`;

  const response = await fetchWithRetry(url, {
    headers: { Accept: 'application/x-ndjson' },
    onRetry: (waitMs) => onRetry?.(waitMs),
  });

  const text = await response.text();
  if (!text.trim()) return [];
  const lines = text.trim().split('\n');
  return lines
    .map((line) => {
      try {
        return JSON.parse(line) as LichessGame;
      } catch {
        return null;
      }
    })
    .filter((game): game is LichessGame => game !== null);
}

export async function fetchLichessGameByUrl(gameUrl: string): Promise<string | null> {
  const gameId = parseLichessGameUrl(gameUrl);
  if (!gameId) return null;
  return fetchLichessGameById(gameId);
}

export async function fetchLichessGameById(gameId: string): Promise<string | null> {
  const url = `https://lichess.org/game/export/${encodePathSegment(gameId)}`;
  try {
    const response = await fetchWithRetry(url, {
      headers: { Accept: 'application/x-chess-pgn' },
    });
    return await response.text();
  } catch (error) {
    console.error('Error fetching Lichess game:', error);
    return null;
  }
}

export function parseLichessGameUrl(url: string): string | null {
  const match = url.match(/lichess\.org\/(?:embed\/)?([a-zA-Z0-9]{8,12})(?:\/|$|\?)/);
  return match ? match[1] : null;
}
