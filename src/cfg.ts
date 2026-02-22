export const parseCfgLines = (content: string): Map<string, string> => {
  const values = new Map<string, string>();

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }

    const equalsIndex = trimmed.indexOf("=");

    if (equalsIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim();

    if (key.length === 0) {
      continue;
    }

    values.set(key, value);
  }

  return values;
};

export const parseCfgNumber = (value: string): number | null => {
  const parsed = Number.parseFloat(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
};

export const parseCfgInteger = (value: string): number | null => {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) ? parsed : null;
};

export const parseCfgBoolean = (value: string): boolean | null => {
  const normalized = value.trim().toLowerCase();

  if (normalized === "true") {
    return true;
  }

  if (normalized === "false") {
    return false;
  }

  return null;
};

export const loadCfgFile = async (path: string): Promise<Map<string, string> | null> => {
  try {
    const response = await window.fetch(path, { cache: "no-cache" });

    if (!response.ok) {
      return null;
    }

    try {
      // Separate response reading from config parsing errors. response.text() itself doesn't throw
      // parse errors—it merely reads the response body as a string. The actual parsing happens in
      // parseCfgLines, which may throw if the format is invalid. This nested try-catch lets us
      // distinguish network/response errors from configuration parsing errors.
      const content = await response.text();
      return parseCfgLines(content);
    } catch (parseError) {
      console.warn(`[MEMORYBLOX] Failed to parse config file:`, path, parseError);
      return null;
    }
  } catch (error) {
    // Network or fetch-level errors (typically TypeError from fetch() timeout/network failure)
    console.warn(`[MEMORYBLOX] Failed to fetch config file:`, path, error);
    return null;
  }
};
