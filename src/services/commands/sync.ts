import type { Vault } from "obsidian";
import { t } from "src/i18n";
import type { Anki } from "src/services/anki/anki";
import type { ISettings } from "src/conf/settings";
import { collectVaultNoteIndex } from "src/services/vault/vault";
import { deckNameIndex } from "src/services/vault/paths";
import { obsidianYamlEngine, type YamlEngine } from "src/services/yaml-engine";
import {
  applyAnkiDeletions,
  fillMissingBlockIds,
} from "src/services/commands/sync-apply";
import { syncOneDeck } from "src/services/commands/sync-deck";
import type { SyncScope } from "src/services/commands/sync-scan";
import {
  formatSyncReport,
  type SyncDeckReport,
  type SyncReport,
} from "src/services/commands/sync-report";

export { fillMissingBlockIds, formatSyncReport };
export type { SyncReport };

export async function executeSync(
  anki: Anki,
  vault: Vault,
  settings: ISettings,
  yaml: YamlEngine = obsidianYamlEngine,
): Promise<SyncReport> {
  const snapshots = Object.values(settings.deckImportSnapshots);
  if (snapshots.length === 0) {
    throw new Error(t("notice.noImportYet"));
  }
  await fillMissingBlockIds(vault, settings, yaml);
  const scope: SyncScope = {
    anki,
    deckIndex: deckNameIndex(await anki.getDeckNames()),
    index: await collectVaultNoteIndex(vault),
    settings,
    vault,
    yaml,
  };
  const liveIds = new Set<number>();
  const decks: SyncDeckReport[] = [];
  let enrolled = 0;
  let purgedFromDeletions = 0;
  for (const snapshot of snapshots) {
    const synced = await syncOneDeck(scope, snapshot);
    for (const noteId of synced.liveIds) {
      liveIds.add(noteId);
    }
    decks.push(synced.result.deck);
    enrolled += synced.result.enrolled;
    purgedFromDeletions += synced.result.purged;
  }
  const purged = await applyAnkiDeletions(scope, liveIds);
  return {
    decks,
    deleted: purged.deleted,
    enrolled,
    purgedRecords: purged.purgedRecords + purgedFromDeletions,
  };
}
