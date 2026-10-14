import type { Vault } from "obsidian";
import type { Anki } from "src/services/anki/anki";
import { withDeckNames } from "src/services/anki/read";
import type {
  ExecuteImportRequest,
  ImportExecutionReport,
} from "src/services/commands/import-contract";
import {
  importDecision,
  mappingAvailability,
  mediaNames,
  packableNotes,
  plannedByFolder,
  plannedImports,
  workingNotesFor,
} from "src/services/commands/import-plan";
import { writePlannedFolders } from "src/services/commands/import-write";
import { importDeckMedia } from "src/services/vault/media";
import { obsidianYamlEngine, type YamlEngine } from "src/services/yaml-engine";

export type {
  ClassifiedNote,
  ExecuteImportRequest,
  ImportExecutionReport,
  NoteSyncState,
} from "src/services/commands/import-contract";
export { isNoteUpdatedSince } from "src/services/commands/import-contract";

export async function executeImport(
  anki: Anki,
  vault: Vault,
  request: ExecuteImportRequest,
  yaml: YamlEngine = obsidianYamlEngine,
): Promise<ImportExecutionReport> {
  const selected = request.notes.filter(
    (note) => request.decisions[note.noteId] ?? false,
  );
  const selectedForRun = workingNotesFor(request, selected);
  const working = {
    ...selectedForRun,
    notes: await withDeckNames(anki, selectedForRun.notes),
  };
  const { packable, skippedUnmapped } = await packableNotes(
    working.notes,
    mappingAvailability(vault, request),
  );
  const decision = await importDecision(packable, request, vault, yaml);
  const planned = plannedImports(decision.importable, request);
  const media = await importDeckMedia(
    anki,
    vault,
    request.deckName,
    mediaNames(planned),
  );
  const byFolder = plannedByFolder(request, planned);
  const report: ImportExecutionReport = {
    cancelled: false,
    changedSincePreview: decision.changedSincePreview,
    created: 0,
    folders: byFolder.size,
    forced: decision.forced,
    mediaFiles: Object.keys(media.written).length,
    mediaNotImported: media.notImported.length,
    overwritten: 0,
    skipped: request.notes.length - selected.length,
    skippedLeftToSync: decision.skippedLeftToSync,
    skippedNewerInVault: decision.skippedNewerInVault,
    skippedUnmapped,
    syncedHashes: {},
    syncedNotes: {},
    vanishedFromDeck: working.vanished,
  };
  await writePlannedFolders(
    {
      importedPaths: media.written,
      report,
      request,
      takenPaths: new Set(),
      vault,
      yaml,
    },
    byFolder,
    planned.length,
  );
  return report;
}
