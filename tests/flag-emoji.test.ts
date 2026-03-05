import { afterEach, describe, expect, test } from "vitest";

import {
  flagEmojiTesting,
  getFlagEmojiCountryCode,
  getFlagEmojiCountryName,
  getFlagEmojiSvgUrl,
  setFlagEmojiCdnBaseUrl,
} from "../src/flag-emoji.ts";

const DEFAULT_CDN_BASE_URL = "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg";

afterEach(() => {
  setFlagEmojiCdnBaseUrl(DEFAULT_CDN_BASE_URL);
});

describe("flag emoji helpers", () => {
  test("resolves country code and name for flag emojis", () => {
    expect(getFlagEmojiCountryCode("🇨🇦")).toBe("CA");
    expect(getFlagEmojiCountryName("🇨🇦")).toBe("Canada");
  });

  test("returns null for invalid flag emoji strings", () => {
    expect(getFlagEmojiCountryCode("A")).toBeNull();
    expect(getFlagEmojiCountryCode("🇨🇦🇺🇸")).toBeNull();
    expect(getFlagEmojiSvgUrl("🧠")).toBeNull();
  });

  test("returns country code when name is unknown", () => {
    expect(getFlagEmojiCountryName("🇺🇸")).toBe("US");
  });

  test("builds Twemoji CDN URL with configured base", () => {
    setFlagEmojiCdnBaseUrl("https://example.com/flags");

    expect(getFlagEmojiSvgUrl("🇨🇦")).toBe(
      "https://example.com/flags/1f1e8-1f1e6.svg",
    );
  });

  test("falls back to default base URL when provided base is blank", () => {
    setFlagEmojiCdnBaseUrl("   ");

    expect(getFlagEmojiSvgUrl("🇨🇦")).toBe(
      "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f1e8-1f1e6.svg",
    );
  });

  test("resolves multiple country codes from known countries", () => {
    expect(getFlagEmojiCountryCode("🇺🇸")).toBe("US");
    expect(getFlagEmojiCountryCode("🇵🇱")).toBe("PL");
    expect(getFlagEmojiCountryCode("🇯🇵")).toBe("JP");
    expect(getFlagEmojiCountryCode("🇩🇪")).toBe("DE");
    expect(getFlagEmojiCountryCode("🇬🇧")).toBe("GB"); // Unknown country code — should return "GB"
  });

  test("resolves country names for all known countries", () => {
    expect(getFlagEmojiCountryName("🇦🇷")).toBe("Argentina");
    expect(getFlagEmojiCountryName("🇦🇺")).toBe("Australia");
    expect(getFlagEmojiCountryName("🇧🇷")).toBe("Brazil");
    expect(getFlagEmojiCountryName("🇫🇷")).toBe("France");
    expect(getFlagEmojiCountryName("🇯🇵")).toBe("Japan");
  });

  test("handles mixed-length emoji strings correctly", () => {
    expect(getFlagEmojiCountryCode("")).toBeNull();
    expect(getFlagEmojiSvgUrl("")).toBeNull();
    expect(getFlagEmojiCountryName("🇨🇦🇺🇸🇬🇧")).toBeNull();
  });

  test("handles single regional indicator (incomplete pair)", () => {
    const singleIndicator = String.fromCodePoint(0x1F1E8); // Just the 'C' indicator
    expect(getFlagEmojiCountryCode(singleIndicator)).toBeNull();
    expect(getFlagEmojiSvgUrl(singleIndicator)).toBeNull();
    expect(getFlagEmojiCountryName(singleIndicator)).toBeNull();
  });

  test("handles non-regional-indicator characters", () => {
    expect(getFlagEmojiCountryCode("AB")).toBeNull();
    expect(getFlagEmojiCountryCode("🇨A")).toBeNull();
    expect(getFlagEmojiSvgUrl("🧠🎲")).toBeNull();
  });

  test("CDN URL generation for various valid country codes", () => {
    setFlagEmojiCdnBaseUrl("https://example.com/emojis");

    expect(getFlagEmojiSvgUrl("🇺🇸")).toBe("https://example.com/emojis/1f1fa-1f1f8.svg");
    expect(getFlagEmojiSvgUrl("🇬🇧")).toBe("https://example.com/emojis/1f1ec-1f1e7.svg");

    setFlagEmojiCdnBaseUrl(DEFAULT_CDN_BASE_URL);
  });

  test("setFlagEmojiCdnBaseUrl normalizes whitespace-only strings", () => {
    const urls = ["   ", "\t\t", "\n\n"];

    for (const url of urls) {
      setFlagEmojiCdnBaseUrl(url);
      // Should fall back to default
      expect(getFlagEmojiSvgUrl("🇨🇦")).toContain("cdn.jsdelivr.net");
    }

    setFlagEmojiCdnBaseUrl(DEFAULT_CDN_BASE_URL);
  });

  test("setFlagEmojiCdnBaseUrl persists custom base URL", () => {
    const customUrl = "https://custom.example.com/flags";
    setFlagEmojiCdnBaseUrl(customUrl);

    // Call twice to verify persistence
    expect(getFlagEmojiSvgUrl("🇨🇦")).toContain("custom.example.com");
    expect(getFlagEmojiSvgUrl("🇺🇸")).toContain("custom.example.com");

    setFlagEmojiCdnBaseUrl(DEFAULT_CDN_BASE_URL);
  });

  test("country names fallback to country code when name is unknown", () => {
    // Most country codes won't have names in FLAG_COUNTRY_NAMES
    const unknownFlag = String.fromCodePoint(0x1F1F9, 0x1F1F9); // 🇹🇹 Trinidad & Tobago
    const result = getFlagEmojiCountryName(unknownFlag);
    expect(result).toBe("TT"); // Falls back to code when not in known list
  });

  test("handles edge case: empty CDN URL string", () => {
    setFlagEmojiCdnBaseUrl("");
    expect(getFlagEmojiSvgUrl("🇨🇦")).toContain("cdn.jsdelivr.net");
    setFlagEmojiCdnBaseUrl(DEFAULT_CDN_BASE_URL);
  });

  test("flag helper internals handle empty and non-regional indicator characters", () => {
    expect(flagEmojiTesting.isRegionalIndicator("A")).toBe(false);
    expect(flagEmojiTesting.isRegionalIndicator("")).toBe(false);
    expect(flagEmojiTesting.getHexCodePoint("")).toBeNull();
    expect(flagEmojiTesting.getRegionalIndicatorLetter("")).toBeNull();
    expect(flagEmojiTesting.getRegionalIndicatorLetter("A")).toBeNull();
  });
});
