/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

describe("useDebouncedValue", () => {
  it("updates after the debounce delay", async () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value, delayMs }) => useDebouncedValue(value, delayMs),
      { initialProps: { value: "a", delayMs: 300 } }
    );

    expect(result.current).toBe("a");
    rerender({ value: "ab", delayMs: 300 });
    expect(result.current).toBe("a");

    await act(async () => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe("a");

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe("ab");
    vi.useRealTimers();
  });
});
