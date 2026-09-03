import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

import { QUERY_EVENTS } from "@/lib/query-events/registry";

const apiSource = readFileSync(
	new URL("../../../../api/src/trpc/routers/sales.route.ts", import.meta.url),
	"utf8",
);
const salesProductionSource = readFileSync(
	new URL(
		"../../../../../packages/sales/src/sales-production.ts",
		import.meta.url,
	),
	"utf8",
);
const reviewQuerySource = readFileSync(
	new URL(
		"../../../../../packages/sales/src/production-submission-review/queries.ts",
		import.meta.url,
	),
	"utf8",
);
const workerSurfaceSource = readFileSync(
	new URL("../production-workspace.tsx", import.meta.url),
	"utf8",
);
const salesOverviewSource = readFileSync(
	new URL(
		"../sheets/sales-overview-sheet/production/v2/production-tab-v2.tsx",
		import.meta.url,
	),
	"utf8",
);

describe("production worker canonical parity", () => {
	it("keeps every worker read scoped to the authenticated employee", () => {
		for (const marker of [
			"input.workerId = props.ctx.userId",
			"workerId: props.ctx.userId",
			"assignedToId: props.ctx.userId",
		] as const) {
			expect(apiSource.includes(marker)).toBe(true);
		}
	});

	it("refreshes worker queue, dashboard, detail, and Calendar without reload", () => {
		const routes = QUERY_EVENTS["sales.pipeline.changed"].targets.map(
			(target) => target.route,
		);
		for (const route of [
			"sales.productionTasks",
			"sales.productionDashboardV2",
			"sales.productionCalendarTasks",
			"sales.productionOverview",
		] as const) {
			expect(routes.includes(route)).toBe(true);
		}
	});

	it("shares one actionable-review count and exact-evidence seam", () => {
		expect(
			salesProductionSource.includes(
				"countActionableProductionSubmissionMaterialReviews(db)",
			),
		).toBe(true);
		expect(reviewQuerySource.includes("getActionablePendingReviewIds")).toBe(
			true,
		);
		expect(
			reviewQuerySource.includes("classifyProductionMaterialReviewActionability"),
		).toBe(true);
		expect(workerSurfaceSource.includes("ProductionMaterialReviewPanel")).toBe(
			true,
		);
		expect(salesOverviewSource.includes("ProductionMaterialReviewPanel")).toBe(
			true,
		);
	});
});
