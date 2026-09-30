import { describe, expect, test } from "bun:test";
import { resolveLegacySalesOverviewActiveTab } from "./tab-navigation";

describe("Sales Overview available tab navigation", () => {
	test("falls back from an empty disabled Production tab to General", () => {
		expect(
			resolveLegacySalesOverviewActiveTab({
				currentTab: "production",
				tabs: [
					{ value: "general", label: "General" },
					{ value: "production", label: "Productions", disabled: true },
				],
			}),
		).toBe("general");
	});
	test("keeps restricted views within their available tabs", () => {
		expect(
			resolveLegacySalesOverviewActiveTab({
				currentTab: "production",
				tabs: [
					{ value: "production", label: "Productions", disabled: true },
					{ value: "production-notes", label: "Notes" },
				],
			}),
		).toBe("production-notes");
	});
	test("allows empty Transactions and Dispatch", () => {
		for (const currentTab of ["transactions", "dispatch"]) {
			expect(
				resolveLegacySalesOverviewActiveTab({
					currentTab,
					tabs: [
						{ value: "general", label: "General" },
						{ value: "transactions", label: "Transactions" },
						{ value: "dispatch", label: "Dispatch" },
					],
				}),
			).toBe(currentTab);
		}
	});
});
