import type { BoardTileViewModel } from "./board";
import type { GameplayEngine } from "./gameplay";
import { formatElapsedTime } from "./utils";

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
