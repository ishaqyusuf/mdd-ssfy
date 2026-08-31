import { describe, expect, it } from "bun:test";

import {
	getGuardedPackingSettings,
	updateGuardedPackingSettings,
} from "./guarded-packing-settings";
import {
	DEFAULT_GUARDED_PACKING_POLICY,
	guardedPackingPolicyFromEvidenceSnapshot,
	guardedPackingReviewBlocksDelivery,
	normalizeGuardedPackingPolicy,
	reviseGuardedPackingPolicy,
} from "./schema";

const changedAt = "2026-08-28T12:00:00.000Z";

describe("guarded packing policy", () => {
	it("fails closed to the versioned default for missing or malformed settings", () => {
		expect(normalizeGuardedPackingPolicy(undefined)).toEqual(
			DEFAULT_GUARDED_PACKING_POLICY,
		);
		expect(normalizeGuardedPackingPolicy({ reviewMode: "UNKNOWN" })).toEqual(
			DEFAULT_GUARDED_PACKING_POLICY,
		);
		expect(guardedPackingReviewBlocksDelivery(undefined)).toBe(true);
	});

	it("reads policy from a report evidence snapshot", () => {
		const policy = {
			...DEFAULT_GUARDED_PACKING_POLICY,
			reviewMode: "ALLOW_DELIVERY_WHILE_PENDING" as const,
			revision: 4,
			changedAt,
		};
		expect(guardedPackingPolicyFromEvidenceSnapshot({ policy })).toEqual(
			policy,
		);
		expect(guardedPackingReviewBlocksDelivery({ policy })).toBe(false);
	});

	it("uses the current policy as the effective delivery gate without rewriting report history", () => {
		const historicalPolicy = {
			...DEFAULT_GUARDED_PACKING_POLICY,
			reviewMode: "BLOCK_DELIVERY_UNTIL_APPROVED" as const,
			revision: 2,
			changedAt,
		};
		const currentPolicy = {
			...historicalPolicy,
			reviewMode: "ALLOW_DELIVERY_WHILE_PENDING" as const,
			revision: 3,
		};

		expect(
			guardedPackingReviewBlocksDelivery(
				{ policy: historicalPolicy },
				currentPolicy,
			),
		).toBe(false);
		expect(
			guardedPackingPolicyFromEvidenceSnapshot({ policy: historicalPolicy }),
		).toEqual(historicalPolicy);
	});

	it("revises every configurable field and leaves an identical policy unchanged", () => {
		const next = {
			enabled: false,
			allowAwaitingProductionSubmission: false,
			allowPendingMaterialReview: false,
			reviewMode: "ALLOW_DELIVERY_WHILE_PENDING" as const,
			notifySalesRep: false,
			createProductionEvidenceOnApproval: false,
		};
		const revised = reviseGuardedPackingPolicy({
			current: DEFAULT_GUARDED_PACKING_POLICY,
			next,
			changedAt,
		});
		expect(revised).toEqual({
			changed: true,
			policy: { ...next, revision: 1, changedAt },
		});
		expect(
			reviseGuardedPackingPolicy({
				current: revised.policy,
				next,
				changedAt: "2026-08-28T13:00:00.000Z",
			}),
		).toEqual({ changed: false, policy: revised.policy });
	});

	it("loads the guarded policy without creating a settings row", async () => {
		const policy = {
			...DEFAULT_GUARDED_PACKING_POLICY,
			notifySalesRep: false,
			revision: 2,
			changedAt,
		};
		const db = {
			settings: {
				findFirst: async () => ({ meta: { guardedPacking: policy } }),
			},
		} as unknown as Parameters<typeof getGuardedPackingSettings>[0];
		await expect(getGuardedPackingSettings(db)).resolves.toEqual(policy);
	});

	it("merges a revised policy into existing sales settings", async () => {
		let savedMeta: unknown;
		const db = {
			$transaction: async (fn: (tx: unknown) => unknown, options: unknown) => {
				expect(options).toEqual({
					isolationLevel: "Serializable",
					timeout: 60_000,
				});
				return fn({
					settings: {
						findFirst: async () => ({
							id: 9,
							meta: { existingFeature: { enabled: true } },
						}),
						update: async ({ data }: { data: { meta: unknown } }) => {
							savedMeta = data.meta;
						},
					},
				});
			},
		} as Parameters<typeof updateGuardedPackingSettings>[0];
		const next = {
			enabled: true,
			allowAwaitingProductionSubmission: false,
			allowPendingMaterialReview: true,
			reviewMode: "ALLOW_DELIVERY_WHILE_PENDING" as const,
			notifySalesRep: false,
			createProductionEvidenceOnApproval: false,
		};
		const result = await updateGuardedPackingSettings(db, next, {
			now: new Date(changedAt),
		});
		expect(result.policy).toEqual({ ...next, revision: 1, changedAt });
		expect(savedMeta).toEqual({
			existingFeature: { enabled: true },
			guardedPacking: result.policy,
		});
	});

	it("runs delivery-policy effects inside the same settings transaction", async () => {
		const events: string[] = [];
		const db = {
			$transaction: async (fn: (tx: unknown) => unknown) =>
				fn({
					settings: {
						findFirst: async () => null,
						create: async () => events.push("policy persisted"),
					},
				}),
		} as Parameters<typeof updateGuardedPackingSettings>[0];

		await expect(
			updateGuardedPackingSettings(
				db,
				{
					...DEFAULT_GUARDED_PACKING_POLICY,
					reviewMode: "ALLOW_DELIVERY_WHILE_PENDING",
				},
				{
					now: new Date(changedAt),
					afterPersist: async () => {
						events.push("dispatches reconciled");
						return { readyDispatchCount: 2 };
					},
				},
			),
		).resolves.toMatchObject({
			persistedEffect: { readyDispatchCount: 2 },
		});
		expect(events).toEqual(["policy persisted", "dispatches reconciled"]);
	});
});
