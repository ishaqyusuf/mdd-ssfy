import { describe, expect, test } from "bun:test";
import { resolveSelectedModule, resolveVisibleNavModules } from "@gnd/site-nav";
import { createNavModule } from "@gnd/site-nav/types";

const sales = {
	...createNavModule("Sales", "salesDashboard"),
	activeLinkCount: 2,
	href: "/sales",
};
const community = {
	...createNavModule("Community", "project"),
	activeLinkCount: 2,
	href: "/community",
};

describe("resolveSelectedModule", () => {
	test("keeps an explicit module selection ahead of the active route", () => {
		expect(
			resolveSelectedModule([sales, community], "Community", "Sales")?.name,
		).toBe("Community");
	});

	test("uses the active route module when no selection exists", () => {
		expect(resolveSelectedModule([sales, community], null, "Sales")?.name).toBe(
			"Sales",
		);
	});

	test("falls back to the first available module", () => {
		expect(
			resolveSelectedModule([sales, community], "Inventory", "HRM")?.name,
		).toBe("Sales");
	});
});

describe("resolveVisibleNavModules", () => {
	const shared = {
		...createNavModule("", "settings"),
		activeLinkCount: 2,
	};

	test("keeps unnamed module links below the selected named module", () => {
		expect(
			resolveVisibleNavModules(
				[sales, community, shared],
				"Community",
				"Sales",
			).map((module) => module.name),
		).toEqual(["Community", ""]);
	});

	test("keeps unnamed modules when no named module is available", () => {
		expect(resolveVisibleNavModules([shared], null, null)).toEqual([shared]);
	});
});
