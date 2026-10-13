import { useEffect, useMemo, useState, type JSX } from "react";
import { mergeClasses } from "src/gui/classes";
import { t } from "src/i18n";
import { startAsyncLoad } from "@shared/hooks/useAsyncLoad";
import { ankiWinsStrategy } from "@shared/types/AnkiWinsStrategy";
import type { Anki } from "src/services/anki/anki";
import type { AnkiNoteInfo } from "src/entities/anki-note";
import type { NoteFormData } from "src/entities/note-form-data";
import type { Vault } from "obsidian";
import type { VaultNoteIndex } from "src/services/vault/vault";
import { findVaultNoteBlock } from "src/services/vault/vault";
import {
  classifyNoteLifecycle,
  notePreviewStatusFor,
} from "src/services/notes/lifecycle";
import type {
  NoteLifecycleEvent,
  NoteLifecycleStatus,
} from "src/services/notes/lifecycle";
import {
  decisionActFor,
  syncDecisionFor,
} from "src/services/notes/decision-table";
import type { SyncDecisionRow } from "src/services/notes/decision-table";
import type { NoteLifecycleRecord } from "src/services/notes/lifecycle";
import { computeContentHash } from "src/services/notes/content-hash";
import { fetchDeckNotes } from "src/services/anki/read";
import { normalizeNoteText } from "src/services/notes/text";
import type { ClassifiedNote } from "src/services/commands/import-deck";
import type { NotePreviewStatus } from "src/services/notes/lifecycle";
import { useApplyDefaultSelection } from "@shared/hooks/useApplyDefaultSelection";
import { useDebouncedValue } from "@shared/hooks/useDebouncedValue";
import { commonWizardClasses } from "@shared/classes";
import { NotesTable, StatusChip, type ColumnDef } from "@shared/components";
import { matchesSearch } from "@shared/utils/notes-search";
import { transferNotesPreviewClasses } from "../classes";
import {
  comparePreviewRank,
  countNotes,
  outcomeLabelKey,
  previewStatusOrder,
  rationaleText,
  recreateWarning,
  selectionNoticeText,
} from "@shared/utils/preview";

export interface NotesPreviewProps {
  readonly anki: Anki;
  readonly className?: string;
  readonly currentPage: number;
  readonly deckName: string;
  readonly forcedNoteIds: Record<number, boolean>;
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

const previewPageSize = 100;

function noteFront(note: AnkiNoteInfo): string {
  const front = note.fields["Front"]?.value;
  const firstField = Object.values(note.fields)[0]?.value ?? "";
  return normalizeNoteText(front ?? firstField);
}

function noteSummary(note: AnkiNoteInfo): string {
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

function isImportSelectedByDefault(status: NoteLifecycleStatus): boolean {
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

function classifiedNoteId(item: ClassifiedNote): number {
  return item.note.noteId;
}

function classifiedDefaultSelected(item: ClassifiedNote): boolean {
  return isImportSelectedByDefault(item.status);
}

function importSearchableText(item: ClassifiedNote): string {
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

function selectionNotice(notes: ClassifiedNote[]): string {
  const reasons: string[] = [];
  for (const status of previewStatusOrder) {
    const count = notes.filter((item) => item.previewStatus === status).length;
    if (count > 0) {
      reasons.push(`${countNotes(count)} ${previewReasonText(status)}`);
    }
  }
  return selectionNoticeText(reasons, t("preview.actionAllAnki"));
}

function resurrectionWarning(count: number): string {
  return recreateWarning(count, "Obsidian");
}

function buildCardColumns(
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

async function classifyNotes(
  rawNotes: AnkiNoteInfo[],
  vault: Vault,
  vaultNoteIndex: VaultNoteIndex,
  records: Record<number, NoteLifecycleRecord>,
): Promise<ClassifiedNote[]> {
  return await Promise.all(
    rawNotes.map((note) => classifyNote(note, vault, vaultNoteIndex, records)),
  );
}

export function NotesPreview({
  anki,
  currentPage,
  deckName,
  forcedNoteIds,
  noteLifecycle,
  onPageChange,
  onTotalPagesChange,
  vault,
  vaultNoteIndex,
  notesSelectedToImport,
  onForcedNoteIdsChange,
  onNotesSelectedToImportChange,
  onNotesLoaded,
  className,
}: NotesPreviewProps): JSX.Element {
  const rootClassName = mergeClasses(commonWizardClasses.pageView, className);
  const [rawNotes, setRawNotes] = useState<AnkiNoteInfo[] | null>(null);
  const [classified, setClassified] = useState<ClassifiedNote[] | null>(null);
  const [progress, setProgress] = useState("");
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);

  const loadPreviewNotes = (): (() => void) => {
    setRawNotes(null);
    setQuery("");
    onPageChange(0);
    return startAsyncLoad(async (isLive) => {
      try {
        const notes = await fetchDeckNotes(anki, deckName, (fetched, total) => {
          if (isLive()) {
            setProgress(
              t("preview.loadingProgress", { current: fetched, total }),
            );
          }
        });
        if (isLive()) {
          setRawNotes(notes);
        }
      } catch {
        if (isLive()) {
          setLoadError(t("errors.couldNotLoadNotes"));
        }
      }
    });
  };

  useEffect(loadPreviewNotes, [anki, deckName]);

  const loadClassifiedNotes = () => {
    setClassified(null);
    return startAsyncLoad(async (isLive) => {
      if (!rawNotes) {
        return;
      }
      const items = await classifyNotes(
        rawNotes,
        vault,
        vaultNoteIndex,
        noteLifecycle,
      );
      if (isLive()) {
        setClassified([...items].sort(comparePreviewRank));
        onNotesLoaded(
          items.map((item) => item.note),
          Object.fromEntries(
            items.map((item) => [item.note.noteId, item.status]),
          ),
        );
      }
    });
  };

  useEffect(loadClassifiedNotes, [
    rawNotes,
    vault,
    vaultNoteIndex,
    noteLifecycle,
  ]);

  useApplyDefaultSelection(
    classified,
    classifiedNoteId,
    classifiedDefaultSelected,
    notesSelectedToImport,
    onNotesSelectedToImportChange,
  );

  const filteredNotes = useMemo(
    () =>
      (classified ?? []).filter((item) =>
        matchesSearch(importSearchableText(item), debouncedQuery),
      ),
    [classified, debouncedQuery],
  );

  const onQueryChange = (value: string): void => {
    setQuery(value);
    onPageChange(0);
  };

  const onQueryClear = (): void => {
    setQuery("");
    onPageChange(0);
  };

  useEffect(() => {
    if (classified) {
      const pageCount = Math.max(
        1,
        Math.ceil(filteredNotes.length / previewPageSize),
      );
      onTotalPagesChange(pageCount);
    }
  }, [classified, filteredNotes.length, onTotalPagesChange]);

  const notesLeftToDecide = useMemo(
    () =>
      classified?.filter(
        (item) =>
          !isImportSelectedByDefault(item.status) &&
          !forcedNoteIds[item.note.noteId],
      ) ?? [],
    [classified, forcedNoteIds],
  );
  const notesToResurrect = notesLeftToDecide.filter(
    (item) => item.previewStatus === "noFile",
  ).length;

  const onSelectionChange = (selected: Record<number, boolean>): void => {
    onNotesSelectedToImportChange(selected);
  };

  const onForceChange = (
    forced: Record<number, boolean>,
    selected: Record<number, boolean>,
  ): void => {
    onForcedNoteIdsChange(forced);
    onNotesSelectedToImportChange(selected);
  };

  const columns = useMemo(
    () => buildCardColumns(forcedNoteIds),
    [forcedNoteIds],
  );

  if (loadError) {
    return (
      <div className={rootClassName}>
        <p>{loadError}</p>
      </div>
    );
  }
  if (!classified) {
    return (
      <div className={rootClassName}>
        <p>{progress || t("preview.loading")}</p>
      </div>
    );
  }

  return (
    <div className={rootClassName}>
      <NotesTable
        allItems={classified}
        columns={columns}
        currentPage={currentPage}
        emptyMatchText={t("preview.noSearchMatches", {
          query: debouncedQuery,
        })}
        forcedNoteIds={forcedNoteIds}
        forceStrategy={ankiWinsStrategy}
        getDefaultSelected={(item) => isImportSelectedByDefault(item.status)}
        getNoteId={(item) => item.note.noteId}
        getRow={(item) => syncDecisionFor("import", item.status)}
        getRowAriaLabel={(item) =>
          t("preview.selectRow", { summary: noteSummary(item.note) })
        }
        getRowClassName={(item) =>
          mergeClasses(
            transferNotesPreviewClasses.previewRow,
            item.previewStatus === "upToDate"
              ? transferNotesPreviewClasses.previewRowImported
              : undefined,
          )
        }
        getRowDetails={(item) => ({
          back: item.note.fields["Back"]?.value,
          model: item.note.modelName,
          path: item.vaultPath,
          rationale: rowRationale(
            item,
            forcedNoteIds[item.note.noteId] ?? false,
          ),
          tags: tagsText(item.note.tags),
        })}
        getRowTitle={(item) => noteSummary(item.note)}
        getStatus={(item) => item.status}
        isResurrectable={(item) => item.previewStatus === "noFile"}
        items={filteredNotes}
        notesSelectedToImport={notesSelectedToImport}
        onForceChange={onForceChange}
        onSelectionChange={onSelectionChange}
        pageSize={previewPageSize}
        resurrectionWarning={resurrectionWarning(notesToResurrect)}
        search={{
          label: t("preview.searchLabel"),
          onChange: onQueryChange,
          onClear: onQueryClear,
          placeholder: t("preview.searchPlaceholder"),
          value: query,
        }}
        selectionNotice={selectionNotice(classified)}
      />
    </div>
  );
}
