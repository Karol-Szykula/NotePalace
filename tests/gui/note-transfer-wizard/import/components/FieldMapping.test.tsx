/**
 * @jest-environment jsdom
 *
 * FieldMapping behaviors that stay outside the page objects: the default pack
 * preselection for built-in models and the guarantee that no model pack is
 * written while the wizard is still open.
 */
import "obsidian-test-mocks/jest-setup";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "obsidian-test-mocks/obsidian";
import type { Vault as ObsidianVault } from "obsidian";
import type { AnkiNoteInfo } from "src/entities/anki-note";
import { Anki } from "src/services/anki/anki";
import { NotesImportWizard } from "src/gui/note-transfer-wizard/import/NotesImportWizard";
import { FieldMapping } from "src/gui/note-transfer-wizard/import/components/FieldMapping";
import { ankiResponder } from "../../../../helpers/anki-responder";
import { createSettings } from "../../../../helpers/settings";
import { AnkiConnectMock } from "../../../../mocks/anki-connect";

AnkiConnectMock.install();

beforeEach(() => {
  AnkiConnectMock.reset();
});

const responder = ankiResponder();

const deckName = "Languages";
const noteId = 1111111111111;
const customPackPath = ".obsidian/plugins/notepalace/packs/My-Model.json";

const clozeNote: AnkiNoteInfo = {
  cards: [7],
  fields: {
    Extra: { value: "<p>Capital</p>" },
    Text: { value: "<p>Paris is {{c1::France}}</p>" },
  },
  mod: 100,
  modelName: "Cloze",
  noteId,
  tags: [],
};

const customModelNote: AnkiNoteInfo = {
  cards: [8],
  fields: {
    Answer: { value: "<p>A</p>" },
    Question: { value: "<p>Q</p>" },
  },
  mod: 100,
  modelName: "My Model",
  noteId,
  tags: [],
};

test("given a cloze deck when the fields page loads then preselects the pack mapping", async () => {
  // given
  responder.respondWith({
    decks: { [deckName]: [clozeNote.noteId] },
    notes: [clozeNote],
  });
  render(
    <FieldMapping
      anki={new Anki()}
      deckName={deckName}
      onMappingsChange={jest.fn()}
      savedMappings={{}}
    />,
  );
  // when
  await screen.findByText(/Map fields for deck/);
  const selects = screen.getAllByRole("combobox") as HTMLSelectElement[];
  // then
  expect(selects.some((select) => select.value === "Extra")).toBe(true);
});

test("given a custom model when advancing past fields then no pack is written", async () => {
  // given
  responder.respondWith({
    decks: { [deckName]: [customModelNote.noteId] },
    notes: [customModelNote],
  });
  const app = App.createConfigured__({ files: {} });
  const onCancel = jest.fn();
  const saveSettings = jest.fn(async (): Promise<void> => undefined);
  render(
    <NotesImportWizard
      onCancel={onCancel}
      saveSettings={saveSettings}
      settings={createSettings()}
      vault={app.vault as unknown as ObsidianVault}
    />,
  );
  const user = userEvent.setup();
  // when
  await user.click(await screen.findByRole("radio", { name: /Languages/ }));
  await user.click(await screen.findByRole("button", { name: /Next: Fields/ }));
  await screen.findByText(/Map fields for deck/);
  await user.click(await screen.findByRole("button", { name: /Next: Cards/ }));
  await screen.findByText(/Cards to import: 1\/1/);
  // then
  const vault = app.vault as unknown as ObsidianVault;
  const adapter = vault.adapter as unknown as {
    exists(path: string): Promise<boolean>;
  };
  const packExists = await adapter.exists(customPackPath);
  expect(packExists).toBe(false);
});
