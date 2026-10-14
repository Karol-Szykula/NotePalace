/**
 * @jest-environment jsdom
 *
 * User-perspective tests for the export notes preview search: filtering by
 * block fields, tags and model, never the file path, full-list counts and
 * filtered pagination.
 */
import "obsidian-test-mocks/jest-setup";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Vault as ObsidianVault } from "obsidian";
import { App } from "obsidian-test-mocks/obsidian";
import { Anki } from "src/services/anki/anki";
import {
  NotesPreview,
  type NotesPreviewProps,
} from "src/gui/note-transfer-wizard/export/components/NotesPreview";
import { AnkiConnectMock } from "../../../../../mocks/anki-connect";

AnkiConnectMock.install();

beforeEach(() => {
  AnkiConnectMock.reset();
});

const searchLabel = "Search notes";

interface BlockFields {
  readonly back?: string;
  readonly id?: number;
  readonly model?: string;
  readonly tags?: string;
}

function noteBlock(front: string, fields: BlockFields = {}): string {
  const lines = [
    "```note-form",
    `front: ${front}`,
    `back: ${fields.back ?? "B"}`,
    `tags: ${fields.tags ?? ""}`,
    `model: ${fields.model ?? "Basic"}`,
  ];
  if (fields.id !== undefined) {
    lines.push(`id: ${fields.id}`);
  }
  lines.push("```");
  return lines.join("\n");
}

interface RenderedPreview {
  readonly onTotalPagesChange: jest.Mock;
}

interface PreviewOptions {
  readonly currentPage?: number;
}

function renderPreview(
  files: Record<string, string>,
  options: PreviewOptions = {},
): RenderedPreview {
  const onTotalPagesChange = jest.fn();
  const app = App.createConfigured__({ files });
  const vault = app.vault as unknown as ObsidianVault;
  const props: NotesPreviewProps = {
    anki: new Anki(),
    currentPage: options.currentPage ?? 0,
    deckName: "Languages",
    forcedNoteIds: {},
    ignoredDirectories: "",
    noteLifecycle: {},
    notesSelectedToExport: {},
    onForcedNoteIdsChange: jest.fn(),
    onNotesSelectedToExportChange: jest.fn(),
    onPageChange: jest.fn(),
    onStatusesLoaded: jest.fn(),
    onTotalPagesChange,
    totalPages: 1,
    vault,
  };
  render(<NotesPreview {...props} />);
  return { onTotalPagesChange };
}

async function typeQuery(text: string): Promise<void> {
  await userEvent.type(
    screen.getByRole("textbox", { name: searchLabel }),
    text,
  );
}

describe("export NotesPreview search", () => {
  test("given blocks when a front query is typed then only the matching block remains", async () => {
    // given
    const files = {
      "Languages/Fresh.md": `${noteBlock("Fresh note")}\n`,
      "Languages/Other.md": `${noteBlock("Other note")}\n`,
    };
    renderPreview(files);
    await screen.findByText("Fresh note");

    // when
    await typeQuery("fresh");

    // then
    await waitFor(() =>
      expect(screen.queryByText("Other note")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Fresh note")).toBeInTheDocument();
  });

  test("given blocks when a back query is typed then only the matching block remains", async () => {
    // given
    const files = {
      "Languages/Fresh.md": `${noteBlock("Fresh note", { back: "hidden answer" })}\n`,
      "Languages/Other.md": `${noteBlock("Other note")}\n`,
    };
    renderPreview(files);
    await screen.findByText("Fresh note");

    // when
    await typeQuery("answer");

    // then
    await waitFor(() =>
      expect(screen.queryByText("Other note")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Fresh note")).toBeInTheDocument();
  });

  test("given a tagged block when its tag is typed then only the matching block remains", async () => {
    // given
    const files = {
      "Languages/Fresh.md": `${noteBlock("Fresh note", { tags: "poland" })}\n`,
      "Languages/Other.md": `${noteBlock("Other note")}\n`,
    };
    renderPreview(files);
    await screen.findByText("Fresh note");

    // when
    await typeQuery("poland");

    // then
    await waitFor(() =>
      expect(screen.queryByText("Other note")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Fresh note")).toBeInTheDocument();
  });

  test("given a block with a model when the model name is typed then only the matching block remains", async () => {
    // given
    const files = {
      "Languages/Fresh.md": `${noteBlock("Fresh note", { model: "Basic (and reversed card)" })}\n`,
      "Languages/Other.md": `${noteBlock("Other note")}\n`,
    };
    renderPreview(files);
    await screen.findByText("Fresh note");

    // when
    await typeQuery("reversed");

    // then
    await waitFor(() =>
      expect(screen.queryByText("Other note")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Fresh note")).toBeInTheDocument();
  });

  test("given a block whose file path matches when that word is typed then nothing matches", async () => {
    // given
    const files = {
      "Languages/Secret place.md": `${noteBlock("Alpha")}\n`,
      "Languages/Other.md": `${noteBlock("Beta")}\n`,
    };
    renderPreview(files);
    await screen.findByText("Alpha");

    // when
    await typeQuery("secret");

    // then
    expect(
      await screen.findByText("No notes match \u201csecret\u201d."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
  });

  test("given a filtered list when the clear control is activated then every block returns", async () => {
    // given
    const files = {
      "Languages/Fresh.md": `${noteBlock("Fresh note")}\n`,
      "Languages/Other.md": `${noteBlock("Other note")}\n`,
    };
    renderPreview(files);
    await screen.findByText("Fresh note");
    await typeQuery("fresh");
    await waitFor(() =>
      expect(screen.queryByText("Other note")).not.toBeInTheDocument(),
    );

    // when
    await userEvent.click(screen.getByRole("button", { name: "Clear search" }));

    // then
    expect(await screen.findByText("Other note")).toBeInTheDocument();
  });

  test("given a query hiding selected blocks when filtered then the full total stays", async () => {
    // given
    const files = {
      "Languages/Alpha.md": `${noteBlock("Alpha")}\n`,
      "Languages/Beta.md": `${noteBlock("Beta")}\n`,
      "Languages/Gamma.md": `${noteBlock("Gamma")}\n`,
    };
    renderPreview(files);
    await screen.findByText("Alpha");

    // when
    await typeQuery("alpha");

    // then
    await waitFor(() =>
      expect(screen.queryByText("Beta")).not.toBeInTheDocument(),
    );
    expect(screen.getByText(/Notes to export: \d+\/3\./)).toBeInTheDocument();
  });

  test("given more than one page when a query narrows the list then the page count follows it", async () => {
    // given
    const files: Record<string, string> = {
      "Languages/Unique.md": `${noteBlock("Unique needle")}\n`,
    };
    for (let index = 0; index < 100; index += 1) {
      files[`Languages/Filler ${index}.md`] =
        `${noteBlock(`Filler ${index}`)}\n`;
    }
    const { onTotalPagesChange } = renderPreview(files, { currentPage: 1 });
    await screen.findByRole("textbox", { name: searchLabel });

    // when
    await typeQuery("needle");

    // then
    await waitFor(() => expect(onTotalPagesChange).toHaveBeenLastCalledWith(1));
  }, 15000);
});
