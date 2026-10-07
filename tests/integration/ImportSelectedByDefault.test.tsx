/**
 * @jest-environment jsdom
 *
 * Import decision-table rows the wizard runs without the user touching
 * anything: an Anki-only note creates its file, a newer-in-Anki note
 * overwrites its file, an id-bearing unenrolled note rewrites the same file.
 */
import "obsidian-test-mocks/jest-setup";
import {
  NOTE_LIFECYCLE_STATUSES,
  type NoteLifecycleStatus,
} from "src/services/notes/lifecycle";
import {
  importStatusMap,
  type ImportStatusCase,
  unreachableInImportStatus,
} from "../helpers/import-status-map";
import { basicAnkiNote } from "../helpers/status-fixtures";
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

const importByDefault: Array<[NoteLifecycleStatus, ImportStatusCase]> =
  NOTE_LIFECYCLE_STATUSES.flatMap((status) =>
    importStatusMap[status] === unreachableInImportStatus
      ? []
      : [[status, importStatusMap[status]]],
  );

describe("ImportSelectedByDefault", () => {
  test.each(importByDefault)(
    "given a note in %s when the cards page opens then it is preselected",
    async (_status, entry) => {
      // given
      const note = basicAnkiNote(noteId, entry.ankiMod);
      const fixture = await entry.buildFixture(noteId);
      page = ImportModalPO.render({
        decks: deck,
        files: fixture.files,
        noteLifecycle: fixture.noteLifecycle,
        notes: [note],
      });
      // when
      await page.goToCardsPage(deckName);
      const preselected = await page.isNotePreselected();
      // then
      expect(preselected).toBe(true);
    },
  );

  test.each(importByDefault)(
    "given a note in %s when Import runs then the summary counts the note",
    async (_status, entry) => {
      // given
      const note = basicAnkiNote(noteId, entry.ankiMod);
      const fixture = await entry.buildFixture(noteId);
      page = ImportModalPO.render({
        decks: deck,
        files: fixture.files,
        noteLifecycle: fixture.noteLifecycle,
        notes: [note],
      });
      // when
      await page.goToCardsPage(deckName);
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
