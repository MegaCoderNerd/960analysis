import { EngineSession, ANALYSIS_TIMEOUT_MS } from '../services/engineSession';
import type { AnalysisResult, StockfishOptions } from '../types';
import { getCachedEval, setCachedEval } from '../services/evalCache';
import { toShredderFen } from '../utils/chess960';

interface PoolTask {
  fen: string;
  depth: number;
  multiPv: number;
  resolve: (result: AnalysisResult) => void;
  reject: (error: Error) => void;
  signal?: AbortSignal;
}

interface SessionSlot {
  session: EngineSession;
  busy: boolean;
}

export class StockfishPool {
  private slots: SessionSlot[] = [];
  private queue: PoolTask[] = [];
  private poolSize: number;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(poolSize?: number) {
    const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 2 : 2;
    this.poolSize = poolSize ?? Math.min(3, Math.max(2, Math.floor(cores / 2)));
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.createSessions();
    try {
      await this.initPromise;
      this.initialized = true;
    } catch (error) {
      this.initPromise = null;
      throw error;
    }
  }

  async analyzeBatch(
    positions: Array<{ fen: string; moveIndex: number }>,
    depth: number,
    onProgress?: (completed: number, total: number) => void,
    signal?: AbortSignal
  ): Promise<Map<number, AnalysisResult>> {
    await this.initialize();

    const results = new Map<number, AnalysisResult>();
    let completed = 0;
    const total = positions.length;

    const analysisPromises = positions.map(({ fen, moveIndex }) =>
      this.analyzePosition(fen, depth, signal).then((result) => {
        results.set(moveIndex, result);
        completed++;
        onProgress?.(completed, total);
        return result;
      })
    );

    await Promise.all(analysisPromises);
    return results;
  }

  private analyzePosition(
    fen: string,
    depth: number,
    signal?: AbortSignal
  ): Promise<AnalysisResult> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }

      const task: PoolTask = {
        fen,
        depth,
        multiPv: 2,
        resolve,
        reject,
        signal,
      };
      this.queue.push(task);
      void this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    const slot = this.slots.find((s) => !s.busy);
    if (!slot || this.queue.length === 0) return;

    const task = this.queue.shift()!;
    if (task.signal?.aborted) {
      task.reject(new DOMException('Aborted', 'AbortError'));
      void this.processQueue();
      return;
    }

    slot.busy = true;
    try {
      const shredderFen = toShredderFen(task.fen);
      const cached = await getCachedEval(shredderFen, task.depth);
      if (cached) {
        task.resolve(cached);
      } else {
        const result = await slot.session.analyzeOnce(
          shredderFen,
          {
            depth: task.depth,
            multiPv: task.multiPv,
            timeoutMs: ANALYSIS_TIMEOUT_MS,
          } satisfies Partial<StockfishOptions> & { timeoutMs?: number },
          task.signal
        );
        await setCachedEval(shredderFen, task.depth, result);
        task.resolve(result);
      }
    } catch (error) {
      task.reject(error instanceof Error ? error : new Error(String(error)));
    } finally {
      slot.busy = false;
      void this.processQueue();
    }
  }

  async terminate(): Promise<void> {
    const pending = this.queue.splice(0);
    for (const task of pending) {
      task.reject(new Error('Engine pool terminated'));
    }
    for (const slot of this.slots) {
      slot.session.terminate();
    }
    this.slots = [];
    this.initialized = false;
    this.initPromise = null;
  }

  private async createSessions(): Promise<void> {
    const sessions = Array.from({ length: this.poolSize }, () => new EngineSession());
    await Promise.all(sessions.map((session) => session.ready()));
    this.slots = sessions.map((session) => ({ session, busy: false }));
  }
}

let poolInstance: StockfishPool | null = null;

export function getStockfishPool(): StockfishPool {
  if (!poolInstance) {
    poolInstance = new StockfishPool();
  }
  return poolInstance;
}
