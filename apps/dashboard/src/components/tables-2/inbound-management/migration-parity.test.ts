import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Inbound Management Sales Orders table migration parity", () => {
	it("keeps the route shell aligned with Sales Orders without manual query fetching", () => {
		const routeSource = readSource(
			"app/(sidebar)/(sales)/sales-book/inbound-management/page.tsx",
		);

		expect(routeSource.includes("PageShell")).toBe(true);
		expect(routeSource.includes("HydrateClient")).toBe(true);
		expect(routeSource.includes("batchPrefetch([")).toBe(true);
		expect(
			routeSource.includes('getInitialTableSettings("inbound-management")'),
		).toBe(true);
		expect(routeSource.includes("<InboundHeader />")).toBe(true);
		expect(
			routeSource.includes("components/tables-2/inbound-management/data-table"),
		).toBe(true);
		expect(routeSource.includes("getQueryClient")).toBe(false);
		expect(routeSource.includes("fetchQuery")).toBe(false);
		expect(routeSource.includes("components/tables/inbound-managment")).toBe(
			false,
		);
		expect(routeSource.includes("@gnd/ui/data-table")).toBe(false);
		expect(routeSource.includes("PageStickyHeader")).toBe(false);
	});

	it("keeps table-owned scroll, DnD, resize, virtualization, and row-open behavior", () => {
		const source = readSource(
			"components/tables-2/inbound-management/data-table.tsx",
		);

		expect(source.includes("VirtualRow")).toBe(true);
		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="inbound-management-table-dnd"')).toBe(true);
		expect(source.includes("collisionDetection={closestCenter}")).toBe(true);
		expect(source.includes("useTableScroll")).toBe(true);
		expect(source.includes("startFromColumn: 1")).toBe(true);
		expect(source.includes("useSuspenseInfiniteQuery")).toBe(true);
		expect(source.includes("trpc.sales.inboundIndex")).toBe(true);
		expect(source.includes("useVirtualizer")).toBe(true);
		expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
		expect(source.includes("estimateSize: () => tableConfig.rowHeight")).toBe(
			true,
		);
		expect(source.includes("setInboundViewParams")).toBe(true);
		expect(source.includes('height: "var(--header-offset, 0px)"')).toBe(true);
	});

	it("keeps compact draggable headers, horizontal pagination, and resize handles", () => {
		const source = readSource(
			"components/tables-2/inbound-management/table-header.tsx",
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

	it("keeps Inbound Management registered for compact tailored column widths", () => {
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");
		const columnsSource = readSource(
			"components/tables-2/inbound-management/columns.tsx",
		);

		expect(settingsSource.includes('| "inbound-management"')).toBe(true);
		expect(configSource.includes('"inbound-management": {')).toBe(true);
		expect(configSource.includes('tableId: "inbound-management"')).toBe(true);
		expect(configSource.includes("rowHeight: 56")).toBe(true);
		expect(configSource.includes('style: "compact"')).toBe(true);
		expect(columnsSource.includes("sizes.custom(132, 220, 154)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(180, 340, 220)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(86, 140, 104)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(116, 180, 132)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(64, 64)")).toBe(true);
		expect(columnsSource.includes("md:sticky md:right-0")).toBe(true);
	});
});
