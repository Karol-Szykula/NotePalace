import type { JSX } from "react";
import { ClozeNoteForm } from "src/gui/note-form/ClozeNoteForm";
import { fakeMarkdown } from "../../fake-markdown";
import type { NoteFormData } from "src/entities/note-form-data";

const baseData: NoteFormData = {
  back: "Europe",
  extra: {},
  front: "The capital of France is {{c1::Paris}}.",
  id: undefined,
  model: "Cloze",
  tags: "geography",
};

const noEdit = (): void => undefined;

export const Read = (): JSX.Element => (
  <ClozeNoteForm
    data={baseData}
    onEdit={noEdit}
    renderMarkdown={fakeMarkdown}
  />
);

export const ReadWithImage = (): JSX.Element => (
  <ClozeNoteForm
    data={{
      ...baseData,
      back: "Europe\n\n![[placeholder.svg]]",
    }}
    onEdit={noEdit}
    renderMarkdown={fakeMarkdown}
  />
);
