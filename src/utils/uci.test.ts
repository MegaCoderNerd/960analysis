import { describe, expect, it } from 'vitest';
import { parseUciLine, scoreToEvaluation } from './uci';

describe('parseUciLine', () => {
  it('parses centipawn scores', () => {
    const parsed = parseUciLine(
      'info depth 18 seldepth 22 multipv 1 score cp 45 nodes 120343 nps 500200 pv e2e4 e7e5'
    );
    expect(parsed.kind).toBe('info');
    if (parsed.kind !== 'info') return;
    expect(parsed.depth).toBe(18);
    expect(parsed.scoreType).toBe('cp');
    expect(parsed.evaluation).toBe(45);
    expect(parsed.pv).toEqual(['e2e4', 'e7e5']);
  });

  it('parses mate scores', () => {
    const parsed = parseUciLine('info depth 18 score mate -3 nodes 8420 pv d8d1 e1f2');
    expect(parsed.kind).toBe('info');
    if (parsed.kind !== 'info') return;
    expect(parsed.scoreType).toBe('mate');
    expect(parsed.mate).toBe(-3);
    expect(parsed.evaluation).toBe(scoreToEvaluation('mate', -3));
    expect(parsed.evaluation).toBe(-10003);
  });

  it('ignores bound scores for evaluation', () => {
    const parsed = parseUciLine('info depth 12 score cp 30 lowerbound pv e2e4');
    expect(parsed.kind).toBe('info');
    if (parsed.kind !== 'info') return;
    expect(parsed.bound).toBe('lowerbound');
    expect(parsed.evaluation).toBeUndefined();
  });

  it('parses bestmove and ponder', () => {
    const parsed = parseUciLine('bestmove e2e4 ponder e7e5');
    expect(parsed).toEqual({ kind: 'bestmove', bestMove: 'e2e4', ponder: 'e7e5' });
  });
});
