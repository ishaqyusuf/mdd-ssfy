import { describe, expect, it } from "bun:test";

import { resolveSalesTaxRecognitionEvidence } from "./recognition-evidence";

describe("resolveSalesTaxRecognitionEvidence", () => {
	it("uses the latest fulfillment evidence and never a payment or order date", () => {
		const result = resolveSalesTaxRecognitionEvidence({
			orderId: 10,
			status: "processing",
			dispatchCompletedPercentage: 100,
			deliveredAt: new Date("2026-08-20T14:00:00Z"),
			pickup: { id: 2, pickupAt: new Date("2026-08-22T14:00:00Z") },
			deliveries: [
				{
					id: 3,
					deliveryMode: "delivery",
					deliveredAt: new Date("2026-08-21T14:00:00Z"),
				},
			],
		});

		expect(result).toEqual({
			status: "eligible",
			evidence: {
				recognizedAt: new Date("2026-08-22T14:00:00Z"),
				source: "PICKUP",
				sourceId: 2,
			},
		});
	});

	it("rejects open, cancelled, and fulfilled orders without a tax point", () => {
		const base = {
			orderId: 10,
			dispatchCompletedPercentage: 0,
			deliveredAt: null,
			pickup: null,
			deliveries: [],
		};
		expect(
			resolveSalesTaxRecognitionEvidence({ ...base, status: "processing" }),
		).toEqual({ status: "ineligible", reason: "not_fulfilled" });
		expect(
			resolveSalesTaxRecognitionEvidence({ ...base, status: "cancelled" }),
		).toEqual({ status: "ineligible", reason: "cancelled" });
		expect(
			resolveSalesTaxRecognitionEvidence({ ...base, status: "completed" }),
		).toEqual({ status: "ineligible", reason: "missing_tax_point" });
	});
});
