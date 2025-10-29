# Custom Board Placement - Technical Requirements

## Current State

The import/export mechanism currently **ignores the BOARD_DEF section** during import. This means:
- ✅ Board tiles and rack are imported correctly
- ✅ Game type and locale are preserved
- ❌ Custom bonus square placements are NOT applied

## Why Custom Boards Are Not Supported Yet

### 1. **Game Configuration Architecture**

The current architecture assumes each game has a **fixed board layout**:

```typescript
// From @scrabble-solver/configs
export const scrabble = {
  boardHeight: 15,
  boardWidth: 15,
  bonuses: [
    { multiplier: 3, type: BONUS_WORD, x: 0, y: 0 },
    { multiplier: 2, type: BONUS_CHARACTER, x: 3, y: 0 },
    // ... fixed positions
  ],
};
```

The bonus squares are **hardcoded per game type** and retrieved via `getConfig(game, locale)`.

### 2. **Board Class Limitations**

The `Board` class (from `@scrabble-solver/types`) only stores:
- Cell positions (x, y)
- Tile data (character, isBlank)
- Empty/filled state

It does **NOT** store bonus square information. Bonuses are looked up separately from the game config.

### 3. **Solver Dependencies**

The solver (`@scrabble-solver/solver`) calculates scores by:
1. Getting the board state (tiles only)
2. Looking up bonuses from the game config
3. Computing word scores based on fixed bonus positions

Custom bonus layouts would require the solver to accept dynamic bonus configurations.

### 4. **UI Rendering**

The board UI component renders bonus squares by:
1. Querying `getConfig(game, locale).bonuses`
2. Mapping bonus positions to CSS classes
3. Displaying colored squares

The UI doesn't have a mechanism to render custom bonus layouts.

## What Would Be Required

### Phase 1: Data Model Changes

#### 1.1 Extend Board Class
```typescript
// Add to Board class
export class Board {
  public readonly bonuses?: Bonus[];  // Optional custom bonuses
  
  constructor({ rows, bonuses }: { rows: Cell[][], bonuses?: Bonus[] }) {
    this.rows = rows;
    this.bonuses = bonuses;
    // ...
  }
}
```

#### 1.2 Update BoardJson Type
```typescript
export interface BoardJson {
  cells: CellJson[][];
  bonuses?: BonusJson[];  // Include in serialization
}
```

### Phase 2: Import/Export Updates

#### 2.1 Parse BOARD_DEF Section
```typescript
// In importBoardFromText()
const bonuses: Bonus[] = [];
if (boardDefSection) {
  for (let y = 0; y < boardDefLines.length; y++) {
    for (let x = 0; x < boardDefLines[y].length; x++) {
      const char = boardDefLines[y][x];
      if (char !== '.' && char !== 'X') {
        bonuses.push(parseBonusChar(char, x, y));
      }
    }
  }
}
```

#### 2.2 Store Custom Bonuses
```typescript
return {
  board: new Board({ rows, bonuses }),
  // ...
};
```

### Phase 3: Solver Integration

#### 3.1 Update Solver API
```typescript
// Current
solve(board: Board, rack: Tile[], config: Config): Result[]

// Proposed
solve(board: Board, rack: Tile[], config: Config, customBonuses?: Bonus[]): Result[]
```

#### 3.2 Bonus Lookup Logic
```typescript
function getBonusAt(x: number, y: number, board: Board, config: Config): Bonus | null {
  // Priority: custom bonuses > config bonuses
  if (board.bonuses) {
    return board.bonuses.find(b => b.x === x && b.y === y) || null;
  }
  return config.bonuses.find(b => b.x === x && b.y === y) || null;
}
```

### Phase 4: UI Updates

#### 4.1 Board Component
```typescript
// Pass custom bonuses to rendering logic
const bonuses = board.bonuses || config.bonuses;
```

#### 4.2 State Management
```typescript
// Redux state would need to track custom bonuses
interface BoardState {
  board: Board;
  customBonuses?: Bonus[];
}
```

### Phase 5: Validation

#### 5.1 Board Validation
- Ensure bonus positions are within board bounds
- Validate bonus types and multipliers
- Check for conflicts (e.g., center square)

#### 5.2 Game Compatibility
- Warn if custom board differs significantly from standard
- Validate that board dimensions match game type

## Implementation Complexity

### Estimated Effort
- **Phase 1 (Data Model)**: 2-4 hours
- **Phase 2 (Import/Export)**: 2-3 hours
- **Phase 3 (Solver)**: 4-6 hours (most complex)
- **Phase 4 (UI)**: 3-4 hours
- **Phase 5 (Validation)**: 2-3 hours
- **Testing**: 4-6 hours

**Total**: ~17-26 hours of development

### Risks & Challenges

1. **Backward Compatibility**: Existing saved boards must still work
2. **Performance**: Custom bonus lookup might be slower than fixed arrays
3. **Solver Complexity**: The solver is highly optimized for fixed layouts
4. **UI Complexity**: Rendering custom boards requires dynamic styling
5. **Validation**: Need to prevent invalid/broken board configurations

## Workaround (Current Approach)

For now, the recommended approach is:
1. Export boards with BOARD_DEF for documentation purposes
2. Import boards with tiles only
3. Manually select the correct game type in settings
4. Accept that bonus squares will match the selected game type

This allows sharing board positions while maintaining solver accuracy for standard game types.

## Future Considerations

### Custom Game Mode
A dedicated "Custom Game" mode could be added:
- Allow users to design custom board layouts
- Save/load custom configurations
- Separate from standard game types
- Optional feature for advanced users

### Board Editor
A visual board editor could enable:
- Drag-and-drop bonus square placement
- Real-time validation
- Preview of score calculations
- Export to shareable format

## Conclusion

Custom board placement is **technically feasible** but requires significant changes across multiple packages:
- `@scrabble-solver/types` (data model)
- `@scrabble-solver/solver` (scoring logic)
- `@scrabble-solver/scrabble-solver` (UI and state)

The current export format **includes** board definitions for future compatibility, but import **ignores** them to maintain system stability and correctness.
