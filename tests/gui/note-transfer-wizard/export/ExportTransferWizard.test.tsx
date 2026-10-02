/**
 * @jest-environment jsdom
 *
 * Integration tests for the ExportTransferWizard: real in-memory vault
 * plus mocked AnkiConnect, asserting the three pages, footer buttons
 * and the executed export report.
 */
import "obsidian-test-mocks/jest-setup";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "obsidian-test-mocks/obsidian";
import type { Vault as ObsidianVault } from "obsidian";
import { ExportTransferWizard } from "src/gui/note-transfer-wizard/export/ExportTransferWizard";
import { createSettings } from "../../../helpers/settings";
import { ankiResponder } from "../../../helpers/anki-responder";
import { AnkiConnectMock } from "../../../mocks/anki-connect";

AnkiConnectMock.install();

beforeEach(() => {
  AnkiConnectMock.reset();
});

const responder = ankiResponder();

function noteBlock(front: string): string {
  return ["```note-form", `front: ${front}`, "back: B", 'tags: ""', "```"].join(
    "\n",
  );
}

function renderWizard(files: Record<string, string> = {}) {
  responder.respondWith();
  const app = App.createConfigured__({ files });
  const onCancel = jest.fn();
  const saveSettings = jest.fn(async (): Promise<void> => undefined);
  render(
    <ExportTransferWizard
      onCancel={onCancel}
      saveSettings={saveSettings}
      settings={createSettings()}
      vault={app.vault as unknown as ObsidianVault}
    />,
  );
  return { onCancel };
}

describe("ExportTransferWizard", () => {
  test("given the wizard when opened then shows the three page indicator labels", async () => {
    // given
    renderWizard({ "Languages/Q.md": `${noteBlock("What is 2+2?")}\n` });

    // when
    const deck = await screen.findByText("Deck");
    const notes = await screen.findByText("Notes");
    const save = await screen.findByText("Save");

    // then
    expect(deck).toBeInTheDocument();
    expect(notes).toBeInTheDocument();
    expect(save).toBeInTheDocument();
  });

  test("given no folder selected when the page loads then Next is disabled until a folder is chosen", async () => {
    // given
    renderWizard({ "Languages/Q.md": `${noteBlock("What is 2+2?")}\n` });
    const user = userEvent.setup();

    // when
    const nextBefore = await screen.findByRole("button", { name: /Next/ });

    // then
    expect(nextBefore).toBeDisabled();

    // when
    await user.click(await screen.findByRole("radio", { name: /Languages/ }));
    const nextAfter = await screen.findByRole("button", { name: /Next/ });

    // then
    expect(nextAfter).not.toBeDisabled();
  });

  test("given a folder when the notes page is reached then shows Export in the footer and executes on the save page", async () => {
    // given
    renderWizard({ "Languages/Q.md": `${noteBlock("What is 2+2?")}\n` });
    const user = userEvent.setup();
    await user.click(await screen.findByRole("radio", { name: /Languages/ }));
    await user.click(await screen.findByRole("button", { name: /Next/ }));
    await screen.findByText("What is 2+2?");

    // when
    await user.click(await screen.findByRole("button", { name: "Export" }));
    const report = await screen.findByText(/Created: 1/);

    // then
    expect(report).toBeInTheDocument();
  });
});
