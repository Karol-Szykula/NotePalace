/**
 * @jest-environment jsdom
 *
 * Smoke test for the import modal page object: opens the modal with a real
 * in-memory vault and mocked AnkiConnect, then reads the wizard steps.
 */
import "obsidian-test-mocks/jest-setup";
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

describe("ImportModalPO", () => {
  test("given a deck in Anki when the import modal opens then shows the import wizard steps", async () => {
    // given
    const fixture = { decks: { Languages: [1111111111111] } };
    // when
    page = ImportModalPO.render(fixture);
    const titles = await page.pageIndicatorTitles();
    // then
    expect(titles).toEqual(["Deck", "Fields", "Notes", "Save"]);
  });
});
