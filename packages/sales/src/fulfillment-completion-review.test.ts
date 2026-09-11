import { expect, test } from "bun:test";
import { buildFulfillmentCompletionReview } from "./fulfillment-completion-review";

const meta = {
	fulfillmentAssignment: {
		version: 1,
		revision: 2,
		selectionMode: "selected",
		lines: [{ uid: "door", quantity: { qty: 0, lh: 3, rh: 2 } }],
	},
};

test("completion review preserves assigned hands and exposes the unpacked remainder", () => {
	const result = buildFulfillmentCompletionReview({
		meta,
		packed: [{ uid: "door", quantity: { qty: 0, lh: 2, rh: 2 } }],
	});
	expect(result.blockedReason).toBeNull();
	expect(result.scopeRevision).toBe(2);
	expect(result.requiresShortLoadConfirmation).toBe(true);
	expect(result.lines).toEqual([
		{
			uid: "door",
			assigned: { qty: 0, lh: 3, rh: 2 },
			packed: { qty: 0, lh: 2, rh: 2 },
			leftBehind: { qty: 0, lh: 1, rh: 0 },
		},
	]);
});

test("unconfirmed and overpacked scopes cannot produce a completion review", () => {
	for (const input of [
		{ meta: {}, packed: [] },
		{ meta, packed: [{ uid: "door", quantity: { qty: 0, lh: 4, rh: 2 } }] },
		{
			meta,
			packed: [{ uid: "another-door", quantity: { qty: 1, lh: 0, rh: 0 } }],
		},
	]) {
		const result = buildFulfillmentCompletionReview(input);
		expect(result.blockedReason).toBeTruthy();
		expect(result.requiresShortLoadConfirmation).toBe(false);
		expect(result.lines).toEqual([]);
	}
});
