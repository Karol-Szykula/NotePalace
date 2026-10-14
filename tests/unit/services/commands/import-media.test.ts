/**
 * @jest-environment jsdom
 *
 * Reimporting a note must not duplicate its attachments. The Obsidian mock and
 * showdown need the DOM, so this suite runs in jsdom.
 */
import "obsidian-test-mocks/jest-setup";
import { App } from "obsidian-test-mocks/obsidian";
import type { TFile as ObsidianTFile, Vault as ObsidianVault } from "obsidian";
import type { AnkiNoteInfo } from "src/entities/anki-note";
import { Anki } from "src/services/anki/anki";
import {
  executeImport,
  type ExecuteImportRequest,
} from "src/services/commands/import-deck";
import { decodeBase64 } from "src/services/vault/media";
import { setActiveDocument } from "../../../mocks/obsidian";
import { AnkiConnectMock } from "../../../mocks/anki-connect";
import { jsonEngine } from "../../../helpers/json-engine";

AnkiConnectMock.install();

beforeEach(() => {
  AnkiConnectMock.reset();
  setActiveDocument();
});

const deckName = "Languages";
const noteId = 201;
const noteFile = `${deckName}/Question-201.md`;
const attachment = `${deckName}/attachments/a.png`;
const attachmentCopy = `${deckName}/attachments/a-1.png`;
const attachmentBase64 = "ZGF0YQ==";

function noteWithImage(): AnkiNoteInfo {
  return {
    cards: [7],
    fields: {
      Back: { value: '<p><img src="a.png"></p>' },
      Front: { value: "<p>Question</p>" },
    },
    mod: 70,
    modelName: "Basic",
    noteId,
    tags: [],
  };
}

function existingBlock(): string {
  return `\`\`\`note-form\n{\n"front": "Question",\n"back": "![[${attachment}]]",\n"tags": "",\n"id": ${noteId}\n}\n\`\`\`\n`;
}

async function vaultWithAttachment(): Promise<ObsidianVault> {
  const app = App.createConfigured__({
    files: { [noteFile]: existingBlock() },
  });
  const vault = app.vault as unknown as ObsidianVault;
  await vault.createFolder(`${deckName}/attachments`);
  await vault.createBinary(attachment, decodeBase64(attachmentBase64));
  return vault;
}

function respondWithMedia(): void {
  AnkiConnectMock.setResponder((request) => {
    if (request.action === "retrieveMediaFile") {
      return { result: attachmentBase64, error: null };
    }
    if (request.action === "deckNames") {
      return { result: [deckName], error: null };
    }
    if (request.action === "cardsInfo") {
      const params = request.params as { cards: number[] };
      return {
        result: params.cards.map((cardId) => ({ cardId, deckName })),
        error: null,
      };
    }
    return { result: null, error: null };
  });
}

function importRequest(ankiWins: boolean): ExecuteImportRequest {
  return {
    ankiWinsNoteIds: ankiWins ? [noteId] : [],
    deckName,
    decisions: { [noteId]: true },
    fieldMappings: { Basic: { Back: "Back", Front: "Front" } },
    noteLifecycle: {
      [noteId]: {
        lastHash: "stale",
        lastMod: 100,
        status: "synced.clean" as const,
        updatedAt: 0,
        v: 1,
      },
    },
    notes: [noteWithImage()],
    targetFolder: "",
    vaultNoteIndex: new Map([[noteId, noteFile]]),
    previewStatuses: undefined,
  };
}

function mediaFetches(): number {
  return AnkiConnectMock.requests.filter(
    (request) => request.action === "retrieveMediaFile",
  ).length;
}

test("given a note edited in the vault when imported without force then keeps its single attachment", async () => {
  // given
  const vault = await vaultWithAttachment();
  respondWithMedia();

  // when
  const report = await executeImport(
    new Anki(),
    vault,
    importRequest(false),
    jsonEngine,
  );

  // then
  expect(report).toMatchObject({ skippedNewerInVault: 1 });
  expect(vault.getAbstractFileByPath(attachmentCopy)).toBeNull();
  expect(mediaFetches()).toBe(0);
});

test("given a forced reimport when executed then reuses the attachment instead of duplicating it", async () => {
  // given
  const vault = await vaultWithAttachment();
  respondWithMedia();

  // when
  const report = await executeImport(
    new Anki(),
    vault,
    importRequest(true),
    jsonEngine,
  );

  // then
  expect(report).toMatchObject({ forced: 1, overwritten: 1 });
  expect(vault.getAbstractFileByPath(attachmentCopy)).toBeNull();
  const file = vault.getAbstractFileByPath(noteFile) as ObsidianTFile;
  expect(await vault.read(file)).toContain(`![[${attachment}]]`);
});
