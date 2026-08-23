import { describe, expect, test } from "bun:test";
import {
	type ProductionHandoffAssignment,
	type ProductionHandoffItem,
	projectProductionSalesHandoff,
} from "./production";

function assignment(
	overrides: Partial<ProductionHandoffAssignment> = {},
): ProductionHandoffAssignment {
	return {
		id: 1,
		salesItemId: 10,
		controlUid: "item-10",
		assignedToId: 7,
		qtyAssigned: 6,
		submissions: [],
		...overrides,
	};
}

function item(overrides: Partial<ProductionHandoffItem> = {}) {
	return {
		salesItemId: 10,
		controlUid: "item-10",
		productionCapable: true,
		requiredQty: 6,
		assignments: [],
		...overrides,
	} satisfies ProductionHandoffItem;
}

function project(items: ProductionHandoffItem[], materialReady = false) {
	return projectProductionSalesHandoff({
		paymentQualified: true,
		lifecycleActive: true,
		orderRevision: "order-r1",
		items,
		...({ materialReady } as Record<string, unknown>),
	});
}

describe("Production Sales Handoff projection", () => {
	test("requires ownership for the full production-capable quantity", () => {
		expect(project([item()])).toMatchObject({
			actionable: true,
			uncoveredQty: 6,
			targetControlUid: "item-10",
		});
		expect(project([item({ assignments: [assignment()] })])).toMatchObject({
			actionable: false,
			uncoveredQty: 0,
			reason: "FULLY_COVERED",
		});
	});

	test("keeps partial, split-worker, and active unowned quantity honest", () => {
		expect(
			project([item({ assignments: [assignment({ qtyAssigned: 2 })] })]),
		).toMatchObject({ actionable: true, uncoveredQty: 4 });
		expect(
			project([
				item({
					assignments: [
						assignment({ id: 1, qtyAssigned: 2, assignedToId: 7 }),
						assignment({ id: 2, qtyAssigned: 4, assignedToId: 8 }),
					],
				}),
			]),
		).toMatchObject({ actionable: false, uncoveredQty: 0 });
		expect(
			project([
				item({
					assignments: [assignment({ assignedToId: null, qtyAssigned: 6 })],
				}),
			]),
		).toMatchObject({
			actionable: true,
			uncoveredQty: 6,
			targetAssignmentId: 1,
		});
	});

	test("dedupes repeated rows and excludes soft-deleted or non-current assignment identities", () => {
		const repeated = assignment({ qtyAssigned: 3 });
		expect(
			project([item({ assignments: [repeated, repeated] })]),
		).toMatchObject({
			actionable: true,
			uncoveredQty: 3,
		});
		for (const excluded of [
			assignment({ deletedAt: "2026-08-23T00:00:00Z" }),
			assignment({ salesItemId: 11 }),
			assignment({ controlUid: "item-11" }),
		]) {
			expect(project([item({ assignments: [excluded] })])).toMatchObject({
				actionable: true,
				uncoveredQty: 6,
			});
		}
	});

	test("finalized attributable work covers after closure without double counting its assignment", () => {
		const completed = assignment({
			assignedToId: null,
			completedAt: "2026-08-23T00:00:00Z",
			submissions: [{ id: 1, qty: 6, materialReview: { status: "APPROVED" } }],
		});
		expect(project([item({ assignments: [completed] })])).toMatchObject({
			actionable: false,
			uncoveredQty: 0,
		});
		expect(
			project([
				item({
					assignments: [
						assignment({
							qtyAssigned: 6,
							submissions: [{ id: 1, qty: 6 }],
						}),
					],
				}),
			]),
		).toMatchObject({ actionable: false, uncoveredQty: 0 });
	});

	test("pending, rejected, deleted, and unrelated submissions do not cover", () => {
		for (const submission of [
			{ id: 1, qty: 6, materialReview: { status: "PENDING" } },
			{ id: 1, qty: 6, materialReview: { status: "REJECTED" } },
			{ id: 1, qty: 6, deletedAt: "2026-08-23T00:00:00Z" },
		]) {
			expect(
				project([
					item({
						assignments: [
							assignment({ assignedToId: null, submissions: [submission] }),
						],
					}),
				]),
			).toMatchObject({ actionable: true, uncoveredQty: 6 });
		}
	});

	test("does not require non-production, deleted, or terminal order work", () => {
		expect(project([item({ productionCapable: false })])).toMatchObject({
			actionable: false,
			reason: "NO_PRODUCTION_REQUIRED",
		});
		expect(project([item({ deletedAt: "2026-08-23" })])).toMatchObject({
			actionable: false,
			reason: "NO_PRODUCTION_REQUIRED",
		});
		expect(
			projectProductionSalesHandoff({
				paymentQualified: true,
				lifecycleActive: false,
				orderRevision: "order-r1",
				items: [item()],
			}),
		).toMatchObject({ actionable: false, reason: "ORDER_INACTIVE" });
	});

	test("order revisions expose only new uncovered quantity and preserve completed work", () => {
		const completed = assignment({
			completedAt: "2026-08-22T00:00:00Z",
			qtyAssigned: 6,
		});
		const before = projectProductionSalesHandoff({
			paymentQualified: true,
			lifecycleActive: true,
			orderRevision: "order-r1",
			items: [item({ assignments: [completed] })],
		});
		const revised = projectProductionSalesHandoff({
			paymentQualified: true,
			lifecycleActive: true,
			orderRevision: "order-r2",
			items: [item({ requiredQty: 8, assignments: [completed] })],
		});
		expect(before).toMatchObject({ actionable: false, uncoveredQty: 0 });
		expect(revised).toMatchObject({ actionable: true, uncoveredQty: 2 });
		expect(before.evidenceRevision).not.toBe(revised.evidenceRevision);
	});

	test("material state is not an input to production qualification", () => {
		expect(project([item()], false)).toEqual(project([item()], true));
	});
});
