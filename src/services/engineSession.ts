import type { AnalysisResult, EngineLine, StockfishOptions } from '../types';
import { toShredderFen } from '../utils/chess960';
import { parseUciLine, type UciInfo } from '../utils/uci';

export const ENGINE_ID = 'stockfish-18-lite-single';
export const ENGINE_WORKER_URL = '/stockfish/stockfish-18-lite-single.js';
export const BOOT_TIMEOUT_MS = 8000;
export const ANALYSIS_TIMEOUT_MS = 45_000;

export type EngineStatus = 'booting' | 'ready' | 'error';

export type EngineStatusListener = (status: EngineStatus, error: string | null) => void;
export type EngineInfoListener = (info: UciInfo, requestId: number) => void;
export type EngineBestMoveListener = (
  bestMove: string,
  ponder: string | undefined,
  requestId: number
) => void;

export function detectEngineSupport(): string | null {
  if (typeof Worker === 'undefined') {
    return 'Web Workers are not supported in this browser.';
  }
  if (typeof WebAssembly === 'undefined') {
    return 'WebAssembly is not supported in this browser.';
  }
  return null;
}

interface AnalyzeJob {
  id: number;
  fen: string;
  depth: number;
  multiPv: number;
}

interface OnceWaiter {
  lines: EngineLine[];
  depth: number;
  evaluation: number | null;
  mate?: number;
  resolve: (result: AnalysisResult) => void;
  reject: (error: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
  abortHandler?: () => void;
  signal?: AbortSignal;
}

export class EngineSession {
  private worker: Worker | null = null;
  private status: EngineStatus = 'booting';
  private errorMessage: string | null = null;
  private generation = 0;
  private searching = false;
  private latestJob: AnalyzeJob | null = null;
  private runChain: Promise<void> = Promise.resolve();
  private stopWaiters: Array<() => void> = [];
  private onceWaiters = new Map<number, OnceWaiter>();
  private bootTimer: ReturnType<typeof setTimeout> | null = null;
  private readyWaiters: Array<{
    resolve: () => void;
    reject: (error: Error) => void;
  }> = [];
  private sawUciOk = false;

  onStatusChange: EngineStatusListener | null = null;
  onInfo: EngineInfoListener | null = null;
  onBestMove: EngineBestMoveListener | null = null;

  constructor() {
    const supportError = detectEngineSupport();
    if (supportError) {
      this.setError(supportError);
      return;
    }

    try {
      this.worker = new Worker(ENGINE_WORKER_URL);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start engine worker';
      this.setError(message);
      return;
    }

    this.worker.onmessage = (event: MessageEvent<unknown>) => {
      this.handleWorkerMessage(event.data);
    };
    this.worker.onerror = (event) => {
      this.setError(event.message || 'Stockfish worker error');
    };

    this.bootTimer = setTimeout(() => {
      if (this.status === 'booting') {
        this.setError('Engine failed to start within 8 seconds. WebAssembly may be blocked or still compiling.');
      }
    }, BOOT_TIMEOUT_MS);

    this.send('uci');
  }

  getStatus(): EngineStatus {
    return this.status;
  }

  getError(): string | null {
    return this.errorMessage;
  }

  ready(): Promise<void> {
    if (this.status === 'ready') return Promise.resolve();
    if (this.status === 'error') {
      return Promise.reject(new Error(this.errorMessage ?? 'Engine error'));
    }
    return new Promise((resolve, reject) => {
      this.readyWaiters.push({ resolve, reject });
    });
  }

  /**
   * Start (or replace) a search. Returns a request id; ignore late messages
   * whose id does not match the latest returned value.
   */
  analyze(fen: string, options: Partial<StockfishOptions> = {}): number {
    const id = ++this.generation;
    this.latestJob = {
      id,
      fen,
      depth: options.depth ?? 18,
      multiPv: options.multiPv ?? 3,
    };
    this.runChain = this.runChain.then(() => this.runLatest()).catch((error) => {
      if (this.status !== 'error') {
        console.error('Engine analyze error:', error);
      }
    });
    return id;
  }

  analyzeOnce(
    fen: string,
    options: Partial<StockfishOptions> & { timeoutMs?: number } = {},
    signal?: AbortSignal
  ): Promise<AnalysisResult> {
    if (signal?.aborted) {
      return Promise.reject(new DOMException('Aborted', 'AbortError'));
    }

    const requestId = this.analyze(fen, options);

    return new Promise((resolve, reject) => {
      const timeoutMs = options.timeoutMs ?? ANALYSIS_TIMEOUT_MS;
      const timeoutId = setTimeout(() => {
        this.failWaiter(requestId, new Error(`Analysis timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      const abortHandler = () => {
        this.stop();
        this.failWaiter(requestId, new DOMException('Aborted', 'AbortError'));
      };
      signal?.addEventListener('abort', abortHandler, { once: true });

      this.onceWaiters.set(requestId, {
        lines: [],
        depth: 0,
        evaluation: null,
        resolve,
        reject,
        timeoutId,
        abortHandler,
        signal,
      });
    });
  }

  stop(): void {
    if (!this.worker || !this.searching) return;
    this.send('stop');
  }

  terminate(): void {
    this.generation += 1;
    this.latestJob = null;
    for (const [, waiter] of this.onceWaiters) {
      clearTimeout(waiter.timeoutId);
      waiter.signal?.removeEventListener('abort', waiter.abortHandler!);
      waiter.reject(new Error('Engine terminated'));
    }
    this.onceWaiters.clear();
    this.rejectReady(new Error('Engine terminated'));
    this.flushStopWaiters();
    if (this.bootTimer) {
      clearTimeout(this.bootTimer);
      this.bootTimer = null;
    }
    this.worker?.terminate();
    this.worker = null;
    this.searching = false;
    this.status = 'error';
    this.errorMessage = 'Engine terminated';
  }

  private async runLatest(): Promise<void> {
    const job = this.latestJob;
    if (!job) return;

    try {
      await this.ready();
    } catch {
      return;
    }

    if (job.id !== this.generation) return;

    if (this.searching) {
      this.send('stop');
      await this.waitForStop();
    }

    if (job.id !== this.generation) return;

    this.searching = true;
    this.send(`setoption name MultiPV value ${job.multiPv}`);
    this.send(`position fen ${toShredderFen(job.fen)}`);
    this.send(`go depth ${job.depth}`);
  }

  private waitForStop(): Promise<void> {
    if (!this.searching) return Promise.resolve();
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.searching = false;
        resolve();
      }, 250);
      this.stopWaiters.push(() => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  private handleWorkerMessage(data: unknown): void {
    const line = typeof data === 'string' ? data : String(data ?? '');
    const parsed = parseUciLine(line);

    if (this.status === 'booting') {
      if (parsed.kind === 'uciok') {
        this.sawUciOk = true;
        this.send('setoption name UCI_Chess960 value true');
        this.send('isready');
        return;
      }
      if (parsed.kind === 'readyok' && this.sawUciOk) {
        this.setReady();
        return;
      }
    }

    if (parsed.kind === 'info') {
      this.applyInfo(parsed);
      return;
    }

    if (parsed.kind === 'bestmove') {
      this.searching = false;
      this.flushStopWaiters();
      const requestId = this.generation;
      this.onBestMove?.(parsed.bestMove, parsed.ponder, requestId);
      this.completeWaiter(requestId, parsed.bestMove, parsed.ponder);
    }
  }

  private applyInfo(info: UciInfo): void {
    const requestId = this.generation;
    const waiter = this.onceWaiters.get(requestId);
    if (waiter && info.depth !== undefined) {
      waiter.depth = Math.max(waiter.depth, info.depth);
    }
    if (waiter && info.evaluation !== undefined && !info.bound) {
      const multipv = info.multipv ?? 1;
      if (multipv === 1) {
        waiter.evaluation = info.evaluation;
        waiter.mate = info.mate;
      }
      if (info.pv) {
        const line: EngineLine = {
          multipv,
          depth: info.depth ?? waiter.depth,
          evaluation: info.evaluation,
          mate: info.mate,
          moves: info.pv,
        };
        const next = [...waiter.lines];
        next[multipv - 1] = line;
        waiter.lines = next.filter(Boolean).slice(0, 3);
      }
    }
    this.onInfo?.(info, requestId);
  }

  private completeWaiter(requestId: number, bestMove: string, ponder?: string): void {
    const waiter = this.onceWaiters.get(requestId);
    if (!waiter) return;
    this.onceWaiters.delete(requestId);
    clearTimeout(waiter.timeoutId);
    if (waiter.abortHandler) {
      waiter.signal?.removeEventListener('abort', waiter.abortHandler);
    }
    waiter.resolve({
      evaluation: waiter.evaluation ?? 0,
      mate: waiter.mate,
      bestMove,
      ponderMove: ponder,
      lines: waiter.lines,
      depth: waiter.depth,
    });
  }

  private failWaiter(requestId: number, error: Error): void {
    const waiter = this.onceWaiters.get(requestId);
    if (!waiter) return;
    this.onceWaiters.delete(requestId);
    clearTimeout(waiter.timeoutId);
    if (waiter.abortHandler) {
      waiter.signal?.removeEventListener('abort', waiter.abortHandler);
    }
    waiter.reject(error);
  }

  private setReady(): void {
    if (this.bootTimer) {
      clearTimeout(this.bootTimer);
      this.bootTimer = null;
    }
    this.status = 'ready';
    this.errorMessage = null;
    this.onStatusChange?.(this.status, null);
    const waiters = this.readyWaiters.splice(0);
    for (const waiter of waiters) waiter.resolve();
  }

  private setError(message: string): void {
    if (this.bootTimer) {
      clearTimeout(this.bootTimer);
      this.bootTimer = null;
    }
    this.status = 'error';
    this.errorMessage = message;
    this.searching = false;
    this.onStatusChange?.(this.status, message);
    this.rejectReady(new Error(message));
    for (const [id] of this.onceWaiters) {
      this.failWaiter(id, new Error(message));
    }
  }

  private rejectReady(error: Error): void {
    const waiters = this.readyWaiters.splice(0);
    for (const waiter of waiters) waiter.reject(error);
  }

  private flushStopWaiters(): void {
    const waiters = this.stopWaiters.splice(0);
    for (const waiter of waiters) waiter();
  }

  private send(command: string): void {
    this.worker?.postMessage(command);
  }
}
