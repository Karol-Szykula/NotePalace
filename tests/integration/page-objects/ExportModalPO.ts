import type { Modal } from "obsidian";
import { splitDeckHierarchy } from "@shared/utils/decks";
import { NotesExportModal } from "src/gui/note-transfer-wizard/export/notes-export-modal";
import type { WizardModalFixture } from "./WizardModalPO";
import { WizardModalPO } from "./WizardModalPO";

export class ExportModalPO extends WizardModalPO {
  protected constructor(modal: Modal, container: HTMLElement) {
    super(modal, container);
  }

  static render(fixture: WizardModalFixture = {}): ExportModalPO {
    const mounted = WizardModalPO.mountModal(NotesExportModal, fixture);
    return new ExportModalPO(mounted.modal, mounted.container);
  }

  async chooseFolder(folderName: string): Promise<void> {
    const { shortName } = splitDeckHierarchy(folderName);
    await this.chooseRadio(shortName);
  }
}
