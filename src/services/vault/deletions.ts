import { TFile } from "obsidian";
import type { EventRef, TAbstractFile, Vault } from "obsidian";
import type { ISettings } from "src/conf/settings";
import { extractYamlNoteIds } from "src/services/vault/vault";

export interface DeletionWatch {
  dispose(): void;
  prime(): Promise<void>;
}

function isMarkdownFile(file: TAbstractFile): file is TFile {
  return file instanceof TFile && file.extension === "md";
}

async function readNoteIds(vault: Vault, file: TFile): Promise<Set<number>> {
  try {
    return new Set(extractYamlNoteIds(await vault.cachedRead(file)));
  } catch {
    return new Set<number>();
  }
}

function idsRemoved(previous: Set<number>, current: Set<number>): number[] {
  return [...previous].filter((id) => !current.has(id));
}

function markRecordsDeleted(
  settings: ISettings,
  noteIds: readonly number[],
): boolean {
  const at = Date.now();
  let changed = false;
  for (const noteId of noteIds) {
    const record = settings.noteLifecycle[noteId];
    if (record === undefined || record.deletedAt !== undefined) {
      continue;
    }
    record.deletedAt = at;
    changed = true;
  }
  return changed;
}

/**
 * Remembers when a tracked note's block leaves the vault (its file deleted or
 * the block removed from a living file) by stamping `deletedAt` on the record.
 * Sync reads that timestamp to decide between resurrecting and forgetting.
 */
export function watchNoteDeletions(
  vault: Vault,
  settings: ISettings,
  save: () => void,
): DeletionWatch {
  const idsByPath = new Map<string, Set<number>>();

  function markDeleted(noteIds: readonly number[]): void {
    if (markRecordsDeleted(settings, noteIds)) {
      save();
    }
  }

  function remember(file: TFile): void {
    void readNoteIds(vault, file).then((ids) => idsByPath.set(file.path, ids));
  }

  function onCreated(file: TAbstractFile): void {
    if (isMarkdownFile(file)) {
      remember(file);
    }
  }

  function onModified(file: TAbstractFile): void {
    if (!isMarkdownFile(file)) {
      return;
    }
    void readNoteIds(vault, file).then((ids) => {
      const previous = idsByPath.get(file.path) ?? new Set<number>();
      idsByPath.set(file.path, ids);
      markDeleted(idsRemoved(previous, ids));
    });
  }

  function onDeleted(file: TAbstractFile): void {
    const removed = idsByPath.get(file.path);
    idsByPath.delete(file.path);
    if (removed !== undefined) {
      markDeleted([...removed]);
    }
  }

  function onRenamed(file: TAbstractFile, oldPath: string): void {
    const ids = idsByPath.get(oldPath);
    idsByPath.delete(oldPath);
    if (ids !== undefined) {
      idsByPath.set(file.path, ids);
    }
  }

  const refs: EventRef[] = [
    vault.on("create", onCreated),
    vault.on("modify", onModified),
    vault.on("delete", onDeleted),
    vault.on("rename", onRenamed),
  ];

  return {
    async prime(): Promise<void> {
      idsByPath.clear();
      for (const file of vault.getMarkdownFiles()) {
        idsByPath.set(file.path, await readNoteIds(vault, file));
      }
    },
    dispose(): void {
      for (const ref of refs) {
        vault.offref(ref);
      }
      refs.length = 0;
    },
  };
}
