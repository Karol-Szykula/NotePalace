import type { TFile, Vault } from "obsidian";
import type { Anki } from "src/services/anki/anki";
import { assureModels } from "src/services/anki/anki-models";
import { pushNotesToAnki, uploadNoteMedia } from "src/services/commands/push";
import { deckNameIndex, resolveDeckName } from "src/services/vault/paths";
import { serializeYamlNote } from "src/services/notes/document";
import type { YamlEngine } from "src/services/yaml-engine";
import type {
  ExportPlan,
  IdAssignment,
} from "src/services/commands/export-plan";
import { plannedNotes } from "src/services/commands/export-plan";

async function ensurePlannedDecks(anki: Anki, plan: ExportPlan): Promise<void> {
  const knownNames = await anki.getDeckNames();
  const known = new Set(knownNames);
  const index = deckNameIndex(knownNames);
  for (const candidate of plan.creates) {
    candidate.note.deckName = resolveDeckName(index, candidate.note.deckName);
  }
  for (const deckName of decksForCreates(plan)) {
    if (known.has(deckName)) {
      continue;
    }
    await anki.createDeck(deckName);
    known.add(deckName);
  }
}

export async function writeBackIds(
  vault: Vault,
  assignments: IdAssignment[],
  yaml: YamlEngine,
): Promise<void> {
  const byFile = new Map<TFile, IdAssignment[]>();
  for (const assignment of assignments) {
    const group = byFile.get(assignment.location.file) ?? [];
    group.push(assignment);
    byFile.set(assignment.location.file, group);
  }
  for (const [file, group] of byFile) {
    const content = await vault.read(file);
    let rewritten = content;
    for (const { location, noteId } of [...group].sort(
      (first, second) => second.location.start - first.location.start,
    )) {
      const block = serializeYamlNote({ ...location.block, id: noteId }, yaml);
      rewritten =
        rewritten.slice(0, location.start) +
        block +
        rewritten.slice(location.end);
    }
    await vault.modify(file, rewritten);
  }
}

export async function uploadPlannedMedia(
  anki: Anki,
  plan: ExportPlan,
): Promise<void> {
  await uploadNoteMedia(anki, plannedNotes(plan));
}

function decksForCreates(plan: ExportPlan): string[] {
  return [...new Set(plan.creates.map((candidate) => candidate.note.deckName))];
}

function modelsForCreates(plan: ExportPlan): string[] {
  return [
    ...new Set(plan.creates.map((candidate) => candidate.note.modelName)),
  ];
}

export async function assurePlannedModels(
  anki: Anki,
  plan: ExportPlan,
): Promise<void> {
  const assurance = await assureModels(anki, modelsForCreates(plan));
  if (assurance.mismatched.length === 0) {
    return;
  }
  const mismatched = new Set(
    assurance.mismatched.map((mismatch) => mismatch.modelName),
  );
  const kept = plan.creates.filter(
    (candidate) => !mismatched.has(candidate.note.modelName),
  );
  plan.report.skippedModelMismatch += plan.creates.length - kept.length;
  plan.creates = kept;
}

export async function createPlannedNotes(
  anki: Anki,
  plan: ExportPlan,
): Promise<void> {
  if (plan.creates.length === 0) {
    return;
  }
  await ensurePlannedDecks(anki, plan);
  const noteIds = await anki.addNotes(
    plan.creates.map((candidate) => candidate.note),
  );
  plan.creates.forEach((candidate, index) => {
    const noteId = noteIds[index];
    if (noteId === undefined || noteId < 0) {
      plan.report.skippedConflicts += 1;
      return;
    }
    plan.report.created += 1;
    plan.idWrites.push({ location: candidate.location, noteId });
    plan.synced.push({ hash: candidate.hash, noteId });
  });
}

export async function pushPlannedNotes(
  anki: Anki,
  plan: ExportPlan,
): Promise<void> {
  await pushNotesToAnki(anki, plan.pushes);
  for (const { hash, source } of plan.pushes) {
    plan.report.updated += 1;
    plan.synced.push({ hash, noteId: source.noteId });
  }
}
