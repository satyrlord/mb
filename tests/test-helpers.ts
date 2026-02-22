import { vi } from "vitest";

export const createMockTextResponse = (content: string): Response => {
  return {
    ok: true,
    text: async () => content,
  } as Response;
};

export const createMockDomRect = (
  left: number,
  top: number,
  width: number,
  height: number,
): DOMRect => {
  return {
    x: left,
    y: top,
    width,
    height,
    top,
    left,
    right: left + width,
    bottom: top + height,
    toJSON: () => ({}),
  } as DOMRect;
};

export const createBoardTileButton = (
  icon: string,
  rect = createMockDomRect(10, 10, 40, 40),
): HTMLButtonElement => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "tile game-block";

  const rightFace = document.createElement("span");
  rightFace.className = "tile-face tile-right";

  const topFace = document.createElement("span");
  topFace.className = "tile-face tile-top";

  const frontFace = document.createElement("span");
  frontFace.className = "tile-face tile-front";
  frontFace.textContent = "?";

  const backFace = document.createElement("span");
  backFace.className = "tile-face tile-back";
  backFace.textContent = icon;

  button.append(rightFace, topFace, frontFace, backFace);
  button.getBoundingClientRect = () => rect;

  return button;
};

/**
 * A varied numeric sequence used to give WinFx particle tests deterministic
 * but non-uniform random values (positions, rotations, delays, colours). The
 * 20-element spread ensures consecutive particles receive distinct `--piece-rot`
 * values without requiring a real PRNG.
 */
export const createDeterministicWinFxRandomSequence = (): number[] => [
  0.12, 0.87, 0.34, 0.65, 0.48, 0.73, 0.21, 0.56, 0.91, 0.38,
  0.67, 0.14, 0.82, 0.29, 0.55, 0.76, 0.03, 0.44, 0.98, 0.61,
];

export const createRandomSequenceMock = (
  sequence: number[],
) => {
  // Note: When called with an empty sequence, fall back to a constant 0.5.
  // This keeps tests deterministic without throwing, and uses the midpoint
  // of Math.random()'s [0, 1) range for callers that do not require a specific
  // pattern.
  if (sequence.length === 0) {
    return vi.spyOn(Math, "random").mockImplementation(() => 0.5);
  }

  let index = 0;

  return vi.spyOn(Math, "random").mockImplementation(() => {
    const value = sequence[index % sequence.length];
    index += 1;
    return value;
  });
};
