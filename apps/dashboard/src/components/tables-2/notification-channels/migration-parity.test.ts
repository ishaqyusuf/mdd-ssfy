import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Notification Channels Sales Orders table migration parity", () => {
	it("keeps the settings route on the table shell with persisted settings", () => {
		const routeSource = readSource(
			"app/(sidebar)/settings/notification-channels/v2/page.tsx",
		);
		const pageSource = readSource(
			"components/settings/notification-channels-v2-page.tsx",
		);

		expect(routeSource.includes("ScrollableContent")).toBe(true);
		expect(routeSource.includes("batchPrefetch([")).toBe(true);
		expect(
			/getInitialTableSettings\(\s*"notification-channels"\s*,?\s*\)/.test(
				routeSource,
			),
		).toBe(true);
		expect(pageSource.includes("NotificationChannelsColumnVisibility")).toBe(
			true,
		);
		expect(pageSource.includes("NotificationChannelsDataTable")).toBe(true);
		expect(pageSource.includes("channels.map((channel)")).toBe(false);
		expect(pageSource.includes("w-full rounded-2xl border p-4 text-left")).toBe(
			false,
		);
		expect(routeSource.includes("getQueryClient")).toBe(false);
		expect(routeSource.includes("fetchQuery")).toBe(false);
	});

	it("keeps table-owned scroll, DnD, resize, and persisted columns", () => {
		const source = readSource(
			"components/tables-2/notification-channels/data-table.tsx",
		);

		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="notification-channels-table-dnd"')).toBe(true);
		expect(source.includes("collisionDetection={closestCenter}")).toBe(true);
		expect(source.includes("enableColumnResizing: true")).toBe(true);
		expect(source.includes("onColumnSizingChange: setColumnSizing")).toBe(true);
		expect(source.includes("onColumnOrderChange: setColumnOrder")).toBe(true);
		expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
		expect(source.includes("estimateSize: () => tableConfig.rowHeight")).toBe(
			true,
		);
		expect(source.includes('className="h-full overflow-auto')).toBe(true);
	});

	it("keeps compact tailored columns, row selection, and table registration", () => {
		const columnsSource = readSource(
			"components/tables-2/notification-channels/columns.tsx",
		);
		const headerSource = readSource(
			"components/tables-2/notification-channels/table-header.tsx",
		);
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");

		expect(columnsSource.includes("sizes.custom(240, 420, 300)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(118, 164, 132)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(126, 170, 142)")).toBe(true);
		expect(columnsSource.includes("onSelectChannel(row.original)")).toBe(true);
		expect(headerSource.includes("SortableContext")).toBe(true);
		expect(headerSource.includes("horizontalListSortingStrategy")).toBe(true);
		expect(headerSource.includes("DraggableHeader")).toBe(true);
		expect(headerSource.includes("ResizeHandle")).toBe(true);
		expect(settingsSource.includes('| "notification-channels"')).toBe(true);
		expect(configSource.includes('"notification-channels": {')).toBe(true);
		expect(configSource.includes('tableId: "notification-channels"')).toBe(
			true,
		);
		expect(configSource.includes("rowHeight: 56")).toBe(true);
		expect(configSource.includes('style: "compact"')).toBe(true);
	});
});
