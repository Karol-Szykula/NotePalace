import type { App } from "obsidian";
import { Modal } from "obsidian";
import { createElement } from "react";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import type { ISettings } from "src/conf/settings";
import { NotesImportWizard } from "src/gui/note-transfer-wizard/import/NotesImportWizard";
import type { WizardScope } from "src/gui/note-transfer-wizard/shared/utils/active-note-scope";

export class NotesImportModal extends Modal {
  private settings: ISettings;
  private reactRoot: Root | null = null;

  constructor(
    app: App,
    settings: ISettings,
    private saveSettings: () => Promise<void>,
    private activeScope: WizardScope,
  ) {
    super(app);
    this.settings = settings;
  }

  override onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    this.mountReactRoot(contentEl);
  }

  private mountReactRoot(contentEl: HTMLElement) {
    this.reactRoot = createRoot(contentEl);
    this.reactRoot.render(
      createElement(NotesImportWizard, {
        activeScope: this.activeScope,
        onCancel: () => this.close(),
        settings: this.settings,
        saveSettings: () => this.saveSettings(),
        vault: this.app.vault,
      }),
    );
  }

  override onClose() {
    this.unmountReactRoot();
    const { contentEl } = this;
    contentEl.empty();
  }

  private unmountReactRoot() {
    this.reactRoot?.unmount();
    this.reactRoot = null;
  }
}
