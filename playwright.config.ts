import { defineConfig, devices } from "@playwright/test";

const galleryPort = 4271;
const galleryUrl = `http://127.0.0.1:${galleryPort}/`;

export default defineConfig({
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    },
  },
  projects: [
    {
      name: "components",
      testDir: "./playwright",
      testMatch: "**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: galleryUrl,
        deviceScaleFactor: 1,
        reuseContext: true,
        serviceWorkers: "block",
        viewport: { height: 900, width: 1200 },
      },
    },
  ],
  snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}{ext}",
  webServer: {
    command: `GALLERY_PORT=${galleryPort} node playwright/server/serve.mjs`,
    reuseExistingServer: !process.env["CI"],
    stderr: "pipe",
    stdout: "pipe",
    url: galleryUrl,
  },
});
