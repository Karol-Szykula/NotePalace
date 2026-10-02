import { registerDevCommands } from "src/dev/commands";
import NotePalace from "./main";

export default class NotePalaceDev extends NotePalace {
  override async onload() {
    await super.onload();
    registerDevCommands(this);
  }
}
