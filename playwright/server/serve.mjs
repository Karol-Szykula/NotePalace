import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import { obsidianStubPlugin } from "./esbuild-plugins.mjs";
import { materializeSkin } from "./obsidian-skin.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const galleryDir = path.resolve(here, "..", "gallery");
const repoRoot = path.resolve(here, "..", "..");
const skinCacheDir = path.join(repoRoot, "playwright", ".cache");
const port = Number(process.env.GALLERY_PORT ?? 4271);

const obsidianAsarCandidates = [
  process.env.OBSIDIAN_ASAR,
  "/usr/lib/obsidian/obsidian.asar",
  "/usr/share/obsidian/resources/obsidian.asar",
  "/Applications/Obsidian.app/Contents/Resources/obsidian.asar",
].filter((candidate) => typeof candidate === "string");

const skin = materializeSkin({
  cacheDir: skinCacheDir,
  candidates: obsidianAsarCandidates,
  fallbackCss: path.join(galleryDir, "fallback-theme.css"),
});

if (skin.origin === "obsidian") {
  console.log(
    `NotePalace gallery: theme from Obsidian ${skin.manifest.obsidianVersion}.`,
  );
  console.log(
    `NotePalace gallery: app.css sha256 ${skin.manifest.appCssSha256}.`,
  );
} else {
  console.warn(
    "NotePalace gallery: no Obsidian install found, using the fallback theme.",
  );
}

const context = await esbuild.context({
  alias: {
    "@shared": path.join(repoRoot, "src/gui/note-transfer-wizard/shared"),
    src: path.join(repoRoot, "src"),
  },
  assetNames: "assets/[name]-[hash]",
  bundle: true,
  define: { "process.env.NODE_ENV": '"production"' },
  entryPoints: {
    app: skin.appCssPath,
    gallery: path.join(galleryDir, "gallery.css"),
    main: path.join(galleryDir, "main.tsx"),
    styles: path.join(repoRoot, "styles.css"),
  },
  format: "esm",
  jsx: "automatic",
  loader: {
    ".svg": "file",
    ".ttf": "file",
    ".woff": "file",
    ".woff2": "file",
  },
  logLevel: "info",
  outdir: path.join(galleryDir, "build"),
  platform: "browser",
  plugins: [obsidianStubPlugin],
  target: "es2022",
});

await context.watch();
const served = await context.serve({ port, servedir: galleryDir });
console.log(`NotePalace gallery: http://127.0.0.1:${served.port}/`);
