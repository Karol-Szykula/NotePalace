/**
 * @jest-environment jsdom
 *
 * User-perspective tests for the shared notes table's per-page controls.
 */
import "obsidian-test-mocks/jest-setup";
import { useState, type JSX } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  NotesTable,
  type NotesTableProps,
} from "src/gui/note-transfer-wizard/shared/components/NotesTable";
import { syncDecisionFor } from "src/services/notes/decision-table";
import type { ForceStrategy } from "src/gui/note-transfer-wizard/shared/types/forceStrategy";
import type { NoteLifecycleStatus } from "src/services/notes/lifecycle";

const forceableStatuses: readonly NoteLifecycleStatus[] = [
  "synced.diverged",
  "synced.vaultNewer",
];

const forceStrategy: ForceStrategy = {
  appliesToStatus: (status) => forceableStatuses.includes(status),
  getForcedOutcome: () => "Forced outcome",
};

interface HarnessProps {
  readonly initialSelected?: Record<number, boolean>;
  readonly items: readonly number[];
  readonly getDefaultSelected?: (item: number) => boolean;
  readonly getStatus?: (item: number) => NoteLifecycleStatus;
  readonly isSelectionLocked?: (item: number) => boolean | undefined;
  readonly pageSize: number;
}

function renderTable({
  items,
  initialSelected = {},
  getDefaultSelected = () => true,
  getStatus = () => "synced.diverged",
  isSelectionLocked,
  pageSize,
}: HarnessProps): void {
  function Harness(): JSX.Element {
    const [selected, setSelected] =
      useState<Record<number, boolean>>(initialSelected);
    const [forced, setForced] = useState<Record<number, boolean>>({});
    const notesTableProps: NotesTableProps<number> = {
      columns: [
        {
          header: "Note",
          render: (item) => <span>{`Note ${item}`}</span>,
          width: "1fr",
        },
      ],
      currentPage: 0,
      forcedNoteIds: forced,
      forceStrategy,
      getDefaultSelected,
      getNoteId: (item) => item,
      getRow: () => syncDecisionFor("import", "synced.diverged"),
      getRowAriaLabel: (item) => `Select note ${item}`,
      getRowDetails: (item) => ({ rationale: `Rationale ${item}` }),
      getRowTitle: (item) => `Note ${item}`,
      getStatus,
      isResurrectable: () => false,
      items: items as number[],
      notesSelectedToImport: selected,
      onForceChange: (nextForced, nextSelected) => {
        setForced(nextForced);
        setSelected(nextSelected);
      },
      onSelectionChange: (next) => setSelected(next),
      pageSize,
      ...(isSelectionLocked !== undefined ? { isSelectionLocked } : {}),
    };
    return <NotesTable {...notesTableProps} />;
  }
  render(<Harness />);
}

async function clickRowToggle(name: string): Promise<void> {
  await userEvent.click(screen.getByRole("button", { name }));
}

describe("NotesTable", () => {
  test("given more items than one page when rendered then it shows no pagination of its own", () => {
    // given
    const items = [1, 2, 3];
    const pageSize = 1;

    // when
    renderTable({ items, pageSize });

    // then
    expect(
      screen.queryByRole("button", { name: /Prev|Next/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/\d+ \/ \d+/)).not.toBeInTheDocument();
  });

  test("given more items than one page when rendered then only the current page is listed", () => {
    // given
    const items = [1, 2, 3];
    const pageSize = 1;

    // when
    renderTable({ items, pageSize });

    // then
    expect(screen.getByText("Note 1")).toBeInTheDocument();
    expect(screen.queryByText("Note 2")).not.toBeInTheDocument();
  });

  test("given selectable rows when the header checkbox is clicked then every row on the page is selected", async () => {
    // given
    const items = [1, 2];
    const pageSize = 2;
    const initialSelected = { 1: false, 2: false };

    // when
    renderTable({ items, pageSize, initialSelected });
    await userEvent.click(
      screen.getByRole("checkbox", { name: "Select all notes on this page" }),
    );

    // then
    expect(
      screen.getByRole("checkbox", { name: "Select note 1" }),
    ).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Select note 2" }),
    ).toBeChecked();
  });

  test("given a non-preselected row when the header checkbox is clicked then the row stays untouched", async () => {
    // given
    const items = [1, 2];
    const pageSize = 2;
    const initialSelected = { 1: false, 2: false };

    // when
    renderTable({
      items,
      pageSize,
      initialSelected,
      getDefaultSelected: (item) => item === 1,
    });
    await userEvent.click(
      screen.getByRole("checkbox", { name: "Select all notes on this page" }),
    );

    // then
    expect(
      screen.getByRole("checkbox", { name: "Select note 2" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("checkbox", { name: "Select note 2" }),
    ).not.toBeChecked();
  });

  test("given forceable rows when the header switch is clicked on then every row is forced and selected", async () => {
    // given
    const items = [1, 2];
    const pageSize = 2;

    // when
    renderTable({ items, pageSize });
    await userEvent.click(
      screen.getByRole("switch", { name: "Force all notes on this page" }),
    );

    // then
    expect(
      screen.getByRole("switch", { name: "Force all notes on this page" }),
    ).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByRole("checkbox", { name: "Select note 1" }),
    ).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Select note 2" }),
    ).toBeChecked();
  });

  test("given forced rows when the header switch is clicked off then the force clears and the default selection returns", async () => {
    // given
    const items = [1, 2];
    const pageSize = 2;

    // when
    renderTable({ items, pageSize });
    const headerSwitch = screen.getByRole("switch", {
      name: "Force all notes on this page",
    });
    await userEvent.click(headerSwitch);
    await userEvent.click(headerSwitch);

    // then
    expect(
      screen.getByRole("switch", { name: "Force all notes on this page" }),
    ).not.toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByRole("checkbox", { name: "Select note 1" }),
    ).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Select note 2" }),
    ).toBeChecked();
  });

  test("given an out-of-scope row when rendered then it has no force switch of its own", () => {
    // given
    const items = [3];
    const pageSize = 1;

    // when
    renderTable({ items, pageSize, getStatus: () => "synced.clean" });

    // then
    expect(
      screen.queryByRole("switch", { name: "Forced outcome" }),
    ).not.toBeInTheDocument();
  });

  test("given a locked row when rendered then its select box is disabled and checked", () => {
    // given
    const items = [1];
    const pageSize = 1;

    // when
    renderTable({
      items,
      pageSize,
      isSelectionLocked: (item) => (item === 1 ? true : undefined),
    });

    // then
    const rowCheckbox = screen.getByRole("checkbox", {
      name: "Select note 1",
    });
    expect(rowCheckbox).toBeDisabled();
    expect(rowCheckbox).toBeChecked();
  });

  test("given rows when the toolbar button is clicked then every row on the page is expanded", async () => {
    // given
    const items = [1, 2];
    const pageSize = 2;

    // when
    renderTable({ items, pageSize });
    await clickRowToggle("Expand all");

    // then
    expect(screen.getByText("Rationale 1")).toBeInTheDocument();
    expect(screen.getByText("Rationale 2")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Collapse all" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  test("given expanded rows when the toolbar button is clicked again then every row collapses", async () => {
    // given
    const items = [1, 2];
    const pageSize = 2;

    // when
    renderTable({ items, pageSize });
    await clickRowToggle("Expand all");
    await clickRowToggle("Collapse all");

    // then
    expect(screen.queryByText("Rationale 1")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Expand all" }),
    ).toBeInTheDocument();
  });

  test("given rows when a chevron is clicked then only that row expands", async () => {
    // given
    const items = [1, 2];
    const pageSize = 2;

    // when
    renderTable({ items, pageSize });
    await clickRowToggle("Expand Note 1");

    // then
    expect(
      screen.getByRole("gridcell", { name: "Note 1" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Rationale 1")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Collapse Note 1" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(screen.queryByText("Rationale 2")).not.toBeInTheDocument();
  });
});
