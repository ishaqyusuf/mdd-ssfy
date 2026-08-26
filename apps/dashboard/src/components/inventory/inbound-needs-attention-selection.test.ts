import { describe, expect, test } from "bun:test";

import {
	MAX_INBOUND_ATTENTION_BATCH_SIZE,
	selectInboundAttentionBatch,
	toggleInboundAttentionSelection,
} from "./inbound-needs-attention-selection";

describe("toggleInboundAttentionSelection", () => {
	test("adds and removes inbound ids without duplicates", () => {
		expect(toggleInboundAttentionSelection([70], 90, true)).toEqual([70, 90]);
		expect(toggleInboundAttentionSelection([70, 90], 90, false)).toEqual([70]);
		expect(toggleInboundAttentionSelection([70, 90], 90, true)).toEqual([
			70, 90,
		]);
	});

	test("caps batch selection to the API boundary", () => {
		const ids = Array.from({ length: 110 }, (_, index) => index + 1);
		expect(selectInboundAttentionBatch(ids)).toHaveLength(
			MAX_INBOUND_ATTENTION_BATCH_SIZE,
		);
		expect(
			toggleInboundAttentionSelection(
				selectInboundAttentionBatch(ids),
				111,
				true,
			),
		).toHaveLength(MAX_INBOUND_ATTENTION_BATCH_SIZE);
	});
});
