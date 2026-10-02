/**
 * @jest-environment jsdom
 *
 * User-perspective tests for the export wizard notes page: every row states
 * what will happen, only notes that will really be written are selected,
 * and every row offers "Obsidian wins" - a per-note force that takes
 * Obsidian's version no matter the state, in bulk or for one note.
 */
import "obsidian-test-mocks/jest-setup";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Anki } from "src/services/anki/anki";
import { NotesPreview } from "src/gui/note-transfer-wizard/export/components/NotesPreview";
import type { Vault as ObsidianVault } from "obsidian";
import { App } from "obsidian-test-mocks/obsidian";
import { computeContentHash } from "src/services/notes/content-hash";
import { syncedCleanRecord } from "src/services/notes/lifecycle";
import type { NoteLifecycleRecord } from "src/services/notes/lifecycle";
import { AnkiConnectMock } from "../../../../mocks/anki-connect";

AnkiConnectMock.install();

beforeEach(() => {
  AnkiConnectMock.reset();
});

function previewNote(noteId: number, mod: number, front: string) {
  return {
    noteId,
    mod,
    modelName: "Basic",
    fields: { Front: { value: `<p>${front}</p>` } },
    tags: [] as string[],
    cards: [7],
  };
}

type PreviewNote = ReturnType<typeof previewNote>;

interface PreviewScenario {
  files: Record<string, string>;
  forcedNoteIds?: Record<number, boolean>;
  noteLifecycle: Record<number, NoteLifecycleRecord>;
  notes: PreviewNote[];
}

function previewNotes(): PreviewNote[] {
  return [
    previewNote(101, 100, "Up to date card"),
    previewNote(104, 100, "Vault newer card"),
    previewNote(105, 500, "Both changed card"),
  ];
}

function respondWithNotes(notes: PreviewNote[]): void {
  AnkiConnectMock.setResponder((request) => {
    if (request.action === "notesInfo") {
      const params = request.params as { notes: number[] };
      return {
        result: notes.filter((note) => params.notes.includes(note.noteId)),
        error: null,
      };
    }
    return { result: null, error: null };
  });
}

function noteBlock(front: string, id: number | null): string {
  const lines = ["```note-form", `front: ${front}`, "back: B", 'tags: ""'];
  if (id !== null) {
    lines.push(`id: ${id}`);
  }
  lines.push("```");
  return lines.join("\n");
}

async function previewRecords(): Promise<Record<number, NoteLifecycleRecord>> {
  return {
    101: syncedCleanRecord(
      100,
      await computeContentHash("Up to date card", "B", "", "Basic"),
      0,
    ),
    104: syncedCleanRecord(
      100,
      await computeContentHash("Anki side text", "B", "", "Basic"),
      0,
    ),
    105: syncedCleanRecord(100, "stale", 0),
  };
}

async function defaultPreviewScenario(): Promise<PreviewScenario> {
  return {
    files: {
      "Languages/Fresh.md": `${noteBlock("Fresh note", null)}\n`,
      "Languages/Up to date-101.md": `${noteBlock("Up to date card", 101)}\n`,
      "Languages/Vault newer-104.md": `${noteBlock("Vault newer card", 104)}\n`,
      "Languages/Both changed-105.md": `${noteBlock("Both changed card", 105)}\n`,
    },
    noteLifecycle: await previewRecords(),
    notes: previewNotes(),
  };
}

async function renderPreview(scenarioOverride?: PreviewScenario) {
  const scenario = scenarioOverride ?? (await defaultPreviewScenario());
  respondWithNotes(scenario.notes);
  const onNotesSelectedToExportChange = jest.fn();
  const onForcedNoteIdsChange = jest.fn();
  const onStatusesLoaded = jest.fn();
  const onPageChange = jest.fn();
  const onTotalPagesChange = jest.fn();
  const app = App.createConfigured__({
    files: scenario.files,
  });
  const vault = app.vault as unknown as ObsidianVault;
  render(
    <NotesPreview
      anki={new Anki()}
      currentPage={0}
      deckName="Languages"
      forcedNoteIds={scenario.forcedNoteIds ?? {}}
      ignoredDirectories=""
      noteLifecycle={scenario.noteLifecycle}
      notesSelectedToExport={{}}
      onForcedNoteIdsChange={onForcedNoteIdsChange}
      onNotesSelectedToExportChange={onNotesSelectedToExportChange}
      onPageChange={onPageChange}
      onStatusesLoaded={onStatusesLoaded}
      onTotalPagesChange={onTotalPagesChange}
      totalPages={1}
      vault={vault}
    />,
  );
  return {
    onForcedNoteIdsChange,
    onNotesSelectedToExportChange,
    onStatusesLoaded,
  };
}

function previewRow(summaryText: string): HTMLElement {
  const summary = screen.getByText(summaryText);
  const row = summary.closest(
    "div.ankipalace-note-export-wizard-modal__preview-row",
  );
  if (row === null) {
    throw new Error(`No preview row found for ${summaryText}`);
  }
  return row as HTMLElement;
}

describe("NotesPreview", () => {
  test("given a new block without an id when the preview renders then its row is locked checked", async () => {
    // given
    await renderPreview();
    await screen.findByText("Fresh note");

    // when
    const row = previewRow("Fresh note");
    const box = within(row).getByRole("checkbox", { name: "" });

    // then
    expect(box).toBeChecked();
    expect(box).toBeDisabled();
  });

  test("given an unchanged block when the preview renders then it says nothing will be written", async () => {
    // given
    await renderPreview();
    await screen.findByText("Up to date card");

    // when
    const row = previewRow("Up to date card");

    // then
    expect(
      within(row).getByText(/Both sides match: nothing to write/),
    ).toBeInTheDocument();
  });

  test("given a vault-newer block when the preview renders then it says it will push", async () => {
    // given
    await renderPreview();
    await screen.findByText("Vault newer card");

    // when
    const row = previewRow("Vault newer card");

    // then
    expect(
      within(row).getByText(/Newer in Obsidian: pushes to Anki/),
    ).toBeInTheDocument();
  });

  test("given a diverged block when Obsidian wins is clicked then it is forced and selected", async () => {
    // given
    const { onForcedNoteIdsChange, onNotesSelectedToExportChange } =
      await renderPreview();
    await screen.findByText("Both changed card");

    // when
    await userEvent.setup().click(
      within(previewRow("Both changed card")).getByRole("checkbox", {
        name: /Obsidian wins: overwrites Anki/,
      }),
    );

    // then
    expect(onForcedNoteIdsChange).toHaveBeenCalledWith({ 105: true });
    expect(onNotesSelectedToExportChange).toHaveBeenCalledWith(
      expect.objectContaining({ 105: true }),
    );
  });

  test("given notes left undecided when the bulk force is used then every one is forced", async () => {
    // given
    const { onForcedNoteIdsChange, onNotesSelectedToExportChange } =
      await renderPreview();
    const useObsidianForAll = await screen.findByRole("button", {
      name: /use obsidian's version for all \(2\)/i,
    });

    // when
    await userEvent.setup().click(useObsidianForAll);

    // then
    expect(onForcedNoteIdsChange).toHaveBeenCalledWith({
      101: true,
      105: true,
    });
    expect(onNotesSelectedToExportChange).toHaveBeenCalledWith(
      expect.objectContaining({ 101: true, 105: true }),
    );
  });

  test("given classified blocks when loaded then statuses are reported without the new ones", async () => {
    // given
    const { onStatusesLoaded } = await renderPreview();
    await screen.findByText("Fresh note");

    // then
    expect(onStatusesLoaded).toHaveBeenCalledWith({
      101: "synced.clean",
      104: "synced.vaultNewer",
      105: "synced.diverged",
    });
  });
});
