import { AnkiNote, type AnkiNoteInit } from "src/entities/anki-note";

export interface CustomMappedNoteInit extends AnkiNoteInit {
  modelName: string;
}

export class CustomMappedNote extends AnkiNote {
  constructor(init: CustomMappedNoteInit) {
    super(init);
    this.modelName = init.modelName;
  }
}
