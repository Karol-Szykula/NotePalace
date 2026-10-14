import { useState, type JSX } from "react";
import { mergeClasses } from "src/gui/classes";
import { t } from "src/i18n";
import { noteFormClasses } from "src/gui/note-form/classes";
import type { NoteShape } from "src/entities/note-shapes";
import type { NoteFormData, NoteFormEdit } from "src/entities/note-form-data";

export interface NoteFormFieldsProps {
  readonly className?: string | undefined;
  readonly data: NoteFormData;
  readonly onEdit: (edit: NoteFormEdit) => void;
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

export function NoteFormFields({
  className,
  data,
  onEdit,
  shape,
}: NoteFormFieldsProps): JSX.Element {
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
    </div>
  );
}
