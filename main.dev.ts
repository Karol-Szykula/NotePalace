import { registerDevCommands } from "src/dev/commands";
import AnkiPalace from "./main";

export default class AnkiPalaceDev extends AnkiPalace {
  override async onload() {
    await super.onload();
    registerDevCommands(this);
  }
}
