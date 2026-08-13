import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const workspaceRoot = join(import.meta.dir, "../../../..");

function source(path: string) {
	return readFileSync(join(workspaceRoot, path), "utf8");
}

function expectMarkers(file: string, markers: string[]) {
	const contents = source(file);
	for (const marker of markers) expect(contents).toContain(marker);
}

describe("Special Order operational enforcement boundaries", () => {
	test("purchasing commitments use the shared server gate", () => {
		expectMarkers("apps/api/src/db/queries/inbound-receiving.ts", [
			'operation: "PURCHASING"',
			'source: "api.inventory.create-inbound-from-demands"',
			'source: "api.inventory.assign-inbound-demands"',
			"ctx.db,",
		]);
	});

	test("manual packing and dispatch progression use the shared server gate", () => {
		expectMarkers("apps/api/src/trpc/routers/dispatch.route.ts", [
			"assertSpecialOrderOperationAllowedForApi",
			"isDispatchProgressionTransition",
			'"api.dispatch.start"',
			'"api.dispatch.submit"',
			'"api.dispatch.complete-with-proof"',
			'"api.dispatch.update-status"',
			'"api.dispatch.prepare-inventory"',
			'"api.dispatch.send-for-pickup"',
			'"api.dispatch.sign-packing-slip"',
			'"api.dispatch.create"',
		]);
	});

	test("inventory fulfillment and production resolution cannot bypass the gate", () => {
		expectMarkers("apps/api/src/trpc/routers/inventories.route.ts", [
			'"api.inventory.resolve-mark-as-production"',
			'"api.inventory.resolve-mark-as-auto-purchasing"',
			'"api.inventory.ship-available"',
			'"api.inventory.assign-dispatch-allocation"',
			'"api.inventory.pack-dispatch-allocation"',
			'"api.inventory.fulfill-dispatch"',
		]);
	});

	test("protected API mutations return Warning Only decisions to staff UI", () => {
		expectMarkers("apps/api/src/utils/special-order-enforcement.ts", [
			"captureSpecialOrderOperationDecision",
		]);
		expectMarkers("apps/api/src/trpc/init.ts", [
			"withSpecialOrderOperationFeedback",
		]);
		expectMarkers("apps/dashboard/src/trpc/query-client.ts", [
			"getSpecialOrderOperationWarnings",
			"formatSpecialOrderOperationWarning",
		]);
	});

	test("background and direct batch production paths use the same decision", () => {
		expectMarkers("packages/jobs/src/tasks/sales/update-sales-control.ts", [
			"assertSpecialOrderOperationAllowed",
			'operation: "PRODUCTION"',
			'operation: "PACKING"',
			'operation: "DISPATCH"',
			'source: "jobs.update-sales-control"',
		]);
		expectMarkers(
			"apps/dashboard/src/actions/batch-assign-production-orders.ts",
			[
				"assertSpecialOrderOperationAllowed",
				'operation: "PRODUCTION"',
				'source: "dashboard.batch-assign-production-orders"',
			],
		);
	});
});
