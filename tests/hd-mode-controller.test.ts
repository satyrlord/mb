// @vitest-environment jsdom
import { describe, test, expect, beforeEach } from "vitest";
import {
  detectDeviceType,
  getDefaultHdMode,
  readStoredHdMode,
  writeHdMode,
  updateHdToggleButton,
  applyHdMode,
  hdModeControllerTesting,
} from "../src/hd-mode-controller.js";

const { STORAGE_KEY, MOBILE_TABLET_PATTERN } = hdModeControllerTesting;

describe("hd-mode-controller", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  // ── detectDeviceType ─────────────────────────────────────────────────

  describe("detectDeviceType", () => {
    test("returns 'mobile' for Android user agent", () => {
      expect(detectDeviceType("Mozilla/5.0 (Linux; Android 13) Mobile")).toBe("mobile");
    });

    test("returns 'mobile' for iPhone user agent", () => {
      expect(detectDeviceType("Mozilla/5.0 (iPhone; CPU iPhone OS 16_0)")).toBe("mobile");
    });

    test("returns 'mobile' for iPad user agent", () => {
      expect(detectDeviceType("Mozilla/5.0 (iPad; CPU OS 16_0)")).toBe("mobile");
    });

    test("returns 'mobile' for iPod user agent", () => {
      expect(detectDeviceType("Mozilla/5.0 (iPod touch; CPU iPhone OS 16_0)")).toBe("mobile");
    });

    test("returns 'mobile' for Windows Phone user agent", () => {
      expect(detectDeviceType("Mozilla/5.0 (Windows Phone 10.0)")).toBe("mobile");
    });

    test("returns 'mobile' for tablet user agent", () => {
      expect(detectDeviceType("Mozilla/5.0 (Linux; Tablet)")).toBe("mobile");
    });

    test("returns 'mobile' for Silk (Kindle Fire) user agent", () => {
      expect(detectDeviceType("Mozilla/5.0 (Linux; Android 4.4) Silk/80")).toBe("mobile");
    });

    test("returns 'mobile' for Opera Mini user agent", () => {
      expect(detectDeviceType("Opera/9.80 (Android; Opera Mini/46)")).toBe("mobile");
    });

    test("returns 'desktop' for standard Chrome desktop user agent", () => {
      expect(detectDeviceType(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120",
      )).toBe("desktop");
    });

    test("returns 'desktop' for Mac Safari user agent", () => {
      expect(detectDeviceType(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Safari/605.1.15",
      )).toBe("desktop");
    });

    test("returns 'mobile' for iPadOS desktop-class Safari user agent", () => {
      expect(detectDeviceType(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        { platform: "MacIntel", maxTouchPoints: 5 },
      )).toBe("mobile");
    });

    test("returns 'desktop' for real Macs with zero touch points", () => {
      expect(detectDeviceType(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        { platform: "MacIntel", maxTouchPoints: 0 },
      )).toBe("desktop");
    });

    test("returns 'desktop' for Linux Firefox user agent", () => {
      expect(detectDeviceType(
        "Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0",
      )).toBe("desktop");
    });

    test("returns 'desktop' for empty user agent", () => {
      expect(detectDeviceType("")).toBe("desktop");
    });

    test("mobile pattern is case insensitive", () => {
      expect(MOBILE_TABLET_PATTERN.test("ANDROID")).toBe(true);
      expect(MOBILE_TABLET_PATTERN.test("IPhone")).toBe(true);
    });
  });

  // ── getDefaultHdMode ─────────────────────────────────────────────────

  describe("getDefaultHdMode", () => {
    test("returns 'off' for mobile devices", () => {
      expect(getDefaultHdMode("mobile")).toBe("off");
    });

    test("returns 'on' for desktop devices", () => {
      expect(getDefaultHdMode("desktop")).toBe("on");
    });
  });

  // ── readStoredHdMode / writeHdMode ─────────────────────────────────

  describe("readStoredHdMode", () => {
    test("returns device-aware default when no stored value exists", () => {
      expect(readStoredHdMode("mobile")).toBe("off");
      expect(readStoredHdMode("desktop")).toBe("on");
    });

    test("returns 'on' when stored value is 'on'", () => {
      window.localStorage.setItem(STORAGE_KEY, "on");
      expect(readStoredHdMode("mobile")).toBe("on");
    });

    test("returns 'off' when stored value is 'off'", () => {
      window.localStorage.setItem(STORAGE_KEY, "off");
      expect(readStoredHdMode("desktop")).toBe("off");
    });

    test("falls back to device default for invalid stored values", () => {
      window.localStorage.setItem(STORAGE_KEY, "invalid");
      expect(readStoredHdMode("mobile")).toBe("off");
      expect(readStoredHdMode("desktop")).toBe("on");
    });
  });

  describe("writeHdMode", () => {
    test("persists mode to localStorage", () => {
      writeHdMode("on");
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe("on");

      writeHdMode("off");
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe("off");
    });
  });

  // ── updateHdToggleButton ─────────────────────────────────────────────

  describe("updateHdToggleButton", () => {
    test("sets aria-pressed='true' and label when mode is 'on'", () => {
      const button = document.createElement("button");
      updateHdToggleButton(button, "on");

      expect(button.getAttribute("aria-pressed")).toBe("true");
      expect(button.getAttribute("aria-label")).toBe("Disable HD mode");
      expect(button.getAttribute("title")).toBe("Disable HD mode");
    });

    test("sets aria-pressed='false' and label when mode is 'off'", () => {
      const button = document.createElement("button");
      updateHdToggleButton(button, "off");

      expect(button.getAttribute("aria-pressed")).toBe("false");
      expect(button.getAttribute("aria-label")).toBe("Enable HD mode");
      expect(button.getAttribute("title")).toBe("Enable HD mode");
    });
  });

  // ── applyHdMode ─────────────────────────────────────────────────────

  describe("applyHdMode", () => {
    test("sets data-hd-mode attribute to 'on'", () => {
      const element = document.createElement("div");
      applyHdMode(element, "on");
      expect(element.dataset.hdMode).toBe("on");
    });

    test("sets data-hd-mode attribute to 'off'", () => {
      const element = document.createElement("div");
      applyHdMode(element, "off");
      expect(element.dataset.hdMode).toBe("off");
    });
  });
});
