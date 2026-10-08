import type {
  NoteLifecycleEvent,
  NoteLifecycleStatus,
} from "src/services/notes/lifecycle";
import { NOTE_LIFECYCLE_STATUSES } from "src/services/notes/lifecycle";
import { resolveMessage, type MessageKey } from "src/i18n/messages";

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
  forcedOutcomeKey?: MessageKey;
  kind: OutcomeKind;
  rationaleKey: MessageKey;
  responsibleComponent: ResponsibleComponent;
}

interface CommandRule {
  readonly act: SyncDecisionAct;
  readonly forcedAct?: SyncDecisionAct;
  readonly forcedOutcome?: MessageKey;
  readonly kind: OutcomeKind;
  readonly rationale: MessageKey;
}
interface CanonicalDecision {
  readonly export: CommandRule;
  readonly import: CommandRule;
  readonly responsibleComponent: ResponsibleComponent;
  readonly status: NoteLifecycleStatus;
  readonly sync: CommandRule;
}

const forceWinnerByCommand: Record<SyncCommand, ForceWinner> = {
  export: "obsidian",
  import: "anki",
  sync: "none",
};

const forceWinnerLabelKey: Record<ForceWinner, MessageKey> = {
  anki: "force.ankiWins",
  none: "force.none",
  obsidian: "force.obsidianWins",
};

const canonicalDecisions: Record<NoteLifecycleStatus, CanonicalDecision> = {
  "ankiOnly.neverImported": {
    status: "ankiOnly.neverImported",
    responsibleComponent: "create-from-anki",
    export: {
      act: OUT_OF_SCOPE,
      kind: "create",
      rationale: "decision.ankiOnly.neverImported.export.rationale",
    },
    import: {
      act: "IMPORT",
      kind: "create",
      rationale: "decision.ankiOnly.neverImported.import.rationale",
    },
    sync: {
      act: OUT_OF_SCOPE,
      kind: "create",
      rationale: "decision.ankiOnly.neverImported.sync.rationale",
    },
  },
  "ankiOnly.fileDeleted": {
    status: "ankiOnly.fileDeleted",
    responsibleComponent: "bidirectional-sync",
    export: {
      act: OUT_OF_SCOPE,
      kind: "missing",
      rationale: "decision.ankiOnly.fileDeleted.export.rationale",
    },
    import: {
      act: OUT_OF_SCOPE,
      forcedAct: "RESURRECT",
      forcedOutcome: "decision.ankiOnly.fileDeleted.import.forcedOutcome",
      kind: "missing",
      rationale: "decision.ankiOnly.fileDeleted.import.rationale",
    },
    sync: {
      act: OUT_OF_SCOPE,
      kind: "missing",
      rationale: "decision.ankiOnly.fileDeleted.sync.rationale",
    },
  },
  "synced.clean": {
    status: "synced.clean",
    responsibleComponent: "bidirectional-sync",
    export: {
      act: "CHECK",
      kind: "quiet",
      rationale: "decision.synced.clean.export.rationale",
    },
    import: {
      act: "CHECK",
      forcedOutcome: "decision.synced.clean.import.forcedOutcome",
      kind: "quiet",
      rationale: "decision.synced.clean.import.rationale",
    },
    sync: {
      act: "CHECK",
      kind: "quiet",
      rationale: "decision.synced.clean.sync.rationale",
    },
  },
  "synced.ankiNewer": {
    status: "synced.ankiNewer",
    responsibleComponent: "bidirectional-sync",
    export: {
      act: OUT_OF_SCOPE,
      forcedAct: "FORCE_PUSH",
      forcedOutcome: "decision.synced.ankiNewer.export.forcedOutcome",
      kind: "skip",
      rationale: "decision.synced.ankiNewer.export.rationale",
    },
    import: {
      act: "PULL",
      kind: "overwrite",
      rationale: "decision.synced.ankiNewer.import.rationale",
    },
    sync: {
      act: "PULL",
      kind: "overwrite",
      rationale: "decision.synced.ankiNewer.sync.rationale",
    },
  },
  "synced.vaultNewer": {
    status: "synced.vaultNewer",
    responsibleComponent: "create-in-anki",
    export: {
      act: "PUSH",
      kind: "overwrite",
      rationale: "decision.synced.vaultNewer.export.rationale",
    },
    import: {
      act: OUT_OF_SCOPE,
      forcedAct: "FORCE_PULL",
      forcedOutcome: "decision.synced.vaultNewer.import.forcedOutcome",
      kind: "skip",
      rationale: "decision.synced.vaultNewer.import.rationale",
    },
    sync: {
      act: "PUSH",
      kind: "overwrite",
      rationale: "decision.synced.vaultNewer.sync.rationale",
    },
  },
  "synced.diverged": {
    status: "synced.diverged",
    responsibleComponent: "bidirectional-sync",
    export: {
      act: OUT_OF_SCOPE,
      forcedAct: "FORCE_PUSH",
      forcedOutcome: "decision.synced.diverged.export.forcedOutcome",
      kind: "conflict",
      rationale: "decision.synced.diverged.export.rationale",
    },
    import: {
      act: OUT_OF_SCOPE,
      forcedAct: "FORCE_PULL",
      forcedOutcome: "decision.synced.diverged.import.forcedOutcome",
      kind: "conflict",
      rationale: "decision.synced.diverged.import.rationale",
    },
    sync: {
      act: "RESOLVE_NEWEST",
      kind: "conflict",
      rationale: "decision.synced.diverged.sync.rationale",
    },
  },
  "linked.unenrolled": {
    status: "linked.unenrolled",
    responsibleComponent: "enroll-in-anki",
    export: {
      act: "ENROLL",
      kind: "quiet",
      rationale: "decision.linked.unenrolled.export.rationale",
    },
    import: {
      act: "ENROLL",
      kind: "quiet",
      rationale: "decision.linked.unenrolled.import.rationale",
    },
    sync: {
      act: OUT_OF_SCOPE,
      kind: "quiet",
      rationale: "decision.linked.unenrolled.sync.rationale",
    },
  },
  "vaultOnly.unexported": {
    status: "vaultOnly.unexported",
    responsibleComponent: "create-in-anki",
    export: {
      act: "EXPORT",
      kind: "create",
      rationale: "decision.vaultOnly.unexported.export.rationale",
    },
    import: {
      act: OUT_OF_SCOPE,
      kind: "create",
      rationale: "decision.vaultOnly.unexported.import.rationale",
    },
    sync: {
      act: OUT_OF_SCOPE,
      kind: "create",
      rationale: "decision.vaultOnly.unexported.sync.rationale",
    },
  },
  "vaultOnly.unenrolled": {
    status: "vaultOnly.unenrolled",
    responsibleComponent: "enroll-in-anki",
    export: {
      act: "ENROLL",
      kind: "quiet",
      rationale: "decision.vaultOnly.unenrolled.export.rationale",
    },
    import: {
      act: "ENROLL",
      kind: "quiet",
      rationale: "decision.vaultOnly.unenrolled.import.rationale",
    },
    sync: {
      act: OUT_OF_SCOPE,
      kind: "quiet",
      rationale: "decision.vaultOnly.unenrolled.sync.rationale",
    },
  },
  "vaultOnly.ankiDeleted": {
    status: "vaultOnly.ankiDeleted",
    responsibleComponent: "bidirectional-sync",
    export: {
      act: OUT_OF_SCOPE,
      forcedAct: "EXPORT",
      forcedOutcome: "decision.vaultOnly.ankiDeleted.export.forcedOutcome",
      kind: "missing",
      rationale: "decision.vaultOnly.ankiDeleted.export.rationale",
    },
    import: {
      act: OUT_OF_SCOPE,
      kind: "missing",
      rationale: "decision.vaultOnly.ankiDeleted.import.rationale",
    },
    sync: {
      act: OUT_OF_SCOPE,
      kind: "missing",
      rationale: "decision.vaultOnly.ankiDeleted.sync.rationale",
    },
  },
  orphaned: {
    status: "orphaned",
    responsibleComponent: "cleanup-vault",
    export: {
      act: OUT_OF_SCOPE,
      kind: "missing",
      rationale: "decision.orphaned.export.rationale",
    },
    import: {
      act: OUT_OF_SCOPE,
      kind: "missing",
      rationale: "decision.orphaned.import.rationale",
    },
    sync: {
      act: OUT_OF_SCOPE,
      kind: "missing",
      rationale: "decision.orphaned.sync.rationale",
    },
  },
};

function forceLabelText(command: SyncCommand): string {
  return resolveMessage(
    "en",
    forceWinnerLabelKey[forceWinnerByCommand[command]],
  );
}

function forcedOutcomeText(
  command: SyncCommand,
  row: SyncDecisionRow,
): string | undefined {
  if (row.forcedOutcomeKey === undefined) {
    return undefined;
  }
  return resolveMessage("en", "force.outcome", {
    force: forceLabelText(command),
    outcome: resolveMessage("en", row.forcedOutcomeKey),
  });
}

function forcedActOf(rule: CommandRule): Pick<SyncDecisionRow, "forcedAct"> {
  return rule.forcedAct === undefined ? {} : { forcedAct: rule.forcedAct };
}

function forcedOutcomeKeyOf(
  rule: CommandRule,
): Pick<SyncDecisionRow, "forcedOutcomeKey"> {
  return rule.forcedOutcome === undefined
    ? {}
    : { forcedOutcomeKey: rule.forcedOutcome };
}

function deriveRow(
  canonical: CanonicalDecision,
  command: SyncCommand,
): SyncDecisionRow {
  const rule = canonical[command];
  return {
    act: rule.act,
    ...forcedActOf(rule),
    ...forcedOutcomeKeyOf(rule),
    kind: rule.kind,
    rationaleKey: rule.rationale,
    responsibleComponent: canonical.responsibleComponent,
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

function whyOf(row: SyncDecisionRow, command: SyncCommand): string {
  const rationale = resolveMessage("en", row.rationaleKey);
  const forced = forcedOutcomeText(command, row);
  return forced === undefined ? rationale : `${rationale} Forced: ${forced}`;
}

function forceCellOf(row: SyncDecisionRow, command: SyncCommand): string {
  return row.forcedAct === undefined
    ? ""
    : `<br/>**Force:** ${row.forcedAct} (${forceLabelText(command)})`;
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
        whyOf(row, command).replace(/\n/g, " "),
      ].join("<br/>");
    });
    return `| \`${status}\` | ${cells.join(" | ")} |`;
  });

  return [...header, ...rows].join("\n");
}

function commandRowMarkdown(
  status: NoteLifecycleStatus,
  row: SyncDecisionRow,
  command: SyncCommand,
): string {
  const forced = row.forcedAct ?? "—";
  return `| \`${status}\` | \`${row.kind}\` | \`${actOf(row)}\` | \`${forced}\` | \`${row.responsibleComponent}\` | ${whyOf(row, command)} |`;
}

export function syncDecisionTableMarkdownCommandCentric(): string {
  const sections: string[] = [];
  for (const command of SYNC_COMMANDS) {
    const rows = NOTE_LIFECYCLE_STATUSES.map((status) =>
      commandRowMarkdown(status, decisions[command][status], command),
    );
    sections.push(
      [
        `### ${command} (force: ${forceLabelText(command)})`,
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
      : `<br/>force: ${row.forcedAct} (${forceLabelText(command)})`;
  const actSymbol = row.act === OUT_OF_SCOPE ? "\u2014" : row.act;
  const forcedPart =
    row.forcedAct === undefined ? "" : ` / ${row.forcedAct} (force)`;
  const base = `${actSymbol}${forcedPart}<br/>${row.kind} \u00b7 ${row.responsibleComponent}`;
  const content = `${base}${forcedInfo}<br/>${whyOf(row, command).replace(/\n/g, " ")}`;
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
