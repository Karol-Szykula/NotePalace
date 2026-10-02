/**
 * @jest-environment jsdom
 *
 * User-perspective tests for the export wizard first page: vault folder
 * list rendering, Anki counters, hierarchy display and selection callback.
 */
import "obsidian-test-mocks/jest-setup";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Vault as ObsidianVault } from "obsidian";
import { App } from "obsidian-test-mocks/obsidian";
import { DeckSelection } from "src/gui/note-transfer-wizard/export/components/DeckSelection";

function noteBlock(front: string, id: number | null): string {
  const lines = ["```note-form", `front: ${front}`, "back: B", 'tags: ""'];
  if (id !== null) {
    lines.push(`id: ${id}`);
  }
  lines.push("```");
  return lines.join("\n");
}

function renderDeckSelection(files: Record<string, string>) {
  const app = App.createConfigured__({ files });
  const onSelectDeckName = jest.fn();
  render(
    <DeckSelection
      ignoredDirectories=""
      onSelectDeckName={onSelectDeckName}
      selectedDeckName=""
      vault={app.vault as unknown as ObsidianVault}
    />,
  );
  return { onSelectDeckName };
}

describe("DeckSelection", () => {
  test("given folders with blocks when the list renders then shows names with counters", async () => {
    // given
    const files = {
      "Languages/Q.md": `${noteBlock("Q", null)}\n`,
      "Languages/Advanced/A.md": `${noteBlock("A", 5)}\n`,
    };
    renderDeckSelection(files);

    // when
    const languages = await screen.findByText("Languages");
    const advanced = await screen.findByText("Advanced");
    const fresh = await screen.findByText("0/1");
    const tracked = await screen.findByText("1/1");

    // then
    expect(languages).toBeInTheDocument();
    expect(advanced).toBeInTheDocument();
    expect(fresh).toBeInTheDocument();
    expect(tracked).toBeInTheDocument();
  });

  test("given a folder list when a radio is clicked then notifies with the deck name", async () => {
    // given
    const files = {
      "Languages/Q.md": `${noteBlock("Q", null)}\n`,
      "Languages/Advanced/A.md": `${noteBlock("A", 5)}\n`,
    };
    const user = userEvent.setup();
    const { onSelectDeckName } = renderDeckSelection(files);
    const radio = await screen.findByRole("radio", { name: /Advanced/ });

    // when
    await user.click(radio);

    // then
    expect(onSelectDeckName).toHaveBeenCalledTimes(1);
    expect(onSelectDeckName).toHaveBeenCalledWith("Languages::Advanced");
  });

  test("given a vault without note blocks when the list loads then explains there is nothing to export", async () => {
    // given
    renderDeckSelection({ "Empty.md": "no blocks here\n" });

    // when
    const message = await screen.findByText(/No exportable notes/);

    // then
    expect(message).toBeInTheDocument();
  });
});
