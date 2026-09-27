import { describe, expect, it } from 'vitest';
import { calculateAccuracy, estimateGameRating } from './accuracy';
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

  it('stays high when most moves are best or excellent and errors are rare', () => {
    const white = [
      ...Array.from({ length: 19 }, () => move({ centipawnLoss: 8, evaluation: 20, classification: 'best' })),
      ...Array.from({ length: 8 }, () => move({ centipawnLoss: 40, evaluation: 10, classification: 'excellent' })),
      ...Array.from({ length: 4 }, () => move({ centipawnLoss: 85, evaluation: 0, classification: 'good' })),
      move({ centipawnLoss: 125, evaluation: -20, classification: 'inaccuracy' }),
    ];
    const interleaved: AnalyzedMove[] = [];
    for (const whiteMove of white) {
      interleaved.push(whiteMove, move({ san: 'e5', centipawnLoss: 10, evaluation: 0, classification: 'best' }));
    }

    const score = calculateAccuracy(interleaved);
    expect(score.white).toBeGreaterThan(80);
    expect(score.black).toBe(100);
  });

  it('falls when blunders, mistakes, and inaccuracies pile up', () => {
    const white = [
      ...Array.from({ length: 4 }, () => move({ centipawnLoss: 0, evaluation: 10, classification: 'best' })),
      ...Array.from({ length: 3 }, () => move({ centipawnLoss: 120, evaluation: -20, classification: 'inaccuracy' })),
      ...Array.from({ length: 3 }, () => move({ centipawnLoss: 220, evaluation: -80, classification: 'mistake' })),
      ...Array.from({ length: 3 }, () => move({ centipawnLoss: 400, evaluation: -200, classification: 'blunder' })),
    ];
    const interleaved: AnalyzedMove[] = [];
    for (const whiteMove of white) {
      interleaved.push(whiteMove, move({ san: 'e5', centipawnLoss: 5, evaluation: 0, classification: 'best' }));
    }

    const score = calculateAccuracy(interleaved);
    expect(score.white).toBeLessThan(55);
    expect(score.white).toBeGreaterThan(20);
    expect(score.black).toBe(100);
  });

  it('scores book moves as perfect, the way Chess.com does', () => {
    const score = calculateAccuracy([
      move({ centipawnLoss: 80, evaluation: -40, classification: 'book' }),
      move({ centipawnLoss: 0, evaluation: 40, classification: 'best' }),
    ]);
    expect(score.white).toBe(100);
    expect(score.black).toBe(100);
  });
});

describe('estimateGameRating', () => {
  it('maps an 80 accuracy to about a 1600 rapid rating', () => {
    expect(estimateGameRating(80)).toBe(1600);
  });

  it('pulls a perfect beginner game down toward the stated rating', () => {
    const unanchored = estimateGameRating(100);
    const anchored = estimateGameRating(100, 600);
    expect(unanchored).toBeGreaterThan(anchored);
    expect(anchored).toBeLessThan(2000);
  });
});
