import type { App } from "obsidian";
import { Notice, PluginSettingTab, Setting } from "obsidian";
import { t } from "src/i18n";
import { Anki } from "src/services/anki/anki";
import { logger } from "src/services/logger";
import type NotePalace from "../../main";

export class SettingsTab extends PluginSettingTab {
  plugin: NotePalace;

  constructor(app: App, plugin: NotePalace) {
    super(app, plugin);
    this.plugin = plugin;
  }

  override display(): void {
    const { containerEl } = this;
    const plugin = this.plugin;

    containerEl.empty();

    const description = createFragment();
    description.append(
      t("settings.permissionDesc"),
      createEl("br"),
      t("settings.permissionDescSecondLine"),
    );

    new Setting(containerEl)
      .setName(t("settings.givePermission"))
      .setDesc(description)
      .addButton((button) => {
        button.setButtonText(t("settings.grantPermission")).onClick(() => {
          new Anki()
            .requestPermission()
            .then((result) => {
              if (result.permission === "granted") {
                plugin.settings.ankiConnectPermission = true;
                void plugin.saveData(plugin.settings);
                new Notice(t("notice.permissionGranted"));
              } else {
                new Notice(t("notice.permissionNotGranted"));
              }
            })
            .catch((error: unknown) => {
              new Notice(t("notice.ankiError"));
              logger.error("requesting AnkiConnect permission failed", error);
            });
        });
      });

    new Setting(containerEl)
      .setName(t("settings.testAnki"))
      .setDesc(t("settings.testDesc"))
      .addButton((text) => {
        text.setButtonText(t("settings.testButton")).onClick(() => {
          new Anki()
            .ping()
            .then(() => new Notice(t("notice.ankiWorks")))
            .catch(() => new Notice(t("notice.ankiNotConnectedShort")));
        });
      });

    new Setting(containerEl)
      .setName(t("settings.ignoredDirectories"))
      .setDesc(t("settings.ignoredDesc"))
      .addText((text) => {
        text
          .setValue(plugin.settings.ignoredDirectories)
          .setPlaceholder(t("settings.ignoredPlaceholder"))
          .onChange((value) => {
            plugin.settings.ignoredDirectories = value;
            void plugin.saveData(plugin.settings);
          });
      });
  }
}
