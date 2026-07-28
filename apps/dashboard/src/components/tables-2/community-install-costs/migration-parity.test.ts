import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Community Install Costs table migration parity", () => {
	it("renders through the migrated route shell with hydrated table settings", () => {
		const routeSource = readSource(
			"app/(sidebar)/community/(main)/install-costs/page.tsx",
		);
		const compactRouteSource = routeSource.replace(/\s+/g, "");

		expect(routeSource.includes("ScrollableContent")).toBe(true);
		expect(routeSource.includes("HydrateClient")).toBe(true);
		expect(routeSource.includes("batchPrefetch")).toBe(true);
		expect(
			compactRouteSource.includes(
				'getInitialTableSettings("community-install-costs"',
			),
		).toBe(true);
		expect(routeSource.includes("CommunityInstallCostsSkeleton")).toBe(true);
		expect(routeSource.includes("getQueryClient")).toBe(false);
		expect(routeSource.includes(".fetchQuery(")).toBe(false);
	});

	it("keeps the install-cost page off the namespace table and old row component", () => {
		const source = readSource("components/community-install-costs/index.tsx");

		expect(
			source.includes("components/tables-2/community-install-costs/data-table"),
		).toBe(true);
		expect(source.includes("CommunityInstallCostsColumnVisibility")).toBe(true);
		expect(source.includes("@gnd/ui/namespace")).toBe(false);
		expect(source.includes("InstallCostLine")).toBe(false);
		expect(/<Table[\s>]/.test(source)).toBe(false);
	});

	it("keeps table-owned scroll, DnD, resize, and inline save behavior", () => {
		const source = readSource(
			"components/tables-2/community-install-costs/data-table.tsx",
		);

		expect(source.includes("VirtualRow")).toBe(true);
		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="community-install-costs-table-dnd"')).toBe(
			true,
		);
		expect(source.includes("collisionDetection={closestCenter}")).toBe(true);
		expect(source.includes("enableColumnResizing: true")).toBe(true);
		expect(source.includes("onColumnSizingChange: setColumnSizing")).toBe(true);
		expect(source.includes("onColumnOrderChange: setColumnOrder")).toBe(true);
		expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
		expect(source.includes("estimateSize: () => tableConfig.rowHeight")).toBe(
			true,
		);
		expect(source.includes("updateInstallCostRate")).toBe(true);
		expect(source.includes("getCommunityInstallCostRates.queryKey()")).toBe(
			true,
		);
		expect(source.includes("clamp(260px")).toBe(true);
	});

	it("keeps compact headers, horizontal pagination, and resize handles", () => {
		const source = readSource(
			"components/tables-2/community-install-costs/table-header.tsx",
		);

		expect(source.includes("SortableContext")).toBe(true);
		expect(source.includes("horizontalListSortingStrategy")).toBe(true);
		expect(source.includes("DraggableHeader")).toBe(true);
		expect(source.includes("HorizontalPagination")).toBe(true);
		expect(source.includes("getTableCellPaddingClass(tableConfig.style)")).toBe(
			true,
		);
		expect(source.includes("ResizeHandle")).toBe(true);
	});

	it("registers compact tailored install-cost widths", () => {
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");
		const columnsSource = readSource(
			"components/tables-2/community-install-costs/columns.tsx",
		);

		expect(settingsSource.includes('| "community-install-costs"')).toBe(true);
		expect(configSource.includes('"community-install-costs": {')).toBe(true);
		expect(configSource.includes('tableId: "community-install-costs"')).toBe(
			true,
		);
		expect(configSource.includes('id: "task"')).toBe(true);
		expect(configSource.includes("rowHeight: 48")).toBe(true);
		expect(configSource.includes('style: "compact"')).toBe(true);
		expect(columnsSource.includes("sizes.custom(220, 420, 280)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(108, 150, 120)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(100, 140, 112)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(92, 120, 104)")).toBe(true);
		expect(columnsSource.includes("md:sticky md:right-0")).toBe(true);
		expect(columnsSource.includes('header: "Unit"')).toBe(true);
	});
});
