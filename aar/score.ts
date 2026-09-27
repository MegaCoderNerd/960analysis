import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export interface BenchScore {
  mean: number;
  ci_low: number;
  ci_high: number;
  n: number;
  role: 'safety' | 'held_out' | 'capability_filter';
  baseline?: number;
  optimum?: number;
  floor?: number;
  closed_pct?: number;
  passed?: boolean;
}

export interface ResearchScores {
  suite: string;
  headline_pct: number;
  closed_pct: Record<string, number>;
  per_benchmark: Record<string, BenchScore>;
  passes_filter: boolean;
  filter_detail: Record<string, { mean: number; floor: number; passed: boolean }>;
}

export interface FullScores extends ResearchScores {
  held_out_pct: Record<string, number>;
}

export function fraction(matches: number, n: number): number {
  if (n === 0) return 0;
  return matches / n;
}

/** Deterministic items: the interval is the point estimate. */
export function point(mean: number, n: number, role: BenchScore['role']): BenchScore {
  return { mean, ci_low: mean, ci_high: mean, n, role };
}

/**
 * Geometric mean of closed fractions. A non-positive leg binds, matching the
 * harness rule that every hill-climbing benchmark has to move.
 */
export function headlineFraction(closed: number[]): number {
  if (closed.length === 0) return 0;
  if (closed.some((value) => value <= 0)) return Math.min(...closed);
  const logMean = closed.reduce((sum, value) => sum + Math.log(value), 0) / closed.length;
  return Math.exp(logMean);
}

export function closedFraction(score: number, baseline: number, optimum: number): number {
  const span = optimum - baseline;
  if (span === 0) return score >= optimum ? 1 : 0;
  return (score - baseline) / span;
}

export function writeJson(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}
