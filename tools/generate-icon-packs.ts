import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

interface CatalogPack {
  id: string;
  name: string;
  previewIcon: string;
  icons: string[];
}

interface SvgSourceConfig {
  id: string;
  /** Candidate selection priority. Lower number = higher priority. Defaults to source array index + 1. */
  priority?: number;
  metadataUrl: string;
  svgBaseUrl: string;
  outputSvgDir: string;
  license: string;
  licenseUrl: string;
  author: string;
}

interface GeneratorPackConfig {
  id: string;
  keywords: string[];
  sourceIds?: string[];
}

interface IconPackGeneratorConfig {
  catalogPath: string;
  outputPath: string;
  outputAttributionCsvPath: string;
  outputAssetRegistryPath: string;
  iconsPerPack: number;
  emojiRatio: number;
  svgRatio: number;
  autoDownloadSvg: boolean;
  packs: GeneratorPackConfig[];
  sources: SvgSourceConfig[];
}

interface OpenMojiMetadataRow {
  hexcode?: string;
  annotation?: string;
  tags?: string[];
  group?: string;
  subgroups?: string[];
}

interface WebSvgCandidate {
  token: string;
  code: string;
  label: string;
  score: number;
  sourceId: string;
  sourcePriority: number;
  sourceUrl: string;
  outputSvgPath: string;
  license: string;
  licenseUrl: string;
  author: string;
}

interface GeneratedPack {
  id: string;
  name: string;
  previewIcon: string;
  icons: string[];
  emojiCount: number;
  svgCount: number;
}

interface CliOptions {
  configPath: string;
  seed: number;
}

const DEFAULT_CONFIG_PATH = "config/icon-pack-generator.json";

const parseCliOptions = (): CliOptions => {
  const args = process.argv.slice(2);
  let configPath = DEFAULT_CONFIG_PATH;
  let seed = Date.now();

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--config") {
      const value = args[index + 1];
      if (value !== undefined) {
        configPath = value;
        index += 1;
      }
      continue;
    }

    if (arg === "--seed") {
      const value = Number.parseInt(args[index + 1] ?? "", 10);
      if (Number.isFinite(value)) {
        seed = value;
        index += 1;
      }
    }
  }

  return { configPath, seed };
};

const createSeededRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;

  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};

const shuffleWithRandom = <T>(items: readonly T[], random: () => number): T[] => {
  const output = [...items];

  for (let index = output.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(random() * (index + 1));
    [output[index], output[nextIndex]] = [output[nextIndex] as T, output[index] as T];
  }

  return output;
};

const ensureDirectoryForFile = async (filePath: string): Promise<void> => {
  await mkdir(dirname(filePath), { recursive: true });
};

const readJsonFile = async <T>(filePath: string): Promise<T> => {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
};

const readConfig = async (configPath: string): Promise<IconPackGeneratorConfig> => {
  const config = await readJsonFile<IconPackGeneratorConfig>(configPath);

  if (Math.abs((config.emojiRatio + config.svgRatio) - 1) > 0.0001) {
    throw new Error("[MEMORYBLOX] icon-pack-generator: emojiRatio + svgRatio must equal 1.");
  }

  if (config.iconsPerPack <= 0) {
    throw new Error("[MEMORYBLOX] icon-pack-generator: iconsPerPack must be > 0.");
  }

  return config;
};

const normalizeSearchText = (value: string): string => {
  return value.trim().toLowerCase();
};

const buildCandidateScore = (text: string, keywords: readonly string[]): number => {
  if (keywords.length === 0) {
    return 0;
  }

  let score = 0;

  for (const keyword of keywords) {
    const normalizedKeyword = normalizeSearchText(keyword);
    if (normalizedKeyword.length === 0) {
      continue;
    }

    if (text.includes(normalizedKeyword)) {
      score += 1;
    }
  }

  return score;
};

const fetchMetadata = async (
  url: string,
  cache: Map<string, OpenMojiMetadataRow[]>,
): Promise<OpenMojiMetadataRow[]> => {
  const cached = cache.get(url);

  if (cached !== undefined) {
    return cached;
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `[MEMORYBLOX] icon-pack-generator: failed to fetch metadata from ${url}`,
    );
  }

  const metadata = await response.json() as OpenMojiMetadataRow[];
  cache.set(url, metadata);

  return metadata;
};

const buildSourceCandidates = (
  source: SvgSourceConfig,
  sourcePriority: number,
  metadata: OpenMojiMetadataRow[],
  keywords: readonly string[],
): WebSvgCandidate[] => {
  const candidates: WebSvgCandidate[] = [];

  for (const row of metadata) {
    const code = row.hexcode?.trim();

    if (code === undefined || code.length === 0) {
      continue;
    }

    const searchText = normalizeSearchText([
      row.annotation ?? "",
      ...(row.tags ?? []),
      row.group ?? "",
      ...(row.subgroups ?? []),
    ].join(" "));
    const score = buildCandidateScore(searchText, keywords);
    const sourceUrl = `${source.svgBaseUrl.replace(/\/$/u, "")}/${code}.svg`;
    const outputSvgPath = resolve(source.outputSvgDir, `${code}.svg`);

    candidates.push({
      token: `asset:${source.id}:${code}`,
      code,
      label: row.annotation?.trim() || code,
      score,
      sourceId: source.id,
      sourcePriority,
      sourceUrl,
      outputSvgPath,
      license: source.license,
      licenseUrl: source.licenseUrl,
      author: source.author,
    });
  }

  return candidates;
};

const pickSvgCandidates = (
  candidates: readonly WebSvgCandidate[],
  desiredCount: number,
  usedTokens: Set<string>,
  random: () => number,
): WebSvgCandidate[] => {
  // Sort by score descending; for equal-score candidates, prefer higher-priority sources
  // (lower priority number). This implements the source priority/fallback rule: the
  // generator naturally fills quota from primary sources and only draws from lower-priority
  // sources when the primary has insufficient keyword-matching candidates.
  const scored = candidates
    .filter((candidate) => !usedTokens.has(candidate.token))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.sourcePriority - b.sourcePriority;
    });
  const withKeywordMatch = scored.filter((candidate) => candidate.score > 0);
  const noKeywordMatch = scored.filter((candidate) => candidate.score === 0);
  const selected: WebSvgCandidate[] = [];

  for (const candidate of withKeywordMatch) {
    if (selected.length >= desiredCount) {
      break;
    }
    selected.push(candidate);
  }

  if (selected.length < desiredCount) {
    const needed = desiredCount - selected.length;
    const shuffledFallback = shuffleWithRandom(noKeywordMatch, random);
    selected.push(...shuffledFallback.slice(0, needed));
  }

  for (const candidate of selected) {
    usedTokens.add(candidate.token);
  }

  return selected;
};

const pickEmojiIcons = (
  pack: CatalogPack,
  allEmojiIcons: readonly string[],
  desiredCount: number,
  random: () => number,
): string[] => {
  const packEmojiIcons = pack.icons.filter((icon) => !icon.startsWith("asset:"));
  const shuffledPackEmoji = shuffleWithRandom(packEmojiIcons, random);
  const selected = shuffledPackEmoji.slice(0, desiredCount);

  if (selected.length >= desiredCount) {
    return selected;
  }

  const existing = new Set(selected);
  const fallback = shuffleWithRandom(
    allEmojiIcons.filter((icon) => !existing.has(icon)),
    random,
  );

  selected.push(...fallback.slice(0, desiredCount - selected.length));

  return selected;
};

const downloadSvgIcons = async (candidates: readonly WebSvgCandidate[]): Promise<void> => {
  for (const candidate of candidates) {
    await ensureDirectoryForFile(candidate.outputSvgPath);
    const response = await fetch(candidate.sourceUrl);

    if (!response.ok) {
      throw new Error(
        `[MEMORYBLOX] icon-pack-generator: failed to download ${candidate.sourceUrl}`,
      );
    }

    const svgContent = await response.text();
    await writeFile(candidate.outputSvgPath, svgContent, "utf8");
  }
};

const toAttributionCsv = (candidates: readonly WebSvgCandidate[]): string => {
  const lines = [
    "file_path,title,author,source_url,license,license_url,modifications,notes",
  ];

  for (const candidate of candidates) {
    const relativePath = candidate.outputSvgPath.replace(/\\/gu, "/").replace(/^.*?\/icon\//u, "icon/");
    const row = [
      relativePath,
      candidate.label,
      candidate.author,
      candidate.sourceUrl,
      candidate.license,
      candidate.licenseUrl,
      "none",
      "Generated by tools/generate-icon-packs.ts",
    ].map((cell) => cell.includes(",") ? `"${cell.replace(/"/gu, '""')}"` : cell).join(",");
    lines.push(row);
  }

  return `${lines.join("\n")}\n`;
};

const run = async (): Promise<void> => {
  const cliOptions = parseCliOptions();
  const random = createSeededRandom(cliOptions.seed);
  const configPath = resolve(cliOptions.configPath);
  const config = await readConfig(configPath);
  const catalog = await readJsonFile<CatalogPack[]>(resolve(config.catalogPath));
  const catalogById = new Map(catalog.map((pack) => [pack.id, pack]));
  const allEmojiIcons = catalog.flatMap((pack) => pack.icons).filter((icon) => !icon.startsWith("asset:"));

  // Assign explicit priorities from config (or fall back to array index + 1).
  // Sources are indexed so lower-priority sources fill in when higher-priority
  // ones don't cover the full desired SVG count for a pack.
  const sourcesWithPriority = config.sources.map((source, index) => ({
    ...source,
    resolvedPriority: source.priority ?? (index + 1),
  }));
  const sourceMap = new Map(sourcesWithPriority.map((source) => [source.id, source]));

  // Metadata cache: keyed by URL so sources sharing the same metadata endpoint
  // (e.g. openmoji color vs. black both use the same openmoji.json) are only
  // fetched once per run.
  const metadataCache = new Map<string, OpenMojiMetadataRow[]>();

  const generatedPacks: GeneratedPack[] = [];
  const selectedSvgCandidates: WebSvgCandidate[] = [];
  const usedSvgTokens = new Set<string>();
  const desiredSvgCount = Math.round(config.iconsPerPack * config.svgRatio);
  const desiredEmojiCount = config.iconsPerPack - desiredSvgCount;

  for (const targetPack of config.packs) {
    const catalogPack = catalogById.get(targetPack.id);

    if (catalogPack === undefined) {
      throw new Error(
        `[MEMORYBLOX] icon-pack-generator: pack '${targetPack.id}' not found in ${config.catalogPath}.`,
      );
    }

    const sourceIds = targetPack.sourceIds ?? sourcesWithPriority.map((source) => source.id);
    const sourceCandidates: WebSvgCandidate[] = [];

    for (const sourceId of sourceIds) {
      const source = sourceMap.get(sourceId);

      if (source === undefined) {
        throw new Error(`[MEMORYBLOX] icon-pack-generator: unknown source '${sourceId}'.`);
      }

      const metadata = await fetchMetadata(source.metadataUrl, metadataCache);
      const candidates = buildSourceCandidates(source, source.resolvedPriority, metadata, targetPack.keywords);
      sourceCandidates.push(...candidates);
    }

    const pickedSvg = pickSvgCandidates(sourceCandidates, desiredSvgCount, usedSvgTokens, random);
    const pickedEmoji = pickEmojiIcons(catalogPack, allEmojiIcons, desiredEmojiCount, random);
    const icons = shuffleWithRandom(
      [...pickedEmoji, ...pickedSvg.map((candidate) => candidate.token)],
      random,
    );

    generatedPacks.push({
      id: catalogPack.id,
      name: catalogPack.name,
      previewIcon: catalogPack.previewIcon,
      icons,
      emojiCount: pickedEmoji.length,
      svgCount: pickedSvg.length,
    });
    selectedSvgCandidates.push(...pickedSvg);
  }

  if (config.autoDownloadSvg) {
    await downloadSvgIcons(selectedSvgCandidates);
  }

  const generatedAssetRegistry = Object.fromEntries(
    selectedSvgCandidates.map((candidate) => [candidate.token, {
      src: candidate.outputSvgPath.replace(/\\/gu, "/").replace(/^.*?\//u, ""),
      label: candidate.label,
    }]),
  );

  await ensureDirectoryForFile(resolve(config.outputPath));
  await writeFile(
    resolve(config.outputPath),
    `${JSON.stringify({
      generatedAt: new Date().toISOString(),
      seed: cliOptions.seed,
      emojiRatio: config.emojiRatio,
      svgRatio: config.svgRatio,
      iconsPerPack: config.iconsPerPack,
      packs: generatedPacks,
    }, null, 2)}\n`,
    "utf8",
  );

  await ensureDirectoryForFile(resolve(config.outputAttributionCsvPath));
  await writeFile(
    resolve(config.outputAttributionCsvPath),
    toAttributionCsv(selectedSvgCandidates),
    "utf8",
  );

  await ensureDirectoryForFile(resolve(config.outputAssetRegistryPath));
  await writeFile(
    resolve(config.outputAssetRegistryPath),
    `${JSON.stringify(generatedAssetRegistry, null, 2)}\n`,
    "utf8",
  );

  console.log(
    `[MEMORYBLOX] Generated ${generatedPacks.length} packs with ${(config.emojiRatio * 100).toFixed(0)}% emoji / ${(config.svgRatio * 100).toFixed(0)}% SVG ratio.`,
  );
  console.log(`[MEMORYBLOX] Pack output: ${resolve(config.outputPath)}`);
  console.log(`[MEMORYBLOX] Attribution output: ${resolve(config.outputAttributionCsvPath)}`);
  console.log(`[MEMORYBLOX] Asset registry output: ${resolve(config.outputAssetRegistryPath)}`);
};

void run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
