export type TileStatus = "hidden" | "revealed" | "matched" | "blocked";

export const BLOCKED_TILE_TOKEN = "__BLOCKED_TILE__";

export interface Tile {
  id: number;
  pairId: number;
  icon: string;
  status: TileStatus;
}

export interface GameState {
  rows: number;
  columns: number;
  tiles: Tile[];
  totalPairs: number;
  firstSelection: number | null;
  secondSelection: number | null;
  attempts: number;
  matches: number;
  isBoardLocked: boolean;
  isWon: boolean;
  startedAt: number | null;
  endedAt: number | null;
}

export type SelectionResult =
  | { type: "ignored" }
  | { type: "first"; index: number }
  | { type: "match"; firstIndex: number; secondIndex: number; won: boolean }
  | { type: "mismatch"; firstIndex: number; secondIndex: number };

export interface NearWinPreparationResult {
  remainingPair: [number, number] | null;
  matchedPairs: [number, number][];
}

interface CreateGameOptions {
  rows: number;
  columns: number;
  deck: string[];
}

export const createGame = (options: CreateGameOptions): GameState => {
  const tileCount = options.rows * options.columns;

  if (options.deck.length !== tileCount) {
    throw new Error("Deck size must exactly match rows × columns.");
  }

  const pairIdsByIcon = new Map<string, number>();
  let nextPairId = 0;

  const tiles = options.deck.map((icon, index) => {
    if (icon === BLOCKED_TILE_TOKEN) {
      return {
        id: index,
        pairId: -1,
        icon: "",
        status: "blocked" as const,
      };
    }

    let pairId = pairIdsByIcon.get(icon);

    if (pairId === undefined) {
      pairId = nextPairId;
      nextPairId += 1;
      pairIdsByIcon.set(icon, pairId);
    }

    return {
      id: index,
      pairId,
      icon,
      status: "hidden" as const,
    };
  });

  const matchableTileCount = tiles.filter((tile) => tile.status !== "blocked").length;

  if (matchableTileCount % 2 !== 0) {
    throw new Error("Matchable tile count must be even.");
  }

  return {
    rows: options.rows,
    columns: options.columns,
    tiles,
    totalPairs: matchableTileCount / 2,
    firstSelection: null,
    secondSelection: null,
    attempts: 0,
    matches: 0,
    isBoardLocked: false,
    isWon: false,
    startedAt: null,
    endedAt: null,
  };
};

/**
 * Applies a tile selection to game state.
 *
 * @remarks
 * **Auto-resolve side effect:** if a previous mismatch is still open
 * (`isBoardLocked` with both selections set), this call resolves that mismatch
 * before processing `index`. Tiles other than `index` may therefore be modified
 * as part of this call. This typically occurs when the user clicks again before
 * mismatch-reveal timing/animation cleanup completes.
 *
 * @param state The current game state to be updated in place.
 * @param index Zero-based index into {@link GameState.tiles} indicating which tile is selected.
 * @returns A {@link SelectionResult} describing how the selection was handled:
 * - `ignored` if the selection has no effect (locked board, already revealed/matched, or game won).
 * - `first` when this selection becomes the first tile in a pair attempt.
 * - `match` when a matching pair is found, including whether this completes the game.
 * - `mismatch` when the two selected tiles do not form a pair.
 * @throws {RangeError} If `index` is negative or greater than or equal to `state.tiles.length`.
 */
export const selectTile = (state: GameState, index: number): SelectionResult => {
  if (index < 0 || index >= state.tiles.length) {
    throw new RangeError(
      `Tile index ${index} is out of bounds (valid range: 0 to ${state.tiles.length - 1})`,
    );
  }

  const tile = state.tiles[index];

  if (tile === undefined) {
    throw new RangeError(`Tile at index ${index} is missing from tiles array.`);
  }
  if (
    state.isBoardLocked &&
    state.firstSelection !== null &&
    state.secondSelection !== null
  ) {
    resolveMismatch(state, state.firstSelection, state.secondSelection);
  }

  if (
    state.isBoardLocked ||
    state.isWon ||
    tile.status !== "hidden"
  ) {
    return { type: "ignored" };
  }

  if (state.startedAt === null) {
    state.startedAt = performance.now();
  }

  tile.status = "revealed";

  if (state.firstSelection === null) {
    state.firstSelection = index;
    return { type: "first", index };
  }

  state.secondSelection = index;
  state.attempts += 1;
  state.isBoardLocked = true;

  const firstTile = state.tiles[state.firstSelection];

  if (firstTile !== undefined && firstTile.pairId === tile.pairId) {
    firstTile.status = "matched";
    tile.status = "matched";
    state.matches += 1;
    state.firstSelection = null;
    state.secondSelection = null;
    state.isBoardLocked = false;

    const won = state.matches === state.totalPairs;

    if (won) {
      state.isWon = true;
      state.endedAt = performance.now();
    }

    return {
      type: "match",
      firstIndex: firstTile.id,
      secondIndex: tile.id,
      won,
    };
  }

  return {
    type: "mismatch",
    firstIndex: state.firstSelection,
    secondIndex: index,
  };
};

export const resolveMismatch = (
  state: GameState,
  firstIndex: number,
  secondIndex: number,
): void => {
  const firstTile = state.tiles[firstIndex];
  const secondTile = state.tiles[secondIndex];

  if (firstTile !== undefined && firstTile.status === "revealed") {
    firstTile.status = "hidden";
  }

  if (secondTile !== undefined && secondTile.status === "revealed") {
    secondTile.status = "hidden";
  }

  state.firstSelection = null;
  state.secondSelection = null;
  state.isBoardLocked = false;
};

export const resetGame = (state: GameState, deck: string[]): void => {
  if (deck.length !== state.tiles.length) {
    throw new Error("Deck size for reset must match existing board size.");
  }

  const refreshedState = createGame({
    rows: state.rows,
    columns: state.columns,
    deck,
  });

  Object.assign(state, refreshedState);
};

export const getElapsedTimeMs = (state: GameState): number => {
  if (state.startedAt === null) {
    return 0;
  }

  if (state.endedAt !== null) {
    return state.endedAt - state.startedAt;
  }

  return performance.now() - state.startedAt;
};

export const findFirstUnmatchedPairIndices = (
  state: GameState,
): [number, number] | null => {
  const firstTileIdByPairId = new Map<number, number>();

  for (const tile of state.tiles) {
    if (tile.status === "matched" || tile.status === "blocked") {
      continue;
    }

    const firstTileId = firstTileIdByPairId.get(tile.pairId);

    if (firstTileId === undefined) {
      firstTileIdByPairId.set(tile.pairId, tile.id);
      continue;
    }

    return [firstTileId, tile.id];
  }

  return null;
};

export const getRemainingUnmatchedPairCount = (state: GameState): number => {
  const pendingPairIds = new Set<number>();

  for (const tile of state.tiles) {
    if (tile.status === "matched" || tile.status === "blocked") {
      continue;
    }

    pendingPairIds.add(tile.pairId);
  }

  return pendingPairIds.size;
};

export const prepareNearWinState = (
  state: GameState,
): NearWinPreparationResult => {
  const remainingPairIds = new Set<number>();

  for (let index = state.tiles.length - 1; index >= 0; index -= 1) {
    const tile = state.tiles[index];

    if (tile === undefined || tile.status === "blocked") {
      continue;
    }

    remainingPairIds.add(tile.pairId);

    if (remainingPairIds.size === 1) {
      continue;
    }

    remainingPairIds.delete(tile.pairId);
  }

  const [remainingPairId] = remainingPairIds;

  if (remainingPairId === undefined) {
    return {
      remainingPair: null,
      matchedPairs: [],
    };
  }

  const matchedPairs = new Map<number, [number, number]>();
  const remainingPairTiles: number[] = [];

  for (const tile of state.tiles) {
    if (tile.status === "blocked") {
      continue;
    }

    if (tile.pairId === remainingPairId) {
      tile.status = "hidden";
      remainingPairTiles.push(tile.id);
      continue;
    }

    tile.status = "matched";
    const existingPair = matchedPairs.get(tile.pairId);

    if (existingPair === undefined) {
      matchedPairs.set(tile.pairId, [tile.id, tile.id]);
      continue;
    }

    matchedPairs.set(tile.pairId, [existingPair[0], tile.id]);
  }

  state.firstSelection = null;
  state.secondSelection = null;
  state.isBoardLocked = false;
  state.isWon = false;
  state.endedAt = null;
  state.matches = Math.max(0, state.totalPairs - 1);

  if (state.startedAt === null) {
    state.startedAt = performance.now();
  }

  const remainingPair =
    remainingPairTiles.length === 2
      ? [remainingPairTiles[0], remainingPairTiles[1]] as [number, number]
      : null;

  return {
    remainingPair,
    matchedPairs: Array.from(matchedPairs.values()).filter(
      ([firstIndex, secondIndex]) => firstIndex !== secondIndex,
    ),
  };
};
