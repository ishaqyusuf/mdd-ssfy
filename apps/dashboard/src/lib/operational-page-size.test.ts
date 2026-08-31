import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dir, "../../../..");

function readProjectSource(path: string) {
	return readFileSync(resolve(projectRoot, path), "utf8");
}

describe("operational workspace page sizes", () => {
	test("uses 20-record queries across production and fulfillment lists", () => {
		const sources = [
			"apps/dashboard/src/app/(sidebar)/(sales)/sales-book/productions/page.tsx",
			"apps/dashboard/src/app/(clean-code)/(sales)/sales-book/(pages)/production-tasks/page.tsx",
			"apps/dashboard/src/app/(sidebar)/(sales-production-worker)/production/dashboard/page.tsx",
			"apps/dashboard/src/app/(sidebar)/(sales)/sales-book/fulfillment/page.tsx",
			"apps/dashboard/src/app/(sidebar)/(sales)/sales-book/fulfillment/v2/page.tsx",
			"apps/dashboard/src/components/tables-2/sales-production/data-table.tsx",
			"apps/dashboard/src/components/tables-2/sales-dispatch/data-table.tsx",
			"apps/dashboard/src/components/tables-2/dispatch-backlog/data-table.tsx",
			"apps/dashboard/src/components/dispatch-admin/views/dispatch-exceptions-view.tsx",
			"apps/dashboard/src/components/driver-dashboard/model.ts",
			"apps/dashboard/src/components/dispatch-admin/create-dispatch-dialog.tsx",
			"packages/sales/src/production-v2/application/get-production-dashboard-v2.ts",
		];

		for (const path of sources) {
			const source = readProjectSource(path);
			expect(source, path).toContain("size: 20");
			expect(source, path).not.toContain("size: 50");
		}
	});
});
