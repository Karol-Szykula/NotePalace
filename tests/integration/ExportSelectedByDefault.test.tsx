/**
 * @jest-environment jsdom
 *
 * Export decision-table rows the wizard runs without the user touching
 * anything: a vault-only note creates its Anki note, an enrolled note
 * joins the ledger, a newer-in-vault note pushes to Anki.
 */
import "obsidian-test-mocks/jest-setup";
import {
  type ExportStatusCase,
  exportStatusMap,
  unreachableInExportStatus,
} from "../helpers/export-status-map";
import { basicAnkiNote } from "../helpers/status-fixtures";
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

function withFolder(files: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [path, content] of Object.entries(files)) {
    result[`${folderName}/${path}`] = content;
  }
  return result;
}

const exportByDefault: Array<[string, ExportStatusCase]> = Object.entries(
  exportStatusMap,
).filter(([, entry]) => entry !== unreachableInExportStatus);

describe("ExportSelectedByDefault", () => {
  test.each(exportByDefault)(
    "given a note in %s when the notes page opens then it is preselected",
    async (_status, entry) => {
      // given
      const ankiMod = entry.ankiMod;
      const note = ankiMod > 0 ? basicAnkiNote(noteId, ankiMod) : undefined;
      const fixture = await entry.buildFixture(noteId);
      page = ExportModalPO.render({
        decks: { [folderName]: [noteId] },
        notes: note ? [note] : [],
        files: withFolder(fixture.files),
        noteLifecycle: fixture.noteLifecycle,
      });
      // when
      await page.goToNotesPage(folderName);
      const preselected = await page.isNotePreselected();
      // then
      expect(preselected).toBe(true);
    },
  );

  test.each(exportByDefault)(
    "given a note in %s when Export runs then the summary counts the note",
    async (_status, entry) => {
      // given
      const ankiMod = entry.ankiMod;
      const note = ankiMod > 0 ? basicAnkiNote(noteId, ankiMod) : undefined;
      const fixture = await entry.buildFixture(noteId);
      page = ExportModalPO.render({
        decks: { [folderName]: [noteId] },
        notes: note ? [note] : [],
        files: withFolder(fixture.files),
        noteLifecycle: fixture.noteLifecycle,
      });
      // when
      await page.goToNotesPage(folderName);
      await page.clickExportButton();
      const summary = await page.expectTextDisplayed(entry.outcome);
      const fileContents =
        entry.expectFileCreated || entry.expectFileUpdated
          ? await page.noteFileContent(
              _status === "vaultOnly.unexported" ? undefined : noteId,
            )
          : undefined;
      // then
      expect(summary).toBeInTheDocument();
      if (entry.expectFileCreated) {
        expect(fileContents).toBeDefined();
        // Export creates a new Anki note with a new ID; verify an id was written
        expect(fileContents).toMatch(/id: \d+/);
      }
    },
  );
});
