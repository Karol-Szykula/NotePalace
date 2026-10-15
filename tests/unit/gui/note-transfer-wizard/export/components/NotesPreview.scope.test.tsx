/**
 * @jest-environment jsdom
 *
 * The export preview as it opens from the note you are in: the note's front
 * seeds the search, its block is the one highlighted, and a search matching
 * nothing points back at the folder it came from.
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
} from "src/gui/note-transfer-wizard/export/components/NotesPreview";
import { AnkiConnectMock } from "../../../../../mocks/anki-connect";

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

function noteBlock(front: string, id?: number): string {
  const lines = ["```note-form", `front: ${front}`, "back: B", "model: Basic"];
  if (id !== undefined) {
    lines.push(`id: ${id}`);
  }
  lines.push("```");
  return lines.join("\n");
}

interface ScopeOptions {
  readonly highlightKey?: number | null;
  readonly initialQuery?: string;
}

function renderScopedPreview(
  files: Record<string, string>,
  options: ScopeOptions = {},
): void {
  const app = App.createConfigured__({ files });
  const props: NotesPreviewProps = {
    anki: new Anki(),
    currentPage: 0,
    deckName: "Languages",
    forcedNoteIds: {},
    highlightKey: options.highlightKey ?? null,
    ignoredDirectories: "",
    initialQuery: options.initialQuery ?? "",
    noteLifecycle: {},
    notesSelectedToExport: {},
    onForcedNoteIdsChange: jest.fn(),
    onNotesSelectedToExportChange: jest.fn(),
    onPageChange: jest.fn(),
    onStatusesLoaded: jest.fn(),
    onTotalPagesChange: jest.fn(),
    totalPages: 1,
    vault: app.vault as unknown as ObsidianVault,
  };
  render(<NotesPreview {...props} />);
}

describe("export NotesPreview scope", () => {
  test("given a scoped front when the preview opens then only the matching block is listed", async () => {
    // given
    const files = {
      "Languages/Fresh.md": `${noteBlock("Fresh note")}\n`,
      "Languages/Other.md": `${noteBlock("Other note")}\n`,
    };
    renderScopedPreview(files, { initialQuery: "fresh" });

    // when
    const kept = await screen.findByText("Fresh note");

    // then
    expect(kept).toBeInTheDocument();
    expect(screen.queryByText("Other note")).not.toBeInTheDocument();
  });

  test("given a scoped block id when the preview opens then its row is highlighted", async () => {
    // given
    const files = {
      "Languages/Fresh.md": `${noteBlock("Fresh note")}\n`,
      "Languages/Other.md": `${noteBlock("Other note", 22)}\n`,
    };
    renderScopedPreview(files, { highlightKey: 22 });

    // when
    const row = (await screen.findByText("Other note")).closest('[role="row"]');

    // then
    expect(row).toHaveClass(noteTransferWizardClasses.previewHighlight);
  });

  test("given a scoped front that matches nothing when the preview opens then the hint names the folder", async () => {
    // given
    const files = { "Languages/Fresh.md": `${noteBlock("Fresh note")}\n` };
    renderScopedPreview(files, { initialQuery: "zzz" });

    // then
    expect(
      await screen.findByText(
        t("preview.scopedNoMatch", { deck: "Languages" }),
      ),
    ).toBeInTheDocument();
  });

  test("given a scoped front when the clear control is activated then the whole folder returns", async () => {
    // given
    const files = {
      "Languages/Fresh.md": `${noteBlock("Fresh note")}\n`,
      "Languages/Other.md": `${noteBlock("Other note")}\n`,
    };
    renderScopedPreview(files, { initialQuery: "fresh" });
    await screen.findByText("Fresh note");

    // when
    await userEvent.click(screen.getByRole("button", { name: "Clear search" }));

    // then
    expect(await screen.findByText("Other note")).toBeInTheDocument();
  });
});
