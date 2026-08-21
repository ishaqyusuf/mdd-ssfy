import { describe, expect, it } from "bun:test";

import {
	buildSalesPaymentSummaryLines,
	getSalesPaymentSummary,
} from "./payment-summary";

describe("sales payment summary", () => {
	it("groups the two recorded card payments from order 09397LM", () => {
		const summary = getSalesPaymentSummary([
			{
				id: 9158,
				transactionId: 11935,
				amount: 2277.13,
				status: "success",
				meta: {
					salesAmount: 2277.13,
					feeAmount: 68.31,
					customerChargeAmount: 2345.44,
				},
				transaction: { paymentMethod: "credit-card" },
			},
			{
				id: 9159,
				transactionId: 11936,
				amount: 182.22,
				status: "completed",
				meta: {
					salesAmount: 182.22,
					feeAmount: 5.47,
					customerChargeAmount: 187.69,
				},
				transaction: { paymentMethod: "terminal" },
			},
		]);

		expect(summary).toEqual({
			paymentCount: 2,
			principalCents: 245935,
			cccCents: 7378,
			tipCents: 0,
			customerChargedCents: 253313,
			methodLabel: "Credit Card",
			groups: [
				{
					method: "card",
					label: "Card",
					paymentCount: 2,
					principalCents: 245935,
					cccCents: 7378,
					tipCents: 0,
					customerChargedCents: 253313,
					cccEvidence: "recorded",
				},
			],
		});

		expect(buildSalesPaymentSummaryLines(summary)).toEqual([
			{
				key: "card-principal",
				kind: "money",
				label: "Card Payment",
				value: 2459.35,
				method: "card",
			},
			{
				key: "card-ccc",
				kind: "money",
				label: "C.C.C. on Card Payment",
				value: 73.78,
				method: "card",
			},
			{
				key: "card-charged",
				kind: "money",
				label: "Charged to Card",
				value: 2533.13,
				method: "card",
			},
			{
				key: "card-count",
				kind: "count",
				label: "Card Payments Made",
				value: 2,
				method: "card",
			},
		]);
	});

	it("omits a count of one and excludes non-successful or refund rows", () => {
		const summary = getSalesPaymentSummary([
			{
				id: 1,
				transactionId: 10,
				amount: 100,
				status: "success",
				transaction: { paymentMethod: "cash" },
			},
			{
				id: 2,
				transactionId: 11,
				amount: 50,
				status: "pending",
				transaction: { paymentMethod: "cash" },
			},
			{
				id: 3,
				transactionId: 12,
				amount: -25,
				status: "success",
				transaction: { paymentMethod: "cash" },
			},
		]);

		expect(summary.groups).toEqual([
			{
				method: "cash",
				label: "Cash",
				paymentCount: 1,
				principalCents: 10000,
				cccCents: 0,
				tipCents: 0,
				customerChargedCents: 10000,
				cccEvidence: "unavailable",
			},
		]);
		expect(buildSalesPaymentSummaryLines(summary)).toEqual([
			{
				key: "cash-principal",
				kind: "money",
				label: "Cash Payment",
				value: 100,
				method: "cash",
			},
		]);
	});

	it("counts a shared receipt once while retaining its invoice allocations", () => {
		const summary = getSalesPaymentSummary([
			{
				id: 1,
				transactionId: 50,
				amount: 60,
				status: "paid",
				transaction: { paymentMethod: "zelle" },
			},
			{
				id: 2,
				transactionId: 50,
				amount: 40,
				status: "success",
				transaction: { paymentMethod: "zelle" },
			},
		]);

		expect(summary).toMatchObject({
			paymentCount: 1,
			principalCents: 10000,
			methodLabel: "Zelle",
			groups: [
				{
					method: "zelle",
					paymentCount: 1,
					principalCents: 10000,
				},
			],
		});
	});

	it("does not present an unproven provider fee as customer C.C.C.", () => {
		const summary = getSalesPaymentSummary([
			{
				id: 1,
				transactionId: 50,
				amount: 100,
				status: "success",
				meta: { salesAmount: 100, feeAmount: 3 },
				transaction: { paymentMethod: "credit-card" },
			},
		]);

		expect(summary.groups[0]).toMatchObject({
			principalCents: 10000,
			cccCents: 0,
			customerChargedCents: 10000,
			cccEvidence: "unavailable",
		});
		expect(buildSalesPaymentSummaryLines(summary)).toHaveLength(1);
	});
});
