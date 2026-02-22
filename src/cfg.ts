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
