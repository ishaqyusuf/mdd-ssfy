import { describe, expect, it } from "bun:test";
import { hasContractorAccountingReportTrigger } from "./contractor-accounting-report-trigger";

describe("contractor accounting report trigger", () => {
	it("stays hidden for the unfiltered workspace", () => {
		expect(hasContractorAccountingReportTrigger(false)).toBe(false);
	});

	it("appears when the standard search filter has an active value", () => {
		expect(hasContractorAccountingReportTrigger(true)).toBe(true);
	});
});
