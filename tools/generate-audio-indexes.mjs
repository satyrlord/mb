import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = resolve(__filename, "..", "..");

const audioFormatsPath = join(ROOT, "config", "audio-formats.json");
let audioFormatsConfig;

try {
  audioFormatsConfig = JSON.parse(readFileSync(audioFormatsPath, "utf8"));
} catch (error) {
  console.error(
    `[MEMORYBLOX] Failed to read or parse ${audioFormatsPath}. ` +
    `Ensure the file exists and contains valid JSON.`,
    error,
  );
  process.exit(1);
}

const AUDIO_EXTENSIONS = new Set(audioFormatsConfig.extensions);

const getExtension = (fileName) => {
  const dotIndex = fileName.lastIndexOf(".");

  if (dotIndex <= 0 || dotIndex === fileName.length - 1) {
    return "";
  }

  return fileName.slice(dotIndex).toLowerCase();
};

const listAudioFiles = (directoryPath) => {
  return readdirSync(directoryPath)
    .filter((entry) => statSync(join(directoryPath, entry)).isFile())
    .filter((entry) => AUDIO_EXTENSIONS.has(getExtension(entry)))
    .sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }));
};

const writeIndexFile = (directoryName) => {
  const directoryPath = join(ROOT, directoryName);
  const audioFiles = listAudioFiles(directoryPath);
  const indexPath = join(directoryPath, "index.json");
  const payload = `${JSON.stringify(audioFiles, null, 2)}\n`;

  writeFileSync(indexPath, payload, "utf8");
  return { directoryName, count: audioFiles.length, indexPath };
};

const results = [
  writeIndexFile("music"),
  writeIndexFile("sound"),
];

for (const result of results) {
  console.log(`[MEMORYBLOX] Updated ${result.directoryName}/index.json with ${result.count} files.`);
}
