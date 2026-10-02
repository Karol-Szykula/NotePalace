import { useEffect, useMemo, useState, type JSX } from "react";
import { mergeClasses } from "src/gui/classes";
import { startAsyncLoad } from "@shared/hooks/useAsyncLoad";
import { useApplyDefaultSelection } from "@shared/hooks/useApplyDefaultSelection";
import { useForceToggle } from "@shared/hooks/useForceToggle";
import { obsidianWinsStrategy } from "@shared/types/ObsidianWinsStrategy";
import type { Anki } from "src/services/anki/anki";
import { fetchNotesByIdMap } from "src/services/anki/read";
import type { Vault } from "obsidian";
import {
  classifyVaultBlock,
  scanVaultBlocks,
} from "src/services/commands/export-deck";
import type {
  NoteLifecycleEvent,
  NoteLifecycleStatus,
} from "src/services/notes/lifecycle";
import type { NotePreviewStatus } from "src/services/notes/lifecycle";
import { notePreviewStatusFor } from "src/services/notes/lifecycle";
import {
  decisionActFor,
  syncDecisionFor,
} from "src/services/notes/decision-table";
import type { SyncDecisionRow } from "src/services/notes/decision-table";
import type { NoteLifecycleRecord } from "src/services/notes/lifecycle";
import type { YamlNote } from "src/services/notes/document";
import { obsidianYamlEngine } from "src/services/yaml-engine";
import { normalizeNoteText } from "src/services/notes/text";
import { exportNotesPreviewClasses } from "../classes";
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

interface ExportableBlock {
  readonly block: YamlNote;
  readonly deckName: string;
  readonly filePath: string;
  readonly previewStatus: NotePreviewStatus;
  readonly rowKey: number;
  readonly status: NoteLifecycleStatus;
}

export interface NotesPreviewProps {
  readonly anki: Anki;
  readonly className?: string;
  readonly currentPage: number;
  readonly deckName: string;
  readonly forcedNoteIds: Record<number, boolean>;
  readonly ignoredDirectories: string;
  readonly noteLifecycle: Record<number, NoteLifecycleRecord>;
  readonly notesSelectedToExport: Record<number, boolean>;
  readonly onForcedNoteIdsChange: (
    forcedNoteIds: Record<number, boolean>,
  ) => void;
  readonly onNotesSelectedToExportChange: (
    notesSelectedToExport: Record<number, boolean>,
  ) => void;
  readonly onPageChange: (page: number) => void;
  readonly onStatusesLoaded: (
    statuses: Record<number, NoteLifecycleStatus>,
  ) => void;
  readonly onTotalPagesChange: (totalPages: number) => void;
  readonly totalPages: number;
  readonly vault: Vault;
}

const previewPageSize = 100;

function blockSummary(block: YamlNote): string {
  return normalizeNoteText(block.front).slice(0, 80);
}

function exportRow(item: ExportableBlock): SyncDecisionRow {
  return syncDecisionFor("export", item.status);
}

const exportWriteActs: readonly NoteLifecycleEvent[] = [
  "ENROLL",
  "EXPORT",
  "PUSH",
  "FORCE_PUSH",
];

function isExportSelectedByDefault(status: NoteLifecycleStatus): boolean {
  return exportWriteActs.includes(
    decisionActFor("export", status) as NoteLifecycleEvent,
  );
}

const exportBadgeClasses: PreviewBadgeClasses = {
  badgeImported: exportNotesPreviewClasses.previewBadgeImported,
  badgeNew: exportNotesPreviewClasses.previewBadgeNew,
  badgeOverwrite: exportNotesPreviewClasses.previewBadgeOverwrite,
  badgeSkipped: exportNotesPreviewClasses.previewBadgeSkipped,
};

function previewBadgeOutcome(item: ExportableBlock): string {
  const row = exportRow(item);
  if (item.previewStatus === "upToDate") {
    return `${row.rationale} (${item.filePath})`;
  }
  return row.rationale;
}

function previewBadgeText(item: ExportableBlock, isForced: boolean): string {
  return resolveBadgeText(exportRow(item), isForced, previewBadgeOutcome(item));
}

const previewReasonText: Record<NotePreviewStatus, string> = {
  diverged: "edited in both places",
  new: "not exported yet",
  newerInAnki: "with a newer version in Anki",
  newerInVault: "with newer Obsidian edits",
  noFile: "with no file in Obsidian",
  upToDate: "already up to date",
};

function selectionNotice(items: ExportableBlock[]): string {
  const reasons: string[] = [];
  for (const status of previewStatusOrder) {
    const count = items.filter((item) => item.previewStatus === status).length;
    if (count > 0) {
      reasons.push(`${countNotes(count)} ${previewReasonText[status]}`);
    }
  }
  return selectionNoticeText(
    reasons,
    "The button above takes Obsidian's version of every remaining note.",
  );
}

function buildCardColumns(
  forcedNoteIds: Record<number, boolean>,
): ColumnDef<ExportableBlock>[] {
  return [
    {
      header: "Select",
      render: () => <></>,
      width: "auto",
    },
    {
      header: "Note",
      render: (item: ExportableBlock) => (
        <label>
          <span>{blockSummary(item.block)}</span>
          <span
            className={mergeClasses(
              exportNotesPreviewClasses.previewBadge,
              previewBadgeClass(exportRow(item).kind, exportBadgeClasses),
            )}
          >
            {previewBadgeText(item, forcedNoteIds[item.rowKey] ?? false)}
          </span>
        </label>
      ),
      width: "1fr",
    },
  ];
}

function exportableRowKey(blockId: number | undefined, index: number): number {
  return blockId ?? -(index + 1);
}

export function NotesPreview({
  anki,
  currentPage,
  deckName,
  forcedNoteIds: initialForcedNoteIds,
  ignoredDirectories,
  noteLifecycle,
  onPageChange,
  onStatusesLoaded,
  onTotalPagesChange,
  vault,
  notesSelectedToExport,
  onForcedNoteIdsChange,
  onNotesSelectedToExportChange,
  className,
}: NotesPreviewProps): JSX.Element {
  const rootClassName = mergeClasses(commonWizardClasses.pageView, className);
  const [classified, setClassified] = useState<ExportableBlock[] | null>(null);
  const [progress, setProgress] = useState("");
  const [loadError, setLoadError] = useState("");
  const [forceState, forceActions] = useForceToggle(
    initialForcedNoteIds,
    obsidianWinsStrategy,
  );

  const loadClassifiedBlocks = (): (() => void) => {
    setClassified(null);
    onPageChange(0);
    return startAsyncLoad(async (isLive) => {
      try {
        const scan = await scanVaultBlocks(
          vault,
          ignoredDirectories,
          obsidianYamlEngine,
        );
        const inDeck = scan.locations.filter(
          (location) => location.deckName === deckName,
        );
        if (isLive()) {
          setProgress(`Loading notes… 0/${inDeck.length}`);
        }
        const ids = [
          ...new Set(
            inDeck
              .map((location) => location.block.id)
              .filter((id): id is number => id !== undefined),
          ),
        ];
        const ankiNotes = await fetchNotesByIdMap(anki, ids);
        const items: ExportableBlock[] = [];
        for (const [index, location] of inDeck.entries()) {
          const id = location.block.id;
          const status = await classifyVaultBlock(
            location.block,
            id === undefined ? undefined : ankiNotes.get(id),
            id === undefined ? undefined : noteLifecycle[id],
          );
          items.push({
            block: location.block,
            deckName: location.deckName,
            filePath: location.file.path,
            previewStatus: notePreviewStatusFor(status),
            rowKey: exportableRowKey(id, index),
            status,
          });
          if (isLive()) {
            setProgress(`Loading notes… ${index + 1}/${inDeck.length}`);
          }
        }
        if (isLive()) {
          const ordered = [...items].sort(comparePreviewRank);
          setClassified(ordered);
          onStatusesLoaded(
            Object.fromEntries(
              ordered
                .filter((item) => item.block.id !== undefined)
                .map((item) => [item.block.id as number, item.status]),
            ),
          );
        }
      } catch {
        if (isLive()) {
          setLoadError("Error: could not load notes.");
        }
      }
    });
  };

  useEffect(loadClassifiedBlocks, [anki, deckName, ignoredDirectories, vault]);

  useApplyDefaultSelection(
    classified,
    (item) => item.rowKey,
    (item) =>
      item.block.id === undefined || isExportSelectedByDefault(item.status),
    notesSelectedToExport,
    onNotesSelectedToExportChange,
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
          item.block.id !== undefined &&
          !isExportSelectedByDefault(item.status) &&
          !forceState.forcedNoteIds[item.rowKey],
      ) ?? [],
    [classified, forceState.forcedNoteIds],
  );
  const notesToRecreate = notesLeftToDecide.filter(
    (item) => item.status === "vaultOnly.ankiDeleted",
  ).length;

  const selectNote = (
    selected: Record<number, boolean>,
    noteId: number,
    isSelected: boolean,
  ): void => {
    onNotesSelectedToExportChange({ ...selected, [noteId]: isSelected });
  };

  const toggleForced = (noteId: number, isForced: boolean): void => {
    forceActions.toggleForced(noteId, isForced);
    onForcedNoteIdsChange({ ...forceState.forcedNoteIds, [noteId]: isForced });
    onNotesSelectedToExportChange({
      ...notesSelectedToExport,
      [noteId]: isForced,
    });
  };

  const useObsidianForEveryNote = (): void => {
    const forced = { ...forceState.forcedNoteIds };
    const selected = { ...notesSelectedToExport };
    for (const item of notesLeftToDecide) {
      forced[item.rowKey] = true;
      selected[item.rowKey] = true;
    }
    onForcedNoteIdsChange(forced);
    onNotesSelectedToExportChange(selected);
    for (const item of notesLeftToDecide) {
      forceActions.setForced(item.rowKey, true);
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
        <p>{progress || "Loading notes…"}</p>
      </div>
    );
  }

  return (
    <div className={rootClassName}>
      <NotesTable
        bulkActionHandler={useObsidianForEveryNote}
        bulkActionLabel="Use Obsidian's version for all (X)"
        columns={columns}
        countText={(selectedCount, total) =>
          `Notes to export: ${selectedCount}/${total}.`
        }
        currentPage={currentPage}
        forcedNoteIds={forceState.forcedNoteIds}
        forceStrategy={obsidianWinsStrategy}
        getDefaultSelected={(item) =>
          item.block.id === undefined || isExportSelectedByDefault(item.status)
        }
        getNoteId={(item) => item.rowKey}
        getRow={(item) => syncDecisionFor("export", item.status)}
        getRowClassName={(item) =>
          mergeClasses(
            exportNotesPreviewClasses.previewRow,
            item.previewStatus === "upToDate"
              ? exportNotesPreviewClasses.previewRowImported
              : undefined,
          )
        }
        getStatus={(item) => item.status}
        isResurrectable={(item) => item.status === "vaultOnly.ankiDeleted"}
        isSelectionLocked={(item) => item.block.id === undefined}
        items={classified}
        notesSelectedToImport={notesSelectedToExport}
        onForcedChange={toggleForced}
        onPageChange={onPageChange}
        onSelectedChange={selectNote}
        pageSize={previewPageSize}
        resurrectionWarning={recreateWarning(notesToRecreate, "Anki")}
        selectionNotice={selectionNotice(classified)}
      />
    </div>
  );
}
