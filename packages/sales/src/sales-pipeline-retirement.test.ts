import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "../../..");
const read = (path: string) => readFileSync(join(repoRoot, path), "utf8");

const canonicalConsumerFiles = [
	"apps/api/src/db/queries/dealer-portal-orders.ts",
	"apps/api/src/db/queries/dispatch-order-presentation.ts",
	"apps/api/src/db/queries/dispatch.ts",
	"apps/api/src/db/queries/sales-dashboard.ts",
	"apps/api/src/db/queries/sales-orders-v2.ts",
	"apps/api/src/db/queries/sales-overview-general-v2.ts",
	"apps/api/src/db/queries/sales.ts",
	"apps/api/src/db/queries/storefront-account.ts",
	"apps/api/src/filters/dealership-orders-filter.ts",
	"packages/sales/src/order-list-projection-builder.ts",
	"packages/sales/src/production-v2/application/get-production-order-detail-v2.ts",
	"packages/sales/src/sales-production.ts",
	"packages/sales/src/sales-production-planning-calendar.ts",
	"packages/sales/src/production-calendar-presentation.ts",
] as const;

const canonicalCommandFiles = [
	"apps/api/src/db/queries/dispatch.ts",
	"apps/api/src/trpc/routers/dispatch.route.ts",
	"apps/api/src/trpc/routers/sales.route.ts",
	"apps/dashboard/src/actions/batch-assign-production-orders.ts",
	"apps/dashboard/src/actions/batch-edit-production-orders.ts",
	"packages/jobs/src/tasks/sales/bulk-mark-sales-fulfilled.ts",
	"packages/jobs/src/tasks/sales/bulk-mark-sales-production-completed.ts",
	"packages/jobs/src/tasks/sales/update-sales-control.ts",
	"packages/sales/src/sales-completion.ts",
] as const;

const approvedLegacyOperationalAdapters = [
	"apps/api/src/db/queries/inbound-receiving.ts",
	"apps/api/src/db/queries/stock-allocation-review.ts",
	"packages/sales/src/inventory-fulfillment-policy.ts",
	"packages/sales/src/manual-fulfill-sales-inventory-needs.ts",
	"packages/sales/src/production-readiness-override.ts",
	"packages/sales/src/sales-completion.ts",
	"packages/sales/src/sales-inventory-mark-as-preflight.ts",
	"packages/sales/src/sales-inventory-overview.ts",
	"packages/sales/src/sales-status-mark-as-resolution.ts",
	"packages/sales/src/sales-workflow-cancellation.ts",
] as const;

function sourceFiles(directory: string): string[] {
	return readdirSync(join(repoRoot, directory), {
		withFileTypes: true,
	}).flatMap((entry) => {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) return sourceFiles(path);
		return /\.(ts|tsx)$/.test(entry.name) && !entry.name.includes(".test.")
			? [path]
			: [];
	});
}

describe("Sales Pipeline retirement contract", () => {
	it("has no runtime read selector, cohort, or shadow fallback", () => {
		for (const path of canonicalConsumerFiles) {
			const source = read(path);
			expect(source, path).not.toContain("observeSalesPipelineReadProjection");
			expect(source, path).not.toContain("selectSalesPipelineReadProjection");
			expect(source, path).not.toContain("shouldObserveSalesPipelineRead");
			expect(source, path).not.toContain("getSalesPipelineReadMode");
			expect(source, path).not.toContain("shouldServeCanonicalSalesPipeline");
		}
	});

	it("enforces canonical commands without a rollout bypass", () => {
		for (const path of canonicalCommandFiles) {
			expect(read(path), path).not.toContain(
				"shouldEnforceCanonicalSalesPipelineCommands",
			);
		}
	});

	it("does not rebuild lifecycle presentation from retired local inputs", () => {
		expect(read("apps/api/src/db/queries/sales-orders-v2.ts")).not.toContain(
			"pipelineLegacyPresentation",
		);
		expect(read("apps/api/src/db/queries/storefront-account.ts")).not.toContain(
			"legacyCustomerOrderStatusLabel",
		);
		expect(read("apps/api/src/db/queries/sales-dashboard.ts")).not.toContain(
			"overallStatus(order.stat)",
		);
		expect(read("packages/sales/src/sales-production.ts")).not.toContain(
			"resolveProductionWorkflowStatus",
		);
		expect(read("packages/sales/src/order-status.ts")).not.toContain(
			"getSalesOrderLifecycleStatus(",
		);
		for (const path of [
			"apps/api/src/db/queries/customer.ts",
			"apps/dashboard/src/components/sales-overview-system/lib/document-status.ts",
			"packages/sales/src/sales-handoff/service.ts",
		]) {
			expect(read(path), path).not.toContain("legacy-order-status");
		}
	});

	it("bounds the legacy string adapter to reviewed operational seams", () => {
		const consumers = [
			...sourceFiles("apps/api/src"),
			...sourceFiles("apps/dashboard/src"),
			...sourceFiles("apps/dealership/src"),
			...sourceFiles("apps/mobile/src"),
			...sourceFiles("apps/storefront/src"),
			...sourceFiles("packages/jobs/src"),
			...sourceFiles("packages/sales/src"),
		]
			.filter((path) => read(path).includes("legacy-order-status"))
			.sort();
		expect(consumers).toEqual([...approvedLegacyOperationalAdapters].sort());
	});

	it("removes lifecycle rollout environment switches from runtime code", () => {
		const rollout = read("packages/sales/src/sales-pipeline-rollout.ts");
		const turbo = read("turbo.json");
		for (const name of [
			"SALES_PIPELINE_READ_MODE",
			"SALES_PIPELINE_COMMAND_MODE",
			"SALES_PIPELINE_COHORT_PERCENT",
			"SALES_PIPELINE_SHADOW_SAMPLE_PERCENT",
		]) {
			expect(rollout).not.toContain(name);
			expect(turbo).not.toContain(name);
		}
	});
});
