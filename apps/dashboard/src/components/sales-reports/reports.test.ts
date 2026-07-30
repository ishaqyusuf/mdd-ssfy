import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./reports.tsx", import.meta.url), "utf8");
const workspace = readFileSync(
	new URL("./workspace.tsx", import.meta.url),
	"utf8",
);

describe("Sales Reports export menu", () => {
	it("offers every governed sales-performance workbook", () => {
		for (const type of [
			"performance-summary",
			"orders-ledger",
			"sales-reps",
			"products",
			"quote-activity",
			"customers",
		]) {
			expect(source).toContain(`type: "${type}"`);
		}
	});

	it("uses the active period and the dedicated permission", () => {
		expect(source).toContain("params.from");
		expect(source).toContain("params.to");
		expect(source).toContain("params.salesRepIds");
		expect(source).toContain("params.salesChannels");
		expect(source).toContain("generateSalesPerformanceReport");
	});

	it("keeps finance-owned reports in Sales Finance", () => {
		expect(source).toContain('href="/sales-book/finance"');
		expect(source).not.toContain('type: "payments"');
		expect(source).not.toContain('type: "receivables-aging"');
	});

	it("mounts the report menu in the Sales Reports header", () => {
		expect(workspace).toContain("actions={<SalesPerformanceReports />}");
	});
});
