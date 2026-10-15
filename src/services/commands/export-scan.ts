import type { TFile, Vault } from "obsidian";
import type { AnkiNoteInfo } from "src/entities/anki-note";
import { blockContentHash } from "src/services/notes/content-hash";
import {
  createNoteFencePattern,
  parseNoteForm,
  type YamlNote,
} from "src/services/notes/document";
import {
  classifyNoteLifecycle,
  type NoteLifecycleRecord,
  type NoteLifecycleStatus,
} from "src/services/notes/lifecycle";
import { deckForPath, isIgnoredPath } from "src/services/vault/vault";
import type { YamlEngine } from "src/services/yaml-engine";

export interface BlockScan {
  locations: BlockLocation[];
  unreadable: number;
}

export interface BlockLocation {
  block: YamlNote;
  deckName: string;
  end: number;
  file: TFile;
  start: number;
}

export async function scanVaultBlocks(
  vault: Vault,
  ignoredDirectories: string,
  yaml: YamlEngine,
): Promise<BlockScan> {
  const locations: BlockLocation[] = [];
  let unreadable = 0;
  for (const file of vault.getMarkdownFiles()) {
    if (isIgnoredPath(file.path, ignoredDirectories)) {
      continue;
    }
    const scanned = await scanFileBlocks(vault, file, yaml);
    locations.push(...scanned.locations);
    unreadable += scanned.unreadable;
  }
  return { locations, unreadable };
}

async function scanFileBlocks(
  vault: Vault,
  file: TFile,
  yaml: YamlEngine,
): Promise<BlockScan> {
  const content = await vault.read(file);
  const deckName = deckForPath(file.path);
  const pattern = createNoteFencePattern();
  const locations: BlockLocation[] = [];
  let unreadable = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content)) !== null) {
    const location = tryParseBlock(
      match,
      pattern.lastIndex,
      deckName,
      file,
      yaml,
    );
    if (location === null) {
      unreadable += 1;
    } else {
      locations.push(location);
    }
  }
  return { locations, unreadable };
}

function tryParseBlock(
  match: RegExpExecArray,
  end: number,
  deckName: string,
  file: TFile,
  yaml: YamlEngine,
): BlockLocation | null {
  try {
    return {
      block: parseNoteForm(match[1] ?? "", yaml),
      deckName,
      end,
      file,
      start: match.index,
    };
  } catch {
    return null;
  }
}

export async function classifyVaultBlock(
  block: YamlNote,
  anki: AnkiNoteInfo | undefined,
  record: NoteLifecycleRecord | undefined,
): Promise<NoteLifecycleStatus> {
  const hash = await blockContentHash(block);
  const blockInput =
    block.id !== undefined
      ? { id: block.id, hash }
      : { hash, id: undefined as number | undefined };
  return classifyNoteLifecycle({
    anki,
    block: blockInput,
    record,
  });
}

export function indexedBlockIds(locations: BlockLocation[]): number[] {
  return [
    ...new Set(
      locations
        .map((location) => location.block.id)
        .filter((id): id is number => id !== undefined),
    ),
  ];
}
