import type { Modal, Vault } from "obsidian";
import { findByRole, findAllByRole } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { messagePattern } from "@shared/utils/summary-patterns";
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
    await this.expectTextDisplayed(messagePattern("preview.notesToExport"));
  }

  async goToSavePage(): Promise<void> {
    await this.clickExportButton();
    await this.elements.okButton;
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

  async toggleForce(): Promise<void> {
    const toggle = await findByRole(this.container, "switch", {
      name: /^Forced/,
    });
    await userEvent.setup().click(toggle);
  }
}
