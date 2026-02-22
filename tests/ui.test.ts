import { describe, expect, test } from "vitest";
import { JSDOM } from "jsdom";

import { UiView } from "../src/ui.ts";

describe("UiView", () => {
  test("updates time, attempts, and status text", () => {
    const dom = new JSDOM("<div><span id='time'></span><span id='attempts'></span><span id='status'></span></div>");
    const document = dom.window.document;
    const timeValue = document.querySelector<HTMLElement>("#time");
    const attemptsValue = document.querySelector<HTMLElement>("#attempts");
    const statusValue = document.querySelector<HTMLElement>("#status");

    if (timeValue === null || attemptsValue === null || statusValue === null) {
      throw new Error("Test DOM did not initialize correctly.");
    }

    const view = new UiView(timeValue, attemptsValue, statusValue);

    view.setTime("01:23");
    view.setAttempts(5);
    view.setStatus("Ready");

    expect(timeValue.textContent).toBe("01:23");
    expect(attemptsValue.textContent).toBe("5");
    expect(statusValue.textContent).toBe("Ready");
  });
});
