# Build and release guide

This plugin can be installed manually in Obsidian by building the plugin bundle and copying the release files into a vault plugin folder.

## Requirements

- Node.js
- pnpm
- Anki with AnkiConnect installed if you want to sync cards

## Build from source

Install dependencies, including development dependencies:

```bash
pnpm install
```

Build the Obsidian plugin bundle:

```bash
pnpm run build
```

This creates `main.js` in the repository root. The plugin manifest is `manifest.json`.

## Two entries, two bundles

| Entry | Built by | Output | Contains the dev commands |
| --- | --- | --- | --- |
| `main.ts` | `pnpm run build` (esbuild) | `main.js` in the repository root, released | no |
| `main.dev.ts` | `pnpm run dev` (rollup watcher) | `docs/test-vault/.obsidian/plugins/notepalace/main.js` | yes |

`main.dev.ts` is a subclass of the plugin class that registers the developer
commands (`Dev: reset plugin data`) after the normal ones. The release build
starts from `main.ts`, which never imports that module, so the dev commands are
not in the release bundle at all - not disabled, absent. Check it after a build:

```bash
pnpm run build && grep -c "reset plugin data" main.js
```

Zero means the dev code stayed out of the release bundle. The dev bundle always
keeps the file name `main.js`, because that is the name Obsidian loads, even
though the entry is `main.dev.ts`.

## Release

Releases are built by the GitHub Actions workflow in
`.github/workflows/releases.yml`. `main` on GitHub mirrors `develop`, so a
release is a normal fast-forward: tag the commit that carries the version bump
in `manifest.json` and push it, then publish that same commit to `main`:

```bash
git tag 1.0.0
git push github develop:main 1.0.0
```

The workflow runs `pnpm run check`, builds `main.js`, attests the build and
creates a GitHub release with `main.js`, `manifest.json` and `styles.css` as
assets. `versions.json` maps every release to the `minAppVersion` it needs.

## Manual install in Obsidian

Create this folder inside your vault:

```text
<your-vault>/.obsidian/plugins/notepalace/
```

Copy the release files into it:

```text
<your-vault>/.obsidian/plugins/notepalace/main.js
<your-vault>/.obsidian/plugins/notepalace/manifest.json
<your-vault>/.obsidian/plugins/notepalace/styles.css
```

Then restart Obsidian and enable **NotePalace** under:

```text
Settings -> Community plugins
```

Use placeholder paths like `<your-vault>` in documentation and release notes. Do not publish local absolute paths from your machine.
