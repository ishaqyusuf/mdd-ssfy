import { describe, expect, it } from "bun:test";
import { projectDealerFulfillmentStatus } from "./dealer-portal-orders";

describe("dealer order lifecycle projection", () => {
	it("keeps open dispatch exceptions visible above the pipeline headline", () => {
		expect(
			projectDealerFulfillmentStatus({
				orderStatus: "exception",
				statusCode: "processing",
				fulfillmentState: "packing",
			}),
		).toBe("exception");
	});

	it("uses canonical partial and in-transit evidence", () => {
		expect(
			projectDealerFulfillmentStatus({
				orderStatus: "preparing",
				statusCode: "processing",
				fulfillmentState: "partially_fulfilled",
			}),
		).toBe("partial");
		expect(
			projectDealerFulfillmentStatus({
				orderStatus: "preparing",
				statusCode: "in-transit",
				fulfillmentState: "in_transit",
			}),
		).toBe("in_transit");
	});

	it("does not infer completion from packed dispatches", () => {
		expect(
			projectDealerFulfillmentStatus({
				orderStatus: "preparing",
				statusCode: "processing",
				fulfillmentState: "packed",
			}),
		).toBe("preparing");
	});
});
