import type { JSX } from "react";
import { t } from "src/i18n";
import { noteDetailsClasses } from "../classes/common";

export interface NoteDetailsData {
  readonly back?: string | undefined;
  readonly model?: string | undefined;
  readonly path?: string | undefined;
  readonly rationale: string;
  readonly tags?: string | undefined;
}

interface NoteDetailEntry {
  readonly label: string;
  readonly value: string | undefined;
}

export function NoteDetails({
  data,
}: {
  readonly data: NoteDetailsData;
}): JSX.Element {
  const entries: NoteDetailEntry[] = [
    { label: t("preview.detailsBack"), value: data.back },
    { label: t("preview.detailsTags"), value: data.tags },
    { label: t("preview.detailsModel"), value: data.model },
    { label: t("preview.detailsPath"), value: data.path },
    { label: t("preview.detailsRationale"), value: data.rationale },
  ];
  return (
    <dl className={noteDetailsClasses.list}>
      {entries
        .filter(
          (entry): entry is NoteDetailEntry & { value: string } =>
            entry.value !== undefined,
        )
        .map((entry) => (
          <div className={noteDetailsClasses.detail} key={entry.label}>
            <dt className={noteDetailsClasses.detailLabel}>{entry.label}</dt>
            <dd className={noteDetailsClasses.detailValue}>{entry.value}</dd>
          </div>
        ))}
    </dl>
  );
}
