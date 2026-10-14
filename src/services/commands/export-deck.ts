import type { Vault } from "obsidian";
import type { ISettings } from "src/conf/settings";
import type { Anki } from "src/services/anki/anki";
import { recordSyncedBaselines } from "src/services/commands/push";
import {
  classifyVaultBlock,
  scanVaultBlocks,
} from "src/services/commands/export-scan";
import { planExport } from "src/services/commands/export-plan";
import {
  assurePlannedModels,
  createPlannedNotes,
  pushPlannedNotes,
  uploadPlannedMedia,
  writeBackIds,
} from "src/services/commands/export-apply";
import type {
  ExportReport,
  ExecuteExportRequest,
} from "src/services/commands/export-contract";
import { obsidianYamlEngine, type YamlEngine } from "src/services/yaml-engine";

export { classifyVaultBlock, scanVaultBlocks };
export type { ExecuteExportRequest, ExportReport };

export async function executeExport(
  anki: Anki,
  vault: Vault,
  settings: ISettings,
  request: ExecuteExportRequest,
  yaml: YamlEngine = obsidianYamlEngine,
): Promise<ExportReport> {
  const scan = await scanVaultBlocks(vault, request.ignoredDirectories, yaml);
  const plan = await planExport(anki, vault, settings, scan, request);
  await assurePlannedModels(anki, plan);
  await uploadPlannedMedia(anki, plan);
  await createPlannedNotes(anki, plan);
  await pushPlannedNotes(anki, plan);
  await recordSyncedBaselines(anki, settings, plan.synced);
  await writeBackIds(vault, plan.idWrites, yaml);
  return plan.report;
}
