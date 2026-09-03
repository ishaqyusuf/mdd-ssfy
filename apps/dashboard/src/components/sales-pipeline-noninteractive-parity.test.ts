import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

function source(path: string) {
	return readFileSync(new URL(path, import.meta.url), "utf8");
}

const ordersQuery = source("../../../api/src/db/queries/sales-orders-v2.ts");
const dashboardQuery = source("../../../api/src/db/queries/sales-dashboard.ts");
const ordersTable = source("./tables-2/sales-orders/data-table.tsx");
const ordersExport = source("./sales-orders-export.ts");
const materialNotification = source(
	"../../../../packages/jobs/src/tasks/sales/update-sales-control.ts",
);

describe("Sales Pipeline non-interactive consumer parity", () => {
	it("uses one canonical membership scope for list, count, summary, saved filters, and export", () => {
		expect(
			ordersQuery.match(/applyCanonicalLifecycleFilterWhere\(/g)?.length,
		).toBeGreaterThanOrEqual(4);
		expect(ordersTable).toContain("useSalesOrdersV2FilterParams()");
		expect(ordersTable).toContain("trpc.sales.getOrders.infiniteQueryOptions");
		expect(ordersExport).toContain(
			'type SalesOrdersInput = NonNullable<RouterInputs["sales"]["getOrders"]>',
		);
		expect(ordersExport).toContain("Status: textOrFallback(order.statusLabel");
		expect(ordersExport).toContain("...baseFilters");
	});

	it("derives dashboard analytics from canonical snapshots when selected", () => {
		expect(dashboardQuery).toContain("getSalesPipelineSnapshots(");
		expect(dashboardQuery).toContain("observeSalesPipelineReadProjection(");
		expect(dashboardQuery).toContain('surface: "sales.dashboard.lifecycle"');
		expect(dashboardQuery).toContain("snapshot.production.state");
		expect(dashboardQuery).toContain("snapshot.fulfillment.state");
	});

	it("gates review notifications on current actionability and carries revision provenance", () => {
		expect(materialNotification).toContain("getActionablePendingReviewIds(db");
		expect(materialNotification).toContain("if (!currentActionability) return");
		expect(materialNotification).toContain(
			"classification: currentActionability.actionability.classification",
		);
		expect(materialNotification).toContain(
			"classificationVersion: currentActionability.actionability.version",
		);
		expect(materialNotification).toContain(
			"evidenceRevision: review.materialRevision",
		);
	});
});
