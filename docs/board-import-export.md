# Board Import/Export Documentation

## Overview

The board import/export mechanism allows users to save and load Scrabble board states to/from human-readable text files. This is useful for:

- Sharing board positions with others
- Saving game states for later analysis
- Creating test cases
- Backing up game progress
- Transferring boards between devices

## File Format Specification

### Format Version 1.0

The text file format consists of:

1. **Header section** (5 lines):
   - Line 1: Format identifier and version: `SCRABBLE-SOLVER v1.0`
   - Line 2: Game type: `GAME: <game-id>`
   - Line 3: Locale: `LOCALE: <locale-id>`
   - Line 4: Board dimensions: `SIZE: <width>x<height>`
   - Line 5: Separator: `---`

2. **Board section** (height lines):
   - One line per board row
   - Each character represents a cell:
     - **Uppercase letter** (A-Z): Regular tile with that letter
     - **Lowercase letter** (a-z): Blank tile representing that letter
     - **Dot (.)**: Empty cell

3. **Board Definition section** (optional, for documentation):
   - `BOARD_DEF` header
   - One line per row showing bonus square layout
   - Bonus square notation:
     - `.` = empty (no bonus)
     - `D` = double word score
     - `T` = triple word score
     - `Q` = quadruple word score (Super Scrabble)
     - `d` = double letter score
     - `t` = triple letter score
     - `q` = quadruple letter score (Super Scrabble)
     - `X` = center star
   - **Note**: This section is currently **ignored on import** (see custom-board-placement.md)

4. **Footer** (1 line):
   - Separator: `---`

### Example File

```
SCRABBLE-SOLVER v1.0
GAME: scrabble
LOCALE: en-US
SIZE: 15x15
RACK: ABCDEFG
---
...............
.......CAT.....
.......A.......
.......R.......
...............
...............
...............
...............
...............
...............
...............
...............
...............
...............
...............
---
BOARD_DEF
T..d...T...d..T
.D...t...t...D.
..D...d.d...D..
d..D...d...D..d
....D.....D....
.t...t...t...t.
..d...d.d...d..
T..d...X...d..T
..d...d.d...d..
.t...t...t...t.
....D.....D....
d..D...d...D..d
..D...d.d...D..
.D...t...t...D.
T..d...T...d..T
---
```

In this example:
- The board is a standard 15x15 Scrabble board
- The word "CAT" is placed horizontally
- The word "CAR" is placed vertically
- All tiles are regular tiles (not blanks)
- The rack contains 7 tiles: A, B, C, D, E, F, G
- The BOARD_DEF section shows the standard Scrabble bonus layout

### Example with Blank Tiles

```
SCRABBLE-SOLVER v1.0
GAME: scrabble
LOCALE: en-US
SIZE: 5x5
RACK: ABc
---
.....
.CaT.
.....
.....
.....
---
```

In this example:
- The middle 'a' in "CaT" is lowercase, indicating it's a blank tile being used as an 'A'
- The rack contains 'ABc' where lowercase 'c' is a blank tile representing 'C'

## Example Files

Example files for all supported games are available in the `/examples` directory:
- `sample-board.txt` - Standard Scrabble example
- `sample-board-with-blanks.txt` - Scrabble with blank tiles
- `super-scrabble-example.txt` - Super Scrabble (21x21)
- `scrabble-duel-example.txt` - Scrabble Duel (11x11)
- `literaki-example.txt` - Literaki (Polish)
- `kelimelik-example.txt` - Kelimelik (Turkish)
- `letter-league-example.txt` - Letter League (27x19)

## Supported Games

The following game types are supported:

- `scrabble` - Standard Scrabble (15x15)
- `super-scrabble` - Super Scrabble (21x21)
- `scrabble-duel` - Scrabble Duel
- `literaki` - Literaki
- `kelimelik` - Kelimelik
- `letter-league` - Letter League

## Supported Locales

The following locales are supported:

- `en-US` - English (United States)
- `en-GB` - English (United Kingdom)
- `fr-FR` - French (France)
- `de-DE` - German (Germany)
- `es-ES` - Spanish (Spain)
- `pl-PL` - Polish (Poland)
- `ro-RO` - Romanian (Romania)
- `tr-TR` - Turkish (Turkey)
- `fa-IR` - Persian (Iran)

## API Usage

### TypeScript/JavaScript

```typescript
import {
  exportBoardToText,
  importBoardFromText,
  downloadBoardAsFile,
  readBoardFromFile,
  isValidBoardExport,
  type BoardExportData,
  type BoardImportResult,
} from '@scrabble-solver/scrabble-solver/lib/boardImportExport';
import { Board, Game, Locale } from '@scrabble-solver/types';

// Export a board to text
const board = Board.create(15, 15);
const exportData: BoardExportData = {
  game: Game.Scrabble,
  locale: Locale.EN_US,
  board,
};
const text = exportBoardToText(exportData);

// Import a board from text
const result: BoardImportResult = importBoardFromText(text);
console.log('Game:', result.game);
console.log('Locale:', result.locale);
console.log('Board:', result.board);
console.log('Warnings:', result.warnings);

// Download as file (browser only)
downloadBoardAsFile(exportData, 'my-board.txt');

// Read from file upload (browser only)
const file = /* File from input element */;
readBoardFromFile(file)
  .then((result) => {
    console.log('Board loaded:', result.board);
  })
  .catch((error) => {
    console.error('Failed to load board:', error);
  });

// Validate a text string
if (isValidBoardExport(text)) {
  console.log('Valid board export format');
}
```

### Export Function

```typescript
exportBoardToText(data: BoardExportData): string
```

**Parameters:**
- `data.game`: Game type (from `Game` enum)
- `data.locale`: Locale (from `Locale` enum)
- `data.board`: Board instance to export

**Returns:** String containing the formatted board data

### Import Function

```typescript
importBoardFromText(text: string): BoardImportResult
```

**Parameters:**
- `text`: String containing board data in the specified format

**Returns:** Object containing:
- `game`: Parsed game type
- `locale`: Parsed locale
- `board`: Reconstructed Board instance
- `warnings`: Array of warning messages (e.g., for version mismatches, row length issues)

**Throws:** Error if the format is invalid or required fields are missing

### Validation Function

```typescript
isValidBoardExport(text: string): boolean
```

**Parameters:**
- `text`: String to validate

**Returns:** `true` if the text appears to be a valid board export, `false` otherwise

### File Download Function (Browser Only)

```typescript
downloadBoardAsFile(data: BoardExportData, filename?: string): void
```

**Parameters:**
- `data`: Board export data
- `filename`: Optional filename (default: `scrabble-board-{game}-{timestamp}.txt`)

**Side Effects:** Triggers a file download in the browser

### File Upload Function (Browser Only)

```typescript
readBoardFromFile(file: File): Promise<BoardImportResult>
```

**Parameters:**
- `file`: File object from a file input element

**Returns:** Promise that resolves to `BoardImportResult`

**Throws:** Error if file cannot be read or format is invalid

## Error Handling

The import function performs validation and throws descriptive errors for:

- **Invalid header**: Missing or incorrect `SCRABBLE-SOLVER` prefix
- **Missing metadata**: Missing GAME, LOCALE, or SIZE lines
- **Invalid size format**: SIZE not in `WIDTHxHEIGHT` format
- **Dimension mismatch**: Number of rows doesn't match declared height

Non-critical issues generate warnings:

- **Version mismatch**: File version differs from current version
- **Row length mismatch**: Rows are automatically padded or truncated with a warning

## Implementation Details

### Board State Representation

Internally, the board is represented as:

- **Board**: Contains a 2D array of `Cell` objects
- **Cell**: Contains:
  - `x`, `y`: Position coordinates
  - `isEmpty`: Boolean flag
  - `tile`: Reference to a `Tile` object
- **Tile**: Contains:
  - `character`: The letter (uppercase)
  - `isBlank`: Boolean flag indicating if this is a blank tile

### Character Encoding

- Regular tiles are stored with uppercase characters
- Blank tiles are exported as lowercase to distinguish them
- Empty cells use the space character (` `)
- All text files use UTF-8 encoding

### Blank Tile Handling

Blank tiles in Scrabble can represent any letter. In the export format:
- The character indicates what letter the blank represents
- Lowercase indicates it's a blank tile
- Example: `a` = blank tile representing 'A', `A` = regular 'A' tile

## Best Practices

1. **Always validate imports**: Check the `warnings` array after importing
2. **Handle errors gracefully**: Wrap imports in try-catch blocks
3. **Preserve game context**: Always export with the correct game and locale
4. **Use descriptive filenames**: Include game type and date in filenames
5. **Version compatibility**: Be aware that different format versions may not be fully compatible

## Future Enhancements

Potential future improvements:

- Support for additional metadata (player names, scores, move history)
- Compressed binary format for large boards
- JSON format as an alternative
- Batch import/export of multiple boards
- Integration with cloud storage services
