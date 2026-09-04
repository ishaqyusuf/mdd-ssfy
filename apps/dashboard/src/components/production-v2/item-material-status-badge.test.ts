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
	it("renders exactly one compact status badge without appended details", () => {
		expect(source).toContain("getItemMaterialStatusNotice");
		expect(source).toContain("notice.label");
		expect(source).toContain("toneClasses[notice.tone]");
		expect(source).not.toContain("notice.detail");
		expect(source).not.toContain("Review inventory");
		expect(source).not.toContain("Configure in inventory");
		expect(source).not.toContain("COVERED");
		expect(source).not.toContain("evidenceRevision");
		expect(source).not.toContain("Material status details");
		expect(source).not.toContain("Inbound material details");
	});

	it("appears beside lifecycle badges without replacing them", () => {
		expect(overviewBadges).toContain("ItemMaterialStatusBadge");
		expect(overviewBadges).toContain("badges.map");
	});

	it("uses the worker projection without a duplicate expanded detail card", async () => {
		const productionTab = await Bun.file(
			new URL(
				"../sheets/sales-overview-sheet/production/v2/production-tab-v2.tsx",
				import.meta.url,
			),
		).text();
		expect(productionTab).toContain('audience="worker"');
		expect(productionTab).not.toContain("ItemMaterialStatusDetail");
		expect(productionTab).not.toContain("ProductionInboundSummary");
	});
});
