import { useEffect, useMemo, useState, type JSX } from "react";
import { mergeClasses } from "src/gui/classes";
import { t } from "src/i18n";
import { startAsyncLoad } from "@shared/hooks/useAsyncLoad";
import { useApplyDefaultSelection } from "@shared/hooks/useApplyDefaultSelection";
import { useDebouncedValue } from "@shared/hooks/useDebouncedValue";
import { obsidianWinsStrategy } from "@shared/types/ObsidianWinsStrategy";
import type { Anki } from "src/services/anki/anki";
import { fetchNotesByIdMap } from "src/services/anki/read";
import type { AnkiNoteInfo } from "src/entities/anki-note";
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
import { NotesTable, StatusChip, type ColumnDef } from "@shared/components";
import { matchesSearch } from "@shared/utils/notes-search";
import {
  comparePreviewRank,
  countNotes,
  outcomeLabelKey,
  previewStatusOrder,
  rationaleText,
  recreateWarning,
  selectionNoticeText,
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

function blockFront(block: YamlNote): string {
  return normalizeNoteText(block.front);
}

function blockSummary(block: YamlNote): string {
  return blockFront(block).slice(0, 80);
}

function tagsText(tags: string): string | undefined {
  const names = tags.split(/\s+/).filter(Boolean);
  return names.length > 0 ? names.join(", ") : undefined;
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

function rationaleOutcome(item: ExportableBlock): string {
  const row = exportRow(item);
  if (item.previewStatus === "upToDate") {
    return `${t(row.rationaleKey)} (${item.filePath})`;
  }
  return t(row.rationaleKey);
}

function rowRationale(item: ExportableBlock, isForced: boolean): string {
  return rationaleText(
    isForced,
    obsidianWinsStrategy.getForcedOutcome(exportRow(item)),
    rationaleOutcome(item),
  );
}

function previewReasonText(status: NotePreviewStatus): string {
  switch (status) {
    case "diverged":
      return t("preview.editedInBoth");
    case "new":
      return t("preview.notExportedYet");
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

function selectionNotice(items: ExportableBlock[]): string {
  const reasons: string[] = [];
  for (const status of previewStatusOrder) {
    const count = items.filter((item) => item.previewStatus === status).length;
    if (count > 0) {
      reasons.push(`${countNotes(count)} ${previewReasonText(status)}`);
    }
  }
  return selectionNoticeText(reasons, t("preview.actionAll"));
}

function buildCardColumns(
  forcedNoteIds: Record<number, boolean>,
): ColumnDef<ExportableBlock>[] {
  return [
    {
      header: t("preview.noteColumn"),
      render: (item: ExportableBlock) => {
        const row = exportRow(item);
        return (
          <div className={exportNotesPreviewClasses.previewTitle}>
            <span
              className={exportNotesPreviewClasses.previewTitleText}
              title={blockFront(item.block)}
            >
              {blockSummary(item.block)}
            </span>
            <StatusChip
              kind={row.kind}
              label={t(outcomeLabelKey[row.kind])}
              tooltip={rowRationale(item, forcedNoteIds[item.rowKey] ?? false)}
            />
          </div>
        );
      },
      width: "1fr",
    },
  ];
}

function exportableRowKey(blockId: number | undefined, index: number): number {
  return blockId ?? -(index + 1);
}

type VaultBlockLocation = Awaited<
  ReturnType<typeof scanVaultBlocks>
>["locations"][number];

function blockSearchableText(item: ExportableBlock): string {
  return [
    item.block.front,
    item.block.back,
    item.block.tags,
    item.block.model,
  ].join(" ");
}

async function classifyBlocks(
  inDeck: VaultBlockLocation[],
  ankiNotes: Map<number, AnkiNoteInfo>,
  noteLifecycle: Record<number, NoteLifecycleRecord>,
  onProgress: (current: number, total: number) => void,
): Promise<ExportableBlock[]> {
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
    onProgress(index + 1, inDeck.length);
  }
  return items;
}

export function NotesPreview({
  anki,
  currentPage,
  deckName,
  forcedNoteIds,
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
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);

  const loadClassifiedBlocks = (): (() => void) => {
    setClassified(null);
    setQuery("");
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
          setProgress(
            t("preview.loadingProgress", { current: 0, total: inDeck.length }),
          );
        }
        const ids = [
          ...new Set(
            inDeck
              .map((location) => location.block.id)
              .filter((id): id is number => id !== undefined),
          ),
        ];
        const ankiNotes = await fetchNotesByIdMap(anki, ids);
        const items = await classifyBlocks(
          inDeck,
          ankiNotes,
          noteLifecycle,
          (current, total) => {
            if (isLive()) {
              setProgress(t("preview.loadingProgress", { current, total }));
            }
          },
        );
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
          setLoadError(t("errors.couldNotLoadNotes"));
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

  const filteredBlocks = useMemo(
    () =>
      (classified ?? []).filter((item) =>
        matchesSearch(blockSearchableText(item), debouncedQuery),
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
        Math.ceil(filteredBlocks.length / previewPageSize),
      );
      onTotalPagesChange(pageCount);
    }
  }, [classified, filteredBlocks.length, onTotalPagesChange]);

  const notesLeftToDecide = useMemo(
    () =>
      classified?.filter(
        (item) =>
          item.block.id !== undefined &&
          !isExportSelectedByDefault(item.status) &&
          !forcedNoteIds[item.rowKey],
      ) ?? [],
    [classified, forcedNoteIds],
  );
  const notesToRecreate = notesLeftToDecide.filter(
    (item) => item.status === "vaultOnly.ankiDeleted",
  ).length;

  const onSelectionChange = (selected: Record<number, boolean>): void => {
    onNotesSelectedToExportChange(selected);
  };

  const onForceChange = (
    forced: Record<number, boolean>,
    selected: Record<number, boolean>,
  ): void => {
    onForcedNoteIdsChange(forced);
    onNotesSelectedToExportChange(selected);
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
        countText={(selectedCount, total) =>
          t("preview.notesToExport", { selected: selectedCount, total })
        }
        currentPage={currentPage}
        emptyMatchText={t("preview.noSearchMatches", {
          query: debouncedQuery,
        })}
        forcedNoteIds={forcedNoteIds}
        forceStrategy={obsidianWinsStrategy}
        getDefaultSelected={(item) =>
          item.block.id === undefined || isExportSelectedByDefault(item.status)
        }
        getNoteId={(item) => item.rowKey}
        getRow={(item) => syncDecisionFor("export", item.status)}
        getRowAriaLabel={(item) =>
          t("preview.selectRow", { summary: blockSummary(item.block) })
        }
        getRowClassName={(item) =>
          mergeClasses(
            exportNotesPreviewClasses.previewRow,
            item.previewStatus === "upToDate"
              ? exportNotesPreviewClasses.previewRowImported
              : undefined,
          )
        }
        getRowDetails={(item) => ({
          back: item.block.back,
          model: item.block.model,
          path: item.filePath,
          rationale: rowRationale(item, forcedNoteIds[item.rowKey] ?? false),
          tags: tagsText(item.block.tags),
        })}
        getRowTitle={(item) => blockSummary(item.block)}
        getStatus={(item) => item.status}
        isResurrectable={(item) => item.status === "vaultOnly.ankiDeleted"}
        isSelectionLocked={(item) => item.block.id === undefined}
        items={filteredBlocks}
        notesSelectedToImport={notesSelectedToExport}
        onForceChange={onForceChange}
        onSelectionChange={onSelectionChange}
        pageSize={previewPageSize}
        resurrectionWarning={recreateWarning(notesToRecreate, "Anki")}
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
