import type { Modal, Vault } from "obsidian";
import { findByRole } from "@testing-library/react";
import { splitDeckHierarchy } from "@shared/utils/decks";
import type { AnkiNoteInfo } from "src/entities/anki-note";
import { NotesImportModal } from "src/gui/note-transfer-wizard/import/notes-import-modal";
import { ankiResponder } from "../../helpers/anki-responder";
import type { WizardModalFixture } from "./WizardModalPO";
import { WizardModalPO } from "./WizardModalPO";

export interface ImportModalFixture extends WizardModalFixture {
  readonly decks?: Record<string, number[]>;
  readonly notes?: AnkiNoteInfo[];
}

export class ImportModalPO extends WizardModalPO {
  protected constructor(modal: Modal, container: HTMLElement, vault: Vault) {
    super(modal, container, vault);
  }

  static render(fixture: ImportModalFixture = {}): ImportModalPO {
    if (fixture.decks !== undefined || fixture.notes !== undefined) {
      const decks =
        fixture.decks === undefined ? undefined : { ...fixture.decks };
      const notes =
        fixture.notes === undefined ? undefined : [...fixture.notes];
      ankiResponder().respondWith({
        ...(decks && { decks }),
        ...(notes && { notes }),
      });
    }
    const mounted = WizardModalPO.mountModal(NotesImportModal, fixture);
    return new ImportModalPO(mounted.modal, mounted.container, mounted.vault);
  }

  async chooseDeck(deckName: string): Promise<void> {
    const { shortName } = splitDeckHierarchy(deckName);
    await this.chooseRadio(shortName);
  }

  async isDeckRadioEnabled(deckName: string): Promise<boolean> {
    const { shortName } = splitDeckHierarchy(deckName);
    return this.isRadioEnabled(shortName);
  }

  async isNotePreselected(): Promise<boolean> {
    const checkbox = await findByRole(this.container, "checkbox");
    return (checkbox as HTMLInputElement).checked;
  }

  async noteFileContent(noteId: number): Promise<string | undefined> {
    const files = this.vault.getMarkdownFiles();
    for (const file of files) {
      const source = await this.vault.read(file);
      if (source.includes(`id: ${noteId}`)) {
        return source;
      }
    }
    return undefined;
  }
}
