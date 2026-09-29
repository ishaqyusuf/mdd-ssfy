import { describe, expect, test } from "bun:test";
import {
	assertRefundIntent,
	assertRefundPrincipalCapacity,
	createRefundIdempotencyKey,
	nextApplicationStatus,
	normalizeSquareRefundStatus,
	refundablePrincipalByOrder,
	remainingRefundableCents,
} from "./domain";

describe("Square refund domain", () => {
	test("reserves pending refunds from the remaining amount", () => {
		expect(
			remainingRefundableCents({
				paymentAmountCents: 20_000,
				completedRefundCents: 3_000,
				reservedRefundCents: 2_000,
			}),
		).toBe(15_000);
	});

	test("limits refund principal to the original order payment, not the fee-inclusive Square charge", () => {
		const remaining = refundablePrincipalByOrder({
			originalPayments: [{ salesOrderId: 28225, principalCents: 800 }],
			refunds: [],
		});
		expect(remaining.get(28225)).toBe(800);
		expect(() =>
			assertRefundPrincipalCapacity(
				[{ salesOrderId: 28225, principalCents: 828 }],
				remaining,
			),
		).toThrow("exceeds the original payment");
		expect(() =>
			assertRefundPrincipalCapacity(
				[{ salesOrderId: 28225, principalCents: 800, cccCents: 28 }],
				remaining,
			),
		).not.toThrow();
	});

	test("reserves principal per order for pending and completed refunds, but releases failed refunds", () => {
		const remaining = refundablePrincipalByOrder({
			originalPayments: [
				{ salesOrderId: 1, principalCents: 1000 },
				{ salesOrderId: 2, principalCents: 500 },
			],
			refunds: [
				{
					providerStatus: "completed",
					allocations: [{ salesOrderId: 1, principalCents: 200 }],
				},
				{
					providerStatus: "pending",
					allocations: [{ salesOrderId: 1, principalCents: 300 }],
				},
				{
					providerStatus: "failed",
					allocations: [{ salesOrderId: 2, principalCents: 500 }],
				},
			],
		});
		expect(remaining.get(1)).toBe(500);
		expect(remaining.get(2)).toBe(500);
		expect(() =>
			assertRefundPrincipalCapacity(
				[{ salesOrderId: 1, principalCents: 501 }],
				remaining,
			),
		).toThrow();
	});

	test("requires allocations to match principal, CCC, and tip exactly", () => {
		expect(
			assertRefundIntent({
				paymentStatus: "COMPLETED",
				paidAt: new Date("2026-08-01T00:00:00Z"),
				now: new Date("2026-08-20T00:00:00Z"),
				remainingCents: 15_000,
				money: { principalCents: 10_000, cccCents: 300, tipCents: 200 },
				allocations: [
					{
						salesOrderId: 1,
						principalCents: 6_000,
						cccCents: 180,
						tipCents: 120,
					},
					{
						salesOrderId: 2,
						principalCents: 4_000,
						cccCents: 120,
						tipCents: 80,
					},
				],
			}),
		).toEqual({ totalCents: 10_500 });
	});

	test("rejects old, pending, over-limit, and mismatched intents", () => {
		const base = {
			paymentStatus: "COMPLETED",
			paidAt: new Date("2026-08-01T00:00:00Z"),
			now: new Date("2026-08-20T00:00:00Z"),
			remainingCents: 10_000,
			money: { principalCents: 5_000 },
			allocations: [{ salesOrderId: 1, principalCents: 5_000 }],
		};
		expect(() =>
			assertRefundIntent({ ...base, paymentStatus: "PENDING" }),
		).toThrow();
		expect(() =>
			assertRefundIntent({ ...base, paidAt: new Date("2024-01-01") }),
		).toThrow();
		expect(() =>
			assertRefundIntent({ ...base, remainingCents: 4_999 }),
		).toThrow();
		expect(() =>
			assertRefundIntent({
				...base,
				allocations: [{ salesOrderId: 1, principalCents: 4_999 }],
			}),
		).toThrow();
	});

	test("maps provider and external application states", () => {
		expect(normalizeSquareRefundStatus("COMPLETED")).toBe("completed");
		expect(
			nextApplicationStatus({
				origin: "external",
				providerStatus: "completed",
				hasAllocations: false,
			}),
		).toBe("awaiting_allocation");
		expect(
			nextApplicationStatus({
				origin: "gnd",
				providerStatus: "completed",
				hasAllocations: true,
			}),
		).toBe("ready_to_apply");
		expect(
			nextApplicationStatus({
				origin: "gnd",
				providerStatus: "pending",
				hasAllocations: true,
			}),
		).toBe("reserved");
		expect(
			nextApplicationStatus({
				origin: "gnd",
				providerStatus: "failed",
				hasAllocations: true,
			}),
		).toBe("apply_failed");
		expect(
			nextApplicationStatus({
				origin: "gnd",
				providerStatus: "pending",
				hasAllocations: true,
				currentApplicationStatus: "applied",
			}),
		).toBe("applied");
	});

	test("creates stable-provider-safe idempotency keys", () => {
		const first = createRefundIdempotencyKey();
		const second = createRefundIdempotencyKey();
		expect(first).toStartWith("gnd-refund-");
		expect(first.length).toBeLessThanOrEqual(45);
		expect(second).not.toBe(first);
	});
});
