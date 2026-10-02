import { useEffect, useState, type JSX } from "react";
import { mergeClasses } from "src/gui/classes";
import { startAsyncLoad } from "@shared/hooks/useAsyncLoad";
import type { Anki } from "src/services/anki/anki";
import type { VaultNoteIndex } from "src/services/vault/vault";
import type { NoteSyncState } from "src/services/commands/import-deck";
import { isNoteUpdatedSince } from "src/services/commands/import-deck";
import { deckSearchQuery, fetchDeckNotes } from "src/services/anki/read";
import { commonWizardClasses } from "@shared/classes";
import { splitDeckHierarchy } from "@shared/utils/decks";
import { scopeSelectionClasses } from "../classes";
import { DeckList, type DeckItem } from "@shared/components";

export interface DeckSelectionProps {
  readonly anki: Anki;
  readonly className?: string;
  readonly onSelectDeckName: (deckName: string) => void;
  readonly selectedDeckName: string;
  readonly syncState: NoteSyncState;
  readonly vaultNoteIndex: VaultNoteIndex;
}

interface DeckWithNotes {
  readonly deckName: string;
  readonly noteIds: number[];
  readonly updatedCount: number | null;
}

function countImportedNotes(
  noteIds: number[],
  vaultNoteIndex: VaultNoteIndex,
): number {
  return noteIds.filter((id) => vaultNoteIndex.has(id)).length;
}

function isDeckEmpty(noteIds: number[]): boolean {
  return noteIds.length === 0;
}

async function fetchDecksWithNotes(
  anki: Anki,
  vaultNoteIndex: VaultNoteIndex,
  syncState: NoteSyncState,
): Promise<DeckWithNotes[]> {
  const deckNames = await anki.getDeckNames();
  const decksWithNotes = await Promise.all(
    deckNames.map(async (deckName) => {
      const noteIds = await anki.findNotes(deckSearchQuery(deckName));
      return {
        deckName,
        noteIds,
        updatedCount: await countUpdatedNotes(
          anki,
          deckName,
          noteIds,
          vaultNoteIndex,
          syncState,
        ),
      };
    }),
  );
  return decksWithNotes.filter(
    ({ deckName, noteIds }) => !isEmptyDefaultDeck(deckName, noteIds),
  );
}

async function countUpdatedNotes(
  anki: Anki,
  deckName: string,
  noteIds: number[],
  vaultNoteIndex: VaultNoteIndex,
  syncState: NoteSyncState,
): Promise<number | null> {
  if (countImportedNotes(noteIds, vaultNoteIndex) !== noteIds.length) {
    return null;
  }
  if (isDeckEmpty(noteIds)) {
    return null;
  }
  try {
    const notes = await fetchDeckNotes(anki, deckName);
    return notes.filter((note) => isNoteUpdatedSince(note, syncState)).length;
  } catch {
    return null;
  }
}

function isEmptyDefaultDeck(deckName: string, noteIds: number[]): boolean {
  return deckName === "Default" && noteIds.length === 0;
}

function toDeckItem(
  deckName: string,
  noteIds: number[],
  updatedCount: number | null,
  vaultNoteIndex: VaultNoteIndex,
): DeckItem {
  const { depth, shortName } = splitDeckHierarchy(deckName);
  return {
    depth,
    isDisabled: isDeckEmpty(noteIds),
    name: deckName,
    shortName,
    syncedCount: countImportedNotes(noteIds, vaultNoteIndex),
    totalCount: noteIds.length,
    updatedCount,
  };
}

export function DeckSelection({
  anki,
  syncState,
  vaultNoteIndex,
  selectedDeckName,
  onSelectDeckName,
  className,
}: DeckSelectionProps): JSX.Element {
  const [decks, setDecks] = useState<DeckWithNotes[] | null>(null);
  const [loadError, setLoadError] = useState("");

  const loadDeckList = (): (() => void) =>
    startAsyncLoad(async (isLive) => {
      try {
        const decksWithNotes = await fetchDecksWithNotes(
          anki,
          vaultNoteIndex,
          syncState,
        );
        if (isLive()) {
          setDecks(decksWithNotes);
        }
      } catch {
        if (isLive()) {
          setLoadError("Error: Anki must be open with AnkiConnect installed.");
        }
      }
    });

  useEffect(loadDeckList, [anki, vaultNoteIndex, syncState]);

  const rootClassName = mergeClasses(commonWizardClasses.pageView, className);

  if (loadError) {
    return (
      <div className={rootClassName}>
        <p>{loadError}</p>
      </div>
    );
  }
  if (decks === null) {
    return (
      <div className={rootClassName}>
        <p>Connecting to Anki…</p>
      </div>
    );
  }
  if (!decks.length) {
    return (
      <div className={rootClassName}>
        <p>No decks found in Anki.</p>
      </div>
    );
  }
  return (
    <div className={rootClassName}>
      <DeckList
        alreadySyncedTooltip="Already in Obsidian"
        getRowClassName={(_item, isDisabled) =>
          mergeClasses(
            scopeSelectionClasses.scopeRow,
            isDisabled ? scopeSelectionClasses.scopeRowDisabled : undefined,
          )
        }
        inputClassName={scopeSelectionClasses.scopeRadio}
        inputName="notepalace-note-import-wizard-modal-scope"
        items={decks.map(({ deckName, noteIds, updatedCount }) =>
          toDeckItem(deckName, noteIds, updatedCount, vaultNoteIndex),
        )}
        labelClassName={scopeSelectionClasses.scopeLabelText}
        onSelect={onSelectDeckName}
        prompt="Select a deck to import:"
        selectedName={selectedDeckName}
      />
    </div>
  );
}
