import { useEffect, useMemo, useState } from "react";
import { t } from "src/i18n";
import { startAsyncLoad } from "@shared/hooks/useAsyncLoad";
import { useApplyDefaultSelection } from "@shared/hooks/useApplyDefaultSelection";
import { useDebouncedValue } from "@shared/hooks/useDebouncedValue";
import type { Anki } from "src/services/anki/anki";
import type { Vault } from "obsidian";
import type { NoteLifecycleStatus } from "src/services/notes/lifecycle";
import type { NoteLifecycleRecord } from "src/services/notes/lifecycle";
import type { ColumnDef } from "@shared/components";
import { comparePreviewRank } from "@shared/utils/preview";
import { matchesSearch } from "@shared/utils/notes-search";
import {
  blockSearchableText,
  buildCardColumns,
  fetchExportBlocks,
  isExportSelectedByDefault,
  previewPageSize,
  type ExportableBlock,
  type NotesPreviewProps,
  type PreviewQuery,
} from "./exportPreviewHelpers";

function usePreviewQuery(onPageChange: (page: number) => void): PreviewQuery {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);

  const onQueryChange = (value: string): void => {
    setQuery(value);
    onPageChange(0);
  };

  const onQueryClear = (): void => {
    setQuery("");
    onPageChange(0);
  };

  const resetQuery = (): void => {
    setQuery("");
  };

  return { debouncedQuery, onQueryChange, onQueryClear, query, resetQuery };
}

interface ExportBlocksParams {
  readonly anki: Anki;
  readonly deckName: string;
  readonly ignoredDirectories: string;
  readonly noteLifecycle: Record<number, NoteLifecycleRecord>;
  readonly onPageChange: (page: number) => void;
  readonly onStatusesLoaded: (
    statuses: Record<number, NoteLifecycleStatus>,
  ) => void;
  readonly resetQuery: () => void;
  readonly vault: Vault;
}

interface ExportBlocksResult {
  readonly classified: ExportableBlock[] | null;
  readonly loadError: string;
  readonly progress: string;
}

function useExportBlocks(params: ExportBlocksParams): ExportBlocksResult {
  const [classified, setClassified] = useState<ExportableBlock[] | null>(null);
  const [progress, setProgress] = useState("");
  const [loadError, setLoadError] = useState("");

  const loadBlocks = (): (() => void) => {
    setClassified(null);
    params.resetQuery();
    params.onPageChange(0);
    return startAsyncLoad(async (isLive) => {
      try {
        const items = await fetchExportBlocks({
          anki: params.anki,
          deckName: params.deckName,
          ignoredDirectories: params.ignoredDirectories,
          noteLifecycle: params.noteLifecycle,
          onProgress: (current, total) => {
            if (isLive()) {
              setProgress(t("preview.loadingProgress", { current, total }));
            }
          },
          vault: params.vault,
        });
        if (isLive()) {
          const ordered = [...items].sort(comparePreviewRank);
          setClassified(ordered);
          params.onStatusesLoaded(
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

  useEffect(loadBlocks, [
    params.anki,
    params.deckName,
    params.ignoredDirectories,
    params.vault,
  ]);

  return { classified, loadError, progress };
}

interface ExportFilteringParams {
  readonly classified: ExportableBlock[] | null;
  readonly debouncedQuery: string;
  readonly onTotalPagesChange: (totalPages: number) => void;
}

function useFilteredExportBlocks(
  params: ExportFilteringParams,
): ExportableBlock[] {
  const filteredBlocks = useMemo(
    () =>
      (params.classified ?? []).filter((item) =>
        matchesSearch(blockSearchableText(item), params.debouncedQuery),
      ),
    [params.classified, params.debouncedQuery],
  );

  useEffect(() => {
    if (params.classified) {
      const pageCount = Math.max(
        1,
        Math.ceil(filteredBlocks.length / previewPageSize),
      );
      params.onTotalPagesChange(pageCount);
    }
  }, [params.classified, filteredBlocks.length, params.onTotalPagesChange]);

  return filteredBlocks;
}

interface ExportPreviewState {
  readonly classified: ExportableBlock[] | null;
  readonly columns: ColumnDef<ExportableBlock>[];
  readonly filteredBlocks: ExportableBlock[];
  readonly loadError: string;
  readonly progress: string;
  readonly query: PreviewQuery;
}

export function useExportPreview(props: NotesPreviewProps): ExportPreviewState {
  const query = usePreviewQuery(props.onPageChange);
  const blocks = useExportBlocks({
    anki: props.anki,
    deckName: props.deckName,
    ignoredDirectories: props.ignoredDirectories,
    noteLifecycle: props.noteLifecycle,
    onPageChange: props.onPageChange,
    onStatusesLoaded: props.onStatusesLoaded,
    resetQuery: query.resetQuery,
    vault: props.vault,
  });
  useApplyDefaultSelection(
    blocks.classified,
    (item) => item.rowKey,
    (item) =>
      item.block.id === undefined || isExportSelectedByDefault(item.status),
    props.notesSelectedToExport,
    props.onNotesSelectedToExportChange,
  );
  const filteredBlocks = useFilteredExportBlocks({
    classified: blocks.classified,
    debouncedQuery: query.debouncedQuery,
    onTotalPagesChange: props.onTotalPagesChange,
  });
  const columns = useMemo(
    () => buildCardColumns(props.forcedNoteIds),
    [props.forcedNoteIds],
  );

  return {
    classified: blocks.classified,
    columns,
    filteredBlocks,
    loadError: blocks.loadError,
    progress: blocks.progress,
    query,
  };
}
