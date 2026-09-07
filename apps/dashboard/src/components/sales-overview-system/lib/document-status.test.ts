import { describe, expect, it } from "bun:test";

import { getSalesOverviewDocumentStatus } from "./document-status";

describe("sales overview document status", () => {
	it("fails closed when the canonical lifecycle snapshot is unavailable", () => {
		expect(
			getSalesOverviewDocumentStatus({
				deliveryStatus: "completed",
				orderStatus: "Processing",
				type: "order",
			}),
		).toMatchObject({ label: "Status unavailable", status: "unknown" });
	});

	it("exposes fulfilled only from the canonical lifecycle snapshot", () => {
		expect(
			getSalesOverviewDocumentStatus({
				type: "order",
				pipeline: {
					headline: {
						code: "fulfilled",
						label: "Fulfilled",
						tone: "emerald",
					},
				} as never,
			}),
		).toMatchObject({ label: "Fulfilled", status: "fulfilled" });
	});

	it("preserves Administrative Completion provenance over contradictory legacy fields", () => {
		expect(
			getSalesOverviewDocumentStatus({
				type: "order",
				orderStatus: "Completed",
				prodStatus: "N/A",
				deliveryStatus: "completed",
				pipeline: {
					headline: {
						code: "administratively_completed",
						label: "Administratively completed",
						tone: "violet",
					},
				} as never,
			}),
		).toMatchObject({
			label: "Administratively completed",
			status: "administratively_completed",
		});
	});
});
