import { bannerForStatus } from "src/gui/note-form/banners";
import { t } from "src/i18n";

describe("bannerForStatus", () => {
  test("given a diverged note when resolved then warns about newest-wins", async () => {
    // when
    const banner = bannerForStatus("synced.diverged");

    // then
    expect(banner).toBe(t("banners.diverged"));
  });

  test("given a note deleted in anki when resolved then warns about removal", async () => {
    // when
    const banner = bannerForStatus("vaultOnly.ankiDeleted");

    // then
    expect(banner).toBe(t("banners.ankiDeleted"));
  });

  test("given a clean note when resolved then shows no banner", async () => {
    // when
    const banner = bannerForStatus("synced.clean");

    // then
    expect(banner).toBeUndefined();
  });

  test("given no status when resolved then shows no banner", async () => {
    // when
    const banner = bannerForStatus(undefined);

    // then
    expect(banner).toBeUndefined();
  });
});
