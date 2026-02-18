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

export const selectTile = (state: GameState, index: number): SelectionResult => {
  const tile = state.tiles[index];

  if (
    state.isBoardLocked ||
    state.isWon ||
    tile === undefined ||
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
