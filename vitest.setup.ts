/**
 * Global vitest setup for jsdom environment.
 *
 * Suppresses jsdom's "Not implemented: HTMLCanvasElement's getContext()"
 * warnings that fire when canvas 2D contexts are requested without the
 * `canvas` npm package installed. Tests that need real canvas behaviour
 * (e.g. canvas-board-view.test.ts) override this mock with their own
 * `vi.spyOn(HTMLCanvasElement.prototype, "getContext")` in beforeEach.
 */
import { vi } from "vitest";

// Only stub in jsdom environments — node environments don't have HTMLCanvasElement.
const HTMLCanvasElementCtor = (globalThis as Record<string, unknown>).HTMLCanvasElement as
  | { prototype: { getContext: (...args: unknown[]) => unknown } }
  | undefined;

if (HTMLCanvasElementCtor !== undefined) {
  Object.defineProperty(HTMLCanvasElementCtor.prototype, "getContext", {
    value: vi.fn(() => null),
    writable: true,
    configurable: true,
  });
}
