import { describe, expect, test } from "bun:test";
import {
	assertRefundIntent,
	createRefundIdempotencyKey,
	nextApplicationStatus,
	normalizeSquareRefundStatus,
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
