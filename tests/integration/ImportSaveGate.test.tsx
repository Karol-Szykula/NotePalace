/**
 * @jest-environment jsdom
 *
 * The import save page runs the import the moment it opens: OK stays disabled
 * while the run is in flight and unlocks with the report or with the failure
 * message, so a click can never hide a running or a failed import.
 */
import "obsidian-test-mocks/jest-setup";
import type { AnkiNoteInfo } from "src/entities/anki-note";
import { Anki } from "src/services/anki/anki";
import {
  createdPattern,
  mappedFieldsPattern,
  messagePattern,
  notesToImportPattern,
} from "src/gui/note-transfer-wizard/shared/utils/summary-patterns";
import { AnkiConnectMock } from "../mocks/anki-connect";
import { ImportModalPO } from "./page-objects/ImportModalPO";

AnkiConnectMock.install();

let page: ImportModalPO | undefined;

beforeEach(() => {
  AnkiConnectMock.reset();
});

afterEach(() => {
  jest.restoreAllMocks();
  page?.closeModal();
  page = undefined;
});

const deckName = "Languages";

const basicNote: AnkiNoteInfo = {
  cards: [7],
  fields: {
    Back: { value: "<p>4</p>" },
    Front: { value: "<p>What is 2+2?</p>" },
  },
  mod: 100,
  modelName: "Basic",
  noteId: 1111111111111,
  tags: [],
};

const deckWithOneNote = {
  decks: { [deckName]: [basicNote.noteId] },
  notes: [basicNote],
};

function holdNotesFetch(): (notes: AnkiNoteInfo[]) => void {
  let release: (notes: AnkiNoteInfo[]) => void = () => undefined;
  const pending = new Promise<AnkiNoteInfo[]>((resolve) => {
    release = resolve;
  });
  jest.spyOn(Anki.prototype, "getNotes").mockReturnValue(pending);
  return release;
}

async function reachReadyPreview(): Promise<void> {
  await page!.chooseDeck(deckName);
  await page!.clickNextButton();
  await page!.expectTextDisplayed(mappedFieldsPattern);
  await page!.clickNextButton();
  await page!.expectTextDisplayed(notesToImportPattern);
}

describe("ImportModal save gate", () => {
  test("given a running import when the save page opens then OK waits for the report", async () => {
    // given
    page = ImportModalPO.render(deckWithOneNote);
    await reachReadyPreview();
    const releaseNotes = holdNotesFetch();

    // when
    await page.clickImportButton();
    const okEnabledWhileRunning = await page.isOkButtonEnabled();

    // then
    expect(okEnabledWhileRunning).toBe(false);

    // when
    releaseNotes([basicNote]);
    const report = await page.expectTextDisplayed(createdPattern);

    // then
    expect(report).toBeInTheDocument();
    expect(await page.isOkButtonEnabled()).toBe(true);
  });

  test("given Anki dies on the save page when the import fails then OK unlocks with the failure", async () => {
    // given
    page = ImportModalPO.render(deckWithOneNote);
    await reachReadyPreview();

    // when
    AnkiConnectMock.setConnectionDown(true);
    await page.clickImportButton();
    const failure = await page.expectTextDisplayed(
      messagePattern("notice.importFailed", ".+"),
    );

    // then
    expect(failure).toBeInTheDocument();
    expect(await page.isOkButtonEnabled()).toBe(true);
  });
});
