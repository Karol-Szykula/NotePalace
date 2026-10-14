import { mergeClasses } from "src/gui/classes";
import { t } from "src/i18n";
import type { AnkiNoteInfo } from "src/entities/anki-note";
import type { Anki } from "src/services/anki/anki";
import { fetchNotesByIdMap } from "src/services/anki/read";
import {
  classifyVaultBlock,
  scanVaultBlocks,
} from "src/services/commands/export-deck";
import {
  decisionActFor,
  syncDecisionFor,
} from "src/services/notes/decision-table";
import type { SyncDecisionRow } from "src/services/notes/decision-table";
import type { YamlNote } from "src/services/notes/document";
import { notePreviewStatusFor } from "src/services/notes/lifecycle";
import type {
  NoteLifecycleEvent,
  NoteLifecycleRecord,
  NoteLifecycleStatus,
  NotePreviewStatus,
} from "src/services/notes/lifecycle";
import { normalizeNoteText } from "src/services/notes/text";
import { obsidianYamlEngine } from "src/services/yaml-engine";
import type { Vault } from "obsidian";
import { StatusChip, type ColumnDef } from "@shared/components";
import type { NoteDetailsData } from "@shared/components/NoteDetails";
import { obsidianWinsStrategy } from "@shared/types/ObsidianWinsStrategy";
import {
  countNotes,
  outcomeLabelKey,
  previewStatusOrder,
  rationaleText,
  selectionNoticeText,
} from "@shared/utils/preview";
import { exportNotesPreviewClasses } from "../classes";

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

export interface ExportableBlock {
  readonly block: YamlNote;
  readonly deckName: string;
  readonly filePath: string;
  readonly previewStatus: NotePreviewStatus;
  readonly rowKey: number;
  readonly status: NoteLifecycleStatus;
}

export interface PreviewQuery {
  readonly debouncedQuery: string;
  readonly onQueryChange: (value: string) => void;
  readonly onQueryClear: () => void;
  readonly query: string;
  readonly resetQuery: () => void;
}

export const previewPageSize = 100;

function blockFront(block: YamlNote): string {
  return normalizeNoteText(block.front);
}

export function blockSummary(block: YamlNote): string {
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

export function isExportSelectedByDefault(
  status: NoteLifecycleStatus,
): boolean {
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

export function selectionNotice(items: ExportableBlock[]): string {
  const reasons: string[] = [];
  for (const status of previewStatusOrder) {
    const count = items.filter((item) => item.previewStatus === status).length;
    if (count > 0) {
      reasons.push(`${countNotes(count)} ${previewReasonText(status)}`);
    }
  }
  return selectionNoticeText(reasons, t("preview.actionAll"));
}

export function buildCardColumns(
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

export function blockSearchableText(item: ExportableBlock): string {
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

interface FetchExportBlocksParams {
  readonly anki: Anki;
  readonly deckName: string;
  readonly ignoredDirectories: string;
  readonly noteLifecycle: Record<number, NoteLifecycleRecord>;
  readonly onProgress: (current: number, total: number) => void;
  readonly vault: Vault;
}

export async function fetchExportBlocks(
  params: FetchExportBlocksParams,
): Promise<ExportableBlock[]> {
  const scan = await scanVaultBlocks(
    params.vault,
    params.ignoredDirectories,
    obsidianYamlEngine,
  );
  const inDeck = scan.locations.filter(
    (location) => location.deckName === params.deckName,
  );
  params.onProgress(0, inDeck.length);
  const ids = [
    ...new Set(
      inDeck
        .map((location) => location.block.id)
        .filter((id): id is number => id !== undefined),
    ),
  ];
  const ankiNotes = await fetchNotesByIdMap(params.anki, ids);
  return await classifyBlocks(
    inDeck,
    ankiNotes,
    params.noteLifecycle,
    params.onProgress,
  );
}

export function countBlocksToRecreate(
  classified: ExportableBlock[],
  forcedNoteIds: Record<number, boolean>,
): number {
  return classified.filter(
    (item) =>
      item.block.id !== undefined &&
      !isExportSelectedByDefault(item.status) &&
      !forcedNoteIds[item.rowKey] &&
      item.status === "vaultOnly.ankiDeleted",
  ).length;
}

export function exportRowClassName(item: ExportableBlock): string | undefined {
  return mergeClasses(
    exportNotesPreviewClasses.previewRow,
    item.previewStatus === "upToDate"
      ? exportNotesPreviewClasses.previewRowImported
      : undefined,
  );
}

export function exportRowDetails(
  item: ExportableBlock,
  isForced: boolean,
): NoteDetailsData {
  return {
    back: item.block.back,
    model: item.block.model,
    path: item.filePath,
    rationale: rowRationale(item, isForced),
    tags: tagsText(item.block.tags),
  };
}
