import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

import { shouldShowProductionReadiness } from "./production-readiness-visibility";

const contextSource = readFileSync(
	new URL("./context.tsx", import.meta.url),
	"utf8",
);
const bannerSource = readFileSync(
	new URL("./production-readiness-banner.tsx", import.meta.url),
	"utf8",
);

function productionItem({
	assigned = 0,
	production = true,
	submitted = 0,
}: {
	assigned?: number;
	production?: boolean;
	submitted?: number;
} = {}) {
	return {
		itemConfig: { production },
		analytics: {
			stats: {
				prodAssigned: { qty: assigned },
				prodCompleted: { qty: submitted },
			},
		},
	};
}

describe("production readiness notice visibility", () => {
	it("shows readiness only for untouched production work", () => {
		expect(shouldShowProductionReadiness([productionItem()])).toBe(true);
		expect(
			shouldShowProductionReadiness([productionItem({ production: false })]),
		).toBe(false);
		expect(shouldShowProductionReadiness([])).toBe(false);
	});

	it("hides readiness after an assignment exists", () => {
		expect(
			shouldShowProductionReadiness([productionItem({ assigned: 1 })]),
		).toBe(false);
	});

	it("hides readiness after a submission exists, including legacy totals", () => {
		expect(
			shouldShowProductionReadiness([productionItem({ submitted: 1 })]),
		).toBe(false);
		expect(
			shouldShowProductionReadiness([
				{
					itemConfig: { production: true },
					analytics: {
						stats: {
							prodAssigned: { qty: 0, lh: 1, rh: 0 },
							prodCompleted: { qty: 0, lh: 1, rh: 0 },
						},
					},
				},
			]),
		).toBe(false);
	});

	it("ignores activity on non-production lines", () => {
		expect(
			shouldShowProductionReadiness([
				productionItem(),
				productionItem({ assigned: 1, production: false, submitted: 1 }),
			]),
		).toBe(true);
	});

	it("uses the same eligibility for the readiness query and banner", () => {
		expect(
			contextSource.includes("shouldShowProductionReadiness(data?.items)"),
		).toBe(true);
		expect(
			contextSource.includes(
				"enabled: Boolean(data?.orderId && showProductionReadiness)",
			),
		).toBe(true);
		expect(
			bannerSource.includes(
				"if (!production.showProductionReadiness) return null",
			),
		).toBe(true);
	});
});
