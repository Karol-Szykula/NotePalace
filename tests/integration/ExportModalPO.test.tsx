/**
 * @jest-environment jsdom
 *
 * Smoke test for the export modal page object: opens the modal with a real
 * in-memory vault and reads the wizard steps.
 */
import "obsidian-test-mocks/jest-setup";
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

describe("ExportModalPO", () => {
  test("given a folder with note blocks when the export modal opens then shows the export wizard steps", async () => {
    // given
    const noteBlock = [
      "```note-form",
      "front: Q",
      "back: B",
      'tags: ""',
      "```",
    ].join("\n");
    const fixture = { files: { "Languages/Q.md": `${noteBlock}\n` } };
    // when
    page = ExportModalPO.render(fixture);
    const titles = await page.pageIndicatorTitles();
    // then
    expect(titles).toEqual(["Deck", "Notes", "Save"]);
  });
});
