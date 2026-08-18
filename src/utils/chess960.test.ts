import { describe, expect, it } from 'vitest';
import {
  applyChess960Castling,
  applyShredderRights,
  getChess960StartingPosition,
  identifyChess960Position,
  isSquareAttacked,
  parseFen,
  rightsAfterStandardMove,
  toChessJsFen,
  toShredderFen,
} from './chess960';

describe('chess960 Scharnagl numbering', () => {
  it('identifies position 518 as standard chess', () => {
    const board = getChess960StartingPosition(518);
    expect(board).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
    expect(identifyChess960Position(board)).toBe(518);
  });

  it('generates 960 unique starting arrays', () => {
    const boards = new Set<string>();
    for (let n = 1; n <= 960; n++) {
      boards.add(getChess960StartingPosition(n));
    }
    expect(boards.size).toBe(960);
  });

  it('maps HAha rook files to K/Q from the king', () => {
    const shredder = 'rqkbnnbr/pppppppp/8/8/8/8/PPPPPPPP/RQKBNNBR w HAha - 0 1';
    expect(toChessJsFen(shredder).split(' ')[2]).toBe('KQkq');
    expect(toShredderFen(toChessJsFen(shredder)).split(' ')[2]).toBe('HAha');
  });

  it('applies legal queenside castling when the king starts on c', () => {
    const fen = '8/8/8/8/8/8/8/R1K5 w A - 0 1';
    const next = applyChess960Castling(fen, false);
    expect(next).not.toBeNull();
    expect(next!.split(' ')[0].split('/')[7]).toBe('2KR4');
  });

  it('rejects illegal castling without rights', () => {
    const fen = 'rqkbnnbr/pppppppp/8/8/8/8/PPPPPPPP/RQKBNNBR w - - 0 1';
    expect(applyChess960Castling(fen, true)).toBeNull();
  });

  it('does not drop a c-file rook right when the a-file knight moves', () => {
    const start = 'nnrbbqkr/pppppppp/8/8/8/8/PPPPPPPP/NNRBBQKR w HChc - 0 1';
    const rights = rightsAfterStandardMove(start, 'a1', 'b3');
    expect(rights.wQ).toBe(2);
    expect(rights.wK).toBe(7);
    const after = applyShredderRights(
      'nnrbbqkr/pppppppp/8/8/8/1N6/PPPPPPPP/1NRBBQKR b Kkq - 1 1',
      rights
    );
    expect(after.split(' ')[2]).toBe('HChc');
  });

  it('sees pawn attacks toward the opponent back rank', () => {
    const whiteTarget = parseFen('4k3/8/8/8/8/8/1p6/2K5 w - - 0 1');
    expect(isSquareAttacked(whiteTarget.board, 2, 7, false)).toBe(true);
    const blackTarget = parseFen('2k5/1P6/8/8/8/8/8/4K3 b - - 0 1');
    expect(isSquareAttacked(blackTarget.board, 2, 0, true)).toBe(true);
  });
});
