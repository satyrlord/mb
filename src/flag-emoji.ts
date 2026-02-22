const REGIONAL_INDICATOR_START = 0x1F1E6;
const REGIONAL_INDICATOR_END = 0x1F1FF;
const ASCII_A_CODE = 65;
// Default pinned URL keeps deterministic rendering across environments; the
// runtime config can override this via `flags.twemojiCdnBaseUrl`.
const DEFAULT_TWEMOJI_CDN_BASE_URL = "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg";

interface FlagEmojiRuntimeConfig {
  twemojiCdnBaseUrl: string;
}

const runtimeConfig: FlagEmojiRuntimeConfig = {
  twemojiCdnBaseUrl: DEFAULT_TWEMOJI_CDN_BASE_URL,
};

const FLAG_COUNTRY_NAMES: Readonly<Record<string, string>> = {
  AR: "Argentina",
  AU: "Australia",
  BE: "Belgium",
  BR: "Brazil",
  CA: "Canada",
  CH: "Switzerland",
  CL: "Chile",
  CN: "China",
  CO: "Colombia",
  DE: "Germany",
  DK: "Denmark",
  EG: "Egypt",
  ES: "Spain",
  FI: "Finland",
  FR: "France",
  GR: "Greece",
  ID: "Indonesia",
  IE: "Ireland",
  IN: "India",
  IT: "Italy",
  JP: "Japan",
  KR: "South Korea",
  MN: "Mongolia",
  MX: "Mexico",
  NL: "Netherlands",
  NO: "Norway",
  PL: "Poland",
  PT: "Portugal",
  RO: "Romania",
  SE: "Sweden",
};

const isRegionalIndicator = (character: string): boolean => {
  const codePoint = character.codePointAt(0);

  if (codePoint === undefined) {
    return false;
  }

  return codePoint >= REGIONAL_INDICATOR_START && codePoint <= REGIONAL_INDICATOR_END;
};

const getHexCodePoint = (character: string): string | null => {
  const codePoint = character.codePointAt(0);

  if (codePoint === undefined) {
    return null;
  }

  return codePoint.toString(16);
};

const getRegionalIndicatorLetter = (character: string): string | null => {
  const codePoint = character.codePointAt(0);

  if (codePoint === undefined || !isRegionalIndicator(character)) {
    return null;
  }

  const asciiCode = ASCII_A_CODE + (codePoint - REGIONAL_INDICATOR_START);
  return String.fromCharCode(asciiCode);
};

export const getFlagEmojiCountryCode = (icon: string): string | null => {
  const symbols = [...icon];

  if (symbols.length !== 2 || !symbols.every(isRegionalIndicator)) {
    return null;
  }

  const letters = symbols
    .map(getRegionalIndicatorLetter)
    .filter((value): value is string => value !== null);

  if (letters.length !== 2) {
    return null;
  }

  return letters.join("");
};

export const getFlagEmojiCountryName = (icon: string): string | null => {
  const countryCode = getFlagEmojiCountryCode(icon);

  if (countryCode === null) {
    return null;
  }

  return FLAG_COUNTRY_NAMES[countryCode] ?? countryCode;
};

/**
 * Generates a Twemoji CDN SVG URL for a flag emoji.
 *
 * The URL is built using the configured `twemojiCdnBaseUrl` and the
 * hexadecimal Unicode code points of the two regional indicator symbols
 * that make up the flag emoji, joined by a hyphen:
 *
 *   `${twemojiCdnBaseUrl}/{hexCodePoint1}-{hexCodePoint2}.svg`
 *
 * If the provided `icon` is not a valid flag emoji composed of exactly two
 * regional indicator symbols, this function returns `null`.
 *
 * @param icon - A single flag emoji character (two regional indicator symbols).
 * @returns The Twemoji CDN SVG URL for the flag emoji, or `null` for non-flag emoji.
 * @see setFlagEmojiCdnBaseUrl - Configures the base URL used when building the returned path.
 */
export const getFlagEmojiSvgUrl = (icon: string): string | null => {
  const symbols = [...icon];

  if (symbols.length !== 2 || !symbols.every(isRegionalIndicator)) {
    return null;
  }

  const codePoints = symbols
    .map(getHexCodePoint)
    .filter((value): value is string => value !== null);

  if (codePoints.length !== 2) {
    return null;
  }

  return `${runtimeConfig.twemojiCdnBaseUrl}/${codePoints.join("-")}.svg`;
};

export const setFlagEmojiCdnBaseUrl = (url: string): void => {
  const trimmed = url.trim();
  runtimeConfig.twemojiCdnBaseUrl = trimmed.length > 0
    ? trimmed
    : DEFAULT_TWEMOJI_CDN_BASE_URL;
};
