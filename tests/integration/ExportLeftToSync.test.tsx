/**
 * @jest-environment jsdom
 *
 * Export decision-table rows that change nothing until the user forces a run:
 * an up-to-date note keeps its file, a deleted note stays gone until Anki's
 * version re-creates it.
 */
import "obsidian-test-mocks/jest-setup";
import type { AnkiNoteInfo } from "src/entities/anki-note";
import {
  createdPattern,
  forcedPattern,
  unchangedPattern,
} from "src/gui/note-transfer-wizard/shared/utils/summary-patterns";
import type { NoteLifecycleStatus } from "src/services/notes/lifecycle";
import {
  cleanAnkiNote,
  importStatusFixtures,
  type ImportStatusFixtureSpec,
} from "../helpers/status-fixtures";
import { AnkiConnectMock } from "../mocks/anki-connect";
import { ExportModalPO } from "./page-objects/ExportModalPO";

AnkiConnectMock.install();

let page: ExportModalPO | undefined;

beforeEach(() => {
  AnkiConnectMock.reset();
});

afterEach(() => {
  page?.closeModal();
  page = undefined;
});

const folderName = "Languages";
const noteId = 1234567890;
const deck = { [folderName]: [noteId] };

const cleanSpec = importStatusFixtures["synced.clean"];
const ankiDeletedSpec = importStatusFixtures["vaultOnly.ankiDeleted"];

interface LeftToSyncCase extends ImportStatusFixtureSpec {
  readonly buildNote: (id: number, mod: number) => AnkiNoteInfo | undefined;
  readonly loadTexts: readonly RegExp[];
  readonly status: NoteLifecycleStatus;
}

const leftToSyncCases: LeftToSyncCase[] = [
  {
    ...cleanSpec,
    buildNote: cleanAnkiNote,
    loadTexts: [/already up to date/],
    status: "synced.clean",
  },
  {
    ...ankiDeletedSpec,
    buildNote: () => undefined,
    loadTexts: [/Gone from Anki/, /This re-creates 1 note you deleted in Anki/],
    status: "vaultOnly.ankiDeleted",
  },
];

function withFolder(files: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [path, content] of Object.entries(files)) {
    result[`${folderName}/${path}`] = content;
  }
  return result;
}

describe("ExportLeftToSync", () => {
  test.each(
    leftToSyncCases.map((entry): [NoteLifecycleStatus, LeftToSyncCase] => [
      entry.status,
      entry,
    ]),
  )(
    "given a note in %s when the notes page loads then it is not preselected and Export stays disabled",
    async (_status, { ankiMod, buildFixture, buildNote, loadTexts }) => {
      // given
      const note = buildNote(noteId, ankiMod);
      const fixture = await buildFixture(noteId);
      page = ExportModalPO.render({
        decks: deck,
        files: withFolder(fixture.files),
        noteLifecycle: fixture.noteLifecycle,
        notes: note ? [note] : [],
      });
      // when
      await page.goToNotesPage(folderName);
      const preselected = await page.isNotePreselected();
      const importEnabled = await page.isExportButtonEnabled();
      const texts: HTMLElement[] = [];
      for (const loadText of loadTexts) {
        texts.push(await page.expectTextDisplayed(loadText));
      }
      // then
      expect(preselected).toBe(false);
      expect(importEnabled).toBe(false);
      for (const text of texts) {
        expect(text).toBeInTheDocument();
      }
    },
  );

  test("given a synced.clean note when the bulk action forces the run then the note stays unchanged without counting a forced note", async () => {
    // given
    const note = cleanAnkiNote(noteId, cleanSpec.ankiMod);
    const fixture = await cleanSpec.buildFixture(noteId);
    page = ExportModalPO.render({
      decks: deck,
      files: withFolder(fixture.files),
      noteLifecycle: fixture.noteLifecycle,
      notes: [note],
    });
    // when
    await page.goToNotesPage(folderName);
    await page.clickBulkObsidianWins();
    await page.clickExportButton();
    const unchanged = await page.expectTextDisplayed(unchangedPattern);
    const forced = page.queryTextDisplayed(/forced: \d+/);
    // then
    expect(unchanged).toBeInTheDocument();
    expect(forced).toBeNull();
  });

  test("given a vaultOnly.ankiDeleted note when Obsidian wins is toggled then the run re-creates the Anki note", async () => {
    // given
    const fixture = await ankiDeletedSpec.buildFixture(noteId);
    page = ExportModalPO.render({
      decks: deck,
      files: withFolder(fixture.files),
      noteLifecycle: fixture.noteLifecycle,
      notes: [],
    });
    // when
    await page.goToNotesPage(folderName);
    await page.toggleObsidianWins();
    await page.clickExportButton();
    const created = await page.expectTextDisplayed(createdPattern);
    const forced = await page.expectTextDisplayed(forcedPattern);
    // then
    expect(created).toBeInTheDocument();
    expect(forced).toBeInTheDocument();
  });
});
