/**
 * @jest-environment jsdom
 *
 * Import decision-table rows the wizard skips until the user takes Anki's
 * version: a vault-newer note stays untouched, a diverged note stays
 * untouched, and forcing either overwrites the newer Obsidian edits.
 */
import "obsidian-test-mocks/jest-setup";
import { messagePattern } from "src/gui/note-transfer-wizard/shared/utils/summary-patterns";
import type { NoteLifecycleStatus } from "src/services/notes/lifecycle";
import { AnkiConnectMock } from "../mocks/anki-connect";
import {
  basicAnkiNote,
  importStatusFixtures,
  type ImportStatusFixtureSpec,
} from "../helpers/status-fixtures";
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

interface ForcedOverwriteCase extends ImportStatusFixtureSpec {
  readonly notice: RegExp;
  readonly status: NoteLifecycleStatus;
}

const forcedOverwriteCases: ForcedOverwriteCase[] = [
  {
    ...importStatusFixtures["synced.vaultNewer"],
    notice: messagePattern("preview.newerInVaultShort"),
    status: "synced.vaultNewer",
  },
  {
    ...importStatusFixtures["synced.diverged"],
    notice: messagePattern("preview.editedInBoth"),
    status: "synced.diverged",
  },
];

const overwrittenSummary = /overwritten: 1/;
const forcedSummary = /forced: 1/;
const skippedSummary = /skipped: 0/;

describe("ImportForcedOverwrite", () => {
  test.each(forcedOverwriteCases)(
    "given a %s note when the cards page loads then it is not preselected and Import stays disabled",
    async ({ ankiMod, buildFixture, notice }) => {
      // given
      const note = basicAnkiNote(noteId, ankiMod);
      const fixture = await buildFixture(noteId);
      page = ImportModalPO.render({
        decks: deck,
        files: fixture.files,
        noteLifecycle: fixture.noteLifecycle,
        notes: [note],
      });
      // when
      await page.goToCardsPage(deckName);
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
    async ({ ankiMod, buildFixture }) => {
      // given
      const note = basicAnkiNote(noteId, ankiMod);
      const fixture = await buildFixture(noteId);
      page = ImportModalPO.render({
        decks: deck,
        files: fixture.files,
        noteLifecycle: fixture.noteLifecycle,
        notes: [note],
      });
      // when
      await page.goToCardsPage(deckName);
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
    async ({ ankiMod, buildFixture }) => {
      // given
      const note = basicAnkiNote(noteId, ankiMod);
      const fixture = await buildFixture(noteId);
      page = ImportModalPO.render({
        decks: deck,
        files: fixture.files,
        noteLifecycle: fixture.noteLifecycle,
        notes: [note],
      });
      // when
      await page.goToCardsPage(deckName);
      await page.clickBulkAnkiWins();
      const preselected = await page.isNotePreselected();
      const importEnabled = await page.isImportButtonEnabled();
      // then
      expect(preselected).toBe(true);
      expect(importEnabled).toBe(true);
    },
  );
});
