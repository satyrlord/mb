import type { BoardTileViewModel } from "./board.js";
import type { GameplayEngine } from "./gameplay.js";
import { formatElapsedTime } from "./utils.js";

export interface GamePresentationModel {
  boardTiles: BoardTileViewModel[];
  columns: number;
  attempts: number;
  elapsedTime: string;
}

export const createGamePresentationModel = (
  gameplay: GameplayEngine,
): GamePresentationModel => {
  return {
    boardTiles: gameplay.getTiles().map((tile) => ({
      icon: tile.icon,
      status: tile.status,
    })),
    columns: gameplay.getColumns(),
    attempts: gameplay.getAttempts(),
    elapsedTime: formatElapsedTime(gameplay.getElapsedTimeMs()),
  };
};
