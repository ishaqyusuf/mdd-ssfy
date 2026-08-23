import { describe, expect, test } from "bun:test";
import {
	recordSalesHandoffPolicyReconciliationRepair,
	recordSalesHandoffReconciliationRepair,
} from "./repair";

describe("Sales Handoff reconciliation repair", () => {
	test("keeps one visible open repair case per affected order", async () => {
		const cases: Array<Record<string, unknown>> = [];
		const db = {
			resolutionCase: {
				upsert: async ({
					where,
					create,
					update,
				}: {
					where: { id: string };
					create: Record<string, unknown>;
					update: Record<string, unknown>;
				}) => {
					let row = cases.find((candidate) => candidate.id === where.id);
					if (!row) {
						row = create;
						cases.push(row);
					} else {
						Object.assign(row, update);
					}
					return row;
				},
			},
		};

		await recordSalesHandoffReconciliationRepair(db as never, {
			salesOrderIds: [91, 91],
			actorUserId: 17,
			source: "test.payment",
			reason: "temporary failure",
		});
		await recordSalesHandoffReconciliationRepair(db as never, {
			salesOrderIds: [91],
			actorUserId: 18,
			source: "test.payment.retry",
			reason: "second failure",
			initialExposureMilestone: "POLICY_CHANGE",
			initialExposurePolicyRevision: 7,
			initialExposurePolicyChangedAt: "2026-08-23T09:00:00.000Z",
		});

		expect(cases).toHaveLength(1);
		expect(cases[0]).toMatchObject({
			scopeType: "sales_handoff_reconciliation",
			scopeId: "91",
			status: "open",
			summary: "Sales Handoff reconciliation requires repair for order 91.",
			meta: {
				salesOrderId: 91,
				actorUserId: 18,
				source: "test.payment.retry",
				reason: "second failure",
				lastFailedAt: expect.any(String),
				initialExposureMilestone: "POLICY_CHANGE",
				initialExposurePolicyRevision: 7,
				initialExposurePolicyChangedAt: "2026-08-23T09:00:00.000Z",
			},
		});
	});
});

describe("Sales Handoff policy reconciliation repair", () => {
	test("persists the original policy timestamp in the revision marker", async () => {
		let created: Record<string, unknown> | undefined;
		const db = {
			resolutionCase: {
				upsert: async ({ create }: { create: Record<string, unknown> }) => {
					created = create;
					return create;
				},
			},
		};

		await recordSalesHandoffPolicyReconciliationRepair(db as never, {
			policyRevision: 7,
			policyChangedAt: "2026-08-23T09:00:00.000Z",
			actorUserId: 17,
			source: "test.settings",
			reason: "complete fan-out required",
		});

		expect(created).toMatchObject({
			id: "sales-handoff-policy-repair:7",
			scopeType: "sales_handoff_policy_reconciliation",
			scopeId: "7",
			status: "open",
			meta: {
				policyRevision: 7,
				policyChangedAt: "2026-08-23T09:00:00.000Z",
			},
		});
	});
});
