import { describe, expect, it } from "bun:test";
import {
	renderContractorAccountingAlertEmail,
	renderContractorAccountingReportReadyEmail,
} from "./contractor-accounting";

describe("contractor accounting email paths", () => {
	it("escapes alert content and preserves the action link", async () => {
		const html = await renderContractorAccountingAlertEmail({
			actionUrl:
				"https://gndprodesk.com/contractors/accounting?manageAlerts=true",
			message: "Review <script>alert('x')</script> before payment.",
			title: "Balance <due>",
		});

		expect(html).toContain("Balance &lt;due&gt;");
		expect(html).toContain("&lt;script&gt;");
		expect(html).not.toContain("<script>alert");
		expect(html).toContain("manageAlerts=true");
		expect(html).toContain("Open contractor accounting alerts");
	});

	it("renders the report details and download link", async () => {
		const html = await renderContractorAccountingReportReadyEmail({
			kind: "PAYABLES_SUMMARY",
			from: "2026-09-01",
			to: "2026-09-24",
			url: "https://gndprodesk.com/contractors/accounting/reports/42",
		});

		expect(html).toContain("PAYABLES SUMMARY");
		expect(html).toContain("2026-09-01");
		expect(html).toContain("through");
		expect(html).toContain("2026-09-24");
		expect(html).toContain("reports/42");
		expect(html).toContain("Download the report");
	});
});
