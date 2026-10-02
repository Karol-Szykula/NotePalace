/**
 * @jest-environment jsdom
 */
import "obsidian-test-mocks/jest-setup";
import { render, screen, waitFor } from "@testing-library/react";
import { Anki } from "src/services/anki/anki";
import { NotesPreview } from "src/gui/note-transfer-wizard/export/components/NotesPreview";
import type { Vault as ObsidianVault } from "obsidian";
import { App } from "obsidian-test-mocks/obsidian";
import { computeContentHash } from "src/services/notes/content-hash";
import { syncedCleanRecord } from "src/services/notes/lifecycle";
import { AnkiConnectMock } from "./mocks/anki-connect";

AnkiConnectMock.install();
beforeEach(() => {
  AnkiConnectMock.reset();
});

test("debug render with id", async () => {
  AnkiConnectMock.setResponder((request) => {
    console.log("ANKI-ACTION", request.action);
    if (request.action === "notesInfo") {
      const params = request.params as { notes: number[] };
      console.log("NOTESINFO-IDS", JSON.stringify(params.notes));
      return {
        result: [
          {
            noteId: 101,
            mod: 100,
            modelName: "Basic",
            fields: { Front: { value: "<p>Up to date card</p>" } },
            tags: [],
            cards: [7],
          },
        ].filter((n) => params.notes.includes(n.noteId)),
        error: null,
      };
    }
    return { result: null, error: null };
  });
  const app = App.createConfigured__({
    files: {
      "Languages/Up-101.md":
        '```note-form\nfront: Up to date card\nback: B\ntags: ""\nid: 101\n```\n',
    },
  });
  const hash = await computeContentHash("Up to date card", "B", "", "Basic");
  render(
    <NotesPreview
      anki={new Anki()}
      currentPage={0}
      deckName="Languages"
      forcedNoteIds={{}}
      ignoredDirectories=""
      noteLifecycle={{ 101: syncedCleanRecord(100, hash, 0) }}
      notesSelectedToExport={{}}
      onForcedNoteIdsChange={() => undefined}
      onNotesSelectedToExportChange={() => undefined}
      onPageChange={() => undefined}
      onStatusesLoaded={(s) => console.log("STATUSES", JSON.stringify(s))}
      onTotalPagesChange={() => undefined}
      totalPages={1}
      vault={app.vault as unknown as ObsidianVault}
    />,
  );
  await waitFor(() => screen.getByText("Up to date card"), { timeout: 8000 });
}, 20000);
