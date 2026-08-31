import { describe, expect, it } from "bun:test";

import { publishQueryEvent } from "@/lib/query-events/transport";

import {
	PRODUCTION_ASSIGNMENT_REFRESH_INTERVAL_MS,
	subscribeProductionAssignmentRefresh,
} from "./production-assignment-refresh";

describe("production assignment review refresh", () => {
	it("uses a bounded refresh interval for cross-session changes", () => {
		expect(PRODUCTION_ASSIGNMENT_REFRESH_INTERVAL_MS).toBe(5_000);
	});

	it("refreshes the open order ledger after a production review mutation", async () => {
		let refreshCount = 0;
		const unsubscribe = subscribeProductionAssignmentRefresh({
			orderNo: "09480AD",
			refresh: () => {
				refreshCount += 1;
			},
		});

		await publishQueryEvent("sales.production.changed", {
			sales: [{ orderNo: "09480AD", salesType: "order" }],
		});
		await publishQueryEvent("sales.production.changed", {
			sales: [{ orderNo: "OTHER", salesType: "order" }],
		});
		await publishQueryEvent("sales.order.changed", {
			sales: [{ orderNo: "09480AD", salesType: "order" }],
		});
		unsubscribe();

		expect(refreshCount).toBe(1);
	});

	it("refreshes an open ledger for an unscoped production change", async () => {
		let refreshCount = 0;
		const unsubscribe = subscribeProductionAssignmentRefresh({
			orderNo: "09480AD",
			refresh: () => {
				refreshCount += 1;
			},
		});

		await publishQueryEvent("sales.production.changed");
		unsubscribe();

		expect(refreshCount).toBe(1);
	});
});
