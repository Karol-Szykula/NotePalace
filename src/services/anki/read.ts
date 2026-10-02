import type { Anki } from "src/services/anki/anki";
import type { AnkiNoteInfo } from "src/entities/anki-note";

/**
 * The search query that reads a deck. Quoting makes the name literal and
 * still spans the deck's subdecks, so a parent deck that only holds subdecks
 * reads as the sum of its descendants; excluding them needs an explicit
 * `-deck:"Name"::*`.
 */
export function deckSearchQuery(deckName: string): string {
  return `deck:"${escapeQuoted(deckName)}"`;
}

function escapeQuoted(deckName: string): string {
  return deckName.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/** 100 is the batch size the import test pins; 50 was a local choice elsewhere. */
const notesInfoChunkSize = 100;

export async function fetchNotesByIds(
  anki: Anki,
  noteIds: number[],
  onChunk?: (fetched: number, total: number) => void,
): Promise<AnkiNoteInfo[]> {
  const notes: AnkiNoteInfo[] = [];
  for (let i = 0; i < noteIds.length; i += notesInfoChunkSize) {
    const chunk = await anki.getNotes(noteIds.slice(i, i + notesInfoChunkSize));
    notes.push(...chunk);
    onChunk?.(notes.length, noteIds.length);
  }
  return notes;
}

export async function fetchNotesByIdMap(
  anki: Anki,
  noteIds: number[],
): Promise<Map<number, AnkiNoteInfo>> {
  const notes = await fetchNotesByIds(anki, noteIds);
  return new Map(notes.map((note) => [note.noteId, note]));
}

export async function fetchDeckNotes(
  anki: Anki,
  deckName: string,
  onChunk?: (fetched: number, total: number) => void,
): Promise<AnkiNoteInfo[]> {
  const noteIds = await anki.findNotes(deckSearchQuery(deckName));
  return await fetchNotesByIds(anki, noteIds, onChunk);
}

/** notesInfo has no deck, so it comes from the cards the note generated. */
export async function withDeckNames(
  anki: Anki,
  notes: AnkiNoteInfo[],
): Promise<AnkiNoteInfo[]> {
  const deckByCardId = await cardDeckNames(anki, notes);
  return notes.map((note) => {
    const deckName = noteDeckName(note, deckByCardId);
    return deckName === null ? note : { ...note, deckName };
  });
}

function noteDeckName(
  note: AnkiNoteInfo,
  deckByCardId: Map<number, string>,
): string | null {
  const deckNames = (note.cards ?? [])
    .map((cardId) => deckByCardId.get(cardId))
    .filter(
      (deckName): deckName is string =>
        deckName !== undefined && deckName !== "",
    );
  if (deckNames.length === 0) {
    return null;
  }
  const sorted = [...deckNames].sort((first: string, second: string) =>
    first.localeCompare(second),
  );
  return sorted[0] ?? null;
}

async function cardDeckNames(
  anki: Anki,
  notes: AnkiNoteInfo[],
): Promise<Map<number, string>> {
  const cardIds = notes.flatMap((note) => note.cards ?? []);
  const deckByCardId = new Map<number, string>();
  for (let i = 0; i < cardIds.length; i += notesInfoChunkSize) {
    const cards = await anki.cardsInfo(
      cardIds.slice(i, i + notesInfoChunkSize),
    );
    for (const card of cards) {
      deckByCardId.set(card.cardId, card.deckName);
    }
  }
  return deckByCardId;
}
