/**
 * @jest-environment jsdom
 *
 * Contract: watching the vault records when a tracked note's block disappears
 * (file deleted or block removed from a living file) so Sync can later decide
 * between resurrecting and forgetting it.
 */
import "obsidian-test-mocks/jest-setup";
import { App } from "obsidian-test-mocks/obsidian";
import { TFile } from "obsidian";
import type { Vault as ObsidianVault } from "obsidian";
import { watchNoteDeletions } from "src/services/vault/deletions";
import { syncedCleanRecord } from "src/services/notes/lifecycle";
import type { ISettings } from "src/conf/settings";
import { createSettings } from "../../helpers/settings";
import { required } from "../../helpers/required";

function noteBlock(front: string, id: number | null): string {
  const lines = [
    "```note-form",
    "{",
    `"front": "${front}",`,
    '"back": "A",',
    `"tags": ""${id === null ? "" : ","}`,
  ];
  if (id !== null) {
    lines.push(`"id": ${id}`);
  }
  lines.push("}", "```");
  return lines.join("\n");
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

interface Watched {
  readonly save: jest.Mock;
  readonly settings: ISettings;
  readonly vault: ObsidianVault;
}

async function watchWith(
  files: Record<string, string>,
  noteIds: number[],
): Promise<Watched> {
  const app = App.createConfigured__({ files });
  const vault = app.vault as unknown as ObsidianVault;
  const noteLifecycle: ISettings["noteLifecycle"] = {};
  for (const noteId of noteIds) {
    noteLifecycle[noteId] = syncedCleanRecord(100, "hash", 0);
  }
  const settings = createSettings({ noteLifecycle });
  const save = jest.fn();
  const watch = watchNoteDeletions(vault, settings, save);
  await watch.prime();
  return { save, settings, vault };
}

function fileAt(vault: ObsidianVault, path: string): TFile {
  const file = vault.getAbstractFileByPath(path);
  if (!(file instanceof TFile)) {
    throw new Error(`No file at ${path}`);
  }
  return file;
}

describe("watchNoteDeletions", () => {
  test("given a tracked note in a file when the file is deleted then its record is marked deleted", async () => {
    // given
    const path = "Languages/Q-101.md";
    const files = { [path]: `${noteBlock("Q", 101)}\n` };
    const { save, settings, vault } = await watchWith(files, [101]);

    // when
    await vault.delete(fileAt(vault, path));

    // then
    expect(settings.noteLifecycle[101]?.deletedAt).toBeGreaterThan(0);
    expect(save).toHaveBeenCalled();
  });

  test("given a tracked block removed from a living file when the file is modified then its record is marked deleted", async () => {
    // given
    const path = "Languages/Q-101.md";
    const files = { [path]: `${noteBlock("Q", 101)}\n` };
    const { settings, vault } = await watchWith(files, [101]);

    // when
    await vault.modify(fileAt(vault, path), "no block here\n");
    await flush();

    // then
    expect(settings.noteLifecycle[101]?.deletedAt).toBeGreaterThan(0);
  });

  test("given a tracked block still present when the file is modified then nothing is marked deleted", async () => {
    // given
    const path = "Languages/Q-101.md";
    const files = { [path]: `${noteBlock("Q", 101)}\n` };
    const { settings, vault } = await watchWith(files, [101]);

    // when
    await vault.modify(fileAt(vault, path), `${noteBlock("Q edited", 101)}\n`);
    await flush();

    // then
    expect(settings.noteLifecycle[101]?.deletedAt).toBeUndefined();
  });

  test("given a record already marked deleted when its file is deleted again then the first timestamp is kept", async () => {
    // given
    const path = "Languages/Q-101.md";
    const files = { [path]: `${noteBlock("Q", 101)}\n` };
    const { save, settings, vault } = await watchWith(files, [101]);
    settings.noteLifecycle[101] = {
      ...required(settings.noteLifecycle[101]),
      deletedAt: 50,
    };

    // when
    await vault.delete(fileAt(vault, path));

    // then
    expect(settings.noteLifecycle[101]?.deletedAt).toBe(50);
    expect(save).not.toHaveBeenCalled();
  });

  test("given a disposed watch when a file is deleted then nothing is marked deleted", async () => {
    // given
    const path = "Languages/Q-101.md";
    const files = { [path]: `${noteBlock("Q", 101)}\n` };
    const app = App.createConfigured__({ files });
    const vault = app.vault as unknown as ObsidianVault;
    const settings = createSettings({
      noteLifecycle: { 101: syncedCleanRecord(100, "hash", 0) },
    });
    const watch = watchNoteDeletions(vault, settings, jest.fn());
    await watch.prime();
    watch.dispose();

    // when
    await vault.delete(fileAt(vault, path));

    // then
    expect(settings.noteLifecycle[101]?.deletedAt).toBeUndefined();
  });
});
