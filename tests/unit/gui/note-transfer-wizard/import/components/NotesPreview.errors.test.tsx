/**
 * @jest-environment jsdom
 *
 * When Anki is unreachable the import preview fails with a message instead of
 * hanging on the loading state.
 */
import "obsidian-test-mocks/jest-setup";
import { render, screen } from "@testing-library/react";
import type { Vault as ObsidianVault } from "obsidian";
import { App } from "obsidian-test-mocks/obsidian";
import { Anki } from "src/services/anki/anki";
import { t } from "src/i18n";
import {
  NotesPreview,
  type NotesPreviewProps,
} from "src/gui/note-transfer-wizard/import/components/NotesPreview";
import { AnkiConnectMock } from "../../../../../mocks/anki-connect";

AnkiConnectMock.install();

beforeEach(() => {
  AnkiConnectMock.reset();
});

test("given Anki is unreachable when the preview loads then it reports the failure", async () => {
  // given
  AnkiConnectMock.setConnectionDown(true);
  const app = App.createConfigured__({ files: {} });
  const props: NotesPreviewProps = {
    anki: new Anki(),
    currentPage: 0,
    deckName: "Languages",
    forcedNoteIds: {},
    highlightKey: null,
    initialQuery: "",
    noteLifecycle: {},
    notesSelectedToImport: {},
    onForcedNoteIdsChange: jest.fn(),
    onNotesLoaded: jest.fn(),
    onNotesSelectedToImportChange: jest.fn(),
    onPageChange: jest.fn(),
    onTotalPagesChange: jest.fn(),
    totalPages: 1,
    vault: app.vault as unknown as ObsidianVault,
    vaultNoteIndex: new Map(),
  };

  // when
  render(<NotesPreview {...props} />);
  const message = await screen.findByText(t("errors.couldNotLoadNotes"));

  // then
  expect(message).toBeInTheDocument();
});
