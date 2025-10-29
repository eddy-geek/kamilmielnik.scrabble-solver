import { Board, Game, Locale } from '@scrabble-solver/types';

import {
  exportBoardToText,
  importBoardFromText,
  isValidBoardExport,
  type BoardExportData,
} from './boardImportExport';

describe('boardImportExport', () => {
  describe('exportBoardToText', () => {
    it('exports an empty board correctly', () => {
      const board = Board.create(15, 15);
      const data: BoardExportData = {
        game: Game.Scrabble,
        locale: Locale.EN_US,
        board,
      };

      const text = exportBoardToText(data);
      const lines = text.split('\n');

      expect(lines[0]).toBe('SCRABBLE-SOLVER v1.0');
      expect(lines[1]).toBe('GAME: scrabble');
      expect(lines[2]).toBe('LOCALE: en-US');
      expect(lines[3]).toBe('SIZE: 15x15');
      expect(lines[4]).toBe('RACK: ');
      expect(lines[5]).toBe('---');
      expect(lines[6]).toBe('...............'); // 15 dots
      expect(lines[lines.length - 1]).toBe('---');
    });

    it('exports a board with tiles correctly', () => {
      const board = Board.fromStringArray([
        '     ',
        ' CAT ',
        ' A   ',
        ' R   ',
        '     ',
      ]);

      const data: BoardExportData = {
        game: Game.Scrabble,
        locale: Locale.EN_US,
        board,
      };

      const text = exportBoardToText(data);
      const lines = text.split('\n');

      expect(lines[0]).toBe('SCRABBLE-SOLVER v1.0');
      expect(lines[1]).toBe('GAME: scrabble');
      expect(lines[2]).toBe('LOCALE: en-US');
      expect(lines[3]).toBe('SIZE: 5x5');
      expect(lines[4]).toBe('RACK: ');
      expect(lines[6]).toBe('.....');
      expect(lines[7]).toBe('.CAT.');
      expect(lines[8]).toBe('.A...');
      expect(lines[9]).toBe('.R...');
      expect(lines[10]).toBe('.....');
    });

    it('exports blank tiles as lowercase', () => {
      const board = Board.fromStringArray(['CAT']);
      // Mark the 'A' as a blank tile
      board.rows[0][1].tile.isBlank = true;

      const data: BoardExportData = {
        game: Game.Scrabble,
        locale: Locale.EN_US,
        board,
      };

      const text = exportBoardToText(data);
      const lines = text.split('\n');

      expect(lines[6]).toBe('CaT'); // 'a' is lowercase because it's a blank
    });

    it('exports different game types correctly', () => {
      const board = Board.create(21, 21);
      const data: BoardExportData = {
        game: Game.SuperScrabble,
        locale: Locale.FR_FR,
        board,
      };

      const text = exportBoardToText(data);
      const lines = text.split('\n');

      expect(lines[1]).toBe('GAME: super-scrabble');
      expect(lines[2]).toBe('LOCALE: fr-FR');
      expect(lines[3]).toBe('SIZE: 21x21');
    });
  });

  describe('importBoardFromText', () => {
    it('imports an empty board correctly', () => {
      const text = `SCRABBLE-SOLVER v1.0
GAME: scrabble
LOCALE: en-US
SIZE: 5x5
RACK: 
---
.....
.....
.....
.....
.....
---`;

      const result = importBoardFromText(text);

      expect(result.game).toBe(Game.Scrabble);
      expect(result.locale).toBe(Locale.EN_US);
      expect(result.board.columnsCount).toBe(5);
      expect(result.board.rowsCount).toBe(5);
      expect(result.board.isEmpty()).toBe(true);
      expect(result.rack).toEqual([]);
      expect(result.warnings).toHaveLength(0);
    });

    it('imports a board with tiles correctly', () => {
      const text = `SCRABBLE-SOLVER v1.0
GAME: scrabble
LOCALE: en-US
SIZE: 5x5
RACK: ABCDEFG
---
.....
.CAT.
.A...
.R...
.....
---`;

      const result = importBoardFromText(text);

      expect(result.board.rows[1][1].tile.character).toBe('C');
      expect(result.board.rows[1][2].tile.character).toBe('A');
      expect(result.board.rows[1][3].tile.character).toBe('T');
      expect(result.board.rows[2][1].tile.character).toBe('A');
      expect(result.board.rows[3][1].tile.character).toBe('R');
      expect(result.board.rows[0][0].isEmpty).toBe(true);
      expect(result.rack).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
    });

    it('imports blank tiles correctly', () => {
      const text = `SCRABBLE-SOLVER v1.0
GAME: scrabble
LOCALE: en-US
SIZE: 3x1
RACK: ABc
---
CaT
---`;

      const result = importBoardFromText(text);

      expect(result.board.rows[0][0].tile.character).toBe('C');
      expect(result.board.rows[0][0].tile.isBlank).toBe(false);
      expect(result.board.rows[0][1].tile.character).toBe('A');
      expect(result.board.rows[0][1].tile.isBlank).toBe(true);
      expect(result.board.rows[0][2].tile.character).toBe('T');
      expect(result.board.rows[0][2].tile.isBlank).toBe(false);
      expect(result.rack).toEqual(['A', 'B', 'c']);
      expect(result.rack[2]).toBe('c'); // lowercase indicates blank in rack
    });

    it('pads short rows with spaces', () => {
      const text = `SCRABBLE-SOLVER v1.0
GAME: scrabble
LOCALE: en-US
SIZE: 5x2
RACK: 
---
CAT
DOG
---`;

      const result = importBoardFromText(text);

      expect(result.board.columnsCount).toBe(5);
      expect(result.board.rows[0][3].isEmpty).toBe(true);
      expect(result.board.rows[0][4].isEmpty).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('truncates long rows', () => {
      const text = `SCRABBLE-SOLVER v1.0
GAME: scrabble
LOCALE: en-US
SIZE: 3x1
RACK: 
---
TOOLONG
---`;

      const result = importBoardFromText(text);

      expect(result.board.columnsCount).toBe(3);
      expect(result.board.rows[0][0].tile.character).toBe('T');
      expect(result.board.rows[0][1].tile.character).toBe('O');
      expect(result.board.rows[0][2].tile.character).toBe('O');
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('throws error for invalid header', () => {
      const text = `INVALID HEADER
GAME: scrabble
LOCALE: en-US
SIZE: 5x5
---
     
---`;

      expect(() => importBoardFromText(text)).toThrow('Invalid file format');
    });

    it('throws error for missing game line', () => {
      const text = `SCRABBLE-SOLVER v1.0
LOCALE: en-US
SIZE: 5x5
---
     
---`;

      expect(() => importBoardFromText(text)).toThrow('Expected "GAME:" line');
    });

    it('throws error for missing locale line', () => {
      const text = `SCRABBLE-SOLVER v1.0
GAME: scrabble
SIZE: 5x5
---
     
---`;

      expect(() => importBoardFromText(text)).toThrow('Expected "LOCALE:" line');
    });

    it('throws error for invalid size format', () => {
      const text = `SCRABBLE-SOLVER v1.0
GAME: scrabble
LOCALE: en-US
SIZE: invalid
---
     
---`;

      expect(() => importBoardFromText(text)).toThrow('Invalid size format');
    });

    it('throws error for height mismatch', () => {
      const text = `SCRABBLE-SOLVER v1.0
GAME: scrabble
LOCALE: en-US
SIZE: 5x5
---
     
     
---`;

      expect(() => importBoardFromText(text)).toThrow('Board height mismatch');
    });

    it('warns about version mismatch', () => {
      const text = `SCRABBLE-SOLVER v2.0
GAME: scrabble
LOCALE: en-US
SIZE: 5x5
RACK: 
---
.....
.....
.....
.....
.....
---`;

      const result = importBoardFromText(text);
      expect(result.warnings.some((w) => w.includes('version'))).toBe(true);
    });
  });

  describe('round-trip', () => {
    it('exports and imports the same board', () => {
      const originalBoard = Board.fromStringArray([
        '               ',
        '       CAT     ',
        '       A       ',
        '       R       ',
        '               ',
      ]);

      // Mark one tile as blank
      originalBoard.rows[1][8].tile.isBlank = true;

      const data: BoardExportData = {
        game: Game.Scrabble,
        locale: Locale.EN_US,
        board: originalBoard,
        rack: ['A', 'B', 'c', 'D', 'E', 'F', 'G'],
      };

      const text = exportBoardToText(data);
      const result = importBoardFromText(text);

      expect(result.game).toBe(data.game);
      expect(result.locale).toBe(data.locale);
      expect(result.board.equals(originalBoard)).toBe(true);
      expect(result.board.rows[1][8].tile.isBlank).toBe(true);
      expect(result.rack).toEqual(['A', 'B', 'c', 'D', 'E', 'F', 'G']);
    });
  });

  describe('isValidBoardExport', () => {
    it('returns true for valid export', () => {
      const text = `SCRABBLE-SOLVER v1.0
GAME: scrabble
LOCALE: en-US
SIZE: 5x5
RACK: 
---
.....
---`;

      expect(isValidBoardExport(text)).toBe(true);
    });

    it('returns false for invalid export', () => {
      expect(isValidBoardExport('invalid text')).toBe(false);
      expect(isValidBoardExport('')).toBe(false);
    });
  });
});
