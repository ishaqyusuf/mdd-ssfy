import { expect, it } from "bun:test";
import { scheduleMoveLockLabel } from "./lock-reason";

it("describes mixed completed work without calling the whole group completed", () => {
  expect(scheduleMoveLockLabel("PRODUCTION_GROUP_COMPLETED")).toBe("This group contains completed production work and cannot be moved together.");
  expect(scheduleMoveLockLabel("WORKER_CALENDAR_READ_ONLY")).toBe("Worker calendars are read-only.");
  expect(scheduleMoveLockLabel(null)).toBe("Schedule locked");
});
