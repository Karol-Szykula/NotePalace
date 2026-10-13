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

const expectedDiagrams: Diagram[] = [
  { heading: "State Machine Topology", output: "state-machine-topology.svg" },
  { heading: "Export Wizard", output: "decision-table-export.svg" },
  { heading: "Import Wizard", output: "decision-table-import.svg" },
  { heading: "Sync Command", output: "decision-table-sync.svg" },
];

function headingOfEachMermaidBlock(): string[] {
  const headings: string[] = [];
  let currentHeading = "";
  for (const line of readFileSync(sourceDocument, "utf8").split("\n")) {
    if (line.startsWith("#")) {
      currentHeading = line;
    } else if (line.trim() === "```mermaid") {
      headings.push(currentHeading);
    }
  }
  return headings;
}

function assertExpectedDiagramSet(headings: string[]): void {
  if (headings.length !== expectedDiagrams.length) {
    throw new Error(
      `Expected ${expectedDiagrams.length} mermaid diagrams in ${sourceDocument}, found ${headings.length}`,
    );
  }
  expectedDiagrams.forEach((diagram, index) => {
    if (headings[index]?.includes(diagram.heading) !== true) {
      throw new Error(
        `Diagram ${index + 1} should live under "${diagram.heading}" but its heading is "${headings[index] ?? ""}"`,
      );
    }
  });
}

function renderAllDiagrams(): void {
  rmSync(cacheDirectory, { force: true, recursive: true });
  mkdirSync(cacheDirectory, { recursive: true });
  const render = spawnSync(
    join("node_modules", ".bin", "mmdc"),
    ["-i", sourceDocument, "-o", cacheBase],
    { stdio: "inherit" },
  );
  if (render.status !== 0) {
    throw new Error(`mmdc failed with exit code ${String(render.status)}`);
  }
}

function publishNamedDiagrams(): void {
  mkdirSync(diagramDirectory, { recursive: true });
  expectedDiagrams.forEach((diagram, index) => {
    renameSync(
      join(cacheDirectory, `state-machine-${index + 1}.svg`),
      join(diagramDirectory, diagram.output),
    );
  });
}

assertExpectedDiagramSet(headingOfEachMermaidBlock());
renderAllDiagrams();
publishNamedDiagrams();
