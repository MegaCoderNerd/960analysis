import type { AccuracyScore, AnalyzedMove, AnalysisResult } from '../types';
import { ENGINE_ID } from './engineSession';

const DB_NAME = '960analysis';
const DB_VERSION = 1;
export const GAME_CACHE_SCHEMA = 2;
const EVAL_STORE = 'evals';
const GAME_STORE = 'games';

export async function hashKey(input: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const data = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-1', data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return `fnv-${hash}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(EVAL_STORE)) {
        db.createObjectStore(EVAL_STORE);
      }
      if (!db.objectStoreNames.contains(GAME_STORE)) {
        db.createObjectStore(GAME_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
  });
}

async function evalKey(fen: string, depth: number): Promise<string> {
  return hashKey(`${ENGINE_ID}|${depth}|${fen}`);
}

export async function getCachedEval(fen: string, depth: number): Promise<AnalysisResult | null> {
  try {
    const db = await openDb();
    const key = await evalKey(fen, depth);
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(EVAL_STORE, 'readonly');
      const request = tx.objectStore(EVAL_STORE).get(key);
      request.onsuccess = () => resolve((request.result as AnalysisResult | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

export async function setCachedEval(
  fen: string,
  depth: number,
  result: AnalysisResult
): Promise<void> {
  try {
    const db = await openDb();
    const key = await evalKey(fen, depth);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(EVAL_STORE, 'readwrite');
      const request = tx.objectStore(EVAL_STORE).put(
        { ...result, schemaVersion: 1, engineId: ENGINE_ID },
        key
      );
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // Cache is optional.
  }
}

export interface CachedGameReview {
  schemaVersion: number;
  engineId: string;
  moves: AnalyzedMove[];
  accuracy: AccuracyScore;
}

export async function getCachedGame(pgn: string): Promise<CachedGameReview | null> {
  try {
    const db = await openDb();
    const key = await hashKey(`${ENGINE_ID}|game|${pgn.trim()}`);
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(GAME_STORE, 'readonly');
      const request = tx.objectStore(GAME_STORE).get(key);
      request.onsuccess = () => resolve((request.result as CachedGameReview | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

export async function setCachedGame(pgn: string, review: CachedGameReview): Promise<void> {
  try {
    const db = await openDb();
    const key = await hashKey(`${ENGINE_ID}|game|${pgn.trim()}`);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(GAME_STORE, 'readwrite');
      const request = tx.objectStore(GAME_STORE).put(review, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // Cache is optional.
  }
}
