import { mkdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

interface Diagram {
  heading: string;
  output: string;
}

const sourceDocument = "docs/state-machine.md";
const diagramDirectory = "docs/diagrams";
const cacheDirectory = join("node_modules", ".cache", "note-palace-diagrams");
const cacheBase = join(cacheDirectory, "state-machine.svg");
const mmdcBinary = join("node_modules", ".bin", "mmdc");

const expectedDiagrams: Diagram[] = [
  { heading: "State Machine Topology", output: "state-machine-topology.svg" },
  { heading: "Export Wizard", output: "decision-table-export.svg" },
  { heading: "Import Wizard", output: "decision-table-import.svg" },
  { heading: "Sync Command", output: "decision-table-sync.svg" },
];

function isHeading(line: string): boolean {
  return line.startsWith("#");
}

function opensMermaidFence(line: string): boolean {
  return line.trim() === "```mermaid";
}

function headingsOfMermaidBlocks(lines: string[]): string[] {
  const headings: string[] = [];
  let currentHeading = "";
  for (const line of lines) {
    if (isHeading(line)) {
      currentHeading = line;
    } else if (opensMermaidFence(line)) {
      headings.push(currentHeading);
    }
  }
  return headings;
}

function diagramMismatch(headings: string[]): string | undefined {
  if (headings.length !== expectedDiagrams.length) {
    return `expected ${expectedDiagrams.length} mermaid diagrams in ${sourceDocument}, found ${headings.length}`;
  }
  const wrongIndex = expectedDiagrams.findIndex(
    ({ heading }, index) => headings[index]?.includes(heading) !== true,
  );
  if (wrongIndex === -1) {
    return undefined;
  }
  const expected = expectedDiagrams[wrongIndex]?.heading ?? "";
  return `diagram ${wrongIndex + 1} should live under "${expected}" but its heading is "${headings[wrongIndex] ?? ""}"`;
}

function assertExpectedDiagramSet(headings: string[]): void {
  const mismatch = diagramMismatch(headings);
  if (mismatch !== undefined) {
    throw new Error(mismatch);
  }
}

function renderToCache(): void {
  rmSync(cacheDirectory, { force: true, recursive: true });
  mkdirSync(cacheDirectory, { recursive: true });
  const render = spawnSync(
    mmdcBinary,
    ["-i", sourceDocument, "-o", cacheBase],
    {
      stdio: "inherit",
    },
  );
  if (render.status !== 0) {
    throw new Error(`mmdc failed with exit code ${String(render.status)}`);
  }
}

function cachedDiagramPath(index: number): string {
  return join(cacheDirectory, `state-machine-${index + 1}.svg`);
}

function publishNamedDiagrams(): void {
  mkdirSync(diagramDirectory, { recursive: true });
  expectedDiagrams.forEach((diagram, index) => {
    renameSync(
      cachedDiagramPath(index),
      join(diagramDirectory, diagram.output),
    );
  });
}

const lines = readFileSync(sourceDocument, "utf8").split("\n");
assertExpectedDiagramSet(headingsOfMermaidBlocks(lines));
renderToCache();
publishNamedDiagrams();
