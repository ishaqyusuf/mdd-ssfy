import { describe, expect, it } from "bun:test";
import { runBoundedPostSaveTask } from "./new-sales-form";

describe("runBoundedPostSaveTask", () => {
  it("returns null when a task does not settle before the timeout", async () => {
    const errors = await captureConsoleErrors(async () => {
      const startedAt = performance.now();
      const result = await runBoundedPostSaveTask(
        "never-resolves",
        () => new Promise<never>(() => {}),
        15,
      );

      expect(result).toBeNull();
      expect(performance.now() - startedAt).toBeLessThan(250);
    });

    expect(String(errors[0]?.[0] || "")).toContain(
      "Timed out post-save task: never-resolves",
    );
  });

  it("returns null when a task rejects", async () => {
    const errors = await captureConsoleErrors(async () => {
      const result = await runBoundedPostSaveTask(
        "rejects",
        () => Promise.reject(new Error("queue offline")),
        100,
      );

      expect(result).toBeNull();
    });

    expect(String(errors[0]?.[0] || "")).toContain(
      "Unable to complete post-save task: rejects",
    );
    expect(errors[0]?.[1]).toBeInstanceOf(Error);
  });

  it("returns the task result when it resolves before the timeout", async () => {
    const errors = await captureConsoleErrors(async () => {
      const result = await runBoundedPostSaveTask(
        "resolves",
        () => Promise.resolve({ ok: true }),
        100,
      );

      expect(result).toEqual({ ok: true });
    });

    expect(errors).toHaveLength(0);
  });
});

async function captureConsoleErrors(run: () => Promise<void>) {
  const original = console.error;
  const errors: unknown[][] = [];
  console.error = (...args: unknown[]) => {
    errors.push(args);
  };

  try {
    await run();
    return errors;
  } finally {
    console.error = original;
  }
}
