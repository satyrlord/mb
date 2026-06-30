const AUDIO_FILE_PATTERN = /\.(mp3|wav|ogg|m4a)$/iu;

/**
 * Extracts audio filenames from an HTML directory listing.
 *
 * Trust boundary note: `html` may originate from a dev-server directory
 * listing. Only filenames matching `AUDIO_FILE_PATTERN` are kept; results
 * are used solely as fetch URLs for audio assets — never injected as markup.
 */
export const parseDirectoryListingForAudioFiles = (html: string): string[] => {
  const hrefPattern = /href=["']([^"']+)["']/giu;
  const discovered = new Set<string>();
  let match = hrefPattern.exec(html);

  while (match !== null) {
    const href = decodeURIComponent(match[1]);
    const pathSegments = href.split("/").filter((value) => value.length > 0);
    const fileName = pathSegments[pathSegments.length - 1];

    if (fileName !== undefined && AUDIO_FILE_PATTERN.test(fileName)) {
      discovered.add(fileName);
    }

    match = hrefPattern.exec(html);
  }

  return Array.from(discovered);
};

const tryLoadFileListFromJson = async (directory: string): Promise<string[] | null> => {
  const response = await fetch(`${directory}/index.json`, { cache: "no-store" });

  if (!response.ok) {
    return null;
  }

  const data: unknown = await response.json();

  if (Array.isArray(data)) {
    return data.filter((value): value is string => typeof value === "string");
  }

  if (
    typeof data === "object"
    && data !== null
    && "files" in data
    && Array.isArray((data as { files: unknown }).files)
  ) {
    return (data as { files: unknown[] }).files.filter((value): value is string => typeof value === "string");
  }

  return null;
};

const tryLoadFileListFromAssetIndexEndpoint = async (directory: string): Promise<string[] | null> => {
  const response = await fetch(`/__asset-index?dir=${encodeURIComponent(directory.replace(/^\//u, ""))}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const data: unknown = await response.json();

  if (
    typeof data === "object"
    && data !== null
    && "files" in data
    && Array.isArray((data as { files: unknown }).files)
  ) {
    return (data as { files: unknown[] }).files.filter((value): value is string => typeof value === "string");
  }

  return null;
};

const tryLoadFileListFromDirectoryHtml = async (directory: string): Promise<string[] | null> => {
  const response = await fetch(`${directory}/`, { cache: "no-store" });

  if (!response.ok) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("text/html")) {
    return null;
  }

  const html = await response.text();
  return parseDirectoryListingForAudioFiles(html);
};

/**
 * Discovers audio files in a directory using a 3-strategy fallback chain:
 * 1. JSON index file (`<directory>/index.json`)
 * 2. Asset-index endpoint (`/__asset-index?dir=...`)
 * 3. HTML directory listing (`<directory>/`)
 *
 * Returns deduplicated filenames matching common audio extensions.
 */
export const discoverAudioFilesInDirectory = async (directory: string): Promise<string[]> => {
  const methods = [
    { label: "JSON index", load: () => tryLoadFileListFromJson(directory) },
    { label: "asset-index endpoint", load: () => tryLoadFileListFromAssetIndexEndpoint(directory) },
    { label: "HTML directory listing", load: () => tryLoadFileListFromDirectoryHtml(directory) },
  ];

  for (const method of methods) {
    try {
      const result = await method.load();

      if (result === null) {
        continue;
      }

      const filtered = result
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
        .filter((value) => AUDIO_FILE_PATTERN.test(value));

      if (filtered.length > 0) {
        console.info(`[MEMORYBLOX] ${directory}: discovered ${filtered.length} audio file(s) via ${method.label}.`);
        return Array.from(new Set(filtered));
      }
    } catch {
      continue;
    }
  }

  return [];
};

export const buildAbsoluteAssetUrl = (directory: string, fileName: string): string => {
  const normalizedDirectory = directory.endsWith("/")
    ? directory.slice(0, -1)
    : directory;
  return `${normalizedDirectory}/${fileName}`;
};

// Re-export for testing — these are the file-discovery internals that were
// previously exposed via soundManagerTesting and are genuinely useful to
// test in isolation since they involve network fallback strategies.
export const audioFileDiscoveryTesting = {
  tryLoadFileListFromJson,
  tryLoadFileListFromAssetIndexEndpoint,
  tryLoadFileListFromDirectoryHtml,
};
