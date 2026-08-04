import { describe, expect, it } from "bun:test";
import {
	resolveInboundActivityId,
	resolveInboundReference,
} from "./inbound-activity-actions";

describe("inbound activity actions", () => {
	it("maps inbound lifecycle activity to its exact shipment", () => {
		expect(
			resolveInboundActivityId({
				type: "inventory_inbound_activity",
				inboundId: 72,
			}),
		).toBe(72);
		expect(
			resolveInboundActivityId({ type: "sales_info", inboundId: 72 }),
		).toBe(null);
	});

	it("always uses the immutable order number as the inbound reference", () => {
		expect(resolveInboundReference("08601PC")).toBe("08601PC");
		expect(resolveInboundReference(" 08601PC ")).toBe("08601PC");
	});
});
