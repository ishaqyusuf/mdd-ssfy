import { expect, test } from "bun:test";
import { canReceiveProductionInboundItem } from "./production-inbound-scope";

test("receipt scope rejects shared, unassigned, mismatched-size and issue items", () => {
	const base = {
		workerEnabled: true,
		canEditInbound: false,
		hasIssues: false,
		demands: [{ saleId: 1, salesItemId: 10, variantUid: "w2_0-h6_8" }],
		salesOrderId: 1,
		assignments: [{ itemId: 10, dimension: "2-0 x 6-8" }],
	};
	expect(canReceiveProductionInboundItem(base)).toBe(true);
	expect(
		canReceiveProductionInboundItem({ ...base, workerEnabled: false }),
	).toBe(false);
	expect(canReceiveProductionInboundItem({ ...base, assignments: [] })).toBe(
		false,
	);
	expect(canReceiveProductionInboundItem({ ...base, hasIssues: true })).toBe(
		false,
	);
	expect(
		canReceiveProductionInboundItem({
			...base,
			demands: [
				...base.demands,
				{ saleId: 2, salesItemId: 10, variantUid: "w2_0-h6_8" },
			],
		}),
	).toBe(false);
	expect(
		canReceiveProductionInboundItem({
			...base,
			demands: [{ saleId: 1, salesItemId: 10, variantUid: "w2_4-h6_8" }],
		}),
	).toBe(false);
});

test("an explicitly identified non-door assignment owns its material components", () => {
	expect(
		canReceiveProductionInboundItem({
			workerEnabled: true,
			canEditInbound: false,
			hasIssues: false,
			salesOrderId: 1,
			assignments: [{ itemId: 10, dimension: null, wholeItem: true }],
			demands: [{ saleId: 1, salesItemId: 10, variantUid: "hardware" }],
		}),
	).toBe(true);
	expect(
		canReceiveProductionInboundItem({
			workerEnabled: true,
			canEditInbound: false,
			hasIssues: false,
			salesOrderId: 1,
			assignments: [{ itemId: 10, dimension: null }],
			demands: [{ saleId: 1, salesItemId: 10, variantUid: "hardware" }],
		}),
	).toBe(false);
});
