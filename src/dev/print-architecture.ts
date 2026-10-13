import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

interface DependencyCruiserModule {
  dependencies?: Array<{ resolved?: string }>;
  source: string;
}

interface DependencyCruiserReport {
  modules: DependencyCruiserModule[];
}

interface Graph {
  edges: Set<string>;
  nodes: Set<string>;
}

const sourceDirectory = "src";
const configFile = ".dependency-cruiser.cjs";
const outputDocument = "docs/architecture.md";

function groupOf(source: string): string {
  const segments = source.replace(/^src\//, "").split("/");
  const [first, second] = segments;
  if (segments.length > 2 && (first === "gui" || first === "services")) {
    return `${first}/${second ?? ""}`;
  }
  return first ?? source;
}

function readReport(): DependencyCruiserReport {
  const run = spawnSync(
    join("node_modules", ".bin", "depcruise"),
    [sourceDirectory, "-c", configFile, "-T", "json"],
    { encoding: "utf8" },
  );
  if (run.status !== 0) {
    throw new Error(`depcruise failed with exit code ${String(run.status)}`);
  }
  return JSON.parse(run.stdout) as DependencyCruiserReport;
}

function buildGraph(report: DependencyCruiserReport): Graph {
  const nodes = new Set<string>();
  const edges = new Set<string>();
  for (const module of report.modules) {
    const from = groupOf(module.source);
    nodes.add(from);
    for (const dependency of module.dependencies ?? []) {
      const resolved = dependency.resolved;
      if (resolved === undefined || !resolved.startsWith("src/")) {
        continue;
      }
      const to = groupOf(resolved);
      nodes.add(to);
      if (from !== to) {
        edges.add(`${from}\t${to}`);
      }
    }
  }
  return { edges, nodes };
}

function nodeId(group: string): string {
  return group.replace(/[^A-Za-z0-9]/g, "_");
}

function nodeLine(group: string): string {
  return `    ${nodeId(group)}["${group}"]`;
}

function inArea(group: string, area: string): boolean {
  return group === area || group.startsWith(`${area}/`);
}

function areaNodes(nodes: string[], area: string): string[] {
  return nodes.filter((group) => inArea(group, area));
}

function subgraph(area: string, nodes: string[]): string[] {
  const members = areaNodes(nodes, area);
  if (members.length === 0) {
    return [];
  }
  return [
    `  subgraph ${area}_area["${area}"]`,
    ...members.map(nodeLine),
    "  end",
  ];
}

function topLevelNodes(nodes: string[]): string[] {
  return nodes.filter(
    (group) => !inArea(group, "gui") && !inArea(group, "services"),
  );
}

function compareCodeUnits(left: string, right: string): number {
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
}

function mermaidOf(graph: Graph): string {
  const nodes = [...graph.nodes].sort(compareCodeUnits);
  const edges = [...graph.edges].sort(compareCodeUnits);
  return [
    "flowchart LR",
    ...subgraph("gui", nodes),
    ...subgraph("services", nodes),
    ...topLevelNodes(nodes).map((group) => `  ${nodeId(group)}["${group}"]`),
    ...edges.map((edge) => {
      const [from, to] = edge.split("\t");
      return `  ${nodeId(from ?? "")} --> ${nodeId(to ?? "")}`;
    }),
  ].join("\n");
}

function writeDocument(mermaid: string): void {
  const document = `# Architecture

> This document is generated from source code. Do not edit manually.
> Run \`pnpm run depcruise:graph\` to regenerate.

\`\`\`mermaid
${mermaid}
\`\`\`
`;
  mkdirSync(dirname(outputDocument), { recursive: true });
  writeFileSync(outputDocument, document);
}

writeDocument(mermaidOf(buildGraph(readReport())));
