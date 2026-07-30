import { describe, expect, it } from "bun:test";

import {
	salesFinanceAdoptionPingSchema,
	salesFinancePaymentResolutionSchema,
	salesFinanceResolutionsSchema,
} from "./sales-finance";

describe("Sales Finance resolution schemas", () => {
	it("keeps the Resolution Center as a stable adoption surface", () => {
		expect(
			salesFinanceAdoptionPingSchema.parse({ surface: "resolution" }),
		).toEqual({ surface: "resolution" });
	});

	it("accepts bounded resolution queue filters", () => {
		expect(
			salesFinanceResolutionsSchema.parse({
				q: "Acme",
				"customer.name": "Ada",
				status: "Unresolved",
				size: 50,
				cursor: "100",
				sort: "createdAt.desc",
			}),
		).toMatchObject({
			q: "Acme",
			"customer.name": "Ada",
			status: "Unresolved",
			size: 50,
		});
	});

	it("requires auditable notes and a positive refund amount", () => {
		const base = {
			transactionId: 44,
			action: "refund" as const,
			refundMethod: "wallet" as const,
			paymentMethod: "check" as const,
			refundMode: "part" as const,
			reason: "overpayment",
			squarePaymentId: null,
		};

		expect(
			salesFinancePaymentResolutionSchema.safeParse({
				...base,
				refundAmount: 0,
				note: "too short",
			}).success,
		).toBe(false);
		expect(
			salesFinancePaymentResolutionSchema.parse({
				...base,
				refundAmount: 25,
				note: "Confirmed the overpayment against the daily close.",
			}),
		).toMatchObject({
			transactionId: 44,
			refundAmount: 25,
		});
	});
});
