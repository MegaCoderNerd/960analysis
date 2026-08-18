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
});
