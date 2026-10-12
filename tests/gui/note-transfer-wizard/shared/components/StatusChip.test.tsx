/**
 * @jest-environment jsdom
 *
 * Tests for the shared status chip: it names the outcome kind, keeps the
 * full rationale in its accessible name and tooltip, and marks missing notes
 * as danger.
 */
import "obsidian-test-mocks/jest-setup";
import { render, screen } from "@testing-library/react";
import { StatusChip } from "src/gui/note-transfer-wizard/shared/components/StatusChip";
import { chipClasses } from "@shared/classes/common";

describe("StatusChip", () => {
  test("given a create outcome when rendered then it shows the outcome name", () => {
    // given
    render(
      <StatusChip kind="create" label="Create" tooltip="It creates a file." />,
    );

    // when
    const chip = screen.getByRole("group", { name: "It creates a file." });

    // then
    expect(chip).toHaveTextContent("Create");
  });

  test("given a chip when rendered then its title carries the full rationale", () => {
    // given
    const tooltip = "Newer in Anki: skipped, use Sync.";

    // when
    render(<StatusChip kind="skip" label="Skip" tooltip={tooltip} />);

    // then
    expect(screen.getByRole("group", { name: tooltip })).toHaveAttribute(
      "title",
      tooltip,
    );
  });

  test("given a missing outcome when rendered then it carries the danger modifier", () => {
    // given
    render(
      <StatusChip kind="missing" label="Missing" tooltip="Deleted in Anki." />,
    );

    // when
    const chip = screen.getByRole("group", { name: "Deleted in Anki." });

    // then
    expect(chip).toHaveClass(chipClasses.chipDanger);
  });

  test("given an up-to-date outcome when rendered then its icon renders", () => {
    // given
    render(
      <StatusChip
        kind="quiet"
        label="Up to date"
        tooltip="Both sides match."
      />,
    );

    // when
    const icon = document.querySelector(`.${chipClasses.chipIcon}`);

    // then
    expect(icon).not.toBeNull();
    expect(
      document.querySelector(`.${chipClasses.chipIcon} svg`),
    ).not.toBeNull();
  });
});
