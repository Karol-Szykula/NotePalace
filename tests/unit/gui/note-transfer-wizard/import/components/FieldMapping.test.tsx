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
import { t } from "src/i18n";
import {
  notesToImportPattern,
  mappedFieldsPattern,
} from "src/gui/note-transfer-wizard/shared/utils/summary-patterns";
import { ankiResponder } from "../../../../../helpers/anki-responder";
import { required } from "../../../../../helpers/required";
import { createSettings } from "../../../../../helpers/settings";
import { AnkiConnectMock } from "../../../../../mocks/anki-connect";

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
  await screen.findByText(mappedFieldsPattern);
  const selects = screen.getAllByRole("combobox") as HTMLSelectElement[];
  // then
  expect(selects.some((select) => select.value === "Extra")).toBe(true);
});

test("given two fields when both claim the same target then only the last keeps it", async () => {
  // given
  responder.respondWith({
    decks: { [deckName]: [customModelNote.noteId] },
    notes: [customModelNote],
  });
  render(
    <FieldMapping
      anki={new Anki()}
      deckName={deckName}
      onMappingsChange={jest.fn()}
      savedMappings={{}}
    />,
  );
  await screen.findByText(mappedFieldsPattern);
  const selects = screen.getAllByRole("combobox") as HTMLSelectElement[];
  const first = required(selects[0], "first field select");
  const second = required(selects[1], "second field select");
  const user = userEvent.setup();
  // when
  await user.selectOptions(first, "Front");
  await user.selectOptions(second, "Front");
  // then
  const fronts = selects.filter((select) => select.value === "Front");
  expect(fronts).toHaveLength(1);
  expect(required(fronts[0], "front holder")).toBe(second);
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
  await user.click(
    await screen.findByRole("button", {
      name: t("wizard.next"),
    }),
  );
  await screen.findByText(mappedFieldsPattern);
  await user.click(
    await screen.findByRole("button", {
      name: t("wizard.next"),
    }),
  );
  await screen.findByText(notesToImportPattern);
  // then
  const vault = app.vault as unknown as ObsidianVault;
  const adapter = vault.adapter as unknown as {
    exists(path: string): Promise<boolean>;
  };
  const packExists = await adapter.exists(customPackPath);
  expect(packExists).toBe(false);
});
