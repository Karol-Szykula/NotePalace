/**
 * @jest-environment jsdom
 *
 * The import preview as it opens from the note you are in: the note's front
 * seeds the search, its row is the one highlighted, and a search matching
 * nothing points back at the deck it came from.
 */
import "obsidian-test-mocks/jest-setup";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Vault as ObsidianVault } from "obsidian";
import { App } from "obsidian-test-mocks/obsidian";
import { Anki } from "src/services/anki/anki";
import { t } from "src/i18n";
import { noteTransferWizardClasses } from "@shared/classes";
import {
  NotesPreview,
  type NotesPreviewProps,
} from "src/gui/note-transfer-wizard/import/components/NotesPreview";
import { AnkiConnectMock } from "../../../../../mocks/anki-connect";

AnkiConnectMock.install();

beforeEach(() => {
  AnkiConnectMock.reset();
});

function searchNote(noteId: number, front: string) {
  return {
    noteId,
    mod: 100,
    modelName: "Basic",
    fields: { Front: { value: `<p>${front}</p>` } },
    tags: [],
    cards: [7],
  };
}

function respondWithNotes(fronts: string[]): void {
  const notes = fronts.map((front, index) => searchNote(101 + index, front));
  AnkiConnectMock.setResponder((request) => {
    if (request.action === "findNotes") {
      return { result: notes.map((note) => note.noteId), error: null };
    }
    if (request.action === "notesInfo") {
      const requested = request.params["notes"] as number[] | undefined;
      const result =
        requested === undefined
          ? notes
          : notes.filter((note) => requested.includes(note.noteId));
      return { result, error: null };
    }
    return { result: null, error: null };
  });
}

interface ScopeOptions {
  readonly highlightKey?: number | null;
  readonly initialQuery?: string;
}

function renderScopedPreview(fronts: string[], options: ScopeOptions = {}) {
  respondWithNotes(fronts);
  const app = App.createConfigured__({ files: {} });
  const props: NotesPreviewProps = {
    anki: new Anki(),
    currentPage: 0,
    deckName: "Languages",
    forcedNoteIds: {},
    highlightKey: options.highlightKey ?? null,
    initialQuery: options.initialQuery ?? "",
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
  render(<NotesPreview {...props} />);
}

describe("import NotesPreview scope", () => {
  test("given a scoped front when the preview opens then only the matching note is listed", async () => {
    // given
    const fronts = ["Fresh note", "Other note"];
    renderScopedPreview(fronts, { initialQuery: "fresh" });

    // when
    const kept = await screen.findByText("Fresh note");

    // then
    expect(kept).toBeInTheDocument();
    expect(screen.queryByText("Other note")).not.toBeInTheDocument();
  });

  test("given a scoped note id when the preview opens then its row is highlighted", async () => {
    // given
    const fronts = ["Fresh note", "Other note"];
    renderScopedPreview(fronts, { highlightKey: 102 });

    // when
    const row = (await screen.findByText("Other note")).closest('[role="row"]');

    // then
    expect(row).toHaveClass(noteTransferWizardClasses.previewHighlight);
  });

  test("given a scoped front that matches nothing when the preview opens then the hint names the deck", async () => {
    // given
    const fronts = ["Fresh note"];
    renderScopedPreview(fronts, { initialQuery: "zzz" });

    // then
    expect(
      await screen.findByText(
        t("preview.scopedNoMatch", { deck: "Languages" }),
      ),
    ).toBeInTheDocument();
  });

  test("given a scoped front when the query is changed away then the hint falls back to the generic no-match message", async () => {
    // given
    const fronts = ["Fresh note"];
    renderScopedPreview(fronts, { initialQuery: "fresh" });
    await screen.findByText("Fresh note");

    // when
    await userEvent.type(
      screen.getByRole("textbox", { name: "Search notes" }),
      "zzz",
    );

    // then
    expect(await screen.findByText(/No notes match /)).toBeInTheDocument();
    expect(
      screen.queryByText(t("preview.scopedNoMatch", { deck: "Languages" })),
    ).not.toBeInTheDocument();
  });

  test("given a scoped front when the clear control is activated then the whole deck returns", async () => {
    // given
    const fronts = ["Fresh note", "Other note"];
    renderScopedPreview(fronts, { initialQuery: "fresh" });
    await screen.findByText("Fresh note");

    // when
    await userEvent.click(screen.getByRole("button", { name: "Clear search" }));

    // then
    expect(await screen.findByText("Other note")).toBeInTheDocument();
  });
});
