import { describe, expect, it } from 'vitest';
import { isTheoreticalBookMove } from './openingBook';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';

describe('isTheoreticalBookMove', () => {
  it('accepts the main first moves and their common replies', () => {
    expect(isTheoreticalBookMove(START, 'e4', 1)).toBe(true);
    expect(isTheoreticalBookMove(START, 'd4', 1)).toBe(true);
    expect(isTheoreticalBookMove(START, 'c4', 1)).toBe(true);
    expect(isTheoreticalBookMove(START, 'Nf3', 1)).toBe(true);
    expect(isTheoreticalBookMove(AFTER_E4, 'e5', 2)).toBe(true);
    expect(isTheoreticalBookMove(AFTER_E4, 'c5', 2)).toBe(true);
    expect(isTheoreticalBookMove(AFTER_E4, 'e6', 2)).toBe(true);
    expect(isTheoreticalBookMove(AFTER_E4, 'Nf6', 2)).toBe(true);
  });

  it('leaves obvious non-theory and late moves on the centipawn bands', () => {
    expect(isTheoreticalBookMove(START, 'a4', 1)).toBe(false);
    expect(isTheoreticalBookMove(START, 'h4', 1)).toBe(false);
    expect(isTheoreticalBookMove(START, 'f3', 1)).toBe(false);
    expect(isTheoreticalBookMove(START, 'a3', 1)).toBe(false);
    expect(isTheoreticalBookMove(AFTER_E4, 'Na3', 2)).toBe(false);
    expect(isTheoreticalBookMove(START, 'e4', 30)).toBe(false);
  });
});