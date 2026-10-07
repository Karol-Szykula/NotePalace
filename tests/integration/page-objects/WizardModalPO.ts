import {
  act,
  findByRole,
  findByText,
  queryByRole,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { App, Modal, Vault } from "obsidian";
import { App as ObsidianApp } from "obsidian-test-mocks/obsidian";
import { pageIndicatorClasses } from "@shared/classes/common";
import type { ISettings } from "src/conf/settings";
import type { NoteLifecycleRecord } from "src/services/notes/lifecycle";
import { createSettings } from "../../helpers/settings";

export interface WizardModalFixture {
  readonly files?: Record<string, string> | undefined;
  readonly noteLifecycle?: Record<number, NoteLifecycleRecord> | undefined;
}

export type NotePalaceModalConstructor = new (
  app: App,
  settings: ISettings,
  saveSettings: () => Promise<void>,
) => Modal;

interface WizardModalElements {
  readonly backButton: Promise<HTMLElement>;
  readonly cancelButton: Promise<HTMLElement>;
  readonly exportButton: Promise<HTMLElement>;
  readonly importButton: Promise<HTMLElement>;
  readonly nextButton: Promise<HTMLElement>;
  readonly okButton: Promise<HTMLElement>;
}

interface MountedModal {
  readonly container: HTMLElement;
  readonly modal: Modal;
  readonly saveSettingsSpy: jest.Mock;
  readonly vault: Vault;
}

export abstract class WizardModalPO {
  private readonly elements: WizardModalElements;
  private readonly user: ReturnType<typeof userEvent.setup>;

  protected constructor(
    protected readonly modal: Modal,
    protected readonly container: HTMLElement,
    protected readonly vault: Vault,
  ) {
    this.elements = {
      get backButton() {
        return findByRole(container, "button", { name: "← Back" });
      },
      get cancelButton() {
        return findByRole(container, "button", { name: "Cancel" });
      },
      get exportButton() {
        return findByRole(container, "button", { name: "Export" });
      },
      get importButton() {
        return findByRole(container, "button", { name: "Import" });
      },
      get nextButton() {
        return findByRole(container, "button", { name: /^Next:/ });
      },
      get okButton() {
        return findByRole(container, "button", { name: "OK" });
      },
    };
    this.user = userEvent.setup();
  }

  protected static mountModal(
    ModalClass: NotePalaceModalConstructor,
    fixture: WizardModalFixture = {},
  ): MountedModal {
    const app = ObsidianApp.createConfigured__({
      files: fixture.files ?? {},
    });
    const saveSettingsSpy = jest.fn(async (): Promise<void> => {
      return undefined;
    });
    const settingsOverrides: Partial<ISettings> = {};
    if (fixture.noteLifecycle !== undefined) {
      settingsOverrides.noteLifecycle = fixture.noteLifecycle;
    }
    const modal = new ModalClass(
      app as unknown as App,
      createSettings(settingsOverrides),
      saveSettingsSpy,
    );
    document.body.appendChild(modal.containerEl);
    act(() => {
      modal.onOpen();
    });
    return {
      container: modal.containerEl,
      modal,
      saveSettingsSpy,
      vault: app.vault as unknown as Vault,
    };
  }

  clickBackButton(): Promise<void> {
    return this.clickElement(this.elements.backButton);
  }

  clickCancelButton(): Promise<void> {
    return this.clickElement(this.elements.cancelButton);
  }

  clickExportButton(): Promise<void> {
    return this.clickElement(this.elements.exportButton);
  }

  clickImportButton(): Promise<void> {
    return this.clickElement(this.elements.importButton);
  }

  clickNextButton(): Promise<void> {
    return this.clickElement(this.elements.nextButton);
  }

  clickOkButton(): Promise<void> {
    return this.clickElement(this.elements.okButton);
  }

  closeModal(): void {
    if (!this.container.isConnected) {
      return;
    }
    act(() => {
      this.modal.close();
    });
    this.container.remove();
  }

  async expectTextDisplayed(text: string | RegExp): Promise<HTMLElement> {
    return findByText(this.container, text);
  }

  async isBackButtonVisible(): Promise<boolean> {
    return this.isButtonVisible("← Back");
  }

  async isCancelButtonVisible(): Promise<boolean> {
    return this.isButtonVisible("Cancel");
  }

  async isImportButtonEnabled(): Promise<boolean> {
    const importButton = await this.elements.importButton;
    return !(importButton as HTMLButtonElement).disabled;
  }

  async isImportButtonVisible(): Promise<boolean> {
    return this.isButtonVisible("Import");
  }

  async isModalOpen(): Promise<boolean> {
    return this.modal.contentEl.childElementCount > 0;
  }

  async isNextButtonDisabled(): Promise<boolean> {
    const nextButton = await this.elements.nextButton;
    return (nextButton as HTMLButtonElement).disabled;
  }

  async isNextButtonVisible(): Promise<boolean> {
    return this.isButtonVisible(/^Next:/);
  }

  async pageIndicatorTitles(): Promise<string[]> {
    return waitFor(() => {
      const pages = this.container.querySelectorAll(
        `.${pageIndicatorClasses.page}`,
      );
      return Array.from(pages).map((page) => {
        const pageNumber = page.querySelector(
          `.${pageIndicatorClasses.pageNumber}`,
        );
        return pageNumber?.nextElementSibling?.textContent ?? "";
      });
    });
  }

  protected async chooseRadio(name: string): Promise<void> {
    const radio = await findByRole(this.container, "radio", { name });
    await this.user.click(radio);
  }

  protected async isRadioEnabled(name: string): Promise<boolean> {
    const radio = await findByRole(this.container, "radio", { name });
    return !(radio as HTMLInputElement).disabled;
  }

  private async clickElement(element: Promise<HTMLElement>): Promise<void> {
    await this.user.click(await element);
  }

  private async isButtonVisible(name: string | RegExp): Promise<boolean> {
    return queryByRole(this.container, "button", { name }) !== null;
  }
}
