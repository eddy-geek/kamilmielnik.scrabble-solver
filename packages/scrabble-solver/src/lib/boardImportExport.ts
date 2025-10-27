import { Board, type BoardJson, type Game, type Locale } from '@scrabble-solver/types';
import { EMPTY_CELL } from '@scrabble-solver/constants';

/**
 * Format specification for board import/export:
 * 
 * Line 1: Metadata header with format: SCRABBLE-SOLVER v1.0
 * Line 2: Game type (e.g., GAME: scrabble)
 * Line 3: Locale (e.g., LOCALE: en-US)
 * Line 4: Board dimensions (e.g., SIZE: 15x15)
 * Line 5: Blank separator (---)
 * Lines 6+: Board rows (one per line)
 *   - Regular tiles: uppercase letter
 *   - Blank tiles: lowercase letter (indicates the character the blank represents)
 *   - Empty cells: space character
 * Last line: Optional blank separator (---)
 * 
 * Example:
 * SCRABBLE-SOLVER v1.0
 * GAME: scrabble
 * LOCALE: en-US
 * SIZE: 15x15
 * ---
 *                
 *       CAT      
 *       A        
 *       R        
 *                
 * ---
 */

export interface BoardExportData {
  game: Game;
  locale: Locale;
  board: Board;
}

export interface BoardImportResult {
  game: Game;
  locale: Locale;
  board: Board;
  warnings: string[];
}

const FORMAT_VERSION = 'v1.0';
const HEADER_PREFIX = 'SCRABBLE-SOLVER';
const SEPARATOR = '---';

/**
 * Exports a board to a text format
 */
export const exportBoardToText = ({ game, locale, board }: BoardExportData): string => {
  const lines: string[] = [];
  
  // Header
  lines.push(`${HEADER_PREFIX} ${FORMAT_VERSION}`);
  lines.push(`GAME: ${game}`);
  lines.push(`LOCALE: ${locale}`);
  lines.push(`SIZE: ${board.columnsCount}x${board.rowsCount}`);
  lines.push(SEPARATOR);
  
  // Board content
  for (const row of board.rows) {
    const rowString = row
      .map((cell) => {
        if (cell.isEmpty) {
          return EMPTY_CELL;
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
      // Pad with spaces
      warnings.push(`Row ${rowIndex + 1} is too short (${row.length} < ${expectedWidth}), padding with spaces`);
      return row + EMPTY_CELL.repeat(expectedWidth - row.length);
    }
    return row;
  });
  
  // Create board with blank tile information
  const boardJson: BoardJson = normalizedRows.map((row, y) =>
    row.split('').map((char, x) => {
      const isEmpty = !char || char === EMPTY_CELL;
      const isBlank = !isEmpty && char === char.toLowerCase() && char !== char.toUpperCase();
      const character = isEmpty ? EMPTY_CELL : char.toUpperCase();
      
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
