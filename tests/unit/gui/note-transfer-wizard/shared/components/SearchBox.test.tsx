/**
 * @jest-environment jsdom
 *
 * Contract: the search box is a controlled input with an accessible label, a
 * clear control that only exists while it has a value, and Escape to clear.
 */
import "obsidian-test-mocks/jest-setup";
import { useState, type JSX } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchBox } from "src/gui/note-transfer-wizard/shared/components/SearchBox";

function renderSearchBox(initialValue = ""): void {
  function Harness(): JSX.Element {
    const [value, setValue] = useState(initialValue);
    return (
      <SearchBox
        label="Search notes"
        onChange={setValue}
        onClear={() => setValue("")}
        placeholder="Search…"
        value={value}
      />
    );
  }
  render(<Harness />);
}

describe("SearchBox", () => {
  test("given a label when rendered then the input exposes that accessible name", () => {
    // given
    const label = "Search notes";

    // when
    renderSearchBox();

    // then
    expect(screen.getByRole("textbox", { name: label })).toBeInTheDocument();
  });

  test("given a placeholder when rendered then the input shows it", () => {
    // given
    const placeholder = "Search…";

    // when
    renderSearchBox();

    // then
    expect(screen.getByPlaceholderText(placeholder)).toBeInTheDocument();
  });

  test("given the box when a query is typed then the input holds it", async () => {
    // given
    renderSearchBox();

    // when
    await userEvent.type(screen.getByRole("textbox"), "anki");

    // then
    expect(screen.getByRole("textbox")).toHaveValue("anki");
  });

  test("given an empty box then it offers no clear control", () => {
    // given
    renderSearchBox();

    // when
    const clearControl = screen.queryByRole("button", { name: "Clear search" });

    // then
    expect(clearControl).not.toBeInTheDocument();
  });

  test("given a value when the clear control is clicked then the input empties", async () => {
    // given
    renderSearchBox("anki");

    // when
    await userEvent.click(screen.getByRole("button", { name: "Clear search" }));

    // then
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  test("given a value when Escape is pressed then the input empties", async () => {
    // given
    renderSearchBox("anki");

    // when
    await userEvent.type(screen.getByRole("textbox"), "{Escape}");

    // then
    expect(screen.getByRole("textbox")).toHaveValue("");
  });
});
