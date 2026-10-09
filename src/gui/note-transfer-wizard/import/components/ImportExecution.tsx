import { useEffect, useRef, useState, type JSX } from "react";
import { mergeClasses } from "src/gui/classes";
import { t, type MessageKey } from "src/i18n";
import type { Vault } from "obsidian";
import type { Anki } from "src/services/anki/anki";
import type { AnkiNoteInfo } from "src/entities/anki-note";
import type {
  NoteLifecycleRecord,
  NoteLifecycleStatus,
} from "src/services/notes/lifecycle";
import type { FieldMapping as FieldMap } from "src/entities/field-mapping";
import type { VaultNoteIndex } from "src/services/vault/vault";
import {
  executeImport,
  type ImportExecutionReport,
} from "src/services/commands/import-deck";
import { fetchNotesByIds } from "src/services/anki/read";
import { commonWizardClasses } from "../../shared/classes";

export interface ImportExecutionProps {
  readonly anki: Anki;
  readonly className?: string | undefined;
  readonly deckName: string;
  readonly fieldMappings: Record<string, FieldMap>;
  readonly forcedNoteIds: Record<number, boolean>;
  readonly noteLifecycle: Record<number, NoteLifecycleRecord>;
  readonly notes: AnkiNoteInfo[];
  readonly notesSelectedToImport: Record<number, boolean>;
  readonly onFinish: (report: ImportExecutionReport) => void;
  readonly previewStatuses?: Record<number, NoteLifecycleStatus> | undefined;
  readonly vault: Vault;
  readonly vaultNoteIndex?: VaultNoteIndex | undefined;
}

type ExecutionPhase = "running" | "done" | "failed";

function baseReportParts(report: ImportExecutionReport): string[] {
  return [
    t("report.created", { count: report.created }),
    t("report.overwritten", { count: report.overwritten }),
    t("report.skipped", { count: report.skipped }),
    t("report.mediaFiles", { count: report.mediaFiles }),
  ];
}

function countPart(count: number, key: MessageKey): string | undefined {
  return count > 0 ? t(key, { count }) : undefined;
}

function foldersPart(count: number): string | undefined {
  return count > 1 ? t("report.folders", { count }) : undefined;
}

function optionalReportParts(report: ImportExecutionReport): string[] {
  return [
    countPart(report.skippedUnmapped, "report.skippedUnmapped"),
    countPart(report.mediaNotImported, "report.mediaNotImported"),
    countPart(report.changedSincePreview, "report.changedSincePreview"),
    countPart(report.vanishedFromDeck, "report.vanishedFromDeck"),
    foldersPart(report.folders),
    countPart(report.forced, "report.forced"),
    countPart(report.skippedNewerInVault, "report.skippedNewerInVault"),
    countPart(report.skippedLeftToSync, "report.skippedLeftToSync"),
  ].filter((part): part is string => part !== undefined);
}

function formatImportReport(report: ImportExecutionReport): string {
  const parts = [...baseReportParts(report), ...optionalReportParts(report)];
  const cancelled = report.cancelled ? t("report.cancelled") : "";
  return `${parts.join(", ")}${cancelled}.`;
}

export function ImportExecution({
  anki,
  notesSelectedToImport,
  className,
  deckName,
  fieldMappings,
  forcedNoteIds,
  noteLifecycle,
  notes,
  onFinish,
  previewStatuses,
  vault,
  vaultNoteIndex,
}: ImportExecutionProps): JSX.Element {
  const [phase, setPhase] = useState<ExecutionPhase>("running");
  const [progress, setProgress] = useState("");
  const [failure, setFailure] = useState("");
  const [report, setReport] = useState<ImportExecutionReport | null>(null);
  const importStarted = useRef(false);

  const runImport = async () => {
    setPhase("running");
    setFailure("");
    try {
      const freshNotes = await fetchNotesByIds(
        anki,
        notes
          .filter((note) => notesSelectedToImport[note.noteId] ?? false)
          .map((note) => note.noteId),
      );
      const finished = await executeImport(anki, vault, {
        freshNotes,
        previewStatuses,
        ankiWinsNoteIds: Object.entries(forcedNoteIds)
          .filter(([, isForced]) => isForced)
          .map(([noteId]) => Number(noteId)),
        decisions: notesSelectedToImport,
        deckName,
        fieldMappings,
        noteLifecycle,
        notes,
        onProgress: (processed, total) => {
          setProgress(t("report.importingProgress", { processed, total }));
        },
        targetFolder: "",
        vaultNoteIndex,
      });
      setReport(finished);
      setPhase("done");
      onFinish(finished);
    } catch (error) {
      setFailure(
        error instanceof Error ? error.message : "Unknown import error.",
      );
      setPhase("failed");
    }
  };

  const startImportOnce = () => {
    if (importStarted.current) {
      return;
    }
    importStarted.current = true;
    void runImport();
  };

  useEffect(startImportOnce, []);

  return (
    <div className={mergeClasses(commonWizardClasses.pageView, className)}>
      {phase === "running" && <p>{progress || t("report.importing")}</p>}
      {phase === "failed" && (
        <p>{t("notice.importFailed", { error: failure })}</p>
      )}
      {phase === "done" && report && <p>{formatImportReport(report)}</p>}
    </div>
  );
}
