import {
  createGame,
  findFirstUnmatchedPairIndices,
  getElapsedTimeMs,
  getRemainingUnmatchedPairCount,
  prepareNearWinState,
  resetGame,
  resolveMismatch,
  selectTile,
  type GameState,
  type NearWinPreparationResult,
  type SelectionResult,
  type Tile,
} from "./game.js";

export interface GameplayEngine {
  readonly state: GameState;
  selectTile(index: number): SelectionResult;
  resolveMismatch(firstIndex: number, secondIndex: number): void;
  reset(deck: string[]): void;
  getElapsedTimeMs(): number;
  getTiles(): readonly Tile[];
  getColumns(): number;
  getAttempts(): number;
  isWon(): boolean;
  findFirstUnmatchedPairIndices(): [number, number] | null;
  getRemainingUnmatchedPairCount(): number;
  prepareNearWinState(): NearWinPreparationResult;
}

class DefaultGameplayEngine implements GameplayEngine {
  public readonly state: GameState;

  public constructor(state: GameState) {
    this.state = state;
  }

  public selectTile(index: number): SelectionResult {
    return selectTile(this.state, index);
  }

  public resolveMismatch(firstIndex: number, secondIndex: number): void {
    resolveMismatch(this.state, firstIndex, secondIndex);
  }

  public reset(deck: string[]): void {
    resetGame(this.state, deck);
  }

  public getElapsedTimeMs(): number {
    return getElapsedTimeMs(this.state);
  }

  public getTiles(): readonly Tile[] {
    return this.state.tiles;
  }

  public getColumns(): number {
    return this.state.columns;
  }

  public getAttempts(): number {
    return this.state.attempts;
  }

  public isWon(): boolean {
    return this.state.isWon;
  }

  public findFirstUnmatchedPairIndices(): [number, number] | null {
    return findFirstUnmatchedPairIndices(this.state);
  }

  public getRemainingUnmatchedPairCount(): number {
    return getRemainingUnmatchedPairCount(this.state);
  }

  public prepareNearWinState(): NearWinPreparationResult {
    return prepareNearWinState(this.state);
  }
}

interface CreateGameplayEngineOptions {
  rows: number;
  columns: number;
  deck: string[];
}

export const createGameplayEngine = (
  options: CreateGameplayEngineOptions,
): GameplayEngine => {
  const state = createGame(options);
  return new DefaultGameplayEngine(state);
};
