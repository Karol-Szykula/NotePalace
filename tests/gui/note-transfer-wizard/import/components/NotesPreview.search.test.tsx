/**
 * @jest-environment jsdom
 *
 * User-perspective tests for the import notes preview search: filtering by
 * fields, tags and model, case/diacritic folding, clearing, full-list counts
 * and filtered select-all/pagination.
 */
import "obsidian-test-mocks/jest-setup";
import { cloneElement, type ReactElement } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Vault as ObsidianVault } from "obsidian";
import { App } from "obsidian-test-mocks/obsidian";
import { Anki } from "src/services/anki/anki";
import {
  NotesPreview,
  type NotesPreviewProps,
} from "src/gui/note-transfer-wizard/import/components/NotesPreview";
import { AnkiConnectMock } from "../../../../mocks/anki-connect";

AnkiConnectMock.install();

beforeEach(() => {
  AnkiConnectMock.reset();
});

const searchLabel = "Search notes";

interface NoteOptions {
  readonly modelName?: string;
  readonly tags?: string[];
}

function searchNote(noteId: number, front: string, options: NoteOptions = {}) {
  return {
    noteId,
    mod: 100,
    modelName: options.modelName ?? "Basic",
    fields: { Front: { value: `<p>${front}</p>` } },
    tags: options.tags ?? [],
    cards: [7],
  };
}

type SearchNote = ReturnType<typeof searchNote>;

function respondWithNotes(notes: SearchNote[]): void {
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

interface RenderedPreview {
  readonly element: ReactElement<NotesPreviewProps>;
  readonly onNotesSelectedToImportChange: jest.Mock;
  readonly onTotalPagesChange: jest.Mock;
  readonly rerender: (element: ReactElement<NotesPreviewProps>) => void;
}

interface PreviewOptions {
  readonly currentPage?: number;
  readonly deckName?: string;
  readonly selected?: Record<number, boolean>;
}

function renderPreview(
  notes: SearchNote[],
  options: PreviewOptions = {},
): RenderedPreview {
  respondWithNotes(notes);
  const onNotesSelectedToImportChange = jest.fn();
  const onTotalPagesChange = jest.fn();
  const app = App.createConfigured__({ files: {} });
  const vault = app.vault as unknown as ObsidianVault;
  const element = (
    <NotesPreview
      anki={new Anki()}
      currentPage={options.currentPage ?? 0}
      deckName={options.deckName ?? "Languages"}
      forcedNoteIds={{}}
      noteLifecycle={{}}
      notesSelectedToImport={options.selected ?? {}}
      onForcedNoteIdsChange={jest.fn()}
      onNotesLoaded={jest.fn()}
      onNotesSelectedToImportChange={onNotesSelectedToImportChange}
      onPageChange={jest.fn()}
      onTotalPagesChange={onTotalPagesChange}
      totalPages={1}
      vault={vault}
      vaultNoteIndex={new Map()}
    />
  );
  const { rerender } = render(element);
  return {
    element,
    onNotesSelectedToImportChange,
    onTotalPagesChange,
    rerender: (next) => rerender(next),
  };
}

async function typeQuery(text: string): Promise<void> {
  await userEvent.type(
    screen.getByRole("textbox", { name: searchLabel }),
    text,
  );
}

describe("import NotesPreview search", () => {
  test("given notes when a field query is typed then only matching notes remain", async () => {
    // given
    const notes = [
      searchNote(101, "Fresh card"),
      searchNote(102, "Anki newer card"),
    ];
    renderPreview(notes);
    await screen.findByText("Fresh card");

    // when
    await typeQuery("newer");

    // then
    await waitFor(() =>
      expect(screen.queryByText("Fresh card")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Anki newer card")).toBeInTheDocument();
  });

  test("given a tagged note when its tag is typed then the note remains", async () => {
    // given
    const notes = [
      searchNote(101, "Fresh card", { tags: ["Poland"] }),
      searchNote(102, "Anki newer card"),
    ];
    renderPreview(notes);
    await screen.findByText("Fresh card");

    // when
    await typeQuery("poland");

    // then
    await waitFor(() =>
      expect(screen.queryByText("Anki newer card")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Fresh card")).toBeInTheDocument();
  });

  test("given a note with a model when the model name is typed then the note remains", async () => {
    // given
    const notes = [
      searchNote(101, "Fresh card"),
      searchNote(102, "Anki newer card", { modelName: "Cloze" }),
    ];
    renderPreview(notes);
    await screen.findByText("Fresh card");

    // when
    await typeQuery("cloze");

    // then
    await waitFor(() =>
      expect(screen.queryByText("Fresh card")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Anki newer card")).toBeInTheDocument();
  });

  test("given a diacritic note when its ascii query is typed then it remains", async () => {
    // given
    const notes = [
      searchNote(101, "Łódź guide"),
      searchNote(102, "Fresh card"),
    ];
    renderPreview(notes);
    await screen.findByText("Łódź guide");

    // when
    await typeQuery("lodz");

    // then
    await waitFor(() =>
      expect(screen.queryByText("Fresh card")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Łódź guide")).toBeInTheDocument();
  });

  test("given a query hiding selected notes when filtered then the full total stays", async () => {
    // given
    const notes = [
      searchNote(101, "Fresh card"),
      searchNote(102, "Anki newer card"),
      searchNote(103, "Both changed card"),
    ];
    renderPreview(notes);
    await screen.findByText("Fresh card");

    // when
    await typeQuery("fresh");

    // then
    await waitFor(() =>
      expect(screen.queryByText("Anki newer card")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Notes to import: 3/3.")).toBeInTheDocument();
  });

  test("given a query with no matches when filtered then the empty state names the query", async () => {
    // given
    const notes = [searchNote(101, "Fresh card")];
    renderPreview(notes);
    await screen.findByText("Fresh card");

    // when
    await typeQuery("zzz");

    // then
    expect(
      await screen.findByText("No notes match \u201czzz\u201d."),
    ).toBeInTheDocument();
  });

  test("given a filtered list when the clear control is activated then every note returns", async () => {
    // given
    const notes = [
      searchNote(101, "Fresh card"),
      searchNote(102, "Anki newer card"),
    ];
    renderPreview(notes);
    await screen.findByText("Fresh card");
    await typeQuery("newer");
    await waitFor(() =>
      expect(screen.queryByText("Fresh card")).not.toBeInTheDocument(),
    );

    // when
    await userEvent.click(screen.getByRole("button", { name: "Clear search" }));

    // then
    expect(await screen.findByText("Fresh card")).toBeInTheDocument();
  });

  test("given a filtered list when Escape is pressed then every note returns", async () => {
    // given
    const notes = [
      searchNote(101, "Fresh card"),
      searchNote(102, "Anki newer card"),
    ];
    renderPreview(notes);
    await screen.findByText("Fresh card");
    await typeQuery("newer");
    await waitFor(() =>
      expect(screen.queryByText("Fresh card")).not.toBeInTheDocument(),
    );

    // when
    await userEvent.type(
      screen.getByRole("textbox", { name: searchLabel }),
      "{Escape}",
    );

    // then
    expect(await screen.findByText("Fresh card")).toBeInTheDocument();
  });

  test("given a query when the deck changes then the search is emptied", async () => {
    // given
    const notes = [searchNote(101, "Fresh card")];
    const { element, rerender } = renderPreview(notes);
    await screen.findByText("Fresh card");
    await typeQuery("fresh");
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: searchLabel })).toHaveValue(
        "fresh",
      ),
    );

    // when
    rerender(cloneElement(element, { deckName: "Other deck" }));

    // then
    await screen.findByText("Fresh card");
    expect(screen.getByRole("textbox", { name: searchLabel })).toHaveValue("");
  });

  test("given a filtered set when select-all is used then only the filtered notes are selected", async () => {
    // given
    const notes = [
      searchNote(101, "Fresh card"),
      searchNote(102, "Anki newer card"),
    ];
    const { onNotesSelectedToImportChange } = renderPreview(notes, {
      selected: { 101: false, 102: false },
    });
    await screen.findByText("Fresh card");
    await typeQuery("fresh");
    await waitFor(() =>
      expect(screen.queryByText("Anki newer card")).not.toBeInTheDocument(),
    );

    // when
    await userEvent.click(
      screen.getByRole("checkbox", { name: "Select all notes on this page" }),
    );

    // then
    expect(onNotesSelectedToImportChange).toHaveBeenLastCalledWith({
      101: true,
      102: false,
    });
  });

  test("given more than one page when a query narrows the list then the page count follows it", async () => {
    // given
    const fillers = Array.from({ length: 100 }, (_, index) =>
      searchNote(1000 + index, `Filler ${index}`),
    );
    const notes = [searchNote(1, "Unique needle"), ...fillers];
    const { onTotalPagesChange } = renderPreview(notes, { currentPage: 1 });
    await screen.findByRole("textbox", { name: searchLabel });

    // when
    await typeQuery("needle");

    // then
    await waitFor(() => expect(onTotalPagesChange).toHaveBeenLastCalledWith(1));
  }, 15000);
});
