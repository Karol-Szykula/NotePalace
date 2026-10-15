import { mergeClasses } from "src/gui/classes";
import { t } from "src/i18n";
import type { AnkiNoteInfo } from "src/entities/anki-note";
import type { NoteFormData } from "src/entities/note-form-data";
import type { Anki } from "src/services/anki/anki";
import type { ClassifiedNote } from "src/services/commands/import-deck";
import { computeContentHash } from "src/services/notes/content-hash";
import {
  decisionActFor,
  syncDecisionFor,
} from "src/services/notes/decision-table";
import type { SyncDecisionRow } from "src/services/notes/decision-table";
import {
  classifyNoteLifecycle,
  notePreviewStatusFor,
} from "src/services/notes/lifecycle";
import type {
  NoteLifecycleEvent,
  NoteLifecycleRecord,
  NoteLifecycleStatus,
  NotePreviewStatus,
} from "src/services/notes/lifecycle";
import { normalizeNoteText } from "src/services/notes/text";
import type { VaultNoteIndex } from "src/services/vault/vault";
import { findVaultNoteBlock } from "src/services/vault/vault";
import type { Vault } from "obsidian";
import { noteTransferWizardClasses } from "@shared/classes";
import { StatusChip, type ColumnDef } from "@shared/components";
import type { NoteDetailsData } from "@shared/components/NoteDetails";
import { ankiWinsStrategy } from "@shared/types/AnkiWinsStrategy";
import {
  countNotes,
  outcomeLabelKey,
  previewStatusOrder,
  rationaleText,
  recreateWarning,
  selectionNoticeText,
} from "@shared/utils/preview";
import { transferNotesPreviewClasses } from "../classes";

export interface NotesPreviewProps {
  readonly anki: Anki;
  readonly className?: string;
  readonly currentPage: number;
  readonly deckName: string;
  readonly forcedNoteIds: Record<number, boolean>;
  readonly highlightKey?: number | null;
  readonly initialQuery?: string;
  readonly noteLifecycle: Record<number, NoteLifecycleRecord>;
  readonly notesSelectedToImport: Record<number, boolean>;
  readonly onForcedNoteIdsChange: (
    forcedNoteIds: Record<number, boolean>,
  ) => void;
  readonly onNotesLoaded: (
    notes: AnkiNoteInfo[],
    statuses: Record<number, NoteLifecycleStatus>,
  ) => void;
  readonly onNotesSelectedToImportChange: (
    notesSelectedToImport: Record<number, boolean>,
  ) => void;
  readonly onPageChange: (page: number) => void;
  readonly onTotalPagesChange: (totalPages: number) => void;
  readonly totalPages: number;
  readonly vault: Vault;
  readonly vaultNoteIndex: VaultNoteIndex;
}

export type { PreviewQuery } from "@shared/hooks/usePreviewQuery";

export const previewPageSize = 100;

function noteFront(note: AnkiNoteInfo): string {
  const front = note.fields["Front"]?.value;
  const firstField = Object.values(note.fields)[0]?.value ?? "";
  return normalizeNoteText(front ?? firstField);
}

export function noteSummary(note: AnkiNoteInfo): string {
  return noteFront(note).slice(0, 80);
}

function tagsText(tags: readonly string[]): string | undefined {
  return tags.length > 0 ? tags.join(", ") : undefined;
}

function importRow(item: ClassifiedNote): SyncDecisionRow {
  return syncDecisionFor("import", item.status);
}

const importWriteActs: readonly NoteLifecycleEvent[] = [
  "ENROLL",
  "FORCE_PULL",
  "IMPORT",
  "PULL",
  "RESURRECT",
];

export function isImportSelectedByDefault(
  status: NoteLifecycleStatus,
): boolean {
  return importWriteActs.includes(
    decisionActFor("import", status) as NoteLifecycleEvent,
  );
}

function rationaleOutcome(item: ClassifiedNote): string {
  const row = importRow(item);
  if (item.previewStatus === "noFile") {
    return item.isInVaultIndex
      ? t("preview.noReadableBlock")
      : t("preview.idNowhereInVault");
  }
  if (item.previewStatus === "upToDate") {
    return `${t(row.rationaleKey)} (${item.vaultPath ?? "?"})`;
  }
  return t(row.rationaleKey);
}

function rowRationale(item: ClassifiedNote, isForced: boolean): string {
  return rationaleText(
    isForced,
    ankiWinsStrategy.getForcedOutcome(importRow(item)),
    rationaleOutcome(item),
  );
}

export function classifiedNoteId(item: ClassifiedNote): number {
  return item.note.noteId;
}

export function classifiedDefaultSelected(item: ClassifiedNote): boolean {
  return isImportSelectedByDefault(item.status);
}

export function importSearchableText(item: ClassifiedNote): string {
  return [
    ...Object.values(item.note.fields).map((field) => field.value),
    ...item.note.tags,
    item.note.modelName ?? "",
  ].join(" ");
}

function previewReasonText(status: NotePreviewStatus): string {
  switch (status) {
    case "diverged":
      return t("preview.editedInBoth");
    case "new":
      return t("preview.notImportedYet");
    case "newerInAnki":
      return t("preview.newerInAnkiShort");
    case "newerInVault":
      return t("preview.newerInVaultShort");
    case "noFile":
      return t("preview.noFileShort");
    case "upToDate":
      return t("preview.alreadyUpToDateShort");
  }
}

export function selectionNotice(notes: ClassifiedNote[]): string {
  const reasons: string[] = [];
  for (const status of previewStatusOrder) {
    const count = notes.filter((item) => item.previewStatus === status).length;
    if (count > 0) {
      reasons.push(`${countNotes(count)} ${previewReasonText(status)}`);
    }
  }
  return selectionNoticeText(reasons, t("preview.actionAllAnki"));
}

export function resurrectionWarning(count: number): string {
  return recreateWarning(count, "Obsidian");
}

export function buildCardColumns(
  forcedNoteIds: Record<number, boolean>,
): ColumnDef<ClassifiedNote>[] {
  return [
    {
      header: t("preview.noteColumn"),
      render: (item: ClassifiedNote) => {
        const row = importRow(item);
        return (
          <div className={transferNotesPreviewClasses.previewTitle}>
            <span
              className={transferNotesPreviewClasses.previewTitleText}
              title={noteFront(item.note)}
            >
              {noteSummary(item.note)}
            </span>
            <StatusChip
              kind={row.kind}
              label={t(outcomeLabelKey[row.kind])}
              tooltip={rowRationale(
                item,
                forcedNoteIds[item.note.noteId] ?? false,
              )}
            />
          </div>
        );
      },
      width: "1fr",
    },
  ];
}

function blockInputFor(
  block: NoteFormData | null,
  hash: string | undefined,
): { id: number | undefined; hash?: string } | undefined {
  if (block === null) {
    return undefined;
  }
  return hash === undefined ? { id: block.id } : { id: block.id, hash };
}

async function contentHashFor(
  block: NoteFormData | null,
): Promise<string | undefined> {
  if (block === null) {
    return undefined;
  }
  return await computeContentHash(
    block.front,
    block.back,
    block.tags,
    block.model,
  );
}

async function classifyNote(
  note: AnkiNoteInfo,
  vault: Vault,
  vaultNoteIndex: VaultNoteIndex,
  records: Record<number, NoteLifecycleRecord>,
): Promise<ClassifiedNote> {
  const isInVaultIndex = vaultNoteIndex.has(note.noteId);
  const block = isInVaultIndex
    ? await findVaultNoteBlock(vault, vaultNoteIndex, note.noteId)
    : null;
  const status = classifyNoteLifecycle({
    anki: note,
    block: blockInputFor(block, await contentHashFor(block)),
    record: records[note.noteId],
  });
  return {
    isInVaultIndex,
    note,
    previewStatus: notePreviewStatusFor(status),
    status,
    vaultPath: vaultNoteIndex.get(note.noteId),
  };
}

export async function classifyNotes(
  rawNotes: AnkiNoteInfo[],
  vault: Vault,
  vaultNoteIndex: VaultNoteIndex,
  records: Record<number, NoteLifecycleRecord>,
): Promise<ClassifiedNote[]> {
  return await Promise.all(
    rawNotes.map((note) => classifyNote(note, vault, vaultNoteIndex, records)),
  );
}

export function countNotesToResurrect(
  classified: ClassifiedNote[],
  forcedNoteIds: Record<number, boolean>,
): number {
  return classified.filter(
    (item) =>
      !isImportSelectedByDefault(item.status) &&
      !forcedNoteIds[item.note.noteId] &&
      item.previewStatus === "noFile",
  ).length;
}

function importRowClassName(item: ClassifiedNote): string | undefined {
  return mergeClasses(
    transferNotesPreviewClasses.previewRow,
    item.previewStatus === "upToDate"
      ? transferNotesPreviewClasses.previewRowImported
      : undefined,
  );
}

export function importRowClassNameFor(
  highlightKey: number | null,
): (item: ClassifiedNote) => string | undefined {
  return (item) =>
    mergeClasses(
      importRowClassName(item),
      item.note.noteId === highlightKey
        ? noteTransferWizardClasses.previewHighlight
        : undefined,
    );
}

export function importRowDetails(
  item: ClassifiedNote,
  isForced: boolean,
): NoteDetailsData {
  return {
    back: item.note.fields["Back"]?.value,
    model: item.note.modelName,
    path: item.vaultPath,
    rationale: rowRationale(item, isForced),
    tags: tagsText(item.note.tags),
  };
}
