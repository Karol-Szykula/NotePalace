/**
 * @jest-environment jsdom
 *
 * User-perspective tests for the shared notes table's toolbar search, the
 * no-match empty state and full-list counts.
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

const searchLabel = "Search notes";

const forceStrategy: ForceStrategy = {
  appliesToStatus: () => false,
  getForcedOutcome: () => "Forced outcome",
};

const tableProps = {
  columns: [
    {
      header: "Note",
      render: (item: number) => <span>{`Note ${item}`}</span>,
      width: "1fr",
    },
  ],
  countText: (selectedCount: number, total: number) =>
    `${selectedCount} of ${total} selected`,
  currentPage: 0,
  forceStrategy,
  getDefaultSelected: () => true,
  getNoteId: (item: number) => item,
  getRow: () => syncDecisionFor("import", "synced.diverged"),
  getRowAriaLabel: (item: number) => `Select note ${item}`,
  getRowDetails: (item: number) => ({ rationale: `Rationale ${item}` }),
  getRowTitle: (item: number) => `Note ${item}`,
  getStatus: () => "synced.diverged",
  isResurrectable: () => false,
} satisfies Partial<NotesTableProps<number>>;

interface HarnessProps {
  readonly allItems: readonly number[];
  readonly emptyMatchText?: string;
  readonly initialQuery?: string;
  readonly initialSelected?: Record<number, boolean>;
  readonly items: readonly number[];
  readonly onClear?: () => void;
  readonly pageSize: number;
  readonly withSearch?: boolean;
}

function Harness({
  allItems,
  emptyMatchText,
  initialQuery = "",
  initialSelected = {},
  items,
  onClear,
  pageSize,
  withSearch = false,
}: HarnessProps): JSX.Element {
  const [selected, setSelected] =
    useState<Record<number, boolean>>(initialSelected);
  const [forced, setForced] = useState<Record<number, boolean>>({});
  const [query, setQuery] = useState(initialQuery);

  const search = withSearch
    ? {
        label: searchLabel,
        onChange: setQuery,
        onClear: () => {
          onClear?.();
          setQuery("");
        },
        value: query,
      }
    : undefined;

  return (
    <NotesTable
      {...tableProps}
      allItems={[...allItems]}
      emptyMatchText={emptyMatchText}
      forcedNoteIds={forced}
      items={[...items]}
      notesSelectedToImport={selected}
      onForceChange={(nextForced, nextSelected) => {
        setForced(nextForced);
        setSelected(nextSelected);
      }}
      onSelectionChange={setSelected}
      pageSize={pageSize}
      search={search}
    />
  );
}

function renderTable(props: HarnessProps): void {
  render(<Harness {...props} />);
}

describe("NotesTable search", () => {
  test("given a search prop when rendered then the toolbar exposes a labelled search box", () => {
    // given
    const items = [1, 2];

    // when
    renderTable({ allItems: items, items, pageSize: 2, withSearch: true });

    // then
    expect(
      screen.getByRole("textbox", { name: searchLabel }),
    ).toBeInTheDocument();
  });

  test("given no search prop when rendered then the toolbar has no search box", () => {
    // given
    const items = [1, 2];

    // when
    renderTable({ allItems: items, items, pageSize: 2 });

    // then
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  test("given a query typed when the input changes then the search box reflects it", async () => {
    // given
    const items = [1, 2];

    // when
    renderTable({ allItems: items, items, pageSize: 2, withSearch: true });
    await userEvent.type(
      screen.getByRole("textbox", { name: searchLabel }),
      "abc",
    );

    // then
    expect(screen.getByRole("textbox", { name: searchLabel })).toHaveValue(
      "abc",
    );
  });

  test("given a query with no matching rows when rendered then the no-match empty state shows", () => {
    // given
    const items: number[] = [];
    const allItems = [1, 2, 3];
    const emptyMatchText = "No notes match \u201czzz\u201d.";

    // when
    renderTable({
      allItems,
      emptyMatchText,
      initialQuery: "zzz",
      items,
      pageSize: 3,
      withSearch: true,
    });

    // then
    expect(screen.getByText(emptyMatchText)).toBeInTheDocument();
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
  });

  test("given a filtered list when rendered then counts read the full list", () => {
    // given
    const items = [1];
    const allItems = [1, 2, 3];
    const initialSelected = { 1: true, 2: true, 3: true };

    // when
    renderTable({
      allItems,
      initialQuery: "1",
      initialSelected,
      items,
      pageSize: 3,
      withSearch: true,
    });

    // then
    expect(screen.getByText("3 of 3 selected")).toBeInTheDocument();
    expect(screen.queryByText("Note 2")).not.toBeInTheDocument();
  });

  test("given a query hiding selected notes when rendered then the hidden selections stay counted", () => {
    // given
    const items = [1];
    const allItems = [1, 2, 3];
    const initialSelected = { 1: false, 2: true, 3: true };

    // when
    renderTable({
      allItems,
      initialQuery: "1",
      initialSelected,
      items,
      pageSize: 3,
      withSearch: true,
    });

    // then
    expect(screen.getByText("2 of 3 selected")).toBeInTheDocument();
  });

  test("given a query when the clear control is activated then the query clears", async () => {
    // given
    const items = [1];
    const allItems = [1, 2];
    const onClear = jest.fn();

    // when
    renderTable({
      allItems,
      initialQuery: "abc",
      items,
      onClear,
      pageSize: 2,
      withSearch: true,
    });
    await userEvent.click(screen.getByRole("button", { name: "Clear search" }));

    // then
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("textbox", { name: searchLabel })).toHaveValue("");
  });

  test("given a query when Escape is pressed then the query clears", async () => {
    // given
    const items = [1];
    const allItems = [1, 2];
    const onClear = jest.fn();

    // when
    renderTable({
      allItems,
      initialQuery: "abc",
      items,
      onClear,
      pageSize: 2,
      withSearch: true,
    });
    await userEvent.type(
      screen.getByRole("textbox", { name: searchLabel }),
      "{Escape}",
    );

    // then
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
