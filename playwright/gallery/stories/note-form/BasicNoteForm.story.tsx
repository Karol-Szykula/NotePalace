import type { JSX } from "react";
import { BasicNoteForm } from "src/gui/note-form/BasicNoteForm";
import { fakeMarkdown } from "../../fake-markdown";
import type { NoteFormData } from "src/entities/note-form-data";

const baseData: NoteFormData = {
  back: "4",
  extra: {},
  front: "What is 2 + 2?",
  id: 123,
  model: "Basic",
  tags: "math",
};

const noEdit = (): void => undefined;

export const Read = (): JSX.Element => (
  <BasicNoteForm
    data={baseData}
    onEdit={noEdit}
    renderMarkdown={fakeMarkdown}
  />
);

export const ReadWithImage = (): JSX.Element => (
  <BasicNoteForm
    data={{
      ...baseData,
      front: "Which device is this?\n\n![[placeholder.svg]]",
    }}
    onEdit={noEdit}
    renderMarkdown={fakeMarkdown}
  />
);

export const ReadWithList = (): JSX.Element => (
  <BasicNoteForm
    data={{
      ...baseData,
      back: "- first\n- second\n- third",
    }}
    onEdit={noEdit}
    renderMarkdown={fakeMarkdown}
  />
);

export const ReadWithError = (): JSX.Element => (
  <BasicNoteForm
    data={baseData}
    onEdit={noEdit}
    renderMarkdown={() => Promise.reject(new Error("boom"))}
  />
);
