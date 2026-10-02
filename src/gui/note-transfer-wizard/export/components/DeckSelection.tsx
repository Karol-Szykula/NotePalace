import { useEffect, useState, type JSX } from "react";
import { mergeClasses } from "src/gui/classes";
import { startAsyncLoad } from "@shared/hooks/useAsyncLoad";
import type { Vault } from "obsidian";
import { scanVaultBlocks } from "src/services/commands/export-deck";
import { obsidianYamlEngine } from "src/services/yaml-engine";
import { commonWizardClasses } from "@shared/classes";
import { splitDeckHierarchy } from "@shared/utils/decks";
import { DeckList, type DeckItem } from "@shared/components";
import { exportScopeClasses } from "../classes";

export interface DeckSelectionProps {
  readonly className?: string;
  readonly ignoredDirectories: string;
  readonly onSelectDeckName: (deckName: string) => void;
  readonly selectedDeckName: string;
  readonly vault: Vault;
}

interface FolderWithBlocks {
  readonly deckName: string;
  readonly totalBlocks: number;
  readonly trackedBlocks: number;
}

async function fetchFoldersWithBlocks(
  vault: Vault,
  ignoredDirectories: string,
): Promise<FolderWithBlocks[]> {
  const scan = await scanVaultBlocks(
    vault,
    ignoredDirectories,
    obsidianYamlEngine,
  );
  const locations = scan.locations;
  const byDeck = new Map<string, { total: number; tracked: number }>();
  for (const location of locations) {
    const entry = byDeck.get(location.deckName) ?? { total: 0, tracked: 0 };
    entry.total += 1;
    if (location.block.id !== undefined) {
      entry.tracked += 1;
    }
    byDeck.set(location.deckName, entry);
  }
  return [...byDeck.entries()].map(([deckName, counts]) => ({
    deckName,
    totalBlocks: counts.total,
    trackedBlocks: counts.tracked,
  }));
}

function toDeckItem(folder: FolderWithBlocks): DeckItem {
  const { depth, shortName } = splitDeckHierarchy(folder.deckName);
  return {
    depth,
    isDisabled: folder.totalBlocks === 0,
    name: folder.deckName,
    shortName,
    syncedCount: folder.trackedBlocks,
    totalCount: folder.totalBlocks,
    updatedCount: null,
  };
}

export function DeckSelection({
  ignoredDirectories,
  selectedDeckName,
  onSelectDeckName,
  className,
  vault,
}: DeckSelectionProps): JSX.Element {
  const [folders, setFolders] = useState<FolderWithBlocks[] | null>(null);
  const [loadError, setLoadError] = useState("");

  const loadFolderList = (): (() => void) =>
    startAsyncLoad(async (isLive) => {
      try {
        const found = await fetchFoldersWithBlocks(vault, ignoredDirectories);
        if (isLive()) {
          setFolders(found);
        }
      } catch {
        if (isLive()) {
          setLoadError("Error: could not read vault notes.");
        }
      }
    });

  useEffect(loadFolderList, [vault, ignoredDirectories]);

  const rootClassName = mergeClasses(commonWizardClasses.pageView, className);

  if (loadError) {
    return (
      <div className={rootClassName}>
        <p>{loadError}</p>
      </div>
    );
  }
  if (folders === null) {
    return (
      <div className={rootClassName}>
        <p>Reading vault…</p>
      </div>
    );
  }
  if (!folders.length) {
    return (
      <div className={rootClassName}>
        <p>No exportable notes found in the vault.</p>
      </div>
    );
  }
  return (
    <div className={rootClassName}>
      <DeckList
        alreadySyncedTooltip="Already in Anki"
        getRowClassName={(_item, isDisabled) =>
          mergeClasses(
            exportScopeClasses.scopeRow,
            isDisabled ? exportScopeClasses.scopeRowDisabled : undefined,
          )
        }
        inputClassName={exportScopeClasses.scopeRadio}
        inputName="ankipalace-note-export-wizard-modal-scope"
        items={folders.map(toDeckItem)}
        labelClassName={exportScopeClasses.scopeLabelText}
        onSelect={onSelectDeckName}
        prompt="Select a folder to export:"
        selectedName={selectedDeckName}
      />
    </div>
  );
}
