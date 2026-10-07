/**
 * @jest-environment jsdom
 *
 * Import decision-table rows that change nothing until the user forces a run:
 * an up-to-date note keeps its file, a deleted file stays gone until Anki's
 * version re-creates it.
 */
import "obsidian-test-mocks/jest-setup";
import type { AnkiNoteInfo } from "src/entities/anki-note";
import {
  createdPattern,
  overwrittenPattern,
} from "src/gui/note-transfer-wizard/shared/utils/summary-patterns";
import type { NoteLifecycleStatus } from "src/services/notes/lifecycle";
import {
  basicAnkiNote,
  cleanAnkiNote,
  importStatusFixtures,
  type ImportStatusFixtureSpec,
} from "../helpers/status-fixtures";
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

const cleanSpec = importStatusFixtures["synced.clean"];
const fileDeletedSpec = importStatusFixtures["ankiOnly.fileDeleted"];

interface LeftToSyncCase extends ImportStatusFixtureSpec {
  readonly buildNote: (id: number, mod: number) => AnkiNoteInfo;
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
    ...fileDeletedSpec,
    buildNote: basicAnkiNote,
    loadTexts: [
      /this id is nowhere in the vault/,
      /This re-creates 1 note you deleted in Obsidian/,
    ],
    status: "ankiOnly.fileDeleted",
  },
];

const forcedOnce = /forced: 1/;
const neverForced = /forced: \d+/;

describe("ImportLeftToSync", () => {
  test.each(
    leftToSyncCases.map((entry): [NoteLifecycleStatus, LeftToSyncCase] => [
      entry.status,
      entry,
    ]),
  )(
    "given a note in %s when the cards page loads then it is not selected and Import stays disabled",
    async (_status, { ankiMod, buildFixture, buildNote, loadTexts }) => {
      // given
      const note = buildNote(noteId, ankiMod);
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
      const importEnabled = await page.isImportButtonEnabled();
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

  test("given a synced.clean note when the bulk action forces the run then the file keeps its content without counting a forced note", async () => {
    // given
    const note = cleanAnkiNote(noteId, cleanSpec.ankiMod);
    const fixture = await cleanSpec.buildFixture(noteId);
    page = ImportModalPO.render({
      decks: deck,
      files: fixture.files,
      noteLifecycle: fixture.noteLifecycle,
      notes: [note],
    });
    // when
    await page.goToCardsPage(deckName);
    await page.clickBulkAnkiWins();
    await page.clickImportButton();
    const overwritten = await page.expectTextDisplayed(overwrittenPattern);
    const forced = page.queryTextDisplayed(neverForced);
    const fileContents = await page.noteFileContent(noteId);
    // then
    expect(overwritten).toBeInTheDocument();
    expect(forced).toBeNull();
    expect(fileContents).toBeDefined();
    expect(fileContents).toContain(`id: ${noteId}`);
    expect(fileContents).toContain("Q");
    expect(fileContents).not.toContain("What is 2+2?");
  });

  test("given an ankiOnly.fileDeleted note when Anki wins is toggled then the run re-creates the file", async () => {
    // given
    const note = basicAnkiNote(noteId, fileDeletedSpec.ankiMod);
    const fixture = await fileDeletedSpec.buildFixture(noteId);
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
    const created = await page.expectTextDisplayed(createdPattern);
    const forced = await page.expectTextDisplayed(forcedOnce);
    const fileContents = await page.noteFileContent(noteId);
    // then
    expect(created).toBeInTheDocument();
    expect(forced).toBeInTheDocument();
    expect(fileContents).toBeDefined();
    expect(fileContents).toContain(`id: ${noteId}`);
  });
});
