/**
 * @jest-environment jsdom
 *
 * Whole-wizard export flows driven through the modal page object: folder
 * choice, step navigation and the executed export report.
 */
import "obsidian-test-mocks/jest-setup";
import { createdPattern } from "src/gui/note-transfer-wizard/shared/utils/summary-patterns";
import { waitFor } from "@testing-library/react";
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

function noteForm(front: string): string {
  return [
    "```note-form",
    `front: ${front}`,
    "back: B",
    'tags: ""',
    "```",
    "",
  ].join("\n");
}

const vaultWithOneNote = {
  files: { "Languages/Q.md": `${noteForm("What is 2+2?")}\n` },
};

describe("ExportModalFlow", () => {
  test("given note blocks in the vault when the export modal opens then shows all page indicator labels", async () => {
    // given
    page = ExportModalPO.render(vaultWithOneNote);
    // when
    const titles = await page.pageIndicatorTitles();
    // then
    expect(titles).toEqual(["Deck", "Notes", "Save"]);
  });

  test("given no folder selected when the export modal opens then Next is disabled until a folder is chosen", async () => {
    // given
    page = ExportModalPO.render(vaultWithOneNote);
    // when
    const nextDisabledBefore = await page.isNextButtonDisabled();
    // then
    expect(nextDisabledBefore).toBe(true);
    // when
    await page.chooseFolder(folderName);
    const nextDisabledAfter = await page.isNextButtonDisabled();
    // then
    expect(nextDisabledAfter).toBe(false);
  });

  test("given a folder when the export flow reaches the notes page then Export executes and reports the created notes", async () => {
    // given
    page = ExportModalPO.render(vaultWithOneNote);
    // when
    await page.chooseFolder(folderName);
    await page.clickNextButton();
    await page.expectTextDisplayed("What is 2+2?");
    await waitFor(() => expect(page).toBeDefined());
    await waitFor(() => page!.isNotePreselected());
    await page.goToSavePage();
    const report = await page.expectTextDisplayed(createdPattern);
    // then
    expect(report).toBeInTheDocument();
  });
});
