import { useEffect, useRef, useState, type JSX } from "react";
import { mergeClasses } from "src/gui/classes";
import { t } from "src/i18n";
import { noteFormClasses } from "src/gui/note-form/classes";
import type { NoteShape } from "src/entities/note-shapes";
import type { NoteFormData, NoteFormEdit } from "src/entities/note-form-data";

export type RenderMarkdown = (
  markdown: string,
  el: HTMLElement,
) => void | Promise<void>;

export interface NoteFormFieldsProps {
  readonly className?: string | undefined;
  readonly data: NoteFormData;
  readonly onEdit: (edit: NoteFormEdit) => void;
  readonly renderMarkdown: RenderMarkdown;
  readonly shape: NoteShape;
}

interface NoteFormFieldProps {
  readonly id: string;
  readonly isMultiline: boolean;
  readonly label: string;
  readonly onBlur: () => void;
  readonly onChange: (value: string) => void;
  readonly value: string;
}

function NoteFormField({
  id,
  isMultiline,
  label,
  onBlur,
  onChange,
  value,
}: NoteFormFieldProps): JSX.Element {
  return (
    <div className={noteFormClasses.field}>
      <label className={noteFormClasses.label} htmlFor={id}>
        {label}
      </label>
      {isMultiline ? (
        <textarea
          className={noteFormClasses.input}
          id={id}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          rows={3}
          value={value}
        />
      ) : (
        <input
          className={noteFormClasses.input}
          id={id}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          type="text"
          value={value}
        />
      )}
    </div>
  );
}

function renderFieldInto(
  el: HTMLDivElement | null,
  markdown: string,
  renderMarkdown: RenderMarkdown,
  reportError: (hasError: boolean) => void,
): void {
  if (el === null) {
    return;
  }
  el.innerHTML = "";
  reportError(false);
  void Promise.resolve(renderMarkdown(markdown, el)).catch(() => {
    reportError(true);
  });
}

interface RenderedMarkdownProps {
  readonly markdown: string;
  readonly renderMarkdown: RenderMarkdown;
}

function RenderedMarkdown({
  markdown,
  renderMarkdown,
}: RenderedMarkdownProps): JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    renderFieldInto(ref.current, markdown, renderMarkdown, setHasError);
  }, [markdown, renderMarkdown]);

  return (
    <>
      <div
        className={mergeClasses(
          noteFormClasses.readValue,
          noteFormClasses.markdownRendered,
        )}
        ref={ref}
      />
      {hasError ? (
        <span className={noteFormClasses.error}>
          {t("noteForm.renderError")}
        </span>
      ) : null}
    </>
  );
}

interface NoteFormReadFieldProps {
  readonly label: string;
  readonly markdown: string;
  readonly renderMarkdown: RenderMarkdown;
}

function NoteFormReadField({
  label,
  markdown,
  renderMarkdown,
}: NoteFormReadFieldProps): JSX.Element {
  return (
    <div className={noteFormClasses.field}>
      <label className={noteFormClasses.label}>{label}</label>
      <RenderedMarkdown markdown={markdown} renderMarkdown={renderMarkdown} />
    </div>
  );
}

interface NoteFormReadViewProps {
  readonly className?: string | undefined;
  readonly data: NoteFormData;
  readonly onEditClick: () => void;
  readonly renderMarkdown: RenderMarkdown;
  readonly shape: NoteShape;
}

function NoteFormReadView({
  className,
  data,
  onEditClick,
  renderMarkdown,
  shape,
}: NoteFormReadViewProps): JSX.Element {
  return (
    <div className={mergeClasses(noteFormClasses.form, className)}>
      <NoteFormReadField
        label={t(shape.primaryLabelKey)}
        markdown={data.front}
        renderMarkdown={renderMarkdown}
      />
      <NoteFormReadField
        label={t(shape.secondaryLabelKey)}
        markdown={data.back}
        renderMarkdown={renderMarkdown}
      />
      <div className={noteFormClasses.field}>
        <label className={noteFormClasses.label}>{t("noteForm.tags")}</label>
        <span className={noteFormClasses.readValue}>{data.tags}</span>
      </div>
      <button
        className={noteFormClasses.edit}
        onClick={onEditClick}
        type="button"
      >
        {t("noteForm.edit")}
      </button>
    </div>
  );
}

interface NoteFormEditFieldsProps {
  readonly className?: string | undefined;
  readonly data: NoteFormData;
  readonly onDone: () => void;
  readonly onEdit: (edit: NoteFormEdit) => void;
  readonly shape: NoteShape;
}

function NoteFormEditFields({
  className,
  data,
  onDone,
  onEdit,
  shape,
}: NoteFormEditFieldsProps): JSX.Element {
  const [primary, setPrimary] = useState(data.front);
  const [secondary, setSecondary] = useState(data.back);
  const [tags, setTags] = useState(data.tags);

  function reportEdit(): void {
    onEdit({ back: secondary, front: primary, tags });
  }

  return (
    <div className={mergeClasses(noteFormClasses.form, className)}>
      <NoteFormField
        id={`note-form-${shape.primaryKey}`}
        isMultiline
        label={t(shape.primaryLabelKey)}
        onBlur={reportEdit}
        onChange={setPrimary}
        value={primary}
      />
      <NoteFormField
        id={`note-form-${shape.secondaryKey}`}
        isMultiline
        label={t(shape.secondaryLabelKey)}
        onBlur={reportEdit}
        onChange={setSecondary}
        value={secondary}
      />
      <NoteFormField
        id="note-form-tags"
        isMultiline={false}
        label={t("noteForm.tags")}
        onBlur={reportEdit}
        onChange={setTags}
        value={tags}
      />
      <button className={noteFormClasses.done} onClick={onDone} type="button">
        {t("noteForm.done")}
      </button>
    </div>
  );
}

export function NoteFormFields({
  className,
  data,
  onEdit,
  renderMarkdown,
  shape,
}: NoteFormFieldsProps): JSX.Element {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <NoteFormEditFields
        className={className}
        data={data}
        onDone={() => setIsEditing(false)}
        onEdit={onEdit}
        shape={shape}
      />
    );
  }

  return (
    <NoteFormReadView
      className={className}
      data={data}
      onEditClick={() => setIsEditing(true)}
      renderMarkdown={renderMarkdown}
      shape={shape}
    />
  );
}
