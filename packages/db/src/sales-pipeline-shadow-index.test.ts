import { describe, expect, it } from "bun:test";

const schema = await Bun.file(
	new URL("./schema/sales.prisma", import.meta.url),
).text();
const migration = await Bun.file(
	new URL(
		"./migrations/20260904155300_add_sales_pipeline_shadow_scan_index/migration.sql",
		import.meta.url,
	),
).text();

describe("Sales Pipeline production shadow scan index", () => {
	it("matches the health predicates and stable order used by the scan", () => {
		expect(schema).toContain(
			'@@index([state, version, pipelineContractVersion, salesOrderId], name: "idx_sales_order_pipeline_shadow_scan")',
		);
		expect(migration).toContain(
			"(`state`, `version`, `pipelineContractVersion`, `salesOrderId`)",
		);
	});
});
