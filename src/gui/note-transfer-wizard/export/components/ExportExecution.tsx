import { useEffect, useRef, useState, type JSX } from "react";
import { mergeClasses } from "src/gui/classes";
import { t, type MessageKey } from "src/i18n";
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
  readonly className?: string | undefined;
  readonly forcedNoteIds: Record<number, boolean>;
  readonly ignoredDirectories: string;
  readonly notesSelectedToExport: Record<number, boolean>;
  readonly onFinish: (report: ExportReport) => void;
  readonly previewStatuses?: Record<number, NoteLifecycleStatus> | undefined;
  readonly settings: ISettings;
  readonly vault: Vault;
}

type ExecutionPhase = "running" | "done" | "failed";

function baseReportParts(report: ExportReport): string[] {
  return [
    t("report.created", { count: report.created }),
    t("report.updated", { count: report.updated }),
    t("report.skipped", { count: report.skipped }),
    t("report.mediaFiles", { count: report.mediaFiles }),
  ];
}

function countPart(count: number, key: MessageKey): string | undefined {
  return count > 0 ? t(key, { count }) : undefined;
}

function optionalReportParts(report: ExportReport): string[] {
  return [
    countPart(report.unchanged, "report.unchanged"),
    countPart(report.skippedUnmapped, "report.skippedUnmapped"),
    countPart(report.changedSincePreview, "report.changedSincePreview"),
    countPart(report.skippedForSync, "report.leftToSync"),
    countPart(report.skippedDeleted, "report.skippedDeleted"),
    countPart(report.forced, "report.forced"),
  ].filter((part): part is string => part !== undefined);
}

function formatExportReport(report: ExportReport): string {
  const parts = [...baseReportParts(report), ...optionalReportParts(report)];
  return `${parts.join(", ")}.`;
}

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
          setProgress(t("report.exportingProgress", { processed, total }));
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
      {phase === "running" && <p>{progress || t("report.exporting")}</p>}
      {phase === "failed" && (
        <p>{t("notice.exportFailed", { error: failure })}</p>
      )}
      {phase === "done" && report && <p>{formatExportReport(report)}</p>}
    </div>
  );
}
