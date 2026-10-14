import type { Vault } from "obsidian";
import type { Anki } from "src/services/anki/anki";
import type { ISettings } from "src/conf/settings";
import type { VaultNoteIndex } from "src/services/vault/vault";
import type { DeckNameIndex } from "src/services/vault/paths";
import type { YamlEngine } from "src/services/yaml-engine";
import type { MediaNameAllocator } from "src/services/commands/push";

export interface SyncScope {
  anki: Anki;
  deckIndex: DeckNameIndex;
  index: VaultNoteIndex;
  mediaAllocator: MediaNameAllocator;
  settings: ISettings;
  vault: Vault;
  yaml: YamlEngine;
}
