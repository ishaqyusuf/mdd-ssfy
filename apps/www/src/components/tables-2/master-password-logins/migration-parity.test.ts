import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Master Password Logins Sales Orders table migration parity", () => {
	it("keeps the settings route on the restarted table shell", () => {
		const routeSource = readSource(
			"app/(sidebar)/settings/master-password-logins/page.tsx",
		);
		const pageSource = readSource(
			"components/master-password-login-audit-page.tsx",
		);
		const sidebarSource = readSource("components/sidebar-links.ts");

		expect(routeSource.includes("ScrollableContent")).toBe(true);
		expect(routeSource.includes("batchPrefetch([")).toBe(true);
		expect(
			/getInitialTableSettings\(\s*"master-password-logins"\s*,?\s*\)/.test(
				routeSource,
			),
		).toBe(true);
		expect(pageSource.includes("MasterPasswordLoginsColumnVisibility")).toBe(
			true,
		);
		expect(pageSource.includes("MasterPasswordLoginsSkeleton")).toBe(true);
		expect(pageSource.includes("<AlertDialog")).toBe(true);
		expect(pageSource.includes("window.confirm")).toBe(false);
		expect(
			pageSource.includes(
				"components/tables-2/master-password-logins/data-table",
			),
		).toBe(true);
		expect(pageSource.includes("@gnd/ui/table")).toBe(false);
		expect(pageSource.includes("@gnd/ui/data-table")).toBe(false);
		expect(pageSource.includes("@gnd/ui/card")).toBe(false);
		expect(routeSource.includes("components/tables/skeleton")).toBe(false);
		expect(routeSource.includes("PageStickyHeader")).toBe(false);
		expect(routeSource.includes("getQueryClient")).toBe(false);
		expect(routeSource.includes("fetchQuery")).toBe(false);
		expect(routeSource.includes("Master Password Usage")).toBe(true);
		expect(sidebarSource.includes("Master Password Usage")).toBe(true);
	});

	it("keeps table-owned scroll, DnD, resize, and persisted settings", () => {
		const source = readSource(
			"components/tables-2/master-password-logins/data-table.tsx",
		);

		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="master-password-logins-table-dnd"')).toBe(true);
		expect(source.includes("collisionDetection={closestCenter}")).toBe(true);
		expect(source.includes("enableColumnResizing: true")).toBe(true);
		expect(source.includes("onColumnSizingChange: setColumnSizing")).toBe(true);
		expect(source.includes("onColumnOrderChange: setColumnOrder")).toBe(true);
		expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
		expect(source.includes("estimateSize: () => tableConfig.rowHeight")).toBe(
			true,
		);
		expect(source.includes("useSuspenseQuery")).toBe(true);
	});

	it("keeps compact tailored columns, clear action, and table registration", () => {
		const columnsSource = readSource(
			"components/tables-2/master-password-logins/columns.tsx",
		);
		const headerSource = readSource(
			"components/tables-2/master-password-logins/table-header.tsx",
		);
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");

		expect(columnsSource.includes("sizes.custom(220, 420, 280)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(210, 420, 280)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(110, 142, 124)")).toBe(true);
		expect(columnsSource.includes('id: "country"')).toBe(true);
		expect(columnsSource.includes('accessorKey: "countryCode"')).toBe(true);
		expect(columnsSource.includes('id: "usage"')).toBe(true);
		expect(columnsSource.includes("Sales rep transfer")).toBe(true);
		expect(columnsSource.includes("row.original.requestId")).toBe(true);
		expect(columnsSource.includes("onClearRecord(audit)")).toBe(true);
		expect(headerSource.includes("SortableContext")).toBe(true);
		expect(headerSource.includes("horizontalListSortingStrategy")).toBe(true);
		expect(headerSource.includes("DraggableHeader")).toBe(true);
		expect(headerSource.includes("ResizeHandle")).toBe(true);
		expect(settingsSource.includes('| "master-password-logins"')).toBe(true);
		expect(configSource.includes('"master-password-logins": {')).toBe(true);
		expect(configSource.includes('tableId: "master-password-logins"')).toBe(
			true,
		);
		expect(configSource.includes("rowHeight: 64")).toBe(true);
		expect(configSource.includes('style: "compact"')).toBe(true);
	});

	it("keeps existing audit rows compatible through the LOGIN default", () => {
		const migrationSource = readSource(
			"../../../packages/db/src/migrations/20260722180000_master_password_usage_audit/migration.sql",
		);
		const schemaSource = readSource(
			"../../../packages/db/src/schema/master-password-login-audits.prisma",
		);

		expect(
			/`usageType` ENUM\('LOGIN', 'SALES_REP_TRANSFER'\) NOT NULL DEFAULT 'LOGIN'/.test(
				migrationSource,
			),
		).toBe(true);
		expect(
			schemaSource.includes(
				"usageType             MasterPasswordUsageType     @default(LOGIN)",
			),
		).toBe(true);
	});
});
