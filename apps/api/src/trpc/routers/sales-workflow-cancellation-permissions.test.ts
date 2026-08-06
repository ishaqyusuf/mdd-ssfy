import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
	new URL("./sales.route.ts", import.meta.url),
	"utf8",
);

describe("sales workflow cancellation API", () => {
	it("uses protected preview and mutation contracts", () => {
		expect(source).toContain("workflowCancellationPreview: protectedProcedure");
		expect(source).toContain("cancelWorkflowLayer: protectedProcedure");
		expect(source).toContain("salesWorkflowCancellationPreviewSchema");
		expect(source).toContain("cancelSalesWorkflowLayerSchema");
	});

	it("separates production and fulfillment permissions", () => {
		expect(source).toContain(
			'if (action === "production") return requireProductionEditor(ctx)',
		);
		expect(source).toContain('["editPickup", "editOrders", "viewPacking"]');
	});

	it("derives the audit actor from the authenticated user", () => {
		expect(source).toContain("where: { id: props.ctx.userId }");
		expect(source).toContain("name: actor.name");
	});
});
