import { describe, expect, it } from 'vitest';
import { extractPlayerElo, parsePgnToPositions } from './pgn';

const EXAMPLE_960_PGN = `[Event "Rated Chess960 game"]
[Site "https://lichess.org/abc123"]
[White "Kine"]
[Black "Sparky"]
[Result "0-1"]
[FEN "rqkbnnbr/pppppppp/8/8/8/8/PPPPPPPP/RQKBNNBR w HAha - 0 1"]
[SetUp "1"]
[Variant "Chess960"]

1. f4 Nd6 2. e3 b6 3. Nf3 c6 4. Be2 Ng6 5. Ne5 Nxe5 6. fxe5 Nf5 7. c3 e6 8. g4 Ne7 9. e4 f6 10. Qc2 Bf7 11. exf6 gxf6 12. Ne3 d5 13. exd5 cxd5 14. O-O-O Bc7 15. c4 O-O 16. cxd5 Rc8 17. Kb1 exd5 18. Bd3 Kg7 19. Bxh7 Be5 20. Qd3 Bg6 21. Bxg6 Nxg6 22. Nf5+ Kf7 23. Qxd5+ Kf8 24. Qd7 Qc7 25. Qxc7 Rxc7 26. Be3 Re8 27. Bh6+ Kf7 28. Rhe1 Rc5 29. g5 fxg5 30. Bxg5 Ke6 31. Nh6 Kd5 32. Nf7 Rec8 33. Nxe5 Nxe5 34. Bf6 Rc4 35. Rxe5+ Kd6 0-1`;

describe('parsePgnToPositions', () => {
  it('parses a Chess960 PGN including O-O-O with the king already on c', () => {
    const parsed = parsePgnToPositions(EXAMPLE_960_PGN);
    expect(parsed.error).toBeUndefined();
    expect(parsed.chess960).toBe(true);
    expect(parsed.positions.length).toBe(71);
    const castle = parsed.positions.find((pos) => pos.san === 'O-O-O');
    expect(castle).toBeDefined();
    expect(castle?.uci.length).toBe(4);
  });

  it('fails closed on an illegal token', () => {
    const parsed = parsePgnToPositions(
      '[FEN "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"]\n\n1. e4 e5 2. Qxqe5'
    );
    expect(parsed.error).toMatch(/Invalid move/);
  });

  it('accepts O-O-O+ check notation', () => {
    const parsed = parsePgnToPositions(`${EXAMPLE_960_PGN.replace('14. O-O-O', '14. O-O-O+')}`);
    expect(parsed.error).toBeUndefined();
    expect(parsed.positions.some((pos) => pos.san === 'O-O-O')).toBe(true);
  });

  it('keeps 960 queenside rights after the a-file piece moves', () => {
    const pgn = `[FEN "nnrbbqkr/pppppppp/8/8/8/8/PPPPPPPP/NNRBBQKR w HChc - 0 1"]
[SetUp "1"]
[Variant "Chess960"]

1. Nb3 Nb6`;
    const parsed = parsePgnToPositions(pgn);
    expect(parsed.error).toBeUndefined();
    expect(parsed.positions.at(-1)?.fen.split(' ')[2]).toContain('C');
  });

  it('castles queenside after the a-file knight moved and the back rank is cleared', () => {
    const pgn = `[FEN "nnrbbqkr/pppppppp/8/8/8/8/PPPPPPPP/NNRBBQKR w HChc - 0 1"]
[SetUp "1"]
[Variant "Chess960"]

1. Nb3 Nb6 2. f3 f6 3. Qf2 Qf7 4. e3 e6 5. Be2 Be7 6. d3 d6 7. Bd2 Bd7 8. O-O-O`;
    const parsed = parsePgnToPositions(pgn);
    expect(parsed.error).toBeUndefined();
    expect(parsed.positions.at(-1)?.san).toBe('O-O-O');
  });

  it('accepts king-to-rook UCI as Chess960 O-O-O', () => {
    const pgn = `[FEN "nnr2k1r/pppppppp/8/8/8/1N6/PPPPPPPP/1NR3KR w HChc - 1 2"]
[SetUp "1"]
[Variant "Chess960"]

1. g1c1`;
    const parsed = parsePgnToPositions(pgn);
    expect(parsed.error).toBeUndefined();
    expect(parsed.positions.at(-1)?.san).toBe('O-O-O');
  });
});

describe('extractPlayerElo', () => {
  it('reads Chess.com Elo headers', () => {
    const pgn = '[WhiteElo "1520"]\n[BlackElo "1488"]\n\n1. e4 e5';
    expect(extractPlayerElo(pgn, 'white')).toBe(1520);
    expect(extractPlayerElo(pgn, 'black')).toBe(1488);
  });
});
