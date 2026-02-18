import { BoardView } from "./board.js";
import {
  BLOCKED_TILE_TOKEN,
  createGame,
  getElapsedTimeMs,
  resetGame,
  resolveMismatch,
  selectTile,
} from "./game.js";
import { generateEmojiDeck } from "./icons.js";
import { UiView } from "./ui.js";
import { formatElapsedTime, shuffle } from "./utils.js";

/**
 * UI and gameplay timing controls in milliseconds.
 *
 * Rationale and relationships:
 * - `mismatchDelay` is tuned for recognition time after a wrong guess.
 * - `reducedMotionMismatchExtraDelay` extends only mismatch reveal time for
 *   reduced-motion users, who can have less animation feedback for state changes.
 * - Effective mismatch delay = `mismatchDelay + reducedMotionMismatchExtraDelay`
 *   when `prefers-reduced-motion: reduce` matches.
 * - `matchedDisappearPause` keeps successful matches visible long enough to register.
 * - Demo timings (`autoMatch*`) are intentionally quick but readable.
 * - `uiTimerUpdateInterval` balances smooth timer updates with low CPU overhead.
 */
const TIMING_MS = {
  // 700ms gives enough time to perceive both wrong tiles without slowing turns too much.
  mismatchDelay: 700,
  // Adds accessibility dwell time when reduced-motion is preferred.
  reducedMotionMismatchExtraDelay: 200,
  // 1000ms lets a successful match register before dissolve animation begins.
  matchedDisappearPause: 1000,
  // 200ms keeps demo retries responsive while waiting for a playable pair.
  autoMatchRetryDelay: 200,
  // 220ms simulates a quick but readable second selection in demo mode.
  autoMatchSecondSelectionDelay: 220,
  // 450ms allows initial render/layout to settle before demo interaction starts.
  autoMatchBootDelay: 450,
  // 250ms refreshes HUD smoothly while limiting unnecessary update churn.
  uiTimerUpdateInterval: 250,
} as const;

const DEFAULT_DIFFICULTY_ID = "normal";

interface DifficultyConfig {
  id: string;
  label: string;
  rows: number;
  columns: number;
}

interface TileLayout {
  tileCount: number;
  hasBlockedTile: boolean;
  matchableTileCount: number;
  pairCount: number;
}

interface ActiveGameSession {
  mode: "game";
  difficulty: DifficultyConfig;
  gameState: ReturnType<typeof createGame>;
}

type AppSession =
  | {
    mode: "menu";
  }
  | ActiveGameSession;

const DIFFICULTIES: DifficultyConfig[] = [
  { id: "easy", label: "Easy", rows: 5, columns: 6 },
  { id: "normal", label: "Normal", rows: 5, columns: 8 },
  { id: "hard", label: "Hard", rows: 5, columns: 10 },
];

const requireElement = <T extends Element>(selector: string): T => {
  const element = document.querySelector<T>(selector);

  if (element === null) {
    throw new Error(`Required element not found: ${selector}`);
  }

  return element;
};

const boardElement = requireElement<HTMLElement>("#board");
const timeValueElement = requireElement<HTMLElement>("#timeValue");
const attemptsValueElement = requireElement<HTMLElement>("#attemptsValue");
const statusMessageElement = requireElement<HTMLElement>("#statusMessage");
const restartButton = requireElement<HTMLButtonElement>("#restartButton");
const menuButton = requireElement<HTMLButtonElement>("#menuButton");
const difficultyMenu = requireElement<HTMLElement>("#difficultyMenu");
const menuFrame = requireElement<HTMLElement>("#menuFrame");
const gameFrame = requireElement<HTMLElement>("#gameFrame");
const difficultyButtons = Array.from(
  difficultyMenu.querySelectorAll<HTMLButtonElement>("button[data-difficulty]"),
);

let session: AppSession = { mode: "menu" };
// Timer cancellation uses an interval id plus a generation counter to prevent
// stale callbacks from affecting UI or game state after restarts or cancels.
/**
 * Timer cancellation strategy.
 *
 * - `timerIntervalId` tracks the currently active `setInterval` handle so it can
 *   be cleared when the timer is stopped or restarted.
 * - `timerIntervalGeneration` is incremented every time we (re)start the timer
 *   and is captured by timer callbacks.
 * - Inside the callback we compare the captured generation with the current one;
 *   if they differ, the callback is considered stale (from a previous timer run)
 *   and returns without touching UI or game state.
 *
 * This prevents race conditions where an old interval fires after a restart or
 * cancel, ensuring only the most recent timer controls the UI.
 */
let timerIntervalId: number | null = null;
let timerIntervalGeneration = 0;

const hasActiveGame = (value: AppSession): value is ActiveGameSession => {
  return value.mode === "game";
};

const computeTileLayout = (difficulty: DifficultyConfig): TileLayout => {
  const tileCount = difficulty.rows * difficulty.columns;
  const blocked = tileCount % 2 !== 0;
  const matchableTileCount = blocked ? tileCount - 1 : tileCount;
  const pairCount = matchableTileCount / 2;

  return {
    tileCount,
    hasBlockedTile: blocked,
    matchableTileCount,
    pairCount,
  };
};

const getDifficultyById = (id: string): DifficultyConfig | null => {
  return DIFFICULTIES.find((difficulty) => difficulty.id === id) ?? null;
};

const getDefaultDifficulty = (): DifficultyConfig => {
  const difficulty = getDifficultyById(DEFAULT_DIFFICULTY_ID);

  if (difficulty === null) {
    throw new Error(
      `Required default difficulty not found: ${DEFAULT_DIFFICULTY_ID}`,
    );
  }

  return difficulty;
};

const createDeckForDifficulty = (difficulty: DifficultyConfig): string[] => {
  const { hasBlockedTile: blocked, pairCount } = computeTileLayout(difficulty);
  const deck = generateEmojiDeck(pairCount);

  if (!blocked) {
    return deck;
  }

  return shuffle([...deck, BLOCKED_TILE_TOKEN]);
};

const setDifficultySelection = (selectedId: string): void => {
  for (const button of difficultyButtons) {
    const isSelected = button.dataset.difficulty === selectedId;
    button.classList.toggle("active", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  }
};

const getMismatchDelayMs = (): number => {
  const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (reduceMotionQuery.matches) {
    return TIMING_MS.mismatchDelay + TIMING_MS.reducedMotionMismatchExtraDelay;
  }

  return TIMING_MS.mismatchDelay;
};

const stopHudTimer = (): void => {
  timerIntervalGeneration += 1;

  if (timerIntervalId !== null) {
    window.clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
};

const startHudTimer = (): void => {
  stopHudTimer();

  const generation = timerIntervalGeneration;

  timerIntervalId = window.setInterval(() => {
    if (generation !== timerIntervalGeneration || !hasActiveGame(session)) {
      return;
    }

    uiView.setTime(formatElapsedTime(getElapsedTimeMs(session.gameState)));
  }, TIMING_MS.uiTimerUpdateInterval);
};

const showMenuFrame = (): void => {
  stopHudTimer();

  menuFrame.hidden = false;
  gameFrame.hidden = true;
  setDifficultySelection("");
  session = { mode: "menu" };
};

const showGameFrame = (): void => {
  startHudTimer();

  menuFrame.hidden = true;
  gameFrame.hidden = false;
};

const getDifficultyStatusMessage = (difficulty: DifficultyConfig): string => {
  const suffix = computeTileLayout(difficulty).hasBlockedTile
    ? " One blocked tile is inactive."
    : "";

  return `Difficulty: ${difficulty.label}. Match all pairs to win.${suffix}`;
};

const startGameForDifficulty = (difficulty: DifficultyConfig): void => {
  session = {
    mode: "game",
    difficulty,
    gameState: createGame({
      rows: difficulty.rows,
      columns: difficulty.columns,
      deck: createDeckForDifficulty(difficulty),
    }),
  };
  showGameFrame();
  setDifficultySelection(difficulty.id);
  uiView.setStatus(getDifficultyStatusMessage(difficulty));
  render();
};

const handleTileSelect = (index: number): void => {
  if (!hasActiveGame(session)) {
    return;
  }

  const state = session.gameState;
  const selectionResult = selectTile(state, index);

  if (selectionResult.type === "ignored") {
    return;
  }

  render();

  if (selectionResult.type === "mismatch") {
    window.setTimeout(() => {
      resolveMismatch(
        state,
        selectionResult.firstIndex,
        selectionResult.secondIndex,
      );
      render();
    }, getMismatchDelayMs());
    return;
  }

  if (selectionResult.type === "match") {
    boardView.animateMatchedPair(
      selectionResult.firstIndex,
      selectionResult.secondIndex,
      TIMING_MS.matchedDisappearPause,
    );

    if (selectionResult.won) {
      uiView.setStatus("You win! Restart to play again.");
    } else {
      uiView.setStatus("Great match. Keep going.");
    }
    return;
  }

  uiView.setStatus("Pick one more tile.");
};

const render = (): void => {
  if (!hasActiveGame(session)) {
    uiView.setAttempts(0);
    uiView.setTime("00:00");
    return;
  }

  boardView.render(session.gameState.tiles, session.gameState.columns);
  uiView.setAttempts(session.gameState.attempts);
  uiView.setTime(formatElapsedTime(getElapsedTimeMs(session.gameState)));
};

const uiView = new UiView(
  timeValueElement,
  attemptsValueElement,
  statusMessageElement,
  restartButton,
);

const boardView = new BoardView(boardElement, handleTileSelect);

const getFirstUnmatchedPairIndices = (): [number, number] | null => {
  if (!hasActiveGame(session)) {
    return null;
  }

  const firstTileIdByPairId = new Map<number, number>();

  for (const tile of session.gameState.tiles) {
    if (tile.status === "matched") {
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

const runAutoMatchPair = (pair: [number, number]): void => {
  uiView.setStatus("Auto-match demo running...");
  handleTileSelect(pair[0]);
  window.setTimeout(() => {
    handleTileSelect(pair[1]);
  }, TIMING_MS.autoMatchSecondSelectionDelay);
};

const runAutoMatchDemo = (): void => {
  const pair = getFirstUnmatchedPairIndices();

  if (pair === null) {
    if (!hasActiveGame(session)) {
      const defaultDifficulty = getDefaultDifficulty();
      startGameForDifficulty(defaultDifficulty);
      window.setTimeout(() => {
        runAutoMatchDemo();
      }, TIMING_MS.autoMatchRetryDelay);
      return;
    }

    uiView.setStatus("No available pair found for auto-match demo.");
    return;
  }

  runAutoMatchPair(pair);
};

const params = new URLSearchParams(window.location.search);

difficultyMenu.addEventListener("click", (event) => {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return;
  }

  const button = target.closest<HTMLButtonElement>("button[data-difficulty]");

  if (button === null) {
    return;
  }

  const difficultyId = button.dataset.difficulty;

  if (difficultyId === undefined) {
    return;
  }

  const difficulty = getDifficultyById(difficultyId);

  if (difficulty === null) {
    return;
  }

  startGameForDifficulty(difficulty);
});

if (params.get("demo") === "match") {
  window.setTimeout(() => {
    runAutoMatchDemo();
  }, TIMING_MS.autoMatchBootDelay);
}

menuButton.addEventListener("click", () => {
  showMenuFrame();
});

uiView.bindRestart(() => {
  if (!hasActiveGame(session)) {
    return;
  }

  resetGame(
    session.gameState,
    createDeckForDifficulty(session.difficulty),
  );
  uiView.setStatus(getDifficultyStatusMessage(session.difficulty));
  render();
});

showMenuFrame();
render();