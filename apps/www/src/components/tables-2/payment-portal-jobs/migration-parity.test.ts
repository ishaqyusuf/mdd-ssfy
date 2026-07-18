import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Payment Portal jobs table migration parity", () => {
	it("keeps the payment portal route on the restarted shell without manual fetchQuery", () => {
		const source = readSource(
			"app/(sidebar)/contractors/jobs/payment-portal/page.tsx",
		);
		const normalizedSource = source.replace(/\s+/g, "");

		expect(source.includes("ScrollableContent")).toBe(true);
		expect(source.includes("batchPrefetch([")).toBe(true);
		expect(source.includes("trpc.jobs.paymentDashboard.queryOptions({})")).toBe(
			true,
		);
		expect(
			normalizedSource.includes(
				'getInitialTableSettings("payment-portal-jobs"',
			),
		).toBe(true);
		expect(source.includes("paymentPortalJobsInitialSettings={")).toBe(true);
		expect(source.includes("getQueryClient")).toBe(false);
		expect(source.includes("fetchQuery")).toBe(false);
	});

	it("replaces the hand-rendered job cards with a controlled restarted table", () => {
		const portalSource = readSource(
			"components/payment-dashboard/payment-portal.tsx",
		);
		const lazySource = readSource(
			"components/payment-dashboard/lazy-payment-dashboard.tsx",
		);

		expect(
			portalSource.includes(
				"components/tables-2/payment-portal-jobs/data-table",
			),
		).toBe(true);
		expect(portalSource.includes("jobs.map((job)")).toBe(false);
		expect(portalSource.includes("JobListItem")).toBe(false);
		expect(portalSource.includes("rowSelection={rowSelection}")).toBe(true);
		expect(portalSource.includes("setRowSelection={setRowSelection}")).toBe(
			true,
		);
		expect(portalSource.includes("paymentPortalJobsInitialSettings")).toBe(
			true,
		);
		expect(lazySource.includes("paymentPortalJobsInitialSettings")).toBe(true);
	});

	it("keeps table-owned scroll, DnD, resize, and row-open behavior", () => {
		const source = readSource(
			"components/tables-2/payment-portal-jobs/data-table.tsx",
		);

		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="payment-portal-jobs-table-dnd"')).toBe(true);
		expect(source.includes("collisionDetection={closestCenter}")).toBe(true);
		expect(source.includes("onRowSelectionChange: setRowSelection")).toBe(true);
		expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
		expect(source.includes("estimateSize: () => tableConfig.rowHeight")).toBe(
			true,
		);
		expect(source.includes("onOpen(row.original)")).toBe(true);
		expect(source.includes('height: "var(--header-offset, 0px)"')).toBe(true);
	});

	it("keeps compact tailored widths, sticky actions, and table registration", () => {
		const columnsSource = readSource(
			"components/tables-2/payment-portal-jobs/columns.tsx",
		);
		const headerSource = readSource(
			"components/tables-2/payment-portal-jobs/table-header.tsx",
		);
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");

		expect(columnsSource.includes("sizes.custom(50, 50, 50)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(132, 210, 154)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(220, 420, 280)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(180, 320, 220)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(220, 320, 250)")).toBe(true);
		expect(columnsSource.includes("onMarkSubmitted(row.original.id)")).toBe(
			true,
		);
		expect(columnsSource.includes("onApprove(row.original.id)")).toBe(true);
		expect(columnsSource.includes("onReject(row.original.id)")).toBe(true);
		expect(headerSource.includes("SortableContext")).toBe(true);
		expect(headerSource.includes("horizontalListSortingStrategy")).toBe(true);
		expect(headerSource.includes("DraggableHeader")).toBe(true);
		expect(headerSource.includes("ResizeHandle")).toBe(true);
		expect(settingsSource.includes('| "payment-portal-jobs"')).toBe(true);
		expect(configSource.includes('"payment-portal-jobs": {')).toBe(true);
		expect(configSource.includes('tableId: "payment-portal-jobs"')).toBe(true);
		expect(configSource.includes("rowHeight: 64")).toBe(true);
	});
});
