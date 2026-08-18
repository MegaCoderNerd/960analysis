export class HttpError extends Error {
  status: number;
  retryAfterMs?: number;

  constructor(message: string, status: number, retryAfterMs?: number) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

export interface FetchJsonOptions extends RequestInit {
  timeoutMs?: number;
  maxRetries?: number;
  onRetry?: (waitMs: number, attempt: number) => void;
}

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number.parseInt(header, 10);
  if (!Number.isNaN(seconds)) return seconds * 1000;
  const date = Date.parse(header);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithRetry(
  url: string,
  options: FetchJsonOptions = {}
): Promise<Response> {
  const { timeoutMs = 15000, maxRetries = 2, onRetry, ...init } = options;
  let lastError: Error = new Error('Request failed');

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (response.status === 429 || response.status === 503) {
        const retryAfterMs =
          parseRetryAfter(response.headers.get('Retry-After')) ??
          Math.min(8000, 1000 * 2 ** attempt);
        if (attempt < maxRetries) {
          onRetry?.(retryAfterMs, attempt + 1);
          await sleep(retryAfterMs);
          continue;
        }
        throw new HttpError(
          `Rate limit reached (${response.status}). Try again later.`,
          response.status,
          retryAfterMs
        );
      }

      if (!response.ok) {
        throw new HttpError(
          `Request failed: ${response.status} ${response.statusText}`,
          response.status
        );
      }

      return response;
    } catch (error) {
      clearTimeout(timer);
      lastError = error instanceof Error ? error : new Error(String(error));
      if (error instanceof HttpError && error.status !== 429 && error.status !== 503) {
        throw error;
      }
      if (attempt >= maxRetries) break;
      if (!(error instanceof HttpError)) {
        const waitMs = Math.min(8000, 1000 * 2 ** attempt);
        onRetry?.(waitMs, attempt + 1);
        await sleep(waitMs);
      }
    }
  }

  throw lastError;
}

export function encodePathSegment(value: string): string {
  return encodeURIComponent(value.trim());
}
