/**
 * @jest-environment jsdom
 *
 * App.createConfigured__ touches DOM globals. The round trip drives the real
 * export, import and sync against one fake Anki, so a block moved across the
 * commands can never become a second file or a second Anki note.
 */
import "obsidian-test-mocks/jest-setup";
import { App, TFile } from "obsidian-test-mocks/obsidian";
import type { Vault as ObsidianVault } from "obsidian";
import { Anki } from "src/services/anki/anki";
import { executeExport } from "src/services/commands/export-deck";
import {
  executeImport,
  type ImportExecutionReport,
} from "src/services/commands/import-deck";
import { executeSync } from "src/services/commands/sync";
import { syncedCleanRecord } from "src/services/notes/lifecycle";
import { collectVaultNoteIndex } from "src/services/vault/vault";
import { createSettings } from "../../../helpers/settings";
import type { ISettings } from "src/conf/settings";
import { AnkiConnectMock } from "../../../mocks/anki-connect";
import { ankiResponder } from "../../../helpers/anki-responder";
import { jsonEngine } from "../../../helpers/json-engine";

AnkiConnectMock.install();

beforeEach(() => {
  AnkiConnectMock.reset();
});

const responder = ankiResponder();
const ankiState = responder.state;

function formBlock(front: string, back: string, id: number | null): string {
  const lines = [
    "```note-form",
    "{",
    `"front": "${front}",`,
    `"back": "${back}",`,
    '"tags": ""',
  ];
  if (id !== null) {
    lines[lines.length - 1] = '"tags": "",';
    lines.push(`"id": ${id}`);
  }
  lines.push("}", "```");
  return lines.join("\n");
}

function vaultWith(files: Record<string, string>): ObsidianVault {
  const app = App.createConfigured__({ files });
  return app.vault as unknown as ObsidianVault;
}

async function readPath(vault: ObsidianVault, path: string): Promise<string> {
  const file = vault.getAbstractFileByPath(path);
  if (!(file instanceof TFile)) {
    throw new Error(`${path} not found in mock vault`);
  }
  return await vault.read(file);
}

function countIdLines(content: string): number {
  return content.match(/"id":/g)?.length ?? 0;
}

async function exportOneNote(
  vault: ObsidianVault,
  settings: ISettings,
): Promise<number> {
  const report = await executeExport(
    new Anki(),
    vault,
    settings,
    { ignoredDirectories: "", previewStatuses: undefined },
    jsonEngine,
  );
  if (report.created !== 1) {
    throw new Error(`Export created ${report.created} notes, expected 1`);
  }
  return 1_500_000;
}

async function importDeck(
  vault: ObsidianVault,
  settings: ISettings,
  decisions: Record<number, boolean>,
  ankiWinsNoteIds: number[] = [],
  deckName = "Languages",
): Promise<ImportExecutionReport> {
  const vaultNoteIndex = await collectVaultNoteIndex(vault);
  return await executeImport(
    new Anki(),
    vault,
    {
      ankiWinsNoteIds,
      deckName,
      decisions,
      fieldMappings: { Basic: { Back: "Back", Front: "Front" } },
      noteLifecycle: settings.noteLifecycle,
      notes: ankiState.notes,
      targetFolder: "",
      vaultNoteIndex,
      previewStatuses: undefined,
    },
    jsonEngine,
  );
}

function completeImportState(
  settings: ISettings,
  deckName: string,
  report: ImportExecutionReport,
): void {
  for (const [id, mod] of Object.entries(report.syncedNotes)) {
    const noteId = Number(id);
    settings.noteLifecycle[noteId] = syncedCleanRecord(
      mod,
      report.syncedHashes[noteId] ?? "",
      0,
    );
  }
  settings.deckImportSnapshots = {
    ...settings.deckImportSnapshots,
    [deckName]: {
      deckName,
      fieldMappings: { Basic: { Back: "Back", Front: "Front" } },
      importedAt: 0,
    },
  };
}

describe("export then import round trip", () => {
  test("given a note exported to Anki when the deck is imported again with the default decisions then nothing is written", async () => {
    // given
    responder.respondWith();
    const vault = vaultWith({
      "Languages/What-is-2-2.md": `${formBlock("What is 2+2?", "4", null)}\n`,
    });
    const settings = createSettings();
    await exportOneNote(vault, settings);

    // when
    await importDeck(vault, settings, {});

    // then
    expect(vault.getMarkdownFiles()).toHaveLength(1);
    expect(ankiState.notes).toHaveLength(1);
    expect(
      countIdLines(await readPath(vault, "Languages/What-is-2-2.md")),
    ).toBe(1);
  });

  test("given a note exported to Anki when the deck is re-imported with Anki wins then the same file is rewritten and Anki gets no second note", async () => {
    // given
    responder.respondWith();
    const vault = vaultWith({
      "Languages/What-is-2-2.md": `${formBlock("What is 2+2?", "4", null)}\n`,
    });
    const settings = createSettings();
    const noteId = await exportOneNote(vault, settings);
    const createRequestsBeforeImport = ankiState.requests.filter(
      (request) => request.action === "addNotes",
    ).length;

    // when
    await importDeck(vault, settings, { [noteId]: true }, [noteId]);

    // then
    expect(vault.getMarkdownFiles()).toHaveLength(1);
    const content = await readPath(vault, `Languages/What-is-2-2-${noteId}.md`);
    expect(content).toContain("What is 2+2?");
    expect(countIdLines(content)).toBe(1);
    expect(ankiState.notes).toHaveLength(1);
    expect(
      ankiState.requests.filter((request) => request.action === "addNotes"),
    ).toHaveLength(createRequestsBeforeImport);
  });

  test("given a note exported from a nested folder when its deck is imported into an empty vault then the subdeck structure is preserved", async () => {
    // given
    responder.respondWith();
    const vault = vaultWith({
      "Languages/Russian/Privet.md": `${formBlock("Privet", "Hello", null)}\n`,
    });
    const settings = createSettings({});
    const noteId = await exportOneNote(vault, settings);
    const emptyVault = vaultWith({});

    // when
    await importDeck(
      emptyVault,
      settings,
      { [noteId]: true },
      [noteId],
      "Languages::Russian",
    );

    // then
    expect(emptyVault.getMarkdownFiles().map((file) => file.path)).toEqual([
      `Languages/Russian/Privet-${noteId}.md`,
    ]);
  });

  test("given a note exported to Anki when the export runs again then it is a no-op", async () => {
    // given
    responder.respondWith();
    const vault = vaultWith({
      "Languages/What-is-2-2.md": `${formBlock("What is 2+2?", "4", null)}\n`,
    });
    const settings = createSettings();
    await exportOneNote(vault, settings);

    // when
    const report = await executeExport(
      new Anki(),
      vault,
      settings,
      { ignoredDirectories: "", previewStatuses: undefined },
      jsonEngine,
    );

    // then
    expect(report.created).toBe(0);
    expect(ankiState.notes).toHaveLength(1);
    expect(vault.getMarkdownFiles()).toHaveLength(1);
  });

  test("given a forced import when the deck is imported again then the file and note stay put", async () => {
    // given
    responder.respondWith();
    const vault = vaultWith({
      "Languages/What-is-2-2.md": `${formBlock("What is 2+2?", "4", null)}\n`,
    });
    const settings = createSettings();
    const noteId = await exportOneNote(vault, settings);
    await importDeck(vault, settings, { [noteId]: true }, [noteId]);
    const path = `Languages/What-is-2-2-${noteId}.md`;
    const afterForce = await readPath(vault, path);

    // when
    await importDeck(vault, settings, { [noteId]: true });

    // then
    expect(vault.getMarkdownFiles()).toHaveLength(1);
    expect(ankiState.notes).toHaveLength(1);
    expect(await readPath(vault, path)).toBe(afterForce);
  });

  test("given a note exported then imported when synced then one copy remains everywhere", async () => {
    // given
    responder.respondWith();
    const vault = vaultWith({
      "Languages/What-is-2-2.md": `${formBlock("What is 2+2?", "4", null)}\n`,
    });
    const settings = createSettings();
    const noteId = await exportOneNote(vault, settings);
    const report = await importDeck(vault, settings, { [noteId]: true }, [
      noteId,
    ]);
    completeImportState(settings, "Languages", report);

    // when
    const syncReport = await executeSync(
      new Anki(),
      vault,
      settings,
      jsonEngine,
    );

    // then
    expect(vault.getMarkdownFiles()).toHaveLength(1);
    expect(ankiState.notes).toHaveLength(1);
    expect(
      countIdLines(await readPath(vault, `Languages/What-is-2-2-${noteId}.md`)),
    ).toBe(1);
    expect(syncReport.decks[0]).toMatchObject({
      pushed: 0,
      refreshed: 0,
      upToDate: 1,
    });
  });
});
