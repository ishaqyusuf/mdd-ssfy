import { afterAll, describe, expect, it, setSystemTime } from "bun:test";

import dayjs from "./dayjs";
import { transformFilterDateToQuery } from "./index";

function formatRange(
  range: ReturnType<typeof transformFilterDateToQuery>,
): Record<string, string> | null | undefined {
  if (!range) return range;

  return Object.fromEntries(
    Object.entries(range).map(([key, value]) => [
      key,
      dayjs(value).format("YYYY-MM-DD HH:mm:ss.SSS"),
    ]),
  );
}

describe("transformFilterDateToQuery month presets", () => {
  afterAll(() => {
    setSystemTime();
  });

  it("resolves the last three complete calendar months", () => {
    setSystemTime(new Date(2026, 6, 28, 12));

    expect(formatRange(transformFilterDateToQuery(["last 3 months"]))).toEqual({
      gte: "2026-04-01 00:00:00.000",
      lte: "2026-06-30 23:59:59.999",
    });
  });
});
