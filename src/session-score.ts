export type ScoreCategory = "standard" | "debug";

export type SessionMode = "game" | "debug-tiles";

export interface ScoreSessionFlags {
  mode: SessionMode;
  scoreCategory: ScoreCategory;
  isAutoDemoScore: boolean;
}

export const normalizeScoreFlagsForPlayerSelection = (
  flags: ScoreSessionFlags,
): ScoreSessionFlags => {
  if (!flags.isAutoDemoScore) {
    return flags;
  }

  return {
    ...flags,
    isAutoDemoScore: false,
    scoreCategory: flags.mode === "debug-tiles" ? flags.scoreCategory : "standard",
  };
};
