import { TFile } from "obsidian";
import type { Vault } from "obsidian";
import type { VaultNoteIndex } from "src/services/vault/vault";
import { extractYamlNoteIds } from "src/services/vault/vault";

/**
 * Where a note's file belongs, and what to call it when that name is taken.
 *
 * The three callers (import, media, the deck-to-vault mapping) all need the
 * same thing: take a name, and if something already answers to it, add a
 * number. They differed only in what they considered "taken", so that is the
 * one thing the caller still decides.
 */

/**
 * A name is free when nothing holds it here and the vault has no such file.
 * The check is a predicate because "occupied" means something different to each
 * caller: media only cares about names taken in this run, a note's file is
 * free again if what sits there is that same note. Deciding that means
 * reading the file, so the check may be async.
 */
export type OccupiedCheck = (candidate: string) => boolean | Promise<boolean>;

export async function uniquePath(
  folder: string,
  fileName: string,
  takenPaths: Set<string>,
  isOccupied: OccupiedCheck,
): Promise<string> {
  const { stem, extension } = splitFileName(fileName);
  const base = folder ? `${folder}/${stem}${extension}` : `${stem}${extension}`;
  let candidate = base;
  let suffix = 0;
  while (takenPaths.has(candidate) || (await isOccupied(candidate))) {
    suffix += 1;
    candidate = folder
      ? `${folder}/${stem}-${suffix}${extension}`
      : `${stem}-${suffix}${extension}`;
  }
  takenPaths.add(candidate);
  return candidate;
}

function splitFileName(fileName: string): {
  extension: string;
  stem: string;
} {
  const dot = fileName.lastIndexOf(".");
  if (dot <= 0) {
    return { extension: "", stem: fileName };
  }
  return { extension: fileName.slice(dot), stem: fileName.slice(0, dot) };
}

export function parentFolderOf(filePath: string): string {
  const slash = filePath.lastIndexOf("/");
  return slash < 0 ? "" : filePath.slice(0, slash);
}

/** A deck's `Parent::Child` chain is a nested vault folder. */
export function deckFolder(deckName: string, targetFolder: string): string {
  const deckPath = deckName.split("::").join("/");
  return targetFolder ? `${targetFolder}/${deckPath}` : deckPath;
}

function markdownFileName(title: string): {
  stem: string;
  extension: string;
} {
  const stem = title.endsWith(".md") ? title.slice(0, -".md".length) : title;
  return { stem: stem || "note", extension: ".md" };
}

function yamlNoteIdInContent(content: string, noteId: number): boolean {
  return extractYamlNoteIds(content).includes(noteId);
}

export async function resolveExistingNotePath(
  vault: Vault,
  vaultNoteIndex: VaultNoteIndex | undefined,
  noteId: number,
  takenPaths: Set<string>,
): Promise<string | null> {
  const indexedPath = vaultNoteIndex?.get(noteId);
  if (!indexedPath || takenPaths.has(indexedPath)) {
    return null;
  }
  const existing = await vault.getAbstractFileByPath(indexedPath);
  if (!(existing instanceof TFile)) {
    return null;
  }
  const content = await vault.read(existing);
  if (!yamlNoteIdInContent(content, noteId)) {
    return null;
  }
  takenPaths.add(indexedPath);
  return indexedPath;
}

async function resolveRenameTargetPath(
  vault: Vault,
  desiredPath: string,
  takenPaths: Set<string>,
  selfPath: string,
): Promise<string> {
  return uniquePath("", desiredPath, takenPaths, (candidate) => {
    const existing = vault.getAbstractFileByPath(candidate);
    return existing !== null && existing.path !== selfPath;
  });
}

export async function renameIndexedNoteFile(
  vault: Vault,
  indexedPath: string,
  freshFileName: string,
  takenPaths: Set<string>,
): Promise<{ file: TFile; path: string } | null> {
  const indexedFile = await vault.getAbstractFileByPath(indexedPath);
  if (!(indexedFile instanceof TFile)) {
    return null;
  }
  const parent = parentFolderOf(indexedPath);
  const desiredPath = parent ? `${parent}/${freshFileName}` : freshFileName;
  if (desiredPath === indexedPath) {
    return { file: indexedFile, path: indexedPath };
  }
  const targetPath = await resolveRenameTargetPath(
    vault,
    desiredPath,
    takenPaths,
    indexedPath,
  );
  await vault.rename(indexedFile, targetPath);
  takenPaths.delete(indexedPath);
  takenPaths.add(targetPath);
  return { file: indexedFile, path: targetPath };
}

export async function resolveNoteFilePath(
  vault: Vault,
  folder: string,
  title: string,
  noteId: number,
  takenPaths: Set<string>,
): Promise<string> {
  const { stem } = markdownFileName(title);
  return uniquePath(folder, `${stem}.md`, takenPaths, async (candidate) => {
    const existing = vault.getAbstractFileByPath(candidate);
    if (existing === null) {
      return false;
    }
    if (!(existing instanceof TFile)) {
      return true;
    }
    return !yamlNoteIdInContent(await vault.read(existing), noteId);
  });
}
