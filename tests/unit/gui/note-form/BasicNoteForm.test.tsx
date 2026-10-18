/**
 * @jest-environment jsdom
 *
 * Component rendering touches document, so this suite runs in jsdom.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BasicNoteForm } from "src/gui/note-form/BasicNoteForm";
import type { NoteFormData, NoteFormEdit } from "src/entities/note-form-data";

function formData(overrides: Partial<NoteFormData> = {}): NoteFormData {
  return {
    back: "4",
    extra: {},
    front: "What is 2+2?",
    id: 123,
    model: "Basic",
    tags: "math",
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
    <BasicNoteForm data={data} onEdit={onEdit} renderMarkdown={renderText} />,
  );
}

describe("BasicNoteForm", () => {
  test("given form data when rendered then shows the fields as markdown, not inputs", () => {
    // given
    const edits: NoteFormEdit[] = [];

    // when
    renderForm(formData(), (edit) => {
      edits.push(edit);
    });

    // then
    expect(screen.getByText("What is 2+2?")).toBeInTheDocument();
    expect(screen.queryByLabelText("Front")).not.toBeInTheDocument();
    expect(edits).toEqual([]);
  });

  test("given rendered markdown when the read view shows then the value is scoped for markdown styling", () => {
    // given
    const data = formData();
    const saveEdit = () => {};

    // when
    renderForm(data, saveEdit);

    // then
    expect(screen.getByText("What is 2+2?")).toHaveClass("markdown-rendered");
  });

  test("given a front with an image when rendered then passes the field to the renderer", () => {
    // given
    const rendered: string[] = [];
    render(
      <BasicNoteForm
        data={formData({ front: "Q ![[a.png]]" })}
        onEdit={() => {}}
        renderMarkdown={(markdown, el) => {
          rendered.push(markdown);
          el.textContent = markdown;
        }}
      />,
    );

    // when
    // (rendered by the read view)

    // then
    expect(rendered).toEqual(["Q ![[a.png]]", "4"]);
    expect(screen.getByText("Q ![[a.png]]")).toBeInTheDocument();
  });

  test("given a renderer that fails when rendered then shows an error", async () => {
    // given
    render(
      <BasicNoteForm
        data={formData()}
        onEdit={() => {}}
        renderMarkdown={() => Promise.reject(new Error("boom"))}
      />,
    );

    // when
    // (rendered by the read view)

    // then
    expect(
      (await screen.findAllByText("Error: could not render the field.")).length,
    ).toBeGreaterThan(0);
  });

  test("given the edit button when clicked then shows editable fields without an id row", async () => {
    // given
    const edits: NoteFormEdit[] = [];
    renderForm(formData(), (edit) => {
      edits.push(edit);
    });
    const user = userEvent.setup();

    // when
    await user.click(screen.getByRole("button", { name: "Edit" }));

    // then
    expect(await screen.findByLabelText("Front")).toHaveValue("What is 2+2?");
    expect(screen.getByLabelText("Back")).toHaveValue("4");
    expect(screen.getByLabelText("Tags")).toHaveValue("math");
    expect(screen.queryByLabelText("ID")).not.toBeInTheDocument();
    expect(edits).toEqual([]);
  });

  test("given an edited front when blurred then reports the edit", async () => {
    // given
    const edits: NoteFormEdit[] = [];
    renderForm(formData(), (edit) => {
      edits.push(edit);
    });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Edit" }));

    // when
    const front = await screen.findByLabelText("Front");
    await user.clear(front);
    await user.type(front, "What is 3+3?");
    await user.tab();

    // then
    expect(edits).toEqual([{ back: "4", front: "What is 3+3?", tags: "math" }]);
  });
});
