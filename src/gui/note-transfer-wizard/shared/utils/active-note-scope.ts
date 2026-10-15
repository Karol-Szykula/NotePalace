import { TFile, type App } from "obsidian";
import { parseYamlNotes } from "src/services/notes/document";
import { normalizeNoteText } from "src/services/notes/text";
import { deckForPath } from "src/services/vault/vault";

export interface NoteScope {
  readonly deckName: string;
  readonly noteId: number | undefined;
  readonly query: string;
}

export type WizardScope =
  | {
      readonly deckName: string;
      readonly highlightKey: number | null;
      readonly kind: "scoped";
      readonly query: string;
    }
  | { readonly kind: "unavailable" };

const scopeQueryMaxLength = 80;

export async function activeNoteScope(app: App): Promise<NoteScope | null> {
  const file = app.workspace.getActiveFile();
  if (!(file instanceof TFile) || file.extension !== "md") {
    return null;
  }
  const [note] = parseYamlNotes(await app.vault.cachedRead(file));
  if (note === undefined) {
    return null;
  }
  return {
    deckName: deckForPath(file.path),
    noteId: note.id,
    query: normalizeNoteText(note.front).slice(0, scopeQueryMaxLength),
  };
}

export function scopedScope(deckName: string, scope: NoteScope): WizardScope {
  return {
    deckName,
    highlightKey: scope.noteId ?? null,
    kind: "scoped",
    query: scope.query,
  };
}

export function unavailableScope(): WizardScope {
  return { kind: "unavailable" };
}
