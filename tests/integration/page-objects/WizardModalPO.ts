import { act, findByRole, findByText, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { App, Modal } from "obsidian";
import { App as ObsidianApp } from "obsidian-test-mocks/obsidian";
import { pageIndicatorClasses } from "@shared/classes/common";
import type { ISettings } from "src/conf/settings";
import { createSettings } from "../../helpers/settings";

export interface WizardModalFixture {
  readonly files?: Record<string, string>;
}

export type NotePalaceModalConstructor = new (
  app: App,
  settings: ISettings,
  saveSettings: () => Promise<void>,
) => Modal;

interface WizardModalElements {
  readonly backButton: Promise<HTMLElement>;
  readonly cancelButton: Promise<HTMLElement>;
  readonly nextButton: Promise<HTMLElement>;
}

interface MountedModal {
  readonly container: HTMLElement;
  readonly modal: Modal;
  readonly saveSettingsSpy: jest.Mock;
}

export abstract class WizardModalPO {
  private readonly elements: WizardModalElements;
  private readonly user: ReturnType<typeof userEvent.setup>;

  protected constructor(
    protected readonly modal: Modal,
    protected readonly container: HTMLElement,
  ) {
    this.elements = {
      get backButton() {
        return findByRole(container, "button", { name: "← Back" });
      },
      get cancelButton() {
        return findByRole(container, "button", { name: "Cancel" });
      },
      get nextButton() {
        return findByRole(container, "button", { name: /^Next:/ });
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
    const modal = new ModalClass(
      app as unknown as App,
      createSettings(),
      saveSettingsSpy,
    );
    document.body.appendChild(modal.containerEl);
    act(() => {
      modal.onOpen();
    });
    return { container: modal.containerEl, modal, saveSettingsSpy };
  }

  clickBackButton(): Promise<void> {
    return this.clickElement(this.elements.backButton);
  }

  clickCancelButton(): Promise<void> {
    return this.clickElement(this.elements.cancelButton);
  }

  clickNextButton(): Promise<void> {
    return this.clickElement(this.elements.nextButton);
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

  async expectTextDisplayed(text: string): Promise<HTMLElement> {
    return findByText(this.container, text);
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

  private async clickElement(element: Promise<HTMLElement>): Promise<void> {
    await this.user.click(await element);
  }
}
