export type RandomSource = () => number;

export const shuffle = <T>(items: T[], random: RandomSource = Math.random): T[] => {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    const temp = result[index];
    result[index] = result[randomIndex];
    result[randomIndex] = temp;
  }

  return result;
};

export const formatElapsedTime = (elapsedMs: number): string => {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");

  return `${minutes}:${seconds}`;
};

/**
 * Clamp a numeric value to the inclusive range between the given minimum and maximum.
 *
 * @param value The value to clamp.
 * @param min The lower bound of the allowed range (inclusive).
 * @param max The upper bound of the allowed range (inclusive).
 * @returns The value constrained to the range `[min, max]`.
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};
