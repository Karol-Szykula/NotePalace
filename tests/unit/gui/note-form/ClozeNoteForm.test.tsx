/**
 * @jest-environment jsdom
 *
 * Component rendering touches document, so this suite runs in jsdom.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClozeNoteForm } from "src/gui/note-form/ClozeNoteForm";
import type { NoteFormData, NoteFormEdit } from "src/entities/note-form-data";

function formData(overrides: Partial<NoteFormData> = {}): NoteFormData {
  return {
    back: "Capital",
    extra: {},
    front: "Paris is {{c1::France}}",
    id: 9,
    model: "Cloze",
    tags: "geo",
    ...overrides,
  };
}

function renderText(markdown: string, el: HTMLElement): void {
  el.textContent = markdown;
}

function renderForm(
  data: NoteFormData,
  onEdit: (edit: NoteFormEdit) => void,
): void {
  render(
    <ClozeNoteForm data={data} onEdit={onEdit} renderMarkdown={renderText} />,
  );
}

describe("ClozeNoteForm", () => {
  test("given cloze data when rendered then shows fields as markdown, not inputs", () => {
    // given
    const edits: NoteFormEdit[] = [];

    // when
    renderForm(formData(), (edit) => {
      edits.push(edit);
    });

    // then
    expect(screen.getByText("Paris is {{c1::France}}")).toBeInTheDocument();
    expect(screen.queryByLabelText("Text")).not.toBeInTheDocument();
    expect(edits).toEqual([]);
  });

  test("given the edit button when clicked then shows text fields without an id row", async () => {
    // given
    const edits: NoteFormEdit[] = [];
    renderForm(formData(), (edit) => {
      edits.push(edit);
    });
    const user = userEvent.setup();

    // when
    await user.click(screen.getByRole("button", { name: "Edit" }));

    // then
    expect(await screen.findByLabelText("Text")).toHaveValue(
      "Paris is {{c1::France}}",
    );
    expect(screen.getByLabelText("Back Extra")).toHaveValue("Capital");
    expect(screen.queryByLabelText("Front")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("ID")).not.toBeInTheDocument();
    expect(edits).toEqual([]);
  });

  test("given edited text when blurred then reports the edit in slots", async () => {
    // given
    const edits: NoteFormEdit[] = [];
    renderForm(formData(), (edit) => {
      edits.push(edit);
    });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Edit" }));

    // when
    const text = await screen.findByLabelText("Text");
    await user.clear(text);
    await user.type(text, "Lyon is beautiful");
    await user.tab();

    // then
    expect(edits).toEqual([
      { back: "Capital", front: "Lyon is beautiful", tags: "geo" },
    ]);
  });
});
