import type { Modal, Vault } from "obsidian";
import { findByRole } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { splitDeckHierarchy } from "@shared/utils/decks";
import type { AnkiNoteInfo } from "src/entities/anki-note";
import { NotesExportModal } from "src/gui/note-transfer-wizard/export/notes-export-modal";
import { ankiResponder } from "../../helpers/anki-responder";
import type { WizardModalFixture } from "./WizardModalPO";
import { WizardModalPO } from "./WizardModalPO";

export interface ExportModalFixture extends WizardModalFixture {
  readonly decks?: Record<string, number[]>;
  readonly notes?: AnkiNoteInfo[];
}

export class ExportModalPO extends WizardModalPO {
  protected constructor(modal: Modal, container: HTMLElement, vault: Vault) {
    super(modal, container, vault);
  }

  static render(fixture: ExportModalFixture = {}): ExportModalPO {
    const decks =
      fixture.decks === undefined ? undefined : { ...fixture.decks };
    const notes = fixture.notes === undefined ? undefined : [...fixture.notes];
    ankiResponder().respondWith({
      ...(decks && { decks }),
      ...(notes && { notes }),
    });
    const mounted = WizardModalPO.mountModal(NotesExportModal, fixture);
    return new ExportModalPO(mounted.modal, mounted.container, mounted.vault);
  }

  async chooseFolder(folderName: string): Promise<void> {
    const { shortName } = splitDeckHierarchy(folderName);
    await this.chooseRadio(shortName);
  }

  async goToNotesPage(folderName: string): Promise<void> {
    await this.chooseFolder(folderName);
    await this.clickNextButton();
    await this.expectTextDisplayed(/Notes to export:/);
  }

  async goToSavePage(): Promise<void> {
    await this.clickExportButton();
    await this.elements.okButton;
  }

  async isNotePreselected(): Promise<boolean> {
    const checkbox = await findByRole(this.container, "checkbox", {
      name: "",
    });
    return (checkbox as HTMLInputElement).checked;
  }

  async noteFileContent(noteId?: number): Promise<string | undefined> {
    const files = this.vault.getMarkdownFiles();
    for (const file of files) {
      const source = await this.vault.read(file);
      if (noteId !== undefined) {
        if (source.includes(`id: ${noteId}`)) {
          return source;
        }
      } else if (source.match(/id: \d+/)) {
        return source;
      }
    }
    return undefined;
  }

  async toggleObsidianWins(): Promise<void> {
    const checkbox = await findByRole(this.container, "checkbox", {
      name: /^Obsidian wins:/i,
    });
    await userEvent.setup().click(checkbox);
  }

  async clickBulkObsidianWins(): Promise<void> {
    const button = await findByRole(this.container, "button", {
      name: /Use Obsidian's version for all/,
    });
    await userEvent.setup().click(button);
  }
}
