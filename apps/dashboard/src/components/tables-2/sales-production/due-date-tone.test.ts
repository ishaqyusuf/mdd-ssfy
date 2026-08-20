import { describe, expect, it } from "bun:test";

import { getSalesProductionDueDateClassName } from "./due-date-tone";

const today = "2026-08-20";

describe("getSalesProductionDueDateClassName", () => {
	it("uses red for past-due and due-today incomplete work", () => {
		expect(getSalesProductionDueDateClassName("2026-08-19", false, today)).toBe(
			"text-destructive",
		);
		expect(getSalesProductionDueDateClassName("2026-08-20", false, today)).toBe(
			"text-destructive",
		);
	});

	it("uses yellow for incomplete work due within the next seven days", () => {
		expect(getSalesProductionDueDateClassName("2026-08-21", false, today)).toBe(
			"text-amber-600 dark:text-amber-400",
		);
		expect(getSalesProductionDueDateClassName("2026-08-27", false, today)).toBe(
			"text-amber-600 dark:text-amber-400",
		);
	});

	it("keeps completed, distant, invalid, and missing dates neutral", () => {
		expect(
			getSalesProductionDueDateClassName("2026-08-20", true, today),
		).toBeNull();
		expect(
			getSalesProductionDueDateClassName("2026-08-28", false, today),
		).toBeNull();
		expect(
			getSalesProductionDueDateClassName("not-a-date", false, today),
		).toBeNull();
		expect(getSalesProductionDueDateClassName(null, false, today)).toBeNull();
	});
});
