import { useEffect, useMemo, useState, type JSX } from "react";
import { mergeClasses } from "src/gui/classes";
import { t } from "src/i18n";
import { startAsyncLoad } from "@shared/hooks/useAsyncLoad";
import { useForceToggle } from "@shared/hooks/useForceToggle";
import { ankiWinsStrategy } from "@shared/types/AnkiWinsStrategy";
import type { Anki } from "src/services/anki/anki";
import type { AnkiNoteInfo } from "src/entities/anki-note";
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
import { transferNotesPreviewClasses } from "../classes";
import { commonWizardClasses } from "@shared/classes";
import { NotesTable, type ColumnDef } from "@shared/components";
import {
  comparePreviewRank,
  countNotes,
  previewBadgeClass,
  previewStatusOrder,
  recreateWarning,
  resolveBadgeText,
  selectionNoticeText,
  type PreviewBadgeClasses,
} from "@shared/utils/preview";
import { useApplyDefaultSelection } from "@shared/hooks/useApplyDefaultSelection";

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

function noteSummary(note: AnkiNoteInfo): string {
  const front = note.fields["Front"]?.value;
  const firstField = Object.values(note.fields)[0]?.value ?? "";
  return normalizeNoteText(front ?? firstField).slice(0, 80);
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

const importBadgeClasses: PreviewBadgeClasses = {
  badgeImported: transferNotesPreviewClasses.previewBadgeImported,
  badgeNew: transferNotesPreviewClasses.previewBadgeNew,
  badgeOverwrite: transferNotesPreviewClasses.previewBadgeOverwrite,
  badgeSkipped: transferNotesPreviewClasses.previewBadgeSkipped,
};

function previewBadgeOutcome(item: ClassifiedNote): string {
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

function previewBadgeText(item: ClassifiedNote, isForced: boolean): string {
  return resolveBadgeText(
    isForced,
    ankiWinsStrategy.getForcedOutcome(importRow(item)),
    previewBadgeOutcome(item),
  );
}

function classifiedNoteId(item: ClassifiedNote): number {
  return item.note.noteId;
}

function classifiedDefaultSelected(item: ClassifiedNote): boolean {
  return isImportSelectedByDefault(item.status);
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
      header: t("preview.selectColumn"),
      render: () => <></>,
      width: "auto",
    },
    {
      header: t("preview.cardColumn"),
      render: (item: ClassifiedNote) => (
        <label>
          <span>{noteSummary(item.note)}</span>
          <span
            className={mergeClasses(
              transferNotesPreviewClasses.previewBadge,
              previewBadgeClass(importRow(item).kind, importBadgeClasses),
            )}
          >
            {previewBadgeText(item, forcedNoteIds[item.note.noteId] ?? false)}
          </span>
        </label>
      ),
      width: "1fr",
    },
  ];
}

export function NotesPreview({
  anki,
  currentPage,
  deckName,
  forcedNoteIds: initialForcedNoteIds,
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
  const [forceState, forceActions] = useForceToggle(
    initialForcedNoteIds,
    ankiWinsStrategy,
  );

  const loadPreviewNotes = (): (() => void) => {
    setRawNotes(null);
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
      const items: ClassifiedNote[] = [];
      for (const note of rawNotes) {
        const isInVaultIndex = vaultNoteIndex.has(note.noteId);
        const block = isInVaultIndex
          ? await findVaultNoteBlock(vault, vaultNoteIndex, note.noteId)
          : null;
        const hash = block
          ? await computeContentHash(
              block.front,
              block.back,
              block.tags,
              block.model,
            )
          : undefined;
        let blockInput: { id: number | undefined; hash?: string } | undefined;
        if (block !== null && hash !== undefined) {
          blockInput = { id: block.id, hash };
        } else if (block !== null) {
          blockInput = { id: block.id };
        } else {
          blockInput = undefined;
        }
        const status = classifyNoteLifecycle({
          anki: note,
          block: blockInput,
          record: noteLifecycle[note.noteId],
        });
        items.push({
          isInVaultIndex,
          note,
          previewStatus: notePreviewStatusFor(status),
          status,
          vaultPath: vaultNoteIndex.get(note.noteId),
        });
      }
      if (isLive()) {
        const ordered = [...items].sort(comparePreviewRank);
        setClassified(ordered);
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

  useEffect(() => {
    if (classified) {
      const pageCount = Math.max(
        1,
        Math.ceil(classified.length / previewPageSize),
      );
      onTotalPagesChange(pageCount);
    }
  }, [classified, onTotalPagesChange]);

  const notesLeftToDecide = useMemo(
    () =>
      classified?.filter(
        (item) =>
          !isImportSelectedByDefault(item.status) &&
          !forceState.forcedNoteIds[item.note.noteId],
      ) ?? [],
    [classified, forceState.forcedNoteIds],
  );
  const notesToResurrect = notesLeftToDecide.filter(
    (item) => item.previewStatus === "noFile",
  ).length;

  const selectNote = (
    selected: Record<number, boolean>,
    noteId: number,
    isSelected: boolean,
  ): void => {
    onNotesSelectedToImportChange({ ...selected, [noteId]: isSelected });
  };

  const toggleForced = (noteId: number, isForced: boolean): void => {
    forceActions.toggleForced(noteId, isForced);
    onForcedNoteIdsChange({ ...forceState.forcedNoteIds, [noteId]: isForced });
    onNotesSelectedToImportChange({
      ...notesSelectedToImport,
      [noteId]: isForced,
    });
  };

  const useAnkiForEveryNote = (): void => {
    const forced = { ...forceState.forcedNoteIds };
    const selected = { ...notesSelectedToImport };
    for (const item of notesLeftToDecide) {
      forced[item.note.noteId] = true;
      selected[item.note.noteId] = true;
    }
    onForcedNoteIdsChange(forced);
    onNotesSelectedToImportChange(selected);
    for (const item of notesLeftToDecide) {
      forceActions.setForced(item.note.noteId, true);
    }
  };

  const columns = useMemo(
    () => buildCardColumns(forceState.forcedNoteIds),
    [forceState.forcedNoteIds],
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
        bulkActionHandler={useAnkiForEveryNote}
        bulkActionLabel={t("preview.bulkAnki")}
        columns={columns}
        currentPage={currentPage}
        forcedNoteIds={forceState.forcedNoteIds}
        forceStrategy={ankiWinsStrategy}
        getDefaultSelected={(item) => isImportSelectedByDefault(item.status)}
        getNoteId={(item) => item.note.noteId}
        getRow={(item) => syncDecisionFor("import", item.status)}
        getRowClassName={(item) =>
          mergeClasses(
            transferNotesPreviewClasses.previewRow,
            item.previewStatus === "upToDate"
              ? transferNotesPreviewClasses.previewRowImported
              : undefined,
          )
        }
        getStatus={(item) => item.status}
        isResurrectable={(item) => item.previewStatus === "noFile"}
        items={classified}
        notesSelectedToImport={notesSelectedToImport}
        onForcedChange={toggleForced}
        onSelectedChange={selectNote}
        pageSize={previewPageSize}
        resurrectionWarning={resurrectionWarning(notesToResurrect)}
        selectionNotice={selectionNotice(classified)}
      />
    </div>
  );
}
