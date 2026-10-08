import type {
  NoteLifecycleEvent,
  NoteLifecycleStatus,
} from "src/services/notes/lifecycle";
import { NOTE_LIFECYCLE_STATUSES } from "src/services/notes/lifecycle";

export const OUT_OF_SCOPE = "OUT_OF_SCOPE";

export const SYNC_COMMANDS = ["export", "import", "sync"] as const;

export type SyncCommand = (typeof SYNC_COMMANDS)[number];

export type SyncDecisionAct = NoteLifecycleEvent | typeof OUT_OF_SCOPE;

export type OutcomeKind =
  "conflict" | "create" | "missing" | "quiet" | "skip" | "overwrite";

export type ResponsibleComponent =
  | "create-from-anki"
  | "create-in-anki"
  | "bidirectional-sync"
  | "enroll-in-anki"
  | "cleanup-vault";

type ForceWinner = "anki" | "none" | "obsidian";

export interface SyncDecisionRow {
  act: SyncDecisionAct;
  forcedAct?: SyncDecisionAct;
  forcedOutcome?: string;
  kind: OutcomeKind;
  rationale: string;
  responsibleComponent: ResponsibleComponent;
}

interface CommandRule {
  readonly act: SyncDecisionAct;
  readonly forcedAct?: SyncDecisionAct;
  readonly forcedOutcome?: string;
  readonly kind: OutcomeKind;
  readonly rationale: string;
}
interface CanonicalDecision {
  readonly export: CommandRule;
  readonly import: CommandRule;
  readonly responsibleComponent: ResponsibleComponent;
  readonly status: NoteLifecycleStatus;
  readonly sync: CommandRule;
}

const enrolsSameFile =
  "Has an id but no record: enrols it, rewrites the same file.";

const staleRecord = "Only a stale record left: Purge ledger forgets it.";

const forceWinnerByCommand: Record<SyncCommand, ForceWinner> = {
  export: "obsidian",
  import: "anki",
  sync: "none",
};

const forceWinnerLabel: Record<ForceWinner, string> = {
  anki: "Anki wins",
  none: "no force",
  obsidian: "Obsidian wins",
};

const canonicalDecisions: Record<NoteLifecycleStatus, CanonicalDecision> = {
  "ankiOnly.neverImported": {
    status: "ankiOnly.neverImported",
    responsibleComponent: "create-from-anki",
    export: {
      act: OUT_OF_SCOPE,
      kind: "create",
      rationale: "Anki only: the import wizard brings it in.",
    },
    import: {
      act: "IMPORT",
      kind: "create",
      rationale: "Anki only: creates the file.",
    },
    sync: {
      act: OUT_OF_SCOPE,
      kind: "create",
      rationale: "Untracked Anki note: counted as needing import.",
    },
  },
  "ankiOnly.fileDeleted": {
    status: "ankiOnly.fileDeleted",
    responsibleComponent: "bidirectional-sync",
    export: {
      act: OUT_OF_SCOPE,
      kind: "missing",
      rationale: "File gone: Sync decides, nothing to push.",
    },
    import: {
      act: OUT_OF_SCOPE,
      forcedAct: "RESURRECT",
      forcedOutcome: "re-creates the file you deleted.",
      kind: "missing",
      rationale: "File gone: Sync decides, Anki wins re-creates it.",
    },
    sync: {
      act: OUT_OF_SCOPE,
      kind: "missing",
      rationale: "No file: the purge path handles it outside this table.",
    },
  },
  "synced.clean": {
    status: "synced.clean",
    responsibleComponent: "bidirectional-sync",
    export: {
      act: "CHECK",
      kind: "quiet",
      rationale: "Both sides match: nothing to write.",
    },
    import: {
      act: "CHECK",
      forcedOutcome: "rewrites the same content.",
      kind: "quiet",
      rationale: "Both sides match: rewrites nothing.",
    },
    sync: {
      act: "CHECK",
      kind: "quiet",
      rationale: "Both sides match: nothing to do.",
    },
  },
  "synced.ankiNewer": {
    status: "synced.ankiNewer",
    responsibleComponent: "bidirectional-sync",
    export: {
      act: OUT_OF_SCOPE,
      forcedAct: "FORCE_PUSH",
      forcedOutcome: "overwrites Anki.",
      kind: "skip",
      rationale: "Newer in Anki: skipped, use Sync.",
    },
    import: {
      act: "PULL",
      kind: "overwrite",
      rationale: "Newer in Anki: overwrites your file.",
    },
    sync: {
      act: "PULL",
      kind: "overwrite",
      rationale: "Newer in Anki: refreshes the vault file.",
    },
  },
  "synced.vaultNewer": {
    status: "synced.vaultNewer",
    responsibleComponent: "create-in-anki",
    export: {
      act: "PUSH",
      kind: "overwrite",
      rationale: "Newer in Obsidian: pushes to Anki.",
    },
    import: {
      act: OUT_OF_SCOPE,
      forcedAct: "FORCE_PULL",
      forcedOutcome: "overwrites your newer edits.",
      kind: "skip",
      rationale: "Newer in Obsidian: skipped, use Sync.",
    },
    sync: {
      act: "PUSH",
      kind: "overwrite",
      rationale: "Newer in Obsidian: pushes to Anki.",
    },
  },
  "synced.diverged": {
    status: "synced.diverged",
    responsibleComponent: "bidirectional-sync",
    export: {
      act: OUT_OF_SCOPE,
      forcedAct: "FORCE_PUSH",
      forcedOutcome: "overwrites Anki.",
      kind: "conflict",
      rationale: "Edited in both: skipped, use Sync.",
    },
    import: {
      act: OUT_OF_SCOPE,
      forcedAct: "FORCE_PULL",
      forcedOutcome: "overwrites your newer edits.",
      kind: "conflict",
      rationale: "Edited in both: newest wins on Sync.",
    },
    sync: {
      act: "RESOLVE_NEWEST",
      kind: "conflict",
      rationale: "Edited in both: the newer side wins.",
    },
  },
  "linked.unenrolled": {
    status: "linked.unenrolled",
    responsibleComponent: "enroll-in-anki",
    export: {
      act: "ENROLL",
      kind: "quiet",
      rationale: "Has an id but no record: enrols it, writes nothing.",
    },
    import: {
      act: "ENROLL",
      kind: "quiet",
      rationale: enrolsSameFile,
    },
    sync: {
      act: OUT_OF_SCOPE,
      kind: "quiet",
      rationale: "Enrolling is the wizards' job.",
    },
  },
  "vaultOnly.unexported": {
    status: "vaultOnly.unexported",
    responsibleComponent: "create-in-anki",
    export: {
      act: "EXPORT",
      kind: "create",
      rationale: "Vault only: creates the Anki note, writes the id back.",
    },
    import: {
      act: OUT_OF_SCOPE,
      kind: "create",
      rationale: "Vault only: the export wizard creates it.",
    },
    sync: {
      act: OUT_OF_SCOPE,
      kind: "create",
      rationale: "Vault only: the export wizard creates it.",
    },
  },
  "vaultOnly.unenrolled": {
    status: "vaultOnly.unenrolled",
    responsibleComponent: "enroll-in-anki",
    export: {
      act: "ENROLL",
      kind: "quiet",
      rationale: "Has an id but no record: enrols it, writes nothing.",
    },
    import: {
      act: "ENROLL",
      kind: "quiet",
      rationale: enrolsSameFile,
    },
    sync: {
      act: OUT_OF_SCOPE,
      kind: "quiet",
      rationale: "Enrolling is the wizards' job.",
    },
  },
  "vaultOnly.ankiDeleted": {
    status: "vaultOnly.ankiDeleted",
    responsibleComponent: "bidirectional-sync",
    export: {
      act: OUT_OF_SCOPE,
      forcedAct: "EXPORT",
      forcedOutcome: "re-creates it in Anki.",
      kind: "missing",
      rationale: "Gone from Anki: Sync applies the deletion.",
    },
    import: {
      act: OUT_OF_SCOPE,
      kind: "missing",
      rationale: "Gone from Anki: Sync deletes the file.",
    },
    sync: {
      act: OUT_OF_SCOPE,
      kind: "missing",
      rationale: "Gone from Anki: the purge path handles it.",
    },
  },
  orphaned: {
    status: "orphaned",
    responsibleComponent: "cleanup-vault",
    export: {
      act: OUT_OF_SCOPE,
      kind: "missing",
      rationale: staleRecord,
    },
    import: {
      act: OUT_OF_SCOPE,
      kind: "missing",
      rationale: staleRecord,
    },
    sync: {
      act: OUT_OF_SCOPE,
      kind: "missing",
      rationale: staleRecord,
    },
  },
};

function forceLabelFor(command: SyncCommand): string {
  return forceWinnerLabel[forceWinnerByCommand[command]];
}

function renderForcedOutcome(outcome: string, command: SyncCommand): string {
  return `${forceLabelFor(command)}: ${outcome}`;
}

function forcedActOf(rule: CommandRule): Pick<SyncDecisionRow, "forcedAct"> {
  return rule.forcedAct === undefined ? {} : { forcedAct: rule.forcedAct };
}

function forcedOutcomeOf(
  rule: CommandRule,
  command: SyncCommand,
): Pick<SyncDecisionRow, "forcedOutcome"> {
  return rule.forcedOutcome === undefined
    ? {}
    : { forcedOutcome: renderForcedOutcome(rule.forcedOutcome, command) };
}

function deriveRow(
  canonical: CanonicalDecision,
  command: SyncCommand,
): SyncDecisionRow {
  const rule = canonical[command];
  return {
    act: rule.act,
    ...forcedActOf(rule),
    ...forcedOutcomeOf(rule, command),
    kind: rule.kind,
    responsibleComponent: canonical.responsibleComponent,
    rationale: rule.rationale,
  };
}

function deriveTable(
  command: SyncCommand,
): Record<NoteLifecycleStatus, SyncDecisionRow> {
  const table: Partial<Record<NoteLifecycleStatus, SyncDecisionRow>> = {};
  for (const status of NOTE_LIFECYCLE_STATUSES) {
    table[status] = deriveRow(canonicalDecisions[status], command);
  }
  return table as Record<NoteLifecycleStatus, SyncDecisionRow>;
}

const decisions: Record<
  SyncCommand,
  Record<NoteLifecycleStatus, SyncDecisionRow>
> = {
  export: deriveTable("export"),
  import: deriveTable("import"),
  sync: deriveTable("sync"),
};

export function isInScope(act: SyncDecisionAct): act is NoteLifecycleEvent {
  return act !== OUT_OF_SCOPE;
}

export function syncDecisionFor(
  command: SyncCommand,
  status: NoteLifecycleStatus,
): SyncDecisionRow {
  return decisions[command][status];
}

export function decisionActFor(
  command: SyncCommand,
  status: NoteLifecycleStatus,
  isForced = false,
): SyncDecisionAct {
  const row = decisions[command][status];
  if (isForced && row.forcedAct !== undefined) {
    return row.forcedAct;
  }
  return row.act;
}

export interface ResolvedCommandDecision {
  readonly act: SyncDecisionAct;
  readonly forcedFromOutOfScope: boolean;
  readonly isForced: boolean;
}

export function resolveCommandDecision(
  command: SyncCommand,
  status: NoteLifecycleStatus,
  forcedNoteIds: readonly number[] | undefined,
  id: number | undefined,
): ResolvedCommandDecision {
  const isForced = id !== undefined && (forcedNoteIds ?? []).includes(id);
  return {
    act: decisionActFor(command, status, isForced),
    forcedFromOutOfScope:
      isForced && !isInScope(syncDecisionFor(command, status).act),
    isForced,
  };
}

function whyOf(row: SyncDecisionRow): string {
  return row.forcedOutcome === undefined
    ? row.rationale
    : `${row.rationale} Forced: ${row.forcedOutcome}`;
}

function forceCellOf(row: SyncDecisionRow, command: SyncCommand): string {
  return row.forcedAct === undefined
    ? ""
    : `<br/>**Force:** ${row.forcedAct} (${forceLabelFor(command)})`;
}

function forcedPartOf(row: SyncDecisionRow): string {
  return row.forcedAct === undefined ? "" : ` / \`${row.forcedAct}\` (force)`;
}

function actOf(row: SyncDecisionRow): string {
  return row.act === OUT_OF_SCOPE ? "—" : row.act;
}

export function syncDecisionTableMarkdown(): string {
  const header = [
    "| State | Import (Anki wins) | Export (Obsidian wins) | Sync (no force) |",
    "|-------|--------------------|------------------------|-----------------|",
  ];

  const rows = NOTE_LIFECYCLE_STATUSES.map((status) => {
    const cells = SYNC_COMMANDS.map((command) => {
      const row = decisions[command][status];
      return [
        `\`${actOf(row)}\`${forcedPartOf(row)}`,
        `${row.kind} · ${row.responsibleComponent}${forceCellOf(row, command)}`,
        whyOf(row).replace(/\n/g, " "),
      ].join("<br/>");
    });
    return `| \`${status}\` | ${cells.join(" | ")} |`;
  });

  return [...header, ...rows].join("\n");
}

function commandRowMarkdown(
  status: NoteLifecycleStatus,
  row: SyncDecisionRow,
): string {
  const forced = row.forcedAct ?? "—";
  return `| \`${status}\` | \`${row.kind}\` | \`${actOf(row)}\` | \`${forced}\` | \`${row.responsibleComponent}\` | ${whyOf(row)} |`;
}

export function syncDecisionTableMarkdownCommandCentric(): string {
  const sections: string[] = [];
  for (const command of SYNC_COMMANDS) {
    const rows = NOTE_LIFECYCLE_STATUSES.map((status) =>
      commandRowMarkdown(status, decisions[command][status]),
    );
    sections.push(
      [
        `### ${command} (force: ${forceLabelFor(command)})`,
        "",
        "| state | kind | default | forced | responsibleComponent | why |",
        "| --- | --- | --- | --- | --- | --- |",
        ...rows,
        "",
      ].join("\n"),
    );
  }
  return sections.join("\n");
}

function statusId(status: string): string {
  return status.replace(".", "_");
}

function cmdNode(command: string): string {
  return command.charAt(0).toUpperCase() + command.slice(1);
}

function escapeForMermaid(label: string): string {
  const escaped = label.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}"`;
}

function cellContent(row: SyncDecisionRow, command: SyncCommand): string {
  const forcedInfo =
    row.forcedAct === undefined
      ? ""
      : `<br/>force: ${row.forcedAct} (${forceLabelFor(command)})`;
  const actSymbol = row.act === OUT_OF_SCOPE ? "\u2014" : row.act;
  const forcedPart =
    row.forcedAct === undefined ? "" : ` / ${row.forcedAct} (force)`;
  const base = `${actSymbol}${forcedPart}<br/>${row.kind} \u00b7 ${row.responsibleComponent}`;
  const content = `${base}${forcedInfo}<br/>${whyOf(row).replace(/\n/g, " ")}`;
  return escapeForMermaid(content);
}

function buildStatesSubgraph(lines: string[]): void {
  lines.push("  subgraph STATES[States]");
  lines.push("  direction TB");
  for (const status of NOTE_LIFECYCLE_STATUSES) {
    lines.push(`    ${statusId(status)}["${status}"]`);
  }
  lines.push("  end");
  lines.push("");
}

function getCommandLabel(command: SyncCommand): string {
  if (command === "import") return "Import (Anki wins)";
  if (command === "export") return "Export (Obsidian wins)";
  return "Sync (no force)";
}

function buildCommandDiagram(command: SyncCommand): string {
  const lines = ["flowchart TB"];
  lines.push("  subgraph COMMAND[Command]");
  lines.push("  direction TB");
  lines.push(`    ${cmdNode(command)}["${getCommandLabel(command)}"]`);
  lines.push("  end");
  lines.push("");

  buildStatesSubgraph(lines);
  lines.push(`  ${cmdNode(command)} -->|start| START["[*]"]`);
  lines.push("");

  for (const status of NOTE_LIFECYCLE_STATUSES) {
    const row = decisions[command][status];
    const sid = statusId(status);
    lines.push(
      `  ${cmdNode(command)} -->|${cellContent(row, command)}| ${sid}`,
    );
    if (row.forcedAct !== undefined) {
      const forcedLabel = escapeForMermaid(`forced: ${row.forcedAct}`);
      lines.push(`  ${sid} -.->|${forcedLabel}| ${cmdNode(command)}`);
    }
  }

  lines.push("");
  lines.push(`  ${cmdNode(command)} -->|end| END["[*]"]`);
  lines.push("");

  lines.push(
    "  classDef cmd fill:#e8eaf6,stroke:#283593,stroke-width:2px,color:#1a237e;",
  );
  lines.push(
    "  classDef state fill:#fce4ec,stroke:#ad1457,stroke-width:1px,color:#880e4f;",
  );
  lines.push(`  class ${cmdNode(command)} cmd;`);
  for (const status of NOTE_LIFECYCLE_STATUSES) {
    lines.push(`  class ${statusId(status)} state;`);
  }
  return lines.join("\n");
}

export function syncDecisionTableMermaid(command?: SyncCommand): string {
  if (command) {
    return buildCommandDiagram(command);
  }
  return SYNC_COMMANDS.map(buildCommandDiagram).join("\n\n");
}
