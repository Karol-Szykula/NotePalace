/**
 * @jest-environment jsdom
 *
 * Whole-wizard import flows driven through the modal page object: deck
 * selection, step navigation, footer states and the executed summary.
 */
import "obsidian-test-mocks/jest-setup";
import type { AnkiNoteInfo } from "src/entities/anki-note";
import {
  cardsToImportPattern,
  createdPattern,
  mappedFieldsPattern,
} from "src/gui/note-transfer-wizard/shared/utils/summary-patterns";
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
const importedNoteId = 1111111111111;
const secondImportedNoteId = 2222222222222;

function importedNoteForm(noteId: number): string {
  return [
    "```note-form",
    "front: Q",
    "back: A",
    `id: ${noteId}`,
    "```",
    "",
  ].join("\n");
}

const languageDeckFixture = {
  decks: { [deckName]: [importedNoteId] },
};

const twoNotesDeck = {
  decks: { [deckName]: [importedNoteId, secondImportedNoteId] },
};

const oneImportedVault = {
  files: { "Note.md": importedNoteForm(importedNoteId) },
};

const bothImportedVault = {
  files: {
    "Note.md": importedNoteForm(importedNoteId),
    "Other.md": importedNoteForm(secondImportedNoteId),
  },
};

const basicLanguageNote: AnkiNoteInfo = {
  cards: [7],
  fields: {
    Front: { value: "<p>What is 2+2?</p>" },
    Back: { value: "<p>4</p>" },
  },
  mod: 100,
  modelName: "Basic",
  noteId: importedNoteId,
  tags: [],
};

const languageDeckWithNote = {
  decks: { [deckName]: [basicLanguageNote.noteId] },
  notes: [basicLanguageNote],
};

describe("ImportModalFlow", () => {
  test("given decks in Anki when the import modal opens then shows all page indicator labels", async () => {
    // given
    page = ImportModalPO.render(languageDeckFixture);
    // when
    const titles = await page.pageIndicatorTitles();
    // then
    expect(titles).toEqual(["Deck", "Fields", "Cards", "Save"]);
  });

  test("given one of two notes already imported when the deck list renders then shows the 1/2 counter", async () => {
    // given
    page = ImportModalPO.render({ ...twoNotesDeck, ...oneImportedVault });
    // when
    const counter = await page.expectTextDisplayed("1/2");
    const deckLabel = await page.expectTextDisplayed(deckName);
    // then
    expect(counter).toBeInTheDocument();
    expect(deckLabel).toBeInTheDocument();
  });

  test("given no deck selected when the import modal opens then Next is disabled until a deck is chosen", async () => {
    // given
    page = ImportModalPO.render(languageDeckFixture);
    // when
    const nextDisabledBefore = await page.isNextButtonDisabled();
    // then
    expect(nextDisabledBefore).toBe(true);
    // when
    await page.chooseDeck(deckName);
    const nextDisabledAfter = await page.isNextButtonDisabled();
    // then
    expect(nextDisabledAfter).toBe(false);
  });

  test("given all notes already imported when the deck list renders then the deck stays enabled for reimport", async () => {
    // given
    page = ImportModalPO.render({ ...twoNotesDeck, ...bothImportedVault });
    // when
    const deckEnabled = await page.isDeckRadioEnabled(deckName);
    const counter = await page.expectTextDisplayed("2/2");
    // then
    expect(deckEnabled).toBe(true);
    expect(counter).toBeInTheDocument();
  });

  test("given the first page when rendered then shows Cancel without Back and when Cancel is clicked then closes the modal", async () => {
    // given
    page = ImportModalPO.render(languageDeckFixture);
    // when
    const backVisible = await page.isBackButtonVisible();
    // then
    expect(backVisible).toBe(false);
    // when
    await page.clickCancelButton();
    // then
    const modalOpen = await page.isModalOpen();
    expect(modalOpen).toBe(false);
  });

  test("given deck notes when the cards page is reached then shows Import in the footer instead of Next", async () => {
    // given
    page = ImportModalPO.render(languageDeckWithNote);
    // when
    await page.chooseDeck(deckName);
    await page.clickNextButton();
    await page.expectTextDisplayed(mappedFieldsPattern);
    await page.clickNextButton();
    await page.expectTextDisplayed(cardsToImportPattern);
    const importVisible = await page.isImportButtonVisible();
    const importEnabled = await page.isImportButtonEnabled();
    const nextVisible = await page.isNextButtonVisible();
    // then
    expect(importVisible).toBe(true);
    expect(importEnabled).toBe(true);
    expect(nextVisible).toBe(false);
  });

  test("given a ready import when the footer Import is clicked then shows only the summary with OK closing the window", async () => {
    // given
    page = ImportModalPO.render(languageDeckWithNote);
    // when
    await page.chooseDeck(deckName);
    await page.clickNextButton();
    await page.expectTextDisplayed(mappedFieldsPattern);
    await page.clickNextButton();
    await page.expectTextDisplayed(cardsToImportPattern);
    await page.clickImportButton();
    const summary = await page.expectTextDisplayed(createdPattern);
    const importVisible = await page.isImportButtonVisible();
    const nextVisible = await page.isNextButtonVisible();
    const backVisible = await page.isBackButtonVisible();
    const cancelVisible = await page.isCancelButtonVisible();
    // then
    expect(summary).toBeInTheDocument();
    expect(importVisible).toBe(false);
    expect(nextVisible).toBe(false);
    expect(backVisible).toBe(false);
    expect(cancelVisible).toBe(false);
    // when
    await page.clickOkButton();
    // then
    const modalOpen = await page.isModalOpen();
    expect(modalOpen).toBe(false);
  });
});
