import { useEffect, useRef, useState, type JSX } from "react";
import { mergeClasses } from "src/gui/classes";
import type { Vault } from "obsidian";
import type { Anki } from "src/services/anki/anki";
import type { NoteLifecycleStatus } from "src/services/notes/lifecycle";
import type { ISettings } from "src/conf/settings";
import {
  executeExport,
  type ExportReport,
} from "src/services/commands/export-deck";
import { commonWizardClasses } from "@shared/classes";

export interface ExportExecutionProps {
  readonly anki: Anki;
  readonly className?: string;
  readonly forcedNoteIds: Record<number, boolean>;
  readonly ignoredDirectories: string;
  readonly notesSelectedToExport: Record<number, boolean>;
  readonly onFinish: (report: ExportReport) => void;
  readonly previewStatuses?: Record<number, NoteLifecycleStatus>;
  readonly settings: ISettings;
  readonly vault: Vault;
}

type ExecutionPhase = "running" | "done" | "failed";

export function ExportExecution({
  anki,
  notesSelectedToExport,
  className,
  forcedNoteIds,
  ignoredDirectories,
  onFinish,
  previewStatuses,
  settings,
  vault,
}: ExportExecutionProps): JSX.Element {
  const [phase, setPhase] = useState<ExecutionPhase>("running");
  const [progress, setProgress] = useState("");
  const [failure, setFailure] = useState("");
  const [report, setReport] = useState<ExportReport | null>(null);
  const exportStarted = useRef(false);

  const runExport = async () => {
    setPhase("running");
    setFailure("");
    try {
      const finished = await executeExport(anki, vault, settings, {
        decisions: notesSelectedToExport,
        forcedNoteIds: Object.entries(forcedNoteIds)
          .filter(([, isForced]) => isForced)
          .map(([noteId]) => Number(noteId)),
        ignoredDirectories,
        onProgress: (processed, total) => {
          setProgress(`Exporting… ${processed}/${total}`);
        },
        previewStatuses,
      });
      setReport(finished);
      setPhase("done");
      onFinish(finished);
    } catch (error) {
      setFailure(
        error instanceof Error ? error.message : "Unknown export error.",
      );
      setPhase("failed");
    }
  };

  const startExportOnce = () => {
    if (exportStarted.current) {
      return;
    }
    exportStarted.current = true;
    void runExport();
  };

  useEffect(startExportOnce, []);

  return (
    <div className={mergeClasses(commonWizardClasses.pageView, className)}>
      {phase === "running" && <p>{progress || "Exporting…"}</p>}
      {phase === "failed" && <p>Export failed: {failure}</p>}
      {phase === "done" && report && (
        <p>
          Created: {report.created}, updated: {report.updated}, skipped:{" "}
          {report.skipped}, media files: {report.mediaFiles}
          {report.skippedUnmapped > 0
            ? `, skipped without pack: ${report.skippedUnmapped}`
            : ""}
          {report.changedSincePreview > 0
            ? `, ${report.changedSincePreview} changed since the preview`
            : ""}
          {report.skippedForSync > 0
            ? `, left to Sync: ${report.skippedForSync}`
            : ""}
          {report.skippedDeleted > 0
            ? `, skipped as deleted: ${report.skippedDeleted}`
            : ""}
          {report.forced > 0 ? `, forced: ${report.forced}` : ""}.
        </p>
      )}
    </div>
  );
}
