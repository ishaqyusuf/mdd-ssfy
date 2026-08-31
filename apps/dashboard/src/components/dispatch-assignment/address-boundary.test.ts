import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

function source(path: string) {
	return readFileSync(new URL(path, import.meta.url), "utf8");
}

const addressGuard = source("./address-guard.tsx");
const createDispatch = source("../dispatch-admin/create-dispatch-dialog.tsx");
const packingOverview = source("../dispatch-packing-overview/index.tsx");
const dispatchColumns = source("../tables-2/sales-dispatch/columns.tsx");
const dispatchBottomBar = source("../tables-2/sales-dispatch/bottom-bar.tsx");
const dispatchRouter = source(
	"../../../../api/src/trpc/routers/dispatch.route.ts",
);
const dispatchQueries = source("../../../../api/src/db/queries/dispatch.ts");

describe("driver assignment address boundary", () => {
	test("prompts before every dashboard driver-assignment entry point", () => {
		expect(addressGuard).toContain(
			"Verify delivery address before assigning",
		);
		expect(createDispatch).toContain("assignmentAddressGuard.guardAssignment");
		expect(packingOverview).toContain(
			"assignmentAddressGuard.guardAssignment",
		);
		expect(dispatchColumns).toContain(
			"assignmentAddressGuard.guardAssignment",
		);
		expect(dispatchBottomBar).toContain(
			"assignmentAddressGuard.guardAssignment",
		);
	});

	test("retains server-side assignment guards for direct callers", () => {
		expect(dispatchRouter).toContain("assertDispatchAssignmentDestinations");
		expect(dispatchRouter).toContain("assignmentDestinationPreflight");
		expect(dispatchRouter).toContain("normalizeAssignmentDestination");
		expect(dispatchQueries).toContain("assignmentDestinationReady");
		expect(dispatchQueries).toContain(
			"Verify the delivery address before assigning a driver",
		);
	});
});
