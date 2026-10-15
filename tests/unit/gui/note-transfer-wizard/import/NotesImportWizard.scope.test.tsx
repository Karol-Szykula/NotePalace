/**
 * @jest-environment jsdom
 *
 * The import wizard as it opens from the note you are in: it lands on the
 * preview with the note's deck and front, or starts at the deck page and says
 * why it could not be scoped.
 */
import "obsidian-test-mocks/jest-setup";
import { render, screen } from "@testing-library/react";
import type { Vault as ObsidianVault } from "obsidian";
import { App } from "obsidian-test-mocks/obsidian";
import type { AnkiNoteInfo } from "src/entities/anki-note";
import { t } from "src/i18n";
import { NotesImportWizard } from "src/gui/note-transfer-wizard/import/NotesImportWizard";
import { scopedScope, unavailableScope } from "@shared/utils/active-note-scope";
import { ankiResponder } from "../../../../helpers/anki-responder";
import { createSettings } from "../../../../helpers/settings";
import { AnkiConnectMock } from "../../../../mocks/anki-connect";

AnkiConnectMock.install();

beforeEach(() => {
  AnkiConnectMock.reset();
});

const responder = ankiResponder();

const deckName = "Languages";

const freshNote: AnkiNoteInfo = {
  cards: [7],
  fields: { Front: { value: "<p>Fresh card</p>" } },
  mod: 100,
  modelName: "Basic",
  noteId: 101,
  tags: [],
};

function renderWizard(activeScope: ReturnType<typeof scopedScope>): void {
  responder.respondWith({ decks: { [deckName]: [101] }, notes: [freshNote] });
  const app = App.createConfigured__({ files: {} });
  render(
    <NotesImportWizard
      activeScope={activeScope}
      onCancel={jest.fn()}
      saveSettings={jest.fn(async (): Promise<void> => undefined)}
      settings={createSettings()}
      vault={app.vault as unknown as ObsidianVault}
    />,
  );
}

test("given a scoped deck when the import wizard opens then it lands on the preview with the note's front as the search", async () => {
  // given
  const activeScope = scopedScope(deckName, {
    deckName: "languages",
    noteId: 101,
    query: "Fresh",
  });

  // when
  renderWizard(activeScope);
  const search = await screen.findByRole("textbox", { name: "Search notes" });

  // then
  expect(search).toHaveValue("Fresh");
  expect(await screen.findByText("Fresh card")).toBeInTheDocument();
  expect(
    await screen.findByRole("button", { name: t("wizard.import") }),
  ).toBeInTheDocument();
});

test("given no usable active note when the import wizard opens then it starts at the deck page with a notice", async () => {
  // given
  const activeScope = unavailableScope();

  // when
  renderWizard(activeScope);

  // then
  expect(
    await screen.findByText(t("preview.scopeUnavailable")),
  ).toBeInTheDocument();
  expect(
    await screen.findByRole("radio", { name: /Languages/ }),
  ).toBeInTheDocument();
});
