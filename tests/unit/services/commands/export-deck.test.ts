/**
 * @jest-environment jsdom
 *
 * App.createConfigured__ touches DOM globals. The confinement checks run the real
 * commands against one fake Anki and read what actually went over the wire: the
 * decision table says what a command may do, this file proves the command does
 * not reach past it. The import path takes an Anki instance but may only read
 * media with it, so the assertion is about note-mutating actions, and the run
 * that produced the file is asserted next to it so the check cannot pass
 * vacuously.
 */
import "obsidian-test-mocks/jest-setup";
import { App, TFile } from "obsidian-test-mocks/obsidian";
import type { Vault as ObsidianVault } from "obsidian";
import type { AnkiNoteInfo } from "src/entities/anki-note";
import { Anki } from "src/services/anki/anki";
import { executeExport } from "src/services/commands/export-deck";
import { executeImport } from "src/services/commands/import-deck";
import { collectVaultNoteIndex } from "src/services/vault/vault";
import { AnkiConnectMock } from "../../../mocks/anki-connect";
import { ankiResponder } from "../../../helpers/anki-responder";
import { createSettings } from "../../../helpers/settings";
import { jsonEngine } from "../../../helpers/json-engine";

AnkiConnectMock.install();

beforeEach(() => {
  AnkiConnectMock.reset();
});

const responder = ankiResponder();

const vaultOnlyBlock = [
  "```note-form",
  "{",
  '"front": "What is 2+2?",',
  '"back": "4",',
  '"tags": ""',
  "}",
  "```",
].join("\n");

function ankiNote(noteId: number): AnkiNoteInfo {
  return {
    noteId,
    mod: 500,
    modelName: "Basic",
    fields: {
      Back: { value: "<p>4</p>" },
      Front: { value: "<p>What is 2+2?</p>" },
    },
    tags: [],
  };
}

function vaultWith(files: Record<string, string>): ObsidianVault {
  const app = App.createConfigured__({ files });
  return app.vault as unknown as ObsidianVault;
}

function actions(): string[] {
  return responder.state.requests.map((request) => request.action);
}

async function importOneNote(note: AnkiNoteInfo): Promise<ObsidianVault> {
  const vault = vaultWith({});
  responder.respondWith({ notes: [note] });
  await executeImport(
    new Anki(),
    vault,
    {
      ankiWinsNoteIds: [],
      deckName: "Languages",
      decisions: { [note.noteId]: true },
      fieldMappings: { Basic: { Back: "Back", Front: "Front" } },
      noteLifecycle: {},
      notes: [note],
      targetFolder: "",
      vaultNoteIndex: await collectVaultNoteIndex(vault),
      previewStatuses: undefined,
    },
    jsonEngine,
  );
  return vault;
}

describe("the import command stays inside its confinement", () => {
  test("given a new Anki note when imported then a vault file appears", async () => {
    // given
    const note = ankiNote(1_500_001);

    // when
    const vault = await importOneNote(note);

    // then
    expect(vault.getMarkdownFiles()).toHaveLength(1);
  });

  test("given a full import when it runs then no note-mutating Anki action is issued", async () => {
    // given
    const note = ankiNote(1_500_002);

    // when
    await importOneNote(note);

    // then
    expect(actions()).not.toContain("addNotes");
    expect(actions()).not.toContain("addNote");
    expect(actions()).not.toContain("updateNoteFields");
    expect(actions()).not.toContain("deleteNotes");
  });
});

describe("the export command stays inside its confinement", () => {
  test("given a vault-only note when exported then Anki gets exactly one new note", async () => {
    // given
    responder.respondWith();
    const vault = vaultWith({ "Languages/What-is-2-2.md": vaultOnlyBlock });

    // when
    const report = await executeExport(
      new Anki(),
      vault,
      createSettings(),
      { ignoredDirectories: "", previewStatuses: undefined },
      jsonEngine,
    );

    // then
    expect(report.created).toBe(1);
    expect(actions()).toContain("addNotes");
    expect(actions()).not.toContain("deleteNotes");
  });

  test("given a vault folder matching a known deck after sanitizing when exported then no new deck is created", async () => {
    // given
    const realDeck = "CCNA::Day 03 Flashcards - OSI Model, TCP/IP Suite";
    responder.respondWith({ decks: { [realDeck]: [] } });
    const filePath =
      "CCNA/Day 03 Flashcards - OSI Model, TCP-IP Suite/What-is-2-2.md";
    const vault = vaultWith({ [filePath]: vaultOnlyBlock });

    // when
    await executeExport(
      new Anki(),
      vault,
      createSettings(),
      { ignoredDirectories: "", previewStatuses: undefined },
      jsonEngine,
    );

    // then
    expect(actions()).not.toContain("createDeck");
    const addNotes = responder.state.requests.find(
      (request) => request.action === "addNotes",
    );
    const payloads = addNotes?.params["notes"] as { deckName: string }[];
    expect(payloads[0]?.deckName).toBe(realDeck);
  });

  test("given a created Anki note when the export finishes then its id is written back into the block", async () => {
    // given
    responder.respondWith();
    const vault = vaultWith({ "Languages/What-is-2-2.md": vaultOnlyBlock });

    // when
    await executeExport(
      new Anki(),
      vault,
      createSettings(),
      { ignoredDirectories: "", previewStatuses: undefined },
      jsonEngine,
    );

    // then
    const file = vault.getAbstractFileByPath("Languages/What-is-2-2.md");
    if (!(file instanceof TFile)) {
      throw new Error("exported note file is gone");
    }
    const content = await vault.read(file);
    expect(content).toMatch(/"id":\s*\d+/);
  });
});

describe("export media naming", () => {
  test("given two media files sharing a basename when exported then both get distinct Anki names", async () => {
    // given
    responder.respondWith();
    const block = [
      "```note-form",
      "{",
      '"front": "Q",',
      '"back": "![[a/img.png]] ![[b/img.png]]",',
      '"tags": ""',
      "}",
      "```",
    ].join("\n");
    const app = App.createConfigured__({
      files: { "Languages/note.md": block },
    });
    await app.vault.createBinary(
      "Languages/a/img.png",
      new Uint8Array([1, 2, 3]).buffer,
    );
    await app.vault.createBinary(
      "Languages/b/img.png",
      new Uint8Array([4, 5, 6]).buffer,
    );
    const vault = app.vault as unknown as ObsidianVault;

    // when
    await executeExport(
      new Anki(),
      vault,
      createSettings(),
      { ignoredDirectories: "", previewStatuses: undefined },
      jsonEngine,
    );

    // then
    const stored = responder
      .multiActions("storeMediaFile")
      .map((action) => action.params["filename"]);
    expect(stored.sort()).toEqual(["img-1.png", "img.png"]);
    const addNotes = responder.state.requests.find(
      (request) => request.action === "addNotes",
    );
    const payloads = addNotes?.params["notes"] as {
      fields: Record<string, string>;
    }[];
    expect(payloads[0]?.fields["Back"]).toContain('src="img.png"');
    expect(payloads[0]?.fields["Back"]).toContain('src="img-1.png"');
  });
});
