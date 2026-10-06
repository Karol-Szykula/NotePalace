import type { Modal } from "obsidian";
import { splitDeckHierarchy } from "@shared/utils/decks";
import { NotesImportModal } from "src/gui/note-transfer-wizard/import/notes-import-modal";
import { ankiResponder } from "../../helpers/anki-responder";
import type { WizardModalFixture } from "./WizardModalPO";
import { WizardModalPO } from "./WizardModalPO";

export interface ImportModalFixture extends WizardModalFixture {
  readonly decks?: Record<string, number[]>;
}

export class ImportModalPO extends WizardModalPO {
  protected constructor(modal: Modal, container: HTMLElement) {
    super(modal, container);
  }

  static render(fixture: ImportModalFixture = {}): ImportModalPO {
    if (fixture.decks !== undefined) {
      ankiResponder().respondWith({ decks: fixture.decks });
    }
    const mounted = WizardModalPO.mountModal(NotesImportModal, fixture);
    return new ImportModalPO(mounted.modal, mounted.container);
  }

  async chooseDeck(deckName: string): Promise<void> {
    const { shortName } = splitDeckHierarchy(deckName);
    await this.chooseRadio(shortName);
  }
}
