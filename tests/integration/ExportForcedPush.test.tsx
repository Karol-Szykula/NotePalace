/**
 * @jest-environment jsdom
 *
 * Export decision-table rows skipped until the user takes Obsidian's version:
 * a newer-in-Anki note and a diverged note stay unselected until forced.
 */
import "obsidian-test-mocks/jest-setup";
import type { NoteLifecycleRecord } from "src/services/notes/lifecycle";
import type { NoteLifecycleStatus } from "src/services/notes/lifecycle";
import { basicAnkiNote } from "../helpers/status-fixtures";
import {
  forcedPattern,
  updatedPattern,
} from "src/gui/note-transfer-wizard/shared/utils/summary-patterns";
import { AnkiConnectMock } from "../mocks/anki-connect";
import { ExportModalPO } from "./page-objects/ExportModalPO";
import { importStatusFixtures } from "../helpers/status-fixtures";

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

interface ForcedPushCase {
  readonly ankiMod: number;
  readonly buildFixture: (id: number) => Promise<{
    readonly ankiMod: number;
    readonly files: Record<string, string>;
    readonly noteLifecycle: Record<number, NoteLifecycleRecord>;
  }>;
  readonly notice: RegExp;
  readonly status: NoteLifecycleStatus;
}

const forcedPushCases: ForcedPushCase[] = [
  {
    ...importStatusFixtures["synced.ankiNewer"],
    notice: /with a newer version in Anki/,
    status: "synced.ankiNewer",
  },
  {
    ...importStatusFixtures["synced.diverged"],
    notice: /edited in both places/,
    status: "synced.diverged",
  },
];

function withFolder(files: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [path, content] of Object.entries(files)) {
    result[`${folderName}/${path}`] = content;
  }
  return result;
}

describe("ExportForcedPush", () => {
  test.each(forcedPushCases.map((entry) => [entry.status, entry] as const))(
    "given a %s note when the notes page loads then it is not preselected and Export stays disabled",
    async (_status, { ankiMod, buildFixture, notice }) => {
      // given
      const note = basicAnkiNote(noteId, ankiMod);
      const fixture = await buildFixture(noteId);
      page = ExportModalPO.render({
        decks: deck,
        files: withFolder(fixture.files),
        noteLifecycle: fixture.noteLifecycle,
        notes: [note],
      });
      // when
      await page.goToNotesPage(folderName);
      const preselected = await page.isNotePreselected();
      const noticeText = await page.expectTextDisplayed(notice);
      const exportEnabled = await page.isExportButtonEnabled();
      // then
      expect(preselected).toBe(false);
      expect(noticeText).toBeInTheDocument();
      expect(exportEnabled).toBe(false);
    },
  );

  test.each(forcedPushCases.map((entry) => [entry.status, entry] as const))(
    "given a %s note when Obsidian wins is toggled then the run pushes Updated and forced",
    async (_status, { ankiMod, buildFixture }) => {
      // given
      const note = basicAnkiNote(noteId, ankiMod);
      const fixture = await buildFixture(noteId);
      page = ExportModalPO.render({
        decks: deck,
        files: withFolder(fixture.files),
        noteLifecycle: fixture.noteLifecycle,
        notes: [note],
      });
      // when
      await page.goToNotesPage(folderName);
      await page.toggleObsidianWins();
      await page.clickExportButton();
      const updated = await page.expectTextDisplayed(updatedPattern);
      const forced = await page.expectTextDisplayed(forcedPattern);
      // then
      expect(updated).toBeInTheDocument();
      expect(forced).toBeInTheDocument();
    },
  );

  test.each(forcedPushCases.map((entry) => [entry.status, entry] as const))(
    "given a %s note when the bulk action is used then it is selected and Export becomes enabled",
    async (_status, { ankiMod, buildFixture }) => {
      // given
      const note = basicAnkiNote(noteId, ankiMod);
      const fixture = await buildFixture(noteId);
      page = ExportModalPO.render({
        decks: deck,
        files: withFolder(fixture.files),
        noteLifecycle: fixture.noteLifecycle,
        notes: [note],
      });
      // when
      await page.goToNotesPage(folderName);
      await page.clickBulkObsidianWins();
      const preselected = await page.isNotePreselected();
      const exportEnabled = await page.isExportButtonEnabled();
      // then
      expect(preselected).toBe(true);
      expect(exportEnabled).toBe(true);
    },
  );
});
