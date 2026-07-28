import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Payment Dashboard table migration parity", () => {
	it("keeps the payment dashboard route on the restarted shell and table settings", () => {
		const source = readSource(
			"app/(sidebar)/contractors/jobs/payment-dashboard/page.tsx",
		);
		const normalizedSource = source.replace(/\s+/g, "");

		expect(source.includes("ScrollableContent")).toBe(true);
		expect(source.includes("batchPrefetch([")).toBe(true);
		expect(
			normalizedSource.includes(
				'getInitialTableSettings("payment-dashboard-contractors"',
			),
		).toBe(true);
		expect(
			normalizedSource.includes(
				'getInitialTableSettings("payment-dashboard-recent-payments"',
			),
		).toBe(true);
		expect(
			source.includes("contractorQueueInitialSettings={") &&
				source.includes("contractorQueueInitialSettings"),
		).toBe(true);
		expect(
			source.includes("recentPaymentsInitialSettings={") &&
				source.includes("recentPaymentsInitialSettings"),
		).toBe(true);
		expect(source.includes("PageStickyHeader")).toBe(false);
		expect(source.includes("getQueryClient")).toBe(false);
		expect(source.includes("fetchQuery")).toBe(false);
	});

	it("replaces the hand-rendered payment dashboard lists with restarted tables", () => {
		const dashboardSource = readSource(
			"components/payment-dashboard/index.tsx",
		);
		const lazySource = readSource(
			"components/payment-dashboard/lazy-payment-dashboard.tsx",
		);

		expect(
			dashboardSource.includes(
				"components/tables-2/payment-dashboard-contractors/data-table",
			),
		).toBe(true);
		expect(
			dashboardSource.includes(
				"components/tables-2/payment-dashboard-recent-payments/data-table",
			),
		).toBe(true);
		expect(dashboardSource.includes("contractors.map")).toBe(false);
		expect(dashboardSource.includes("recentPayments.map")).toBe(false);
		expect(dashboardSource.includes("contractorQueueInitialSettings")).toBe(
			true,
		);
		expect(dashboardSource.includes("recentPaymentsInitialSettings")).toBe(
			true,
		);
		expect(lazySource.includes("contractorQueueInitialSettings")).toBe(true);
		expect(lazySource.includes("recentPaymentsInitialSettings")).toBe(true);
		expect(lazySource.includes("components/tables/skeleton")).toBe(false);
	});

	it("keeps table-owned scroll, DnD, resize, and compact row-height behavior", () => {
		const contractorSource = readSource(
			"components/tables-2/payment-dashboard-contractors/data-table.tsx",
		);
		const source = readSource(
			"components/tables-2/payment-dashboard-recent-payments/data-table.tsx",
		);

		expect(contractorSource.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(contractorSource.includes("useTableDnd(table)")).toBe(true);
		expect(contractorSource.includes("<DndContext")).toBe(true);
		expect(
			contractorSource.includes('id="payment-dashboard-contractors-table-dnd"'),
		).toBe(true);
		expect(
			contractorSource.includes("collisionDetection={closestCenter}"),
		).toBe(true);
		expect(contractorSource.includes("rowHeight={tableConfig.rowHeight}")).toBe(
			true,
		);
		expect(
			contractorSource.includes("estimateSize: () => tableConfig.rowHeight"),
		).toBe(true);
		expect(
			contractorSource.includes('height: "var(--header-offset, 0px)"'),
		).toBe(true);
		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(
			source.includes('id="payment-dashboard-recent-payments-table-dnd"'),
		).toBe(true);
		expect(source.includes("collisionDetection={closestCenter}")).toBe(true);
		expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
		expect(source.includes("estimateSize: () => tableConfig.rowHeight")).toBe(
			true,
		);
		expect(source.includes('height: "var(--header-offset, 0px)"')).toBe(true);
	});

	it("keeps compact tailored widths, draggable headers, and table settings registration", () => {
		const contractorColumnsSource = readSource(
			"components/tables-2/payment-dashboard-contractors/columns.tsx",
		);
		const contractorHeaderSource = readSource(
			"components/tables-2/payment-dashboard-contractors/table-header.tsx",
		);
		const columnsSource = readSource(
			"components/tables-2/payment-dashboard-recent-payments/columns.tsx",
		);
		const headerSource = readSource(
			"components/tables-2/payment-dashboard-recent-payments/table-header.tsx",
		);
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");

		expect(
			contractorColumnsSource.includes("sizes.custom(200, 360, 250)"),
		).toBe(true);
		expect(
			contractorColumnsSource.includes("sizes.custom(136, 210, 156)"),
		).toBe(true);
		expect(
			contractorColumnsSource.includes("sizes.custom(150, 220, 168)"),
		).toBe(true);
		expect(
			contractorColumnsSource.includes("sizes.custom(104, 132, 112)"),
		).toBe(true);
		expect(contractorHeaderSource.includes("SortableContext")).toBe(true);
		expect(
			contractorHeaderSource.includes("horizontalListSortingStrategy"),
		).toBe(true);
		expect(contractorHeaderSource.includes("DraggableHeader")).toBe(true);
		expect(contractorHeaderSource.includes("ResizeHandle")).toBe(true);
		expect(columnsSource.includes("sizes.custom(136, 220, 156)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(160, 260, 176)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(86, 140, 96)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(82, 108, 88)")).toBe(true);
		expect(headerSource.includes("SortableContext")).toBe(true);
		expect(headerSource.includes("horizontalListSortingStrategy")).toBe(true);
		expect(headerSource.includes("DraggableHeader")).toBe(true);
		expect(headerSource.includes("ResizeHandle")).toBe(true);
		expect(settingsSource.includes('| "payment-dashboard-contractors"')).toBe(
			true,
		);
		expect(
			settingsSource.includes('| "payment-dashboard-recent-payments"'),
		).toBe(true);
		expect(configSource.includes('"payment-dashboard-contractors": {')).toBe(
			true,
		);
		expect(
			configSource.includes('tableId: "payment-dashboard-contractors"'),
		).toBe(true);
		expect(
			configSource.includes('"payment-dashboard-recent-payments": {'),
		).toBe(true);
		expect(
			configSource.includes('tableId: "payment-dashboard-recent-payments"'),
		).toBe(true);
		expect(configSource.includes("rowHeight: 56")).toBe(true);
		expect(configSource.includes("rowHeight: 56")).toBe(true);
	});
});
