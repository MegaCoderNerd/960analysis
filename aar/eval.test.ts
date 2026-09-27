import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { calculateAccuracy } from '../src/utils/accuracy';
import {
  getChess960StartingPosition,
  identifyChess960Position,
} from '../src/utils/chess960';
import { classifyEngineMove } from '../src/utils/reviewClassification';
import { scoreToEvaluation } from '../src/utils/uci';
import {
  BAND_EDGE_ITEMS,
  goldLabel,
  HELD_OUT_ITEMS,
  OPENING_BOOK_ITEMS,
} from './secret/reviewItems';
import {
  closedFraction,
  fraction,
  headlineFraction,
  point,
  writeJson,
  type BenchScore,
  type FullScores,
  type ResearchScores,
} from './score';

interface SuiteBench {
  name: string;
  role: 'safety' | 'held_out' | 'capability_filter';
  baseline?: number;
  optimum?: number;
  floor?: number;
}

function loadSuite(path: string): { suite: string; benchmarks: SuiteBench[] } {
  const benchmarks: SuiteBench[] = [];
  let suite = '';
  let current: SuiteBench | null = null;
  for (const raw of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('suite:')) {
      suite = line.slice('suite:'.length).trim();
      continue;
    }
    if (line.startsWith('- name:')) {
      if (current) benchmarks.push(current);
      current = { name: line.slice('- name:'.length).trim(), role: 'safety' };
      continue;
    }
    if (!current) continue;
    const [key, value] = line.split(':').map((part) => part.trim());
    if (key === 'role') current.role = value as SuiteBench['role'];
    if (key === 'baseline') current.baseline = Number(value);
    if (key === 'optimum') current.optimum = Number(value);
    if (key === 'floor') current.floor = Number(value);
  }
  if (current) benchmarks.push(current);
  return { suite, benchmarks };
}

function agree(items: Parameters<typeof classifyEngineMove>[0][]): { mean: number; n: number } {
  let hits = 0;
  for (const item of items) {
    const got = classifyEngineMove(item).classification;
    if (got === goldLabel(item)) hits += 1;
  }
  return { mean: fraction(hits, items.length), n: items.length };
}

function coreRules(): { mean: number; n: number } {
  const standard = getChess960StartingPosition(518);
  const checks = [
    standard === 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR',
    identifyChess960Position(standard) === 518,
    new Set(Array.from({ length: 960 }, (_, i) => getChess960StartingPosition(i + 1))).size ===
      960,
    calculateAccuracy([
      { san: 'e4', uci: 'e2e4', fen: 'start' },
      { san: 'e5', uci: 'e7e5', fen: 'start' },
    ]).white === null,
    scoreToEvaluation('mate', -3) === -10003,
    classifyEngineMove({
      evalBefore: 300,
      evalAfterSideToMove: 0,
      san: 'a3',
      uci: 'a2a3',
      bestUci: 'e2e4',
      fenBefore: '8/8/8/8/8/8/8/4K2k w - - 0 20',
      ply: 20,
    }).classification === 'blunder',
  ];
  return { mean: fraction(checks.filter(Boolean).length, checks.length), n: checks.length };
}

describe('AAR chess960_review', () => {
  it('writes a held-out-stripped score and a private full score', () => {
    const suite = loadSuite(new URL('./suite.yaml', import.meta.url));
    const measured: Record<string, { mean: number; n: number }> = {
      band_edges: agree(BAND_EDGE_ITEMS),
      opening_book: agree(OPENING_BOOK_ITEMS),
      review_ood: agree(HELD_OUT_ITEMS),
      core_rules: coreRules(),
    };

    const perBenchmark: Record<string, BenchScore> = {};
    const closedPct: Record<string, number> = {};
    const heldOutPct: Record<string, number> = {};
    const filterDetail: FullScores['filter_detail'] = {};
    const safetyClosed: number[] = [];

    for (const bench of suite.benchmarks) {
      const measuredRow = measured[bench.name];
      expect(measuredRow, bench.name).toBeDefined();
      const mean = measuredRow.mean;
      const row = point(mean, measuredRow.n, bench.role);
      if (bench.role === 'capability_filter') {
        const floor = bench.floor ?? 1;
        const passed = mean >= floor;
        row.floor = floor;
        row.passed = passed;
        filterDetail[bench.name] = { mean, floor, passed };
      } else {
        const baseline = bench.baseline ?? 0;
        const optimum = bench.optimum ?? 1;
        const closed = closedFraction(mean, baseline, optimum);
        row.baseline = baseline;
        row.optimum = optimum;
        row.closed_pct = closed * 100;
        if (bench.role === 'safety') {
          closedPct[bench.name] = row.closed_pct;
          safetyClosed.push(closed);
        } else {
          heldOutPct[bench.name] = row.closed_pct;
        }
      }
      perBenchmark[bench.name] = row;
    }

    const passes = Object.values(filterDetail).every((gate) => gate.passed);
    const full: FullScores = {
      suite: suite.suite,
      headline_pct: headlineFraction(safetyClosed) * 100,
      closed_pct: closedPct,
      held_out_pct: heldOutPct,
      per_benchmark: perBenchmark,
      passes_filter: passes,
      filter_detail: filterDetail,
    };

    const research: ResearchScores = {
      suite: full.suite,
      headline_pct: full.headline_pct,
      closed_pct: full.closed_pct,
      per_benchmark: Object.fromEntries(
        Object.entries(full.per_benchmark).filter(([, row]) => row.role !== 'held_out')
      ),
      passes_filter: full.passes_filter,
      filter_detail: full.filter_detail,
    };

    const root = new URL('.', import.meta.url);
    writeJson(fileURLToPath(new URL('./out/scores.json', root)), research);
    writeJson(fileURLToPath(new URL('./out/heldout/scores.json', root)), full);

    const line =
      `HEADLINE ${full.headline_pct >= 0 ? '+' : ''}${full.headline_pct.toFixed(2)}% ` +
      `passes_filter=${full.passes_filter} ` +
      Object.entries(closedPct)
        .map(([name, pct]) => `closed[${name}]=${pct.toFixed(2)}`)
        .join(' ');
    console.log(line);

    expect(research.passes_filter).toBe(true);
    expect(research.per_benchmark.review_ood).toBeUndefined();
    expect('held_out_pct' in research).toBe(false);
    expect(full.per_benchmark.review_ood.role).toBe('held_out');
  });
});
