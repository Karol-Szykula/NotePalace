/**
 * @jest-environment jsdom
 *
 * User-perspective tests for the export execution page: automatic run
 * on open with progress and final report, without any buttons.
 */
import "obsidian-test-mocks/jest-setup";
import { render, screen } from "@testing-library/react";
import { App } from "obsidian-test-mocks/obsidian";
import type { Vault as ObsidianVault } from "obsidian";
import { Anki } from "src/services/anki/anki";
import { ExportExecution } from "src/gui/note-transfer-wizard/export/components/ExportExecution";
import { createdPattern } from "src/gui/note-transfer-wizard/shared/utils/summary-patterns";
import type { ExportReport } from "src/services/commands/export-deck";
import { createSettings } from "../../../../helpers/settings";
import { ankiResponder } from "../../../../helpers/anki-responder";
import { AnkiConnectMock } from "../../../../mocks/anki-connect";
import {
  basicAnkiNote,
  importStatusFixtures,
} from "../../../../helpers/status-fixtures";
import type { NoteLifecycleRecord } from "src/services/notes/lifecycle";

AnkiConnectMock.install();

beforeEach(() => {
  AnkiConnectMock.reset();
});

const responder = ankiResponder();
const noteId = 1234567890;

function noteBlock(front: string): string {
  return ["```note-form", `front: ${front}`, "back: B", 'tags: ""', "```"].join(
    "\n",
  );
}

function withLanguagesPrefix(
  files: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [path, content] of Object.entries(files)) {
    result[`Languages/${path}`] = content;
  }
  return result;
}

function renderExecution(
  files: Record<string, string> = {},
  noteLifecycle: Record<number, NoteLifecycleRecord> = {},
) {
  const app = App.createConfigured__({ files });
  const onFinish = jest.fn();
  render(
    <ExportExecution
      anki={new Anki()}
      forcedNoteIds={{}}
      ignoredDirectories=""
      notesSelectedToExport={{}}
      onFinish={onFinish}
      settings={createSettings({ noteLifecycle })}
      vault={app.vault as unknown as ObsidianVault}
    />,
  );
  return { app, onFinish };
}

describe("ExportExecution", () => {
  test("given a new block when opened then runs the export and reports counts without any buttons", async () => {
    // given
    responder.respondWith();
    const { onFinish } = renderExecution({
      "Languages/Q.md": `${noteBlock("Q")}\n`,
    });

    // when
    const report = await screen.findByText(createdPattern);

    // then
    expect(report).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(onFinish).toHaveBeenCalledTimes(1);
    const finished: ExportReport = onFinish.mock.calls[0][0];
    expect(finished).toMatchObject({
      created: 1,
      skipped: 0,
    });
  });

  test("given a failing write when opened then shows the error and notifies nothing", async () => {
    // given
    responder.respondWith();
    const { app, onFinish } = renderExecution({
      "Languages/Q.md": `${noteBlock("Q")}\n`,
    });
    const failure = new Error("ENOENT: no such file or directory");
    jest.spyOn(app.vault, "modify").mockRejectedValueOnce(failure);

    // when
    const message = await screen.findByText(/Export failed: ENOENT/);

    // then
    expect(message).toBeInTheDocument();
    expect(onFinish).not.toHaveBeenCalled();
  });

  test.each([
    ["synced.ankiNewer", importStatusFixtures["synced.ankiNewer"]],
    ["synced.diverged", importStatusFixtures["synced.diverged"]],
  ])(
    "given a %s note left unforced when execution runs then report names left to Sync",
    async (_status, { ankiMod, buildFixture }) => {
      // given
      responder.respondWith({
        notes: [basicAnkiNote(noteId, ankiMod)],
      });
      const fixture = await buildFixture(noteId);
      const { onFinish } = renderExecution(
        withLanguagesPrefix(fixture.files),
        fixture.noteLifecycle,
      );

      // when
      const report = await screen.findByText(/left to Sync: 1/);

      // then
      expect(report).toBeInTheDocument();
      expect(onFinish).toHaveBeenCalledTimes(1);
      const finished: ExportReport = onFinish.mock.calls[0][0];
      expect(finished.skippedForSync).toBe(1);
    },
  );
});
