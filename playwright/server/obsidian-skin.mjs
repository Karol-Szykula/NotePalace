import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { openAsar } from "./asar.mjs";

const assetRoots = ["public"];
const appCssEntry = "app.css";
const manifestFileName = "skin.json";
const versionEntry = "package.json";

function readObsidianVersion(asar) {
  try {
    return JSON.parse(asar.read(versionEntry).toString("utf8")).version;
  } catch {
    return "unknown";
  }
}

function writeFallbackAppCss(cacheDir, fallbackCss) {
  const appCssPath = path.join(cacheDir, appCssEntry);
  writeFileSync(appCssPath, readFileSync(fallbackCss));
  return { appCssPath, origin: "fallback" };
}

function writeObsidianSkin(cacheDir, source) {
  const asar = openAsar(source);
  const appCss = asar.read(appCssEntry);
  writeFileSync(path.join(cacheDir, appCssEntry), appCss);
  for (const root of assetRoots) {
    for (const file of asar.list(root)) {
      const target = path.join(cacheDir, file);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, asar.read(file));
    }
  }
  const manifest = {
    appCssSha256: createHash("sha256").update(appCss).digest("hex"),
    obsidianVersion: readObsidianVersion(asar),
    source,
  };
  writeFileSync(
    path.join(cacheDir, manifestFileName),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  return {
    appCssPath: path.join(cacheDir, appCssEntry),
    manifest,
    origin: "obsidian",
  };
}

export function materializeSkin({ cacheDir, candidates, fallbackCss }) {
  mkdirSync(cacheDir, { recursive: true });
  const source = candidates.find((candidate) => existsSync(candidate));
  if (source === undefined) {
    return writeFallbackAppCss(cacheDir, fallbackCss);
  }
  try {
    return writeObsidianSkin(cacheDir, source);
  } catch (error) {
    console.warn(
      `NotePalace gallery: ${source} is not a readable Obsidian archive, using the fallback theme.`,
      error,
    );
    return writeFallbackAppCss(cacheDir, fallbackCss);
  }
}
