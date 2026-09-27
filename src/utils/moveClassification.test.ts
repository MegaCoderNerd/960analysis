import { describe, expect, it } from 'vitest';
import { classifyMove } from './moveClassification';

describe('classifyMove', () => {
  it('classifies a 300 centipawn loss as a blunder', () => {
    expect(classifyMove(0, 300, 300)).toBe('blunder');
  });

  it('marks a missed forced mate as missed-win', () => {
    expect(classifyMove(200, 10003, 10003)).toBe('missed-win');
  });

  it('keeps a mate as best when the mate is preserved', () => {
    expect(classifyMove(10002, 10003, 10003, false, 1, true)).toBe('best');
  });

  it('keeps a 100 centipawn loss in the good band', () => {
    expect(classifyMove(0, 100, 100)).toBe('good');
  });

  it('keeps a 150 centipawn loss as an inaccuracy', () => {
    expect(classifyMove(0, 150, 150)).toBe('inaccuracy');
  });

  it('classifies 151 centipawns as a mistake', () => {
    expect(classifyMove(0, 151, 151)).toBe('mistake');
  });

  it('labels an opening-book flag before the centipawn band', () => {
    expect(classifyMove(20, 30, 30, true)).toBe('book');
  });
});
