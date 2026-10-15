/**
 * @jest-environment jsdom
 *
 * The export wizard as it opens from the note you are in: it lands on the
 * notes preview with the note's folder and front, or starts at the folder
 * page and says why it could not be scoped.
 */
import "obsidian-test-mocks/jest-setup";
import { render, screen } from "@testing-library/react";
import type { Vault as ObsidianVault } from "obsidian";
import { App } from "obsidian-test-mocks/obsidian";
import { t } from "src/i18n";
import { ExportTransferWizard } from "src/gui/note-transfer-wizard/export/ExportTransferWizard";
import {
  scopedScope,
  unavailableScope,
  type WizardScope,
} from "@shared/utils/active-note-scope";
import { createSettings } from "../../../../helpers/settings";
import { AnkiConnectMock } from "../../../../mocks/anki-connect";

AnkiConnectMock.install();

beforeEach(() => {
  AnkiConnectMock.reset();
  AnkiConnectMock.setResponder((request) => ({
    error: null,
    result:
      request.action === "findNotes" || request.action === "notesInfo"
        ? []
        : null,
  }));
});

const deckName = "Languages";

function noteBlock(front: string, id: number): string {
  return [
    "```note-form",
    `front: ${front}`,
    "back: B",
    "model: Basic",
    `id: ${id}`,
    "```",
  ].join("\n");
}

function renderWizard(
  activeScope: WizardScope,
  files: Record<string, string>,
): void {
  const app = App.createConfigured__({ files });
  render(
    <ExportTransferWizard
      activeScope={activeScope}
      onCancel={jest.fn()}
      saveSettings={jest.fn(async (): Promise<void> => undefined)}
      settings={createSettings()}
      vault={app.vault as unknown as ObsidianVault}
    />,
  );
}

test("given a scoped folder when the export wizard opens then it lands on the notes preview with the note's front as the search", async () => {
  // given
  const activeScope = scopedScope(deckName, {
    deckName: "languages",
    noteId: 101,
    query: "Fresh",
  });
  const files = { "Languages/Note.md": `${noteBlock("Fresh note", 101)}\n` };

  // when
  renderWizard(activeScope, files);
  const search = await screen.findByRole("textbox", { name: "Search notes" });

  // then
  expect(search).toHaveValue("Fresh");
  expect(await screen.findByText("Fresh note")).toBeInTheDocument();
  expect(
    await screen.findByRole("button", { name: t("wizard.export") }),
  ).toBeInTheDocument();
});

test("given no usable active note when the export wizard opens then it starts at the folder page with a notice", async () => {
  // given
  const activeScope = unavailableScope();
  const files = { "Languages/Note.md": `${noteBlock("Fresh note", 101)}\n` };

  // when
  renderWizard(activeScope, files);

  // then
  expect(
    await screen.findByText(t("preview.scopeUnavailable")),
  ).toBeInTheDocument();
  expect(
    await screen.findByRole("radio", { name: /Languages/ }),
  ).toBeInTheDocument();
});
