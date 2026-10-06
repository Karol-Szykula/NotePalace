/**
 * @jest-environment jsdom
 *
 * Import decision-table rows the wizard runs without the user touching
 * anything: an Anki-only note creates its file, a newer-in-Anki note
 * overwrites its file, an id-bearing unenrolled note rewrites the same file.
 */
import "obsidian-test-mocks/jest-setup";
import type { AnkiNoteInfo } from "src/entities/anki-note";
import { computeContentHash } from "src/services/notes/content-hash";
import type { NoteLifecycleRecord } from "src/services/notes/lifecycle";
import { AnkiConnectMock } from "../mocks/anki-connect";
import { ImportModalPO } from "./page-objects/ImportModalPO";

AnkiConnectMock.install();

let page: ImportModalPO | undefined;

beforeEach(() => {
  AnkiConnectMock.reset();
});

afterEach(() => {
  page?.closeModal();
  page = undefined;
});

const deckName = "Languages";
const noteId = 1234567890;
const deck = { [deckName]: [noteId] };
const mappedFieldsPattern = /Map fields for deck/;
const cardsToImportPattern = /Cards to import: 1\/1/;
const noteFields = {
  Back: { value: "<p>4</p>" },
  Front: { value: "<p>What is 2+2?</p>" },
};

function ankiNote(mod: number): AnkiNoteInfo {
  return {
    cards: [11],
    fields: noteFields,
    mod,
    modelName: "Basic",
    noteId,
    tags: [],
  };
}

function importedNoteForm(): string {
  return [
    "```note-form",
    "front: Q",
    "back: A",
    `id: ${noteId}`,
    "```",
    "",
  ].join("\n");
}

async function cleanRecordWithHash(
  lastMod: number,
): Promise<NoteLifecycleRecord> {
  const lastHash = await computeContentHash("Q", "A", "", "Basic");
  return {
    lastHash,
    lastMod,
    status: "synced.clean",
    updatedAt: 100,
    v: 1,
  };
}

interface ImportByDefaultCase {
  readonly buildFixture: (id: number) => Promise<{
    files?: Record<string, string>;
    noteLifecycle?: Record<number, NoteLifecycleRecord>;
  }>;
  readonly expectFileCreated?: boolean;
  readonly noteMod: number;
  readonly outcome: RegExp;
}

const importByDefault: Array<[string, ImportByDefaultCase]> = [
  [
    "ankiOnly.neverImported",
    {
      buildFixture: async () => ({}),
      expectFileCreated: true,
      noteMod: 100,
      outcome: /Created: 1/,
    },
  ],
  [
    "synced.ankiNewer",
    {
      buildFixture: async (id: number) => ({
        files: { "Newer.md": importedNoteForm() },
        noteLifecycle: { [id]: await cleanRecordWithHash(100) },
      }),
      noteMod: 600,
      outcome: /overwritten: 1/,
    },
  ],
  [
    "linked.unenrolled",
    {
      buildFixture: async () => ({
        files: { "Enrolled.md": importedNoteForm() },
      }),
      noteMod: 600,
      outcome: /overwritten: 1/,
    },
  ],
];

describe("ImportSelectedByDefault", () => {
  test.each(importByDefault)(
    "given a note in %s when the cards page opens then it is preselected",
    async (_status, entry) => {
      // given
      const note = ankiNote(entry.noteMod);
      const fixture = await entry.buildFixture(noteId);
      page = ImportModalPO.render({
        decks: deck,
        files: fixture.files,
        noteLifecycle: fixture.noteLifecycle,
        notes: [note],
      });
      // when
      await page.chooseDeck(deckName);
      await page.clickNextButton();
      await page.expectTextDisplayed(mappedFieldsPattern);
      await page.clickNextButton();
      await page.expectTextDisplayed(cardsToImportPattern);
      const preselected = await page.isNotePreselected();
      // then
      expect(preselected).toBe(true);
    },
  );

  test.each(importByDefault)(
    "given a note in %s when Import runs then the summary counts the note",
    async (_status, entry) => {
      // given
      const note = ankiNote(entry.noteMod);
      const fixture = await entry.buildFixture(noteId);
      page = ImportModalPO.render({
        decks: deck,
        files: fixture.files,
        noteLifecycle: fixture.noteLifecycle,
        notes: [note],
      });
      // when
      await page.chooseDeck(deckName);
      await page.clickNextButton();
      await page.expectTextDisplayed(mappedFieldsPattern);
      await page.clickNextButton();
      await page.expectTextDisplayed(cardsToImportPattern);
      await page.clickImportButton();
      const summary = await page.expectTextDisplayed(entry.outcome);
      const fileContents = entry.expectFileCreated
        ? await page.noteFileContent(noteId)
        : undefined;
      // then
      expect(summary).toBeInTheDocument();
      if (entry.expectFileCreated) {
        expect(fileContents).toBeDefined();
        expect(fileContents).toContain(`id: ${noteId}`);
      }
    },
  );
});
