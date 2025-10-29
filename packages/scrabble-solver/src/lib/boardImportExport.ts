import { getConfig } from '@scrabble-solver/configs';
import { BONUS_CHARACTER, BONUS_WORD } from '@scrabble-solver/constants';
import { Board, type BoardJson, type Game, type Locale } from '@scrabble-solver/types';

/**
 * Format specification for board import/export:
 * 
 * Line 1: Metadata header with format: SCRABBLE-SOLVER v1.0
 * Line 2: Game type (e.g., GAME: scrabble)
 * Line 3: Locale (e.g., LOCALE: en-US)
 * Line 4: Board dimensions (e.g., SIZE: 15x15)
 * Line 5: Rack tiles (e.g., RACK: ABCDefg - lowercase for blanks)
 * Line 6: Blank separator (---)
 * Lines 7+: Board rows (one per line)
 *   - Regular tiles: uppercase letter
 *   - Blank tiles: lowercase letter (indicates the character the blank represents)
 *   - Empty cells: dot (.)
 * After board: Board definition section
 *   - BOARD_DEF header
 *   - One line per row showing bonus squares
 *   - . = empty, D = double word, T = triple word, Q = quadruple word
 *   - d = double letter, t = triple letter, q = quadruple letter
 *   - X = center star
 * Last line: Optional blank separator (---)
 * 
 * Example:
 * SCRABBLE-SOLVER v1.0
 * GAME: scrabble
 * LOCALE: en-US
 * SIZE: 15x15
 * RACK: ABCDefg
 * ---
 * ...............
 * .......CAT.....
 * .......A.......
 * .......R.......
 * ...............
 * ---
 * BOARD_DEF
 * T..d...T...d..T
 * .D...t...t...D.
 * ..D...d.d...D..
 * d..D...d...D..d
 * ....D.....D....
 * .t...t...t...t.
 * ..d...d.d...d..
 * T..d...X...d..T
 * ---
 */

export interface BoardExportData {
  game: Game;
  locale: Locale;
  board: Board;
  rack?: string[];
}

export interface BoardImportResult {
  game: Game;
  locale: Locale;
  board: Board;
  rack: string[];
  warnings: string[];
}

const FORMAT_VERSION = 'v1.0';
const HEADER_PREFIX = 'SCRABBLE-SOLVER';
const SEPARATOR = '---';

/**
 * Exports a board to a text format
 */
export const exportBoardToText = ({ game, locale, board, rack = [] }: BoardExportData): string => {
  const lines: string[] = [];
  
  // Header
  lines.push(`${HEADER_PREFIX} ${FORMAT_VERSION}`);
  lines.push(`GAME: ${game}`);
  lines.push(`LOCALE: ${locale}`);
  lines.push(`SIZE: ${board.columnsCount}x${board.rowsCount}`);
  
  // Rack (convert blanks to lowercase)
  const rackString = rack.map(tile => tile || ' ').join('');
  lines.push(`RACK: ${rackString}`);
  
  lines.push(SEPARATOR);
  
  // Board content
  for (const row of board.rows) {
    const rowString = row
      .map((cell) => {
        if (cell.isEmpty) {
          return '.';
        }
        // Lowercase for blank tiles, uppercase for regular tiles
        return cell.tile.isBlank 
          ? cell.tile.character.toLowerCase() 
          : cell.tile.character.toUpperCase();
      })
      .join('');
    lines.push(rowString);
  }
  
  lines.push(SEPARATOR);
  
  // Board definition (bonus squares)
  lines.push('BOARD_DEF');
  const config = getConfig(game, locale);
  const bonusMap = new Map<string, { multiplier: number; type: string }>();
  
  for (const bonus of config.bonuses) {
    bonusMap.set(`${bonus.x},${bonus.y}`, { multiplier: bonus.multiplier, type: bonus.type });
  }
  
  const centerX = Math.floor(board.columnsCount / 2);
  const centerY = Math.floor(board.rowsCount / 2);
  
  for (let y = 0; y < board.rowsCount; y++) {
    let rowDef = '';
    for (let x = 0; x < board.columnsCount; x++) {
      // Check if this is the center
      if (x === centerX && y === centerY) {
        rowDef += 'X';
        continue;
      }
      
      const bonus = bonusMap.get(`${x},${y}`);
      if (!bonus) {
        rowDef += '.';
        continue;
      }
      
      if (bonus.type === BONUS_WORD) {
        if (bonus.multiplier === 2) rowDef += 'D';
        else if (bonus.multiplier === 3) rowDef += 'T';
        else if (bonus.multiplier === 4) rowDef += 'Q';
        else rowDef += '.';
      } else if (bonus.type === BONUS_CHARACTER) {
        if (bonus.multiplier === 2) rowDef += 'd';
        else if (bonus.multiplier === 3) rowDef += 't';
        else if (bonus.multiplier === 4) rowDef += 'q';
        else rowDef += '.';
      } else {
        rowDef += '.';
      }
    }
    lines.push(rowDef);
  }
  
  lines.push(SEPARATOR);
  
  return lines.join('\n');
};

/**
 * Imports a board from text format
 */
export const importBoardFromText = (text: string): BoardImportResult => {
  const lines = text.split('\n');
  const warnings: string[] = [];
  
  let lineIndex = 0;
  
  // Parse header
  const headerLine = lines[lineIndex++]?.trim();
  if (!headerLine?.startsWith(HEADER_PREFIX)) {
    throw new Error(`Invalid file format. Expected header starting with "${HEADER_PREFIX}"`);
  }
  
  const version = headerLine.substring(HEADER_PREFIX.length).trim();
  if (version !== FORMAT_VERSION) {
    warnings.push(`File version ${version} may not be fully compatible with current version ${FORMAT_VERSION}`);
  }
  
  // Parse game
  const gameLine = lines[lineIndex++]?.trim();
  if (!gameLine?.startsWith('GAME:')) {
    throw new Error('Invalid file format. Expected "GAME:" line');
  }
  const game = gameLine.substring(5).trim() as Game;
  
  // Parse locale
  const localeLine = lines[lineIndex++]?.trim();
  if (!localeLine?.startsWith('LOCALE:')) {
    throw new Error('Invalid file format. Expected "LOCALE:" line');
  }
  const locale = localeLine.substring(7).trim() as Locale;
  
  // Parse size
  const sizeLine = lines[lineIndex++]?.trim();
  if (!sizeLine?.startsWith('SIZE:')) {
    throw new Error('Invalid file format. Expected "SIZE:" line');
  }
  const sizeMatch = sizeLine.substring(5).trim().match(/^(\d+)x(\d+)$/);
  if (!sizeMatch) {
    throw new Error('Invalid size format. Expected "WIDTHxHEIGHT"');
  }
  const expectedWidth = parseInt(sizeMatch[1], 10);
  const expectedHeight = parseInt(sizeMatch[2], 10);
  
  // Parse rack (optional for backwards compatibility)
  let rack: string[] = [];
  const rackLine = lines[lineIndex]?.trim();
  if (rackLine?.startsWith('RACK:')) {
    lineIndex++;
    const rackString = rackLine.substring(5).trim();
    rack = rackString.split('').map(char => {
      if (char === ' ') return '';
      return char;
    });
  }
  
  // Skip separator
  const separatorLine = lines[lineIndex++]?.trim();
  if (separatorLine !== SEPARATOR) {
    warnings.push('Expected separator line after header');
  }
  
  // Parse board rows
  const boardRows: string[] = [];
  while (lineIndex < lines.length) {
    const line = lines[lineIndex++];
    if (line?.trim() === SEPARATOR) {
      break;
    }
    if (line?.trim() === 'BOARD_DEF') {
      // Skip board definition section
      while (lineIndex < lines.length) {
        const defLine = lines[lineIndex++];
        if (defLine?.trim() === SEPARATOR) {
          break;
        }
      }
      break;
    }
    if (line !== undefined) {
      boardRows.push(line);
    }
  }
  
  // Validate board dimensions
  if (boardRows.length !== expectedHeight) {
    throw new Error(
      `Board height mismatch. Expected ${expectedHeight} rows, got ${boardRows.length}`
    );
  }
  
  // Normalize row lengths and convert to board format
  const normalizedRows = boardRows.map((row, rowIndex) => {
    if (row.length > expectedWidth) {
      warnings.push(`Row ${rowIndex + 1} is too long (${row.length} > ${expectedWidth}), truncating`);
      return row.substring(0, expectedWidth);
    }
    if (row.length < expectedWidth) {
      // Pad with dots
      warnings.push(`Row ${rowIndex + 1} is too short (${row.length} < ${expectedWidth}), padding with dots`);
      return row + '.'.repeat(expectedWidth - row.length);
    }
    return row;
  });
  
  // Create board with blank tile information
  const boardJson: BoardJson = normalizedRows.map((row, y) =>
    row.split('').map((char, x) => {
      const isEmpty = !char || char === '.' || char === ' ';
      const isBlank = !isEmpty && char === char.toLowerCase() && char !== char.toUpperCase();
      const character = isEmpty ? ' ' : char.toUpperCase();
      
      return {
        isEmpty,
        tile: isEmpty
          ? null
          : {
              character,
              isBlank,
            },
        x,
        y,
      };
    })
  );
  
  const board = Board.fromJson(boardJson);
  
  return {
    game,
    locale,
    board,
    rack,
    warnings,
  };
};

/**
 * Validates that a text string appears to be a valid board export
 */
export const isValidBoardExport = (text: string): boolean => {
  try {
    const lines = text.split('\n');
    return lines.length > 0 && lines[0].trim().startsWith(HEADER_PREFIX);
  } catch {
    return false;
  }
};

/**
 * Exports board to a downloadable file
 */
export const downloadBoardAsFile = (data: BoardExportData, filename?: string): void => {
  const text = exportBoardToText(data);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `scrabble-board-${data.game}-${Date.now()}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Reads a board from a file upload
 */
export const readBoardFromFile = (file: File): Promise<BoardImportResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const result = importBoardFromText(text);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
};
