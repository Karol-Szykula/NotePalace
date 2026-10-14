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
const subgraphAreas = ["gui", "services"];

function groupOf(source: string): string {
  const segments = source.replace(/^src\//, "").split("/");
  const [first, second] = segments;
  if (segments.length > 2 && subgraphAreas.includes(first ?? "")) {
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

function srcDependencies(module: DependencyCruiserModule): string[] {
  return (module.dependencies ?? [])
    .map((dependency) => dependency.resolved)
    .filter(
      (resolved): resolved is string => resolved?.startsWith("src/") === true,
    );
}

function edgeKey(from: string, to: string): string {
  return `${from}\t${to}`;
}

function buildGraph(report: DependencyCruiserReport): Graph {
  const nodes = new Set<string>();
  const edges = new Set<string>();
  for (const module of report.modules) {
    const from = groupOf(module.source);
    nodes.add(from);
    addEdgeTargets(module, from, nodes, edges);
  }
  return { edges, nodes };
}

function addEdgeTargets(
  module: DependencyCruiserModule,
  from: string,
  nodes: Set<string>,
  edges: Set<string>,
): void {
  for (const resolved of srcDependencies(module)) {
    const to = groupOf(resolved);
    nodes.add(to);
    if (from !== to) {
      edges.add(edgeKey(from, to));
    }
  }
}

function nodeId(group: string): string {
  return group.replace(/[^A-Za-z0-9]/g, "_");
}

function nodeDeclaration(group: string, indent: string): string {
  return `${indent}${nodeId(group)}["${group}"]`;
}

function inArea(group: string, area: string): boolean {
  return group === area || group.startsWith(`${area}/`);
}

function subgraphBlock(area: string, nodes: string[]): string[] {
  const members = nodes.filter((group) => inArea(group, area));
  if (members.length === 0) {
    return [];
  }
  return [
    `  subgraph ${area}_area["${area}"]`,
    ...members.map((group) => nodeDeclaration(group, "    ")),
    "  end",
  ];
}

function topLevelNodes(nodes: string[]): string[] {
  return nodes.filter(
    (group) => !subgraphAreas.some((area) => inArea(group, area)),
  );
}

function compareCodeUnits(left: string, right: string): number {
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
}

function edgeDeclaration(edge: string): string {
  const [from, to] = edge.split("\t");
  return `  ${nodeId(from ?? "")} --> ${nodeId(to ?? "")}`;
}

function mermaidOf(graph: Graph): string {
  const nodes = [...graph.nodes].sort(compareCodeUnits);
  const edges = [...graph.edges].sort(compareCodeUnits);
  return [
    "flowchart LR",
    ...subgraphAreas.flatMap((area) => subgraphBlock(area, nodes)),
    ...topLevelNodes(nodes).map((group) => nodeDeclaration(group, "  ")),
    ...edges.map(edgeDeclaration),
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
