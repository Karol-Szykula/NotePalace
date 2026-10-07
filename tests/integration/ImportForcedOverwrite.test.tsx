/**
 * @jest-environment jsdom
 *
 * Import decision-table rows the wizard skips until the user takes Anki's
 * version: a vault-newer note stays untouched, a diverged note stays
 * untouched, and forcing either overwrites the newer Obsidian edits.
 */
import "obsidian-test-mocks/jest-setup";
import type { AnkiNoteInfo } from "src/entities/anki-note";
import {
  cardsToImportPattern,
  mappedFieldsPattern,
} from "src/gui/note-transfer-wizard/shared/utils/summary-patterns";
import { computeContentHash } from "src/services/notes/content-hash";
import type {
  NoteLifecycleRecord,
  NoteLifecycleStatus,
} from "src/services/notes/lifecycle";
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

function importedNoteForm(front: string): string {
  return [
    "```note-form",
    `front: ${front}`,
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

interface ForcedOverwriteCase {
  readonly buildFixture: (id: number) => Promise<{
    files: Record<string, string>;
    noteLifecycle: Record<number, NoteLifecycleRecord>;
  }>;
  readonly notice: RegExp;
  readonly noteMod: number;
  readonly status: NoteLifecycleStatus;
}

const forcedOverwriteCases: ForcedOverwriteCase[] = [
  {
    buildFixture: async (id) => ({
      files: { "VaultNewer.md": importedNoteForm("Q edited") },
      noteLifecycle: { [id]: await cleanRecordWithHash(100) },
    }),
    notice: /newer Obsidian edits/,
    noteMod: 100,
    status: "synced.vaultNewer",
  },
  {
    buildFixture: async (id) => ({
      files: { "Diverged.md": importedNoteForm("Q edited") },
      noteLifecycle: { [id]: await cleanRecordWithHash(100) },
    }),
    notice: /edited in both places/,
    noteMod: 600,
    status: "synced.diverged",
  },
];

const overwrittenSummary = /overwritten: 1/;
const forcedSummary = /forced: 1/;
const skippedSummary = /skipped: 0/;

async function pagesUntilCards(page: ImportModalPO): Promise<void> {
  await page.chooseDeck(deckName);
  await page.clickNextButton();
  await page.expectTextDisplayed(mappedFieldsPattern);
  await page.clickNextButton();
  await page.expectTextDisplayed(cardsToImportPattern);
}

describe("ImportForcedOverwrite", () => {
  test.each(forcedOverwriteCases)(
    "given a %s note when the cards page loads then it is not preselected and Import stays disabled",
    async ({ buildFixture, notice, noteMod }) => {
      // given
      const note = ankiNote(noteMod);
      const fixture = await buildFixture(noteId);
      page = ImportModalPO.render({
        decks: deck,
        files: fixture.files,
        noteLifecycle: fixture.noteLifecycle,
        notes: [note],
      });
      // when
      await pagesUntilCards(page);
      const preselected = await page.isNotePreselected();
      const noticeText = await page.expectTextDisplayed(notice);
      const importEnabled = await page.isImportButtonEnabled();
      // then
      expect(preselected).toBe(false);
      expect(noticeText).toBeInTheDocument();
      expect(importEnabled).toBe(false);
    },
  );

  test.each(forcedOverwriteCases)(
    "given a %s note when Anki wins is toggled then the run overwrites the file",
    async ({ buildFixture, noteMod }) => {
      // given
      const note = ankiNote(noteMod);
      const fixture = await buildFixture(noteId);
      page = ImportModalPO.render({
        decks: deck,
        files: fixture.files,
        noteLifecycle: fixture.noteLifecycle,
        notes: [note],
      });
      // when
      await pagesUntilCards(page);
      await page.toggleAnkiWins();
      await page.clickImportButton();
      const overwritten = await page.expectTextDisplayed(overwrittenSummary);
      const forced = await page.expectTextDisplayed(forcedSummary);
      const skipped = await page.expectTextDisplayed(skippedSummary);
      const fileContents = await page.noteFileContent(noteId);
      // then
      expect(overwritten).toBeInTheDocument();
      expect(forced).toBeInTheDocument();
      expect(skipped).toBeInTheDocument();
      expect(fileContents).toBeDefined();
      expect(fileContents).toContain(`id: ${noteId}`);
      expect(fileContents).not.toContain("Q edited");
    },
  );

  test.each(forcedOverwriteCases)(
    "given a %s note when the bulk action is used then it is selected and Import becomes enabled",
    async ({ buildFixture, noteMod }) => {
      // given
      const note = ankiNote(noteMod);
      const fixture = await buildFixture(noteId);
      page = ImportModalPO.render({
        decks: deck,
        files: fixture.files,
        noteLifecycle: fixture.noteLifecycle,
        notes: [note],
      });
      // when
      await pagesUntilCards(page);
      await page.clickBulkAnkiWins();
      const preselected = await page.isNotePreselected();
      const importEnabled = await page.isImportButtonEnabled();
      // then
      expect(preselected).toBe(true);
      expect(importEnabled).toBe(true);
    },
  );
});
