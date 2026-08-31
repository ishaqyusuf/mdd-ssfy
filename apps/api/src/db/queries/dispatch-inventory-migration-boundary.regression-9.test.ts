import { describe, expect, test } from "bun:test";

import { hasOperationalInventoryEvidence } from "./dispatch-inventory";

describe("dispatch inventory migration boundary", () => {
	test("keeps historical component-only lines on legacy packing", () => {
		expect(
			hasOperationalInventoryEvidence({
				components: [
					{ stockAllocations: [], inboundDemands: [] },
					{ stockAllocations: [], inboundDemands: [] },
				],
			}),
		).toBe(false);
	});

	test("enables strict inventory control when allocation evidence exists", () => {
		expect(
			hasOperationalInventoryEvidence({
				components: [
					{
						stockAllocations: [{ status: "approved" }],
						inboundDemands: [],
					},
				],
			}),
		).toBe(true);
	});

	test("enables strict inventory control for active inbound evidence", () => {
		expect(
			hasOperationalInventoryEvidence({
				components: [{ stockAllocations: [], inboundDemands: [{}] }],
			}),
		).toBe(true);
	});
});
