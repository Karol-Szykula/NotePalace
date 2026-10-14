import type {
  AnkiNote,
  AnkiNoteInfo,
  AnkiNotePayload,
} from "src/entities/anki-note";
import { logger } from "src/services/logger";
import { defaultDeckName } from "src/services/vault/vault";
import {
  invokeAnkiAction,
  invokeAnkiActionAllowPartial,
  unwrapMultiResult,
} from "src/services/anki/transport";

export { describeUnknown } from "src/services/anki/transport";

export type AnkiActionRequest = {
  action: string;
  params: unknown;
};

export interface AnkiModelDefinition {
  cardTemplates: Array<{ Name: string; Front: string; Back: string }>;
  css: string;
  inOrderFields: string[];
  isCloze: boolean;
  modelName: string;
}

export interface ModelSnapshot {
  fieldsByModel: Record<string, string[]>;
  modelNames: string[];
}

export class Anki {
  public async createDeck(deckName: string): Promise<number> {
    return this.invoke<number>("createDeck", 6, { deck: deckName });
  }

  public async storeMediaFiles(notes: AnkiNote[]) {
    const actions: AnkiActionRequest[] = [];

    for (const note of notes) {
      for (const media of note.getMedias()) {
        actions.push({
          action: "storeMediaFile",
          params: media,
        });
      }
    }

    if (actions.length) {
      return this.invoke<unknown>("multi", 6, { actions });
    } else {
      return {};
    }
  }

  public async retrieveMediaFile(filename: string): Promise<string | null> {
    return await this.invoke<string | null>("retrieveMediaFile", 6, {
      filename,
    });
  }

  public async addNotes(notes: AnkiNote[]): Promise<number[]> {
    const payloads: AnkiNotePayload[] = [];
    notes.forEach((note) => payloads.push(note.toPayload(false)));

    try {
      return await this.invokeAllowPartial("addNotes", 6, { notes: payloads });
    } catch (batchErr) {
      logger.warn(
        "batch addNotes failed, falling back to one-at-a-time",
        batchErr,
      );
      return await this.addNotesOneAtATime(notes);
    }
  }

  private async addNotesOneAtATime(notes: AnkiNote[]): Promise<number[]> {
    const ids: number[] = [];
    for (const note of notes) {
      ids.push(await this.addSingleNote(note));
    }
    return ids;
  }

  private async addSingleNote(note: AnkiNote): Promise<number> {
    try {
      const result = await this.invokeAllowPartial("addNotes", 6, {
        notes: [note],
      });
      return result[0] ?? -1;
    } catch (e) {
      logger.warn("single addNote failed", e);
      return -1;
    }
  }

  private invokeAllowPartial(
    action: string,
    version = 6,
    params: Record<string, unknown> = {},
  ): Promise<number[]> {
    return invokeAnkiActionAllowPartial(action, version, params);
  }

  /**
   * Given the new notes with an optional deck name, it updates all the notes on Anki.
   *
   * Be aware of https://github.com/FooSoft/anki-connect/issues/82. If the Browse pane is opened on Anki,
   * the update does not change all the notes.
   * @param notes the new notes.
   * @param deckName the new deck name.
   */
  public async updateNotes(notes: AnkiNote[]): Promise<unknown> {
    let updateActions: AnkiActionRequest[] = [];

    // Unfortunately https://github.com/FooSoft/anki-connect/issues/183
    // This means that the delta from the current tags on Anki and the generated one should be added/removed
    // That's what the current approach does, but in the future if the API it is made more consistent
    //  then mergeTags(...) is not needed anymore
    const ids: number[] = [];

    for (const note of notes) {
      updateActions.push({
        action: "updateNoteFields",
        params: {
          note: note.toPayload(true),
        },
      });

      updateActions = updateActions.concat(
        this.mergeTags(note.oldTags, note.tags, note.noteId),
      );
      ids.push(note.noteId);
    }

    // Update deck
    updateActions.push({
      action: "changeDeck",
      params: {
        cards: ids,
        deck: notes[0]?.deckName ?? defaultDeckName,
      },
    });

    return this.invoke<unknown>("multi", 6, { actions: updateActions });
  }

  public async changeDeck(ids: number[], deckName: string) {
    return await this.invoke<unknown>("changeDeck", 6, {
      cards: ids,
      deck: deckName,
    });
  }

  public async getDeckNames(): Promise<string[]> {
    return await this.invoke<string[]>("deckNames", 6);
  }

  public async findNotes(query: string): Promise<number[]> {
    return await this.invoke<number[]>("findNotes", 6, { query });
  }

  public async cardsInfo(
    ids: number[],
  ): Promise<Array<{ cardId: number; deckName: string }>> {
    return await this.invoke<Array<{ cardId: number; deckName: string }>>(
      "cardsInfo",
      6,
      { cards: ids },
    );
  }

  public async getNotes(ids: number[]): Promise<AnkiNoteInfo[]> {
    return await this.invoke<AnkiNoteInfo[]>("notesInfo", 6, { notes: ids });
  }

  public async modelNames(): Promise<string[]> {
    return await this.invoke<string[]>("modelNames", 6);
  }

  public async modelFieldNames(modelName: string): Promise<string[]> {
    return await this.invoke<string[]>("modelFieldNames", 6, { modelName });
  }

  public async modelNamesWithFields(
    modelNames: string[],
  ): Promise<ModelSnapshot> {
    const actions: AnkiActionRequest[] = [
      { action: "modelNames", params: {} },
      ...modelNames.map((modelName) => ({
        action: "modelFieldNames",
        params: { modelName },
      })),
    ];
    const results = await this.invokeMulti(actions);
    const allNames = results[0] as string[];
    const fieldsByModel: Record<string, string[]> = {};
    modelNames.forEach((modelName, index) => {
      if (allNames.includes(modelName)) {
        fieldsByModel[modelName] = results[index + 1] as string[];
      }
    });
    return { fieldsByModel, modelNames: allNames };
  }

  public async createModels(
    definitions: AnkiModelDefinition[],
  ): Promise<unknown> {
    if (definitions.length === 0) {
      return null;
    }
    const actions: AnkiActionRequest[] = definitions.map((definition) => ({
      action: "createModel",
      params: {
        modelName: definition.modelName,
        inOrderFields: definition.inOrderFields,
        css: definition.css,
        isCloze: definition.isCloze,
        cardTemplates: definition.cardTemplates,
      },
    }));
    return await this.invokeMulti(actions);
  }

  private async invokeMulti(actions: AnkiActionRequest[]): Promise<unknown[]> {
    const results = await this.invoke<unknown[]>("multi", 6, { actions });
    return results.map((result, index) => unwrapMultiResult(result, index));
  }

  public async ping(): Promise<boolean> {
    return (await this.invoke<number>("version", 6)) === 6;
  }

  private mergeTags(oldTags: string[], newTags: string[], noteId: number) {
    const actions = [];

    // Find tags to Add
    for (const tag of newTags) {
      const index = oldTags.indexOf(tag);
      if (index > -1) {
        oldTags.splice(index, 1);
      } else {
        actions.push({
          action: "addTags",
          params: {
            notes: [noteId],
            tags: tag,
          },
        });
      }
    }

    // All Tags to delete
    for (const tag of oldTags) {
      actions.push({
        action: "removeTags",
        params: {
          notes: [noteId],
          tags: tag,
        },
      });
    }

    return actions;
  }

  private invoke<T>(
    action: string,
    version = 6,
    params: Record<string, unknown> = {},
  ): Promise<T> {
    return invokeAnkiAction<T>(action, version, params);
  }

  public async requestPermission() {
    return this.invoke<{ permission: string }>("requestPermission", 6);
  }
}
