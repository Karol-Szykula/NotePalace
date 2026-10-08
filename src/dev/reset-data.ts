import type { Vault } from "obsidian";
import { defaultSettings } from "src/conf/defaults";
import { t } from "src/i18n";
import type { ISettings } from "src/conf/settings";
import { deleteAllPacks } from "src/services/notes/packs";

export interface ResetPluginDataReport {
  deckImportSnapshots: number;
  fieldMappings: number;
  noteLifecycle: number;
  packs: number;
}

export async function resetPluginData(
  vault: Vault,
  settings: ISettings,
): Promise<ResetPluginDataReport> {
  const report: ResetPluginDataReport = {
    deckImportSnapshots: Object.keys(settings.deckImportSnapshots).length,
    fieldMappings: Object.keys(settings.fieldMappings).length,
    noteLifecycle: Object.keys(settings.noteLifecycle).length,
    packs: await deleteAllPacks(vault),
  };
  Object.assign(settings, defaultSettings());
  return report;
}

export function formatResetReport(report: ResetPluginDataReport): string {
  return t("dev.resetReport", {
    records: report.noteLifecycle,
    snapshots: report.deckImportSnapshots,
    mappings: report.fieldMappings,
    packs: report.packs,
  });
}
