/**
 * @jest-environment jsdom
 *
 * User-perspective tests for the shared switch: the switch role and its on,
 * off and mixed states, the accessible name, the merged class and the
 * disabled and toggled callbacks.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Switch } from "src/gui/components/Switch";

describe("Switch", () => {
  test("given an off switch when rendered then it reports the off state", () => {
    // given
    const ariaLabel = "Force";

    // when
    render(
      <Switch ariaLabel={ariaLabel} checked={false} onChange={jest.fn()} />,
    );

    // then
    const control = screen.getByRole("switch", { name: ariaLabel });
    expect(control).toHaveAttribute("aria-checked", "false");
  });

  test("given an on switch when rendered then it reports the on state", () => {
    // given
    const ariaLabel = "Force";

    // when
    render(<Switch ariaLabel={ariaLabel} checked onChange={jest.fn()} />);

    // then
    const control = screen.getByRole("switch", { name: ariaLabel });
    expect(control).toHaveAttribute("aria-checked", "true");
  });

  test("given a mixed switch when rendered then it reports the mixed state", () => {
    // given
    const ariaLabel = "Force";

    // when
    render(
      <Switch
        ariaLabel={ariaLabel}
        checked={false}
        indeterminate
        onChange={jest.fn()}
      />,
    );

    // then
    const control = screen.getByRole("switch", { name: ariaLabel });
    expect(control).toHaveAttribute("aria-checked", "mixed");
    expect((control as HTMLInputElement).indeterminate).toBe(true);
  });

  test("given a class name when rendered then it merges over the base class", () => {
    // given
    const className = "extra";

    // when
    render(
      <Switch
        ariaLabel="Force"
        checked={false}
        className={className}
        onChange={jest.fn()}
      />,
    );

    // then
    expect(screen.getByRole("switch", { name: "Force" })).toHaveClass(
      "notepalace-switch",
      className,
    );
  });

  test("given a disabled switch when toggled then it does not call back", async () => {
    // given
    const onChange = jest.fn();

    // when
    render(
      <Switch ariaLabel="Force" checked={false} disabled onChange={onChange} />,
    );
    await userEvent
      .setup()
      .click(screen.getByRole("switch", { name: "Force" }));

    // then
    expect(onChange).not.toHaveBeenCalled();
  });

  test("given an off switch when toggled then it calls back as on", async () => {
    // given
    const onChange = jest.fn();

    // when
    render(<Switch ariaLabel="Force" checked={false} onChange={onChange} />);
    await userEvent
      .setup()
      .click(screen.getByRole("switch", { name: "Force" }));

    // then
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
