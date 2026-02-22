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
  /**
   * Number of unique matchable icon groups (distinct pairIds) in the game.
   *
   * With a tile multiplier greater than 1 each icon may have 4+ copies,
   * producing multiple matchable pairs per group.  This field counts the
   * number of **distinct icons**, not the total number of matchable pairs.
   * The win condition uses {@link getRemainingUnmatchedPairCount} instead.
   */
  totalMatchableGroups: number;
  /**
   * Cached count of remaining matchable pairs on the board.
   *
   * Initialized in {@link createGame} and decremented by 1 on every match
   * in {@link selectTile}, giving O(1) win-condition checks.
   * {@link getRemainingUnmatchedPairCount} returns this cached value.
   * {@link prepareNearWinState} and {@link resetGame} reset it as needed.
   */
  remainingPairCount: number;
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

  // Compute initial remaining matchable pair count by counting tiles per pairId.
  const tileCounts = new Map<number, number>();

  for (const tile of tiles) {
    if (tile.status === "blocked") {
      continue;
    }

    tileCounts.set(tile.pairId, (tileCounts.get(tile.pairId) ?? 0) + 1);
  }

  let initialRemainingPairs = 0;

  for (const count of tileCounts.values()) {
    // Use Math.floor(count / 2) to compute matchable pairs from tile count.
    // This accounts for orphaned tiles in odd-count groups (e.g., 3 copies of an icon
    // produce only 1 matchable pair, with 1 tile left unmatched).
    initialRemainingPairs += Math.floor(count / 2);
  }

  return {
    rows: options.rows,
    columns: options.columns,
    tiles,
    totalMatchableGroups: pairIdsByIcon.size,
    remainingPairCount: initialRemainingPairs,
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
    // State invariant: remainingPairCount should never be zero when matching a new tile pair.
    // If remainingPairCount is already zero, a match has occurred when no pairs remained.
    // This suggests either: (1) selectTile() was called when no pairs existed, (2) the same
    // tile pair was matched twice (duplicate match), or (3) state was corrupted externally.
    // Fail fast to catch the bug during development before invalid state propagates.
    if (state.remainingPairCount === 0) {
      throw new Error(
        "[MEMORYBLOX] State corruption detected: Attempted to match a tile pair when remainingPairCount is already zero. Possible causes: duplicate match, corrupted state, or selectTile called after win condition.",
      );
    }
    state.remainingPairCount = Math.max(0, state.remainingPairCount - 1);
    state.firstSelection = null;
    state.secondSelection = null;
    state.isBoardLocked = false;

    const won = state.remainingPairCount === 0;

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

/**
 * Returns the cached count of remaining matchable pairs.
 *
 * This value is initialized in {@link createGame} and decremented on each
 * successful match in {@link selectTile}, giving O(1) performance.
 */
export const getRemainingUnmatchedPairCount = (state: GameState): number => {
  return state.remainingPairCount;
};

export const prepareNearWinState = (
  state: GameState,
): NearWinPreparationResult => {
  // Build a map from pairId → ordered list of tile IDs.
  //
  // With tile multipliers > 1 a single pairId can map to 3+ tile IDs
  // (e.g. triple-copy icons), which is why the value type is `number[]`
  // rather than a fixed-length pair tuple.
  // Blocked tiles are excluded — they are inert and cannot be matched.
  const tilesByPairId = new Map<number, number[]>();

  for (const tile of state.tiles) {
    if (tile.status === "blocked") {
      continue;
    }

    const entries = tilesByPairId.get(tile.pairId);

    if (entries === undefined) {
      tilesByPairId.set(tile.pairId, [tile.id]);
      continue;
    }

    entries.push(tile.id);
  }

  // Pick the last pairId as the one pair left visible for the player to match.
  // Any extra copies of that pairId beyond the first two are orphan tiles that
  // will be pre-marked as matched (see tile-status loop below).
  const pairIds = Array.from(tilesByPairId.keys());
  const remainingPairId = pairIds.length > 0 ? pairIds[pairIds.length - 1] : undefined;

  if (remainingPairId === undefined) {
    return {
      remainingPair: null,
      matchedPairs: [],
    };
  }

  const matchedPairs: [number, number][] = [];
  const remainingPairTiles = tilesByPairId.get(remainingPairId) ?? [];
  const remainingPair = remainingPairTiles.length >= 2
    ? [remainingPairTiles[0], remainingPairTiles[1]] as [number, number]
    : null;

  for (const [pairId, tileIds] of tilesByPairId.entries()) {
    for (let index = 0; index < tileIds.length; index += 1) {
      const tileId = tileIds[index];
      const tile = state.tiles[tileId];

      if (tile === undefined || tile.status === "blocked") {
        continue;
      }

      // For the remaining pair: keep the first two tiles hidden so the player must match them.
      // Any additional copies beyond index 1 are orphan tiles from a multi-copy deck —
      // pre-mark them as matched so they do not block the win condition.
      const keepHidden = pairId === remainingPairId && remainingPair !== null && index < 2;
      tile.status = keepHidden ? "hidden" : "matched";
    }

    const startIndex = pairId === remainingPairId && remainingPair !== null ? 2 : 0;

    for (let index = startIndex; index + 1 < tileIds.length; index += 2) {
      matchedPairs.push([tileIds[index], tileIds[index + 1]]);
    }
  }

  state.firstSelection = null;
  state.secondSelection = null;
  state.isBoardLocked = false;
  state.isWon = false;
  state.endedAt = null;
  state.matches = matchedPairs.length;
  state.remainingPairCount = remainingPair !== null ? 1 : 0;

  if (state.startedAt === null) {
    state.startedAt = performance.now();
  }

  return {
    remainingPair,
    matchedPairs,
  };
};
