/**
 * @jest-environment jsdom
 *
 * Tests for the shared note details panel: it shows the expanded note data
 * with English labels and omits fields that hold no text.
 */
import "obsidian-test-mocks/jest-setup";
import { render, screen } from "@testing-library/react";
import { NoteDetails } from "src/gui/note-transfer-wizard/shared/components/NoteDetails";

describe("NoteDetails", () => {
  test("given full note data when rendered then every detail is labelled", () => {
    // given
    const data = {
      back: "The answer.",
      model: "Basic",
      path: "Folder/Card.md",
      rationale: "Newer in Anki: skipped, use Sync.",
      tags: "tag-a, tag-b",
    };

    // when
    render(<NoteDetails data={data} />);

    // then
    expect(screen.getByText("Back")).toBeInTheDocument();
    expect(screen.getByText("The answer.")).toBeInTheDocument();
    expect(screen.getByText("Tags")).toBeInTheDocument();
    expect(screen.getByText("tag-a, tag-b")).toBeInTheDocument();
    expect(screen.getByText("Model")).toBeInTheDocument();
    expect(screen.getByText("Basic")).toBeInTheDocument();
    expect(screen.getByText("File")).toBeInTheDocument();
    expect(screen.getByText("Folder/Card.md")).toBeInTheDocument();
    expect(screen.getByText("Rationale")).toBeInTheDocument();
  });

  test("given a note with no tags when rendered then the tags row is omitted", () => {
    // given
    const data = { rationale: "It creates a file." };

    // when
    render(<NoteDetails data={data} />);

    // then
    expect(screen.queryByText("Tags")).not.toBeInTheDocument();
    expect(screen.getByText("Rationale")).toBeInTheDocument();
  });
});
