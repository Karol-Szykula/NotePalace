/**
 * @jest-environment jsdom
 *
 * The export save page runs the export the moment it opens: OK stays disabled
 * while the run is in flight and unlocks with the report or with the failure
 * message, so a click can never hide a running or a failed export.
 */
import "obsidian-test-mocks/jest-setup";
import type { AnkiNoteInfo } from "src/entities/anki-note";
import { Anki } from "src/services/anki/anki";
import {
  createdPattern,
  messagePattern,
} from "src/gui/note-transfer-wizard/shared/utils/summary-patterns";
import { AnkiConnectMock } from "../mocks/anki-connect";
import { ExportModalPO } from "./page-objects/ExportModalPO";

AnkiConnectMock.install();

let page: ExportModalPO | undefined;

beforeEach(() => {
  AnkiConnectMock.reset();
});

afterEach(() => {
  jest.restoreAllMocks();
  page?.closeModal();
  page = undefined;
});

const folderName = "Languages";

const vaultWithOneNote = {
  files: {
    "Languages/Q.md": `${["```note-form", "front: Q", "back: A", "```", ""].join("\n")}\n`,
  },
};

function holdNotesFetch(): (notes: AnkiNoteInfo[]) => void {
  let release: (notes: AnkiNoteInfo[]) => void = () => undefined;
  const pending = new Promise<AnkiNoteInfo[]>((resolve) => {
    release = resolve;
  });
  jest.spyOn(Anki.prototype, "getNotes").mockReturnValue(pending);
  return release;
}

describe("ExportModal save gate", () => {
  test("given a running export when the save page opens then OK waits for the report", async () => {
    // given
    page = ExportModalPO.render(vaultWithOneNote);
    await page.goToNotesPage(folderName);
    const releaseNotes = holdNotesFetch();

    // when
    await page.goToSavePage();
    const okEnabledWhileRunning = await page.isOkButtonEnabled();

    // then
    expect(okEnabledWhileRunning).toBe(false);

    // when
    releaseNotes([]);
    const report = await page.expectTextDisplayed(createdPattern);

    // then
    expect(report).toBeInTheDocument();
    expect(await page.isOkButtonEnabled()).toBe(true);
  });

  test("given Anki dies on the save page when the export fails then OK unlocks with the failure", async () => {
    // given
    page = ExportModalPO.render(vaultWithOneNote);
    await page.goToNotesPage(folderName);

    // when
    AnkiConnectMock.setConnectionDown(true);
    await page.goToSavePage();
    const failure = await page.expectTextDisplayed(
      messagePattern("notice.exportFailed", ".+"),
    );

    // then
    expect(failure).toBeInTheDocument();
    expect(await page.isOkButtonEnabled()).toBe(true);
  });
});
