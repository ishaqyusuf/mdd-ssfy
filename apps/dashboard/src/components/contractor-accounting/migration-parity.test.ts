import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const header = readFileSync(new URL("./header.tsx", import.meta.url), "utf8");
const workspace = readFileSync(
	new URL("../contractor-accounting-page.tsx", import.meta.url),
	"utf8",
);
const payables = readFileSync(
	new URL("./payables.tsx", import.meta.url),
	"utf8",
);
const tabs = readFileSync(new URL("./tabs.ts", import.meta.url), "utf8");

describe("contractor accounting Midday migration parity", () => {
	test("renders product tabs in their own block above search and actions", () => {
		expect(header.indexOf("<PageTabs")).toBeLessThan(
			header.indexOf("<SearchFilterTRPC"),
		);
		expect(header).toContain("pageTabs={null}");
		expect(header).toContain("toolbarActions={");
	});

	test("keeps all four accounting workspaces URL-owned", () => {
		for (const tab of ["ledger", "payables", "review", "resolution"]) {
			expect(tabs).toContain(`tab: "${tab}"`);
		}
		expect(workspace).toContain('params.tab === "payables"');
		expect(workspace).toContain('params.tab === "review"');
		expect(workspace).toContain('params.tab === "resolution"');
	});

	test("hands payable contractors to the existing Payment Portal", () => {
		expect(payables).toContain(
			"/contractors/jobs/payment-portal?contractorId=",
		);
		expect(payables).toContain("createPayoutRun");
		expect(payables).not.toContain("createPaymentPortal");
	});
});
