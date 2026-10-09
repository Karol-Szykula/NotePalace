/**
 * @jest-environment jsdom
 *
 * The reset prompt renders through React, so it needs DOM globals.
 */
import "obsidian-test-mocks/jest-setup";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { t } from "src/i18n";
import { ResetPrompt } from "src/gui/dev/reset-prompt";

describe("ResetPrompt", () => {
  test("given the reset prompt when rendered then it shows what the reset forgets", () => {
    // given
    const onCancel = jest.fn();
    const onConfirm = jest.fn();

    // when
    render(<ResetPrompt onCancel={onCancel} onConfirm={onConfirm} />);

    // then
    expect(screen.getByText(t("dev.resetConfirm"))).toBeInTheDocument();
  });

  test("given the reset prompt when cancel is pressed then nothing is reset", async () => {
    // given
    const onCancel = jest.fn();
    const onConfirm = jest.fn();
    render(<ResetPrompt onCancel={onCancel} onConfirm={onConfirm} />);

    // when
    await userEvent.click(
      screen.getByRole("button", { name: t("dev.cancel") }),
    );

    // then
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  test("given the reset prompt when the reset button is pressed then the reset is confirmed once", async () => {
    // given
    const onCancel = jest.fn();
    const onConfirm = jest.fn();
    render(<ResetPrompt onCancel={onCancel} onConfirm={onConfirm} />);

    // when
    await userEvent.click(
      screen.getByRole("button", { name: t("dev.resetButton") }),
    );

    // then
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });
});
