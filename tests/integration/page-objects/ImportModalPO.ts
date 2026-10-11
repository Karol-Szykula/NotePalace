import type { Modal, Vault } from "obsidian";
import { findByRole, findAllByRole } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { splitDeckHierarchy } from "@shared/utils/decks";
import type { AnkiNoteInfo } from "src/entities/anki-note";
import { NotesImportModal } from "src/gui/note-transfer-wizard/import/notes-import-modal";
import {
  mappedFieldsPattern,
  notesToImportPattern,
} from "src/gui/note-transfer-wizard/shared/utils/summary-patterns";
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

  async goToCardsPage(deckName: string): Promise<void> {
    await this.chooseDeck(deckName);
    await this.clickNextButton();
    await this.expectTextDisplayed(mappedFieldsPattern);
    await this.clickNextButton();
    await this.expectTextDisplayed(notesToImportPattern);
  }

  async isNotePreselected(): Promise<boolean> {
    const checkboxes = await findAllByRole(this.container, "checkbox", {
      name: /^Select /,
    });
    const firstRowBox = checkboxes.find(
      (box) =>
        box.getAttribute("aria-label") !== "Select all notes on this page",
    );
    if (firstRowBox === undefined) {
      throw new Error("No note row found");
    }
    return (firstRowBox as HTMLInputElement).checked;
  }

  async toggleForce(): Promise<void> {
    const toggle = await findByRole(this.container, "switch", {
      name: /^Forced/,
    });
    await userEvent.setup().click(toggle);
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
