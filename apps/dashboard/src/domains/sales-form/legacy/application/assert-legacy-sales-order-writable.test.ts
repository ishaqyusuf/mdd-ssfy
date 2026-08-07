import { describe, expect, it } from "bun:test";
import { LEGACY_ADJUSTMENT_SAVE_BLOCKED_CODE } from "@gnd/sales/sales-form/application/approved-adjustment-projection";
import { assertLegacySalesOrderWritable } from "./assert-legacy-sales-order-writable";

describe("legacy sales order write boundary", () => {
	it("rejects a direct write after loading the current approved marker", async () => {
		let loadedId: number | undefined;
		let blockedError: unknown;
		try {
			await assertLegacySalesOrderWritable(91_187, async (orderId) => {
				loadedId = orderId;
				return {
					newSalesForm: {
						approvedAdjustmentId: "adjustment-09187PC",
						lineItems: [],
					},
				};
			});
		} catch (error) {
			blockedError = error;
		}

		expect(loadedId).toBe(91_187);
		expect((blockedError as { code?: string }).code).toBe(
			LEGACY_ADJUSTMENT_SAVE_BLOCKED_CODE,
		);
	});

	it("allows ordinary updates and does not query for creates", async () => {
		let loadCount = 0;
		const loadMeta = async () => {
			loadCount += 1;
			return {};
		};

		expect(await assertLegacySalesOrderWritable(42, loadMeta)).toEqual({});
		expect(await assertLegacySalesOrderWritable(undefined, loadMeta)).toBe(
			null,
		);
		expect(loadCount).toBe(1);
	});
});
