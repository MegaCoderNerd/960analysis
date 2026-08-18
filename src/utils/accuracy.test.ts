import { describe, expect, it } from 'vitest';
import { calculateAccuracy } from './accuracy';
import type { AnalyzedMove } from '../types';

function move(partial: Partial<AnalyzedMove>): AnalyzedMove {
  return {
    san: 'e4',
    uci: 'e2e4',
    fen: 'start',
    ...partial,
  };
}

describe('calculateAccuracy', () => {
  it('excludes unanalyzed moves instead of treating them as perfect', () => {
    const score = calculateAccuracy([
      move({}),
      move({}),
    ]);
    expect(score.white).toBeNull();
    expect(score.black).toBeNull();
  });

  it('scores 100 when classified moves have zero loss', () => {
    const score = calculateAccuracy([
      move({ centipawnLoss: 0, evaluation: 20 }),
      move({ centipawnLoss: 0, evaluation: -20 }),
    ]);
    expect(score.white).toBe(100);
    expect(score.black).toBe(100);
  });

  it('stays high when most moves are best/excellent with a few errors', () => {
    const white = [
      ...Array.from({ length: 19 }, () => move({ centipawnLoss: 8, evaluation: 20 })),
      ...Array.from({ length: 8 }, () => move({ centipawnLoss: 40, evaluation: 10 })),
      ...Array.from({ length: 4 }, () => move({ centipawnLoss: 85, evaluation: 0 })),
      ...Array.from({ length: 4 }, () => move({ centipawnLoss: 125, evaluation: -20 })),
      ...Array.from({ length: 2 }, () => move({ centipawnLoss: 220, evaluation: -80 })),
      move({ centipawnLoss: 400, evaluation: -100 }),
    ];
    const interleaved: AnalyzedMove[] = [];
    for (const whiteMove of white) {
      interleaved.push(whiteMove, move({ san: 'e5', centipawnLoss: 10, evaluation: 0 }));
    }

    const score = calculateAccuracy(interleaved);
    expect(score.white).toBeGreaterThan(75);
    expect(score.white).toBeLessThan(95);
    expect(score.black).toBeGreaterThan(90);
  });
});
