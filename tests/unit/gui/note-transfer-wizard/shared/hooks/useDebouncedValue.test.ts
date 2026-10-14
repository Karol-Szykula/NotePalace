/**
 * @jest-environment jsdom
 *
 * Contract: useDebouncedValue returns the previous value until the delay has
 * elapsed without a newer value, then returns the latest value.
 */
import { act, renderHook } from "@testing-library/react";
import {
  searchDebounceMs,
  useDebouncedValue,
} from "src/gui/note-transfer-wizard/shared/hooks/useDebouncedValue";

describe("useDebouncedValue", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("given a new value when the delay elapses then it returns the new value", () => {
    // given
    const delayMs = 250;
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, delayMs),
      { initialProps: { value: "a" } },
    );

    // when
    rerender({ value: "ab" });
    act(() => {
      jest.advanceTimersByTime(delayMs);
    });

    // then
    expect(result.current).toBe("ab");
  });

  test("given a new value when the delay has not elapsed then it keeps the old value", () => {
    // given
    const delayMs = 250;
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, delayMs),
      { initialProps: { value: "a" } },
    );

    // when
    rerender({ value: "ab" });
    act(() => {
      jest.advanceTimersByTime(delayMs - 1);
    });

    // then
    expect(result.current).toBe("a");
  });

  test("given rapid changes when they settle then it returns only the last value", () => {
    // given
    const delayMs = 250;
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, delayMs),
      { initialProps: { value: "a" } },
    );

    // when
    rerender({ value: "ab" });
    rerender({ value: "abc" });
    act(() => {
      jest.advanceTimersByTime(delayMs);
    });

    // then
    expect(result.current).toBe("abc");
  });

  test("given no explicit delay when the default elapses then it uses the search delay", () => {
    // given
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value),
      { initialProps: { value: "a" } },
    );

    // when
    rerender({ value: "ab" });
    act(() => {
      jest.advanceTimersByTime(searchDebounceMs);
    });

    // then
    expect(result.current).toBe("ab");
  });
});
