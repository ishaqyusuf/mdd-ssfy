import { describe, expect, it } from "bun:test";

import { getSalesOverviewDocumentStatus } from "./document-status";

describe("sales overview document status", () => {
	it("exposes the canonical fulfilled lifecycle status", () => {
		expect(
			getSalesOverviewDocumentStatus({
				deliveryStatus: "completed",
				orderStatus: "Processing",
				type: "order",
			}),
		).toMatchObject({ label: "Fulfilled", status: "fulfilled" });
	});
});
