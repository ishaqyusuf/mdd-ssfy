import { describe, expect, it } from "bun:test";
import { getSalesNeedsActionLabel } from "./sales-handoff-actions-alert-model";

describe("sales handoff compact alert label", () => {
	it("uses exact singular and plural sales wording", () => {
		expect(getSalesNeedsActionLabel(1)).toBe("1 paid sale needs action.");
		expect(getSalesNeedsActionLabel(36)).toBe("36 paid sales need action.");
	});

	it("normalizes unsafe display counts", () => {
		expect(getSalesNeedsActionLabel(-2)).toBe("0 paid sales need action.");
		expect(getSalesNeedsActionLabel(4.9)).toBe("4 paid sales need action.");
	});
});
