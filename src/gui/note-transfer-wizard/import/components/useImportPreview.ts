import { useEffect, useMemo, useState } from "react";
import { t } from "src/i18n";
import { startAsyncLoad } from "@shared/hooks/useAsyncLoad";
import { useApplyDefaultSelection } from "@shared/hooks/useApplyDefaultSelection";
import {
  usePreviewQuery,
  type PreviewQuery,
} from "@shared/hooks/usePreviewQuery";
import type { AnkiNoteInfo } from "src/entities/anki-note";
import type { Anki } from "src/services/anki/anki";
import { fetchDeckNotes } from "src/services/anki/read";
import type { ClassifiedNote } from "src/services/commands/import-deck";
import type { NoteLifecycleStatus } from "src/services/notes/lifecycle";
import type { NoteLifecycleRecord } from "src/services/notes/lifecycle";
import type { VaultNoteIndex } from "src/services/vault/vault";
import type { Vault } from "obsidian";
import type { ColumnDef } from "@shared/components";
import { comparePreviewRank } from "@shared/utils/preview";
import { matchesSearch } from "@shared/utils/notes-search";
import {
  buildCardColumns,
  classifiedDefaultSelected,
  classifiedNoteId,
  classifyNotes,
  importSearchableText,
  previewPageSize,
  type NotesPreviewProps,
} from "./importPreviewHelpers";

interface DeckNotesParams {
  readonly anki: Anki;
  readonly deckName: string;
  readonly onPageChange: (page: number) => void;
  readonly resetQuery: () => void;
}

interface DeckNotesResult {
  readonly loadError: string;
  readonly progress: string;
  readonly rawNotes: AnkiNoteInfo[] | null;
}

function useDeckNotes(params: DeckNotesParams): DeckNotesResult {
  const [rawNotes, setRawNotes] = useState<AnkiNoteInfo[] | null>(null);
  const [progress, setProgress] = useState("");
  const [loadError, setLoadError] = useState("");

  const loadNotes = (): (() => void) => {
    setRawNotes(null);
    params.resetQuery();
    params.onPageChange(0);
    return startAsyncLoad(async (isLive) => {
      try {
        const notes = await fetchDeckNotes(
          params.anki,
          params.deckName,
          (fetched, total) => {
            if (isLive()) {
              setProgress(
                t("preview.loadingProgress", { current: fetched, total }),
              );
            }
          },
        );
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

  useEffect(loadNotes, [params.anki, params.deckName]);

  return { loadError, progress, rawNotes };
}

interface ClassifiedNotesParams {
  readonly noteLifecycle: Record<number, NoteLifecycleRecord>;
  readonly onNotesLoaded: (
    notes: AnkiNoteInfo[],
    statuses: Record<number, NoteLifecycleStatus>,
  ) => void;
  readonly rawNotes: AnkiNoteInfo[] | null;
  readonly vault: Vault;
  readonly vaultNoteIndex: VaultNoteIndex;
}

function useClassifiedImportNotes(
  params: ClassifiedNotesParams,
): ClassifiedNote[] | null {
  const [classified, setClassified] = useState<ClassifiedNote[] | null>(null);

  const loadClassifiedNotes = (): (() => void) => {
    setClassified(null);
    return startAsyncLoad(async (isLive) => {
      if (!params.rawNotes) {
        return;
      }
      const items = await classifyNotes(
        params.rawNotes,
        params.vault,
        params.vaultNoteIndex,
        params.noteLifecycle,
      );
      if (isLive()) {
        setClassified([...items].sort(comparePreviewRank));
        params.onNotesLoaded(
          items.map((item) => item.note),
          Object.fromEntries(
            items.map((item) => [item.note.noteId, item.status]),
          ),
        );
      }
    });
  };

  useEffect(loadClassifiedNotes, [
    params.rawNotes,
    params.vault,
    params.vaultNoteIndex,
    params.noteLifecycle,
  ]);

  return classified;
}

interface ImportFilteringParams {
  readonly classified: ClassifiedNote[] | null;
  readonly debouncedQuery: string;
  readonly onTotalPagesChange: (totalPages: number) => void;
}

function useFilteredImportNotes(
  params: ImportFilteringParams,
): ClassifiedNote[] {
  const filteredNotes = useMemo(
    () =>
      (params.classified ?? []).filter((item) =>
        matchesSearch(importSearchableText(item), params.debouncedQuery),
      ),
    [params.classified, params.debouncedQuery],
  );

  useEffect(() => {
    if (params.classified) {
      const pageCount = Math.max(
        1,
        Math.ceil(filteredNotes.length / previewPageSize),
      );
      params.onTotalPagesChange(pageCount);
    }
  }, [params.classified, filteredNotes.length, params.onTotalPagesChange]);

  return filteredNotes;
}

interface ImportPreviewState {
  readonly classified: ClassifiedNote[] | null;
  readonly columns: ColumnDef<ClassifiedNote>[];
  readonly filteredNotes: ClassifiedNote[];
  readonly loadError: string;
  readonly progress: string;
  readonly query: PreviewQuery;
}

export function useImportPreview(props: NotesPreviewProps): ImportPreviewState {
  const query = usePreviewQuery(props.onPageChange, props.initialQuery ?? "");
  const deckNotes = useDeckNotes({
    anki: props.anki,
    deckName: props.deckName,
    onPageChange: props.onPageChange,
    resetQuery: query.resetQuery,
  });
  const classified = useClassifiedImportNotes({
    noteLifecycle: props.noteLifecycle,
    onNotesLoaded: props.onNotesLoaded,
    rawNotes: deckNotes.rawNotes,
    vault: props.vault,
    vaultNoteIndex: props.vaultNoteIndex,
  });
  useApplyDefaultSelection(
    classified,
    classifiedNoteId,
    classifiedDefaultSelected,
    props.notesSelectedToImport,
    props.onNotesSelectedToImportChange,
  );
  const filteredNotes = useFilteredImportNotes({
    classified,
    debouncedQuery: query.debouncedQuery,
    onTotalPagesChange: props.onTotalPagesChange,
  });
  const columns = useMemo(
    () => buildCardColumns(props.forcedNoteIds),
    [props.forcedNoteIds],
  );

  return {
    classified,
    columns,
    filteredNotes,
    loadError: deckNotes.loadError,
    progress: deckNotes.progress,
    query,
  };
}
