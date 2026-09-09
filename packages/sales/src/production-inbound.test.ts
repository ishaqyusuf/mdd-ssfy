import { expect, test } from "bun:test";
import type { Db } from "@gnd/db";
import {
	getProductionPendingInbounds,
	receiveProductionInbound,
} from "./production-inbound";

const worker = { id: 7, canEditInbound: false, canViewAll: false };
const input = {
	salesOrderId: 1,
	inboundId: 3,
	expectedRevision: "a".repeat(64),
	idempotencyKey: "40c03435-1820-4b1c-8e44-07d19af2bb08",
};
function fixture(
	enabled: boolean,
	assignments: unknown[] = [
		{ itemId: 10, salesDoorId: 1, salesDoor: { dimension: "2-0 x 6-8" } },
	],
) {
	const tx = {
		$queryRaw: async () => [],
		salesOrders: { findFirst: async () => ({ id: 1 }) },
		orderItemProductionAssignments: { findMany: async () => assignments },
		settings: {
			findFirst: async () => ({
				meta: { production: { workerCanReceiveInbound: enabled } },
			}),
		},
		lineItemComponents: { findMany: async () => [] },
		event: {
			findFirst: async () => ({ data: { salesOrderId: 1, inboundId: 3 } }),
		},
	};
	return {
		...tx,
		$transaction: async (
			fn: (value: unknown) => unknown,
			options: { isolationLevel: string },
		) => {
			expect(options.isolationLevel).toBe("Serializable");
			return fn(tx);
		},
	} as unknown as Db;
}
test("unassigned workers cannot enumerate an order's pending inbounds", async () => {
	await expect(
		getProductionPendingInbounds(
			fixture(true, []),
			{ salesOrderId: 1, take: 10 },
			worker,
		),
	).rejects.toThrow("No active assignment");
});
test("a disabled worker policy rejects receipt before any physical or allocation write", async () => {
	await expect(
		receiveProductionInbound(fixture(false), input, async () => worker),
	).rejects.toThrow("Worker inbound receiving is disabled");
});
test("a completed request replays without writing inventory again", async () => {
	expect(
		await receiveProductionInbound(fixture(true), input, async () => worker),
	).toEqual({
		inboundId: 3,
		salesOrderId: 1,
		replayed: true,
		remainingBackorderQty: null,
		needsSupervisor: false,
	});
});
test("request identity cannot be reused for another shipment", async () => {
	await expect(
		receiveProductionInbound(
			fixture(true),
			{ ...input, inboundId: 4 },
			async () => worker,
		),
	).rejects.toThrow("another inbound");
});
