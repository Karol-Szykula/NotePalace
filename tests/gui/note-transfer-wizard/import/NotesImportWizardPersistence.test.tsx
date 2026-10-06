/**
 * @jest-environment jsdom
 *
 * Import wizard persistence: field mappings and model packs reach app storage
 * only after a successful import, while the open wizard keeps its own mapping
 * session across page and deck changes.
 */
import "obsidian-test-mocks/jest-setup";
import { render, screen } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { App } from "obsidian-test-mocks/obsidian";
import type { Vault as ObsidianVault } from "obsidian";
import { NotesImportWizard } from "src/gui/note-transfer-wizard/import/NotesImportWizard";
import type { ISettings } from "src/conf/settings";
import { createSettings } from "../../../helpers/settings";
import { AnkiConnectMock } from "../../../mocks/anki-connect";

AnkiConnectMock.install();

beforeEach(() => {
  AnkiConnectMock.reset();
});

const customPackPath = ".obsidian/plugins/notepalace/packs/My-Model.json";

interface FixtureNote {
  cards: number[];
  fields: Record<string, { value: string }>;
  mod: number;
  modelName: string;
  noteId: number;
  tags: string[];
}

const languageNote: FixtureNote = {
  cards: [7],
  fields: {
    Answer: { value: "<p>A</p>" },
    Question: { value: "<p>Q</p>" },
  },
  mod: 100,
  modelName: "My Model",
  noteId: 1111111111111,
  tags: [],
};

const capitalNote: FixtureNote = {
  cards: [9],
  fields: {
    City: { value: "<p>Paris</p>" },
    Country: { value: "<p>France</p>" },
  },
  mod: 100,
  modelName: "Other Model",
  noteId: 2222222222222,
  tags: [],
};

const fixtureNotes: FixtureNote[] = [languageNote, capitalNote];

function respondWithNotes({ isVanishingAtImport = false } = {}): void {
  let notesInfoCalls = 0;
  AnkiConnectMock.setResponder((request) => {
    switch (request.action) {
      case "deckNames":
        return { result: ["Languages", "Capitals"], error: null };
      case "findNotes": {
        const params = request.params as Record<string, unknown>;
        const query = params["query"] as string;
        const deckNote = query.includes("Capitals")
          ? capitalNote
          : languageNote;
        return { result: [deckNote.noteId], error: null };
      }
      case "notesInfo": {
        notesInfoCalls += 1;
        if (isVanishingAtImport && notesInfoCalls > 2) {
          return { result: [], error: null };
        }
        const params = request.params as { notes: number[] };
        return {
          result: fixtureNotes.filter((note) =>
            params.notes.includes(note.noteId),
          ),
          error: null,
        };
      }
      case "cardsInfo": {
        const params = request.params as { cards: number[] };
        return {
          result: params.cards.map((cardId) => ({
            cardId,
            deckName: cardId === 9 ? "Capitals" : "Languages",
          })),
          error: null,
        };
      }
      default:
        return { result: null, error: null };
    }
  });
}

function openWizard(settings: ISettings) {
  const app = App.createConfigured__({ files: {} });
  const onCancel = jest.fn();
  const saveSettings = jest.fn(async (): Promise<void> => undefined);
  const { unmount } = render(
    <NotesImportWizard
      onCancel={onCancel}
      saveSettings={saveSettings}
      settings={settings}
      vault={app.vault as unknown as ObsidianVault}
    />,
  );
  return { app, saveSettings, settings, unmount };
}

async function selectTarget(
  index: number,
  target: string,
  user: UserEvent,
): Promise<void> {
  const selects = screen.getAllByRole("combobox");
  const select = selects[index];
  if (select === undefined) {
    throw new Error(`missing mapping select at index ${index}`);
  }
  await user.selectOptions(select, target);
}

async function openFieldsPage(deckName: string, user: UserEvent) {
  const deckRadio = await screen.findByRole("radio", {
    name: new RegExp(deckName),
  });
  await user.click(deckRadio);
  await user.click(await screen.findByRole("button", { name: /Next: Fields/ }));
  await screen.findByText(/Map fields for deck/);
}

function mappingTargets(): string[] {
  return (screen.getAllByRole("combobox") as HTMLSelectElement[]).map(
    (select) => select.value,
  );
}

function adapterOf(app: ReturnType<typeof App.createConfigured__>) {
  const vault = app.vault as unknown as ObsidianVault;
  return vault.adapter as unknown as {
    exists(path: string): Promise<boolean>;
    read(path: string): Promise<string>;
  };
}

test("given a mapping chosen when the wizard returns to the fields page then the mapping is still selected", async () => {
  // given
  respondWithNotes();
  const settings = createSettings();
  const user = userEvent.setup();
  openWizard(settings);
  await openFieldsPage("Languages", user);

  // when
  await selectTarget(0, "Front", user);
  await user.click(await screen.findByRole("button", { name: /Next: Cards/ }));
  await screen.findByText(/Cards to import: 1\/1/);
  await user.click(await screen.findByRole("button", { name: /Back/ }));
  const targets = mappingTargets();

  // then
  expect(targets[0]).toBe("Front");
});

test("given a mapping chosen when the wizard advances past the fields page then settings stay untouched", async () => {
  // given
  respondWithNotes();
  const settings = createSettings();
  const user = userEvent.setup();
  const { saveSettings } = openWizard(settings);
  await openFieldsPage("Languages", user);

  // when
  await selectTarget(0, "Front", user);
  await user.click(await screen.findByRole("button", { name: /Next: Cards/ }));
  await screen.findByText(/Cards to import: 1\/1/);

  // then
  expect(saveSettings).not.toHaveBeenCalled();
  expect(settings.fieldMappings).toEqual({});
});

test("given a mapping abandoned when the wizard opens again then the default mapping is preselected", async () => {
  // given
  respondWithNotes();
  const settings = createSettings();
  const user = userEvent.setup();
  const { unmount } = openWizard(settings);
  await openFieldsPage("Languages", user);
  await selectTarget(0, "Front", user);
  await user.click(await screen.findByRole("button", { name: /Next: Cards/ }));
  await screen.findByText(/Cards to import: 1\/1/);
  unmount();

  // when
  openWizard(settings);
  await openFieldsPage("Languages", user);
  const targets = mappingTargets();

  // then
  expect(targets[0]).toBe("Skip");
});

test("given an import completed when the wizard opens again then the chosen mapping is preselected", async () => {
  // given
  respondWithNotes();
  const settings = createSettings();
  const user = userEvent.setup();
  const { unmount } = openWizard(settings);
  await openFieldsPage("Languages", user);
  await selectTarget(0, "Front", user);
  await user.click(await screen.findByRole("button", { name: /Next: Cards/ }));
  await screen.findByText(/Cards to import: 1\/1/);
  await user.click(await screen.findByRole("button", { name: "Import" }));
  await screen.findByText(/Created: 1/);
  unmount();

  // when
  openWizard(settings);
  await openFieldsPage("Languages", user);
  const targets = mappingTargets();

  // then
  expect(targets[0]).toBe("Front");
});

test("given a custom model mapping when the import runs then the note is created", async () => {
  // given
  respondWithNotes();
  const settings = createSettings();
  const user = userEvent.setup();
  openWizard(settings);
  await openFieldsPage("Languages", user);
  await selectTarget(0, "Front", user);
  await selectTarget(1, "Back", user);
  await user.click(await screen.findByRole("button", { name: /Next: Cards/ }));
  await screen.findByText(/Cards to import: 1\/1/);

  // when
  await user.click(await screen.findByRole("button", { name: "Import" }));
  const summary = await screen.findByText(/Created: 1/);

  // then
  expect(summary).toBeInTheDocument();
});

test("given a note that vanished from Anki when the import finishes then the pack is written", async () => {
  // given
  respondWithNotes({ isVanishingAtImport: true });
  const settings = createSettings();
  const user = userEvent.setup();
  const { app } = openWizard(settings);
  await openFieldsPage("Languages", user);
  await selectTarget(0, "Front", user);
  await user.click(await screen.findByRole("button", { name: /Next: Cards/ }));
  await screen.findByText(/Cards to import: 1\/1/);

  // when
  await user.click(await screen.findByRole("button", { name: "Import" }));
  const summary = await screen.findByText(/Created: 0/);
  const packExists = await adapterOf(app).exists(customPackPath);

  // then
  expect(summary).toBeInTheDocument();
  expect(packExists).toBe(true);
});

test("given a mapping chosen for a deck when another deck is selected and the first is picked again then the mapping is still selected", async () => {
  // given
  respondWithNotes();
  const settings = createSettings();
  const user = userEvent.setup();
  openWizard(settings);
  await openFieldsPage("Languages", user);
  await selectTarget(0, "Front", user);

  // when
  await user.click(await screen.findByRole("button", { name: /Back/ }));
  await user.click(await screen.findByRole("radio", { name: /Capitals/ }));
  await user.click(await screen.findByRole("button", { name: /Next: Fields/ }));
  await screen.findByText(/Map fields for deck "Capitals"/);
  await user.click(await screen.findByRole("button", { name: /Back/ }));
  await user.click(await screen.findByRole("radio", { name: /Languages/ }));
  await user.click(await screen.findByRole("button", { name: /Next: Fields/ }));
  await screen.findByText(/Map fields for deck "Languages"/);
  const targets = mappingTargets();

  // then
  expect(targets[0]).toBe("Front");
});
