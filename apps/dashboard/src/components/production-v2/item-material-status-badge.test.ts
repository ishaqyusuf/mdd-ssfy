import { describe, expect, it } from "bun:test";

const source = await Bun.file(
	new URL("./item-material-status-badge.tsx", import.meta.url),
).text();
const overviewBadges = await Bun.file(
	new URL(
		"../sheets/sales-overview-sheet/production/v2/production-item-status-badges.tsx",
		import.meta.url,
	),
).text();

describe("canonical item material badge", () => {
	it("renders the package-provided label, tone, and explanation", () => {
		expect(source).toContain("status.label");
		expect(source).toContain("toneClasses[status.tone]");
		expect(source).toContain("status.explanation");
		expect(source).toContain('aria-label="Material status details"');
		expect(source).toContain("group.received");
		expect(source).toContain("group.committedAllocated");
		expect(source).toContain("group.pendingAllocation");
		expect(source).toContain("group.openInbound");
		expect(source).toContain('status.code === "material_ready"');
		expect(source).toContain('status.code === "awaiting_inbound"');
		expect(source).toContain('aria-label="Inbound material details"');
		expect(source).toContain("inbound.expectedAt");
		expect(source).toContain("inbound.supplierName");
		expect(source).toContain("inbound.quantity");
		expect(source).not.toContain("inbound.componentName");
		expect(source).toContain("INBOUND MATERIAL IN PROGRESS");
		expect(source).toContain("MATERIAL ORDERED");
		expect(source).toContain("Expected arrival");
		expect(source).toContain("No supplier");
		expect(source).toContain("bg-blue-50/80");
	});

	it("appears beside lifecycle badges without replacing them", () => {
		expect(overviewBadges).toContain("ItemMaterialStatusBadge");
		expect(overviewBadges).toContain("badges.map");
	});

	it("is visible in worker mode and expands to exact quantity evidence", async () => {
		const productionTab = await Bun.file(
			new URL(
				"../sheets/sales-overview-sheet/production/v2/production-tab-v2.tsx",
				import.meta.url,
			),
		).text();
		expect(productionTab).toContain(
			"<ItemMaterialStatusBadge status={item.materialStatus}",
		);
		expect(productionTab).toContain("<ItemMaterialStatusDetail");
		expect(productionTab).not.toContain("ProductionInboundSummary");
	});
});
