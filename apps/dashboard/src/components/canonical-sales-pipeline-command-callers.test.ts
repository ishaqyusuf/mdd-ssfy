import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

function source(relativePath: string) {
	return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("canonical sales pipeline command callers", () => {
	it("passes the current production revision through every V2 production action", () => {
		const production = source("./production-v2/shared.tsx");

		expect(production).toContain("pipelineRevision={detail?.pipelineRevision}");
		expect(production).toContain(
			"pipelineRevision: pipelineRevision || undefined",
		);
		expect(production).toContain(
			"pipelineRevision: detail.pipelineRevision || undefined",
		);
	});

	it("uses one atomic command for pack-all completion instead of racing two writes", () => {
		const packing = source("../hooks/use-sales-packing.ts");
		const dispatchTable = source("./tables-2/sales-dispatch/columns.tsx");
		const salesForm = source("./forms/new-sales-form/new-sales-form.tsx");

		for (const caller of [packing, dispatchTable, salesForm]) {
			expect(caller).toContain("markAsCompleted");
			expect(caller).toContain("pipelineRevision");
		}
		expect(salesForm).toContain("{ staleTime: 0 }");
		expect(salesForm).not.toContain("await submitDispatchMutation.mutateAsync");
	});

	it("passes canonical revisions from legacy overview action surfaces", () => {
		const packing = source("../hooks/use-sales-packing.ts");
		const dispatchMenu = source(
			"./sheets/sales-overview-sheet/dispatch-list-menu.tsx",
		);
		const productionMenu = source(
			"./sheets/sales-overview-sheet/production-item-menu.tsx",
		);

		expect(packing).toContain(
			"pipelineRevision: data?.pipelineRevision || undefined",
		);
		expect(dispatchMenu).toContain(
			"pipelineRevision: ctx.data?.pipelineRevision || undefined",
		);
		expect(productionMenu).toContain(
			"pipelineRevision: prod.data.pipelineRevision || undefined",
		);
	});

	it("routes production batches and packing-slip completion through the locked command executor", () => {
		const batchAssign = source(
			"../actions/batch-assign-production-orders.ts",
		);
		const batchEdit = source("../actions/batch-edit-production-orders.ts");
		const dispatch = source("../../../api/src/db/queries/dispatch.ts");

		for (const caller of [batchAssign, batchEdit, dispatch]) {
			expect(caller).toContain("runSalesPipelineCommandTransaction(");
			expect(caller).toContain("expectedRevision:");
		}
		expect(dispatch).toContain('action: "fulfillment.sign_packing_slip"');
	});
});
