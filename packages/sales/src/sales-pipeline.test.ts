import { describe, expect, it } from "bun:test";

import {
	type SalesPipelineEvidence,
	compareSalesPipelineShadow,
	isProductionScheduleAssignmentOpen,
	matchesCanonicalSalesPipelineFilter,
	projectSalesPipelineForAudience,
	resolveCanonicalWorkspaceMembership,
	resolveSalesPipelineSnapshot,
} from "./sales-pipeline";

const baseEvidence = (
	overrides: Partial<SalesPipelineEvidence> = {},
): SalesPipelineEvidence => ({
	salesOrderId: 42,
	orderNo: "09502PC",
	commercial: { status: "open", deletedAt: null, archivedAt: null },
	payment: { total: 1_250, amountDue: 0, reviewStatus: null },
	material: {
		applicability: "required",
		requiredQty: 5,
		readyQty: 5,
	},
	production: {
		configuredRequirement: true,
		requiredQty: 5,
		assignments: [],
		submissions: [],
		aggregate: null,
		administrativeCompletion: null,
	},
	fulfillment: {
		configuredRequirement: true,
		requiredQty: 5,
		packedQty: 0,
		dispatches: [],
		administrativeCompletion: null,
	},
	...overrides,
});

describe("canonical Sales Pipeline snapshot", () => {
	it("keeps assignment-backed Production authoritative when the aggregate is missing", () => {
		const evidence = baseEvidence({
			production: {
				configuredRequirement: true,
				requiredQty: 5,
				assignments: [
					{
						id: 101,
						active: true,
						assignedQty: 5,
						completedQty: 0,
						dueDate: "2026-09-02T09:00:00.000Z",
						assignedToId: 17,
					},
				],
				submissions: [],
				aggregate: null,
				administrativeCompletion: null,
			},
		});

		const snapshot = resolveSalesPipelineSnapshot(evidence);

		expect(snapshot.version).toBe("sales-pipeline/v2");
		expect(snapshot.headline.code).toBe("production_queued");
		expect(snapshot.production).toMatchObject({
			applicability: "required",
			state: "assigned",
			requiredQty: 5,
			completedQty: 0,
		});
		expect(snapshot.provenance).toContainEqual(
			expect.objectContaining({
				dimension: "production",
				source: "production_assignment",
				precedence: 1,
			}),
		);
	});

	it("does not allow zero, stale, or contradictory SalesStat evidence to prove no Production", () => {
		const variants = [
			{ total: 0, score: 0, percentage: 0, updatedAt: "2026-09-02" },
			{ total: 5, score: 5, percentage: 100, updatedAt: "2025-01-01" },
			{ total: 5, score: 5, percentage: 100, updatedAt: "2026-09-02" },
		];

		for (const aggregate of variants) {
			const snapshot = resolveSalesPipelineSnapshot(
				baseEvidence({
					production: {
						configuredRequirement: true,
						requiredQty: 5,
						assignments: [
							{
								id: 101,
								active: true,
								assignedQty: 5,
								completedQty: 0,
								dueDate: "2026-09-02",
							},
						],
						submissions: [],
						aggregate,
						administrativeCompletion: null,
					},
				}),
			);

			expect(snapshot.production.state).toBe("assigned");
			expect(snapshot.production.applicability).toBe("required");
		}
	});

	it("reports legacy differences in shadow mode without changing the snapshot", () => {
		const snapshot = resolveSalesPipelineSnapshot(
			baseEvidence({
				legacy: {
					orderStatus: "Completed",
					productionStatus: "N/A",
					fulfillmentStatus: "Fulfilled",
				},
			}),
		);
		const comparison = compareSalesPipelineShadow(snapshot, {
			legacyHeadline: "fulfilled",
			legacyProductionIncluded: false,
			legacyFulfillmentIncluded: false,
		});

		expect(snapshot.headline.code).toBe("awaiting_production");
		expect(comparison.changedVisibleState).toBe(false);
		expect(comparison.differences.map((item) => item.code)).toContain(
			"HEADLINE_MISMATCH",
		);
	});

	it("excludes administrative completion from active shadow membership", () => {
		const snapshot = resolveSalesPipelineSnapshot(
			baseEvidence({
				production: {
					configuredRequirement: true,
					requiredQty: 1,
					assignments: [],
					submissions: [],
					aggregate: null,
					administrativeCompletion: {
						method: "STATUS_ONLY",
						recordId: "production-admin",
						recordedAt: "2026-09-02",
					},
				},
				fulfillment: {
					configuredRequirement: true,
					requiredQty: 1,
					packedQty: 0,
					dispatches: [],
					administrativeCompletion: {
						method: "STATUS_ONLY",
						recordId: "fulfillment-admin",
						recordedAt: "2026-09-02",
					},
				},
			}),
		);

		expect(
			compareSalesPipelineShadow(snapshot, {
				legacyProductionIncluded: false,
				legacyFulfillmentIncluded: false,
			}).differences,
		).toEqual([]);
	});

	it("resolves bounded batches deterministically", () => {
		const startedAt = performance.now();
		const revisions = Array.from(
			{ length: 1_000 },
			() => resolveSalesPipelineSnapshot(baseEvidence()).revision,
		);

		expect(new Set(revisions).size).toBe(1);
		expect(performance.now() - startedAt).toBeLessThan(1_000);
	});

	it("keeps revisions stable when equivalent evidence arrays arrive reordered", () => {
		const first = baseEvidence({
			production: {
				...baseEvidence().production,
				assignments: [
					{ id: 2, active: true, assignedQty: 2, completedQty: 0 },
					{ id: 1, active: true, assignedQty: 3, completedQty: 0 },
				],
			},
		});
		const second = {
			...first,
			production: {
				...first.production,
				assignments: [...first.production.assignments].reverse(),
			},
		};

		expect(resolveSalesPipelineSnapshot(first).revision).toBe(
			resolveSalesPipelineSnapshot(second).revision,
		);
	});

	it("marks explicit non-production configuration with operational evidence as a conflict", () => {
		const snapshot = resolveSalesPipelineSnapshot(
			baseEvidence({
				production: {
					configuredRequirement: false,
					requiredQty: 0,
					assignments: [
						{
							id: 202,
							active: true,
							assignedQty: 1,
							completedQty: 0,
							dueDate: "2026-09-02",
						},
					],
					submissions: [],
					aggregate: { total: 0, score: 0, percentage: 0 },
					administrativeCompletion: null,
				},
			}),
		);

		expect(snapshot.production.applicability).toBe("conflict");
		expect(snapshot.conflicts).toContainEqual(
			expect.objectContaining({
				code: "PRODUCTION_NOT_REQUIRED_WITH_OPERATIONAL_EVIDENCE",
			}),
		);
		expect(snapshot.capabilities.markProductionCompleted.allowed).toBe(false);
	});

	it("keeps Administrative Completion distinct from operational proof", () => {
		const snapshot = resolveSalesPipelineSnapshot(
			baseEvidence({
				production: {
					configuredRequirement: true,
					requiredQty: 5,
					assignments: [],
					submissions: [],
					aggregate: null,
					administrativeCompletion: {
						method: "STATUS_ONLY",
						recordedAt: "2026-09-02T12:00:00.000Z",
						recordedById: 9,
					},
				},
				fulfillment: {
					configuredRequirement: true,
					requiredQty: 5,
					packedQty: 5,
					dispatches: [],
					administrativeCompletion: {
						method: "STATUS_ONLY",
						recordedAt: "2026-09-02T12:05:00.000Z",
						recordedById: 9,
					},
				},
			}),
		);

		expect(snapshot.production.state).toBe("administratively_completed");
		expect(snapshot.fulfillment.state).toBe("administratively_completed");
		expect(snapshot.headline.code).toBe("administratively_completed");
		expect(snapshot.fulfillment.operationallyComplete).toBe(false);
	});

	it("requires item-bearing proof and committed inventory for canonical Fulfilled", () => {
		const partial = resolveSalesPipelineSnapshot(
			baseEvidence({
				production: {
					configuredRequirement: false,
					requiredQty: 0,
					assignments: [],
					submissions: [],
					aggregate: null,
					administrativeCompletion: null,
				},
				fulfillment: {
					configuredRequirement: true,
					requiredQty: 5,
					packedQty: 5,
					dispatches: [
						{
							id: 301,
							active: true,
							itemCount: 1,
							deliveredQty: 3,
							proofCompleted: true,
							inventoryCommitted: true,
							status: "completed",
						},
					],
					administrativeCompletion: null,
				},
			}),
		);
		expect(partial.fulfillment.state).toBe("partially_fulfilled");
		expect(partial.headline.code).not.toBe("fulfilled");

		const fulfilled = resolveSalesPipelineSnapshot({
			...partial.evidence,
			fulfillment: {
				...partial.evidence.fulfillment,
				dispatches: [
					{
						id: 301,
						active: true,
						itemCount: 1,
						deliveredQty: 5,
						proofCompleted: true,
						inventoryCommitted: true,
						status: "completed",
					},
				],
			},
		});
		expect(fulfilled.fulfillment.state).toBe("fulfilled");
		expect(fulfilled.headline.code).toBe("fulfilled");
	});

	it("does not hide an open scheduled assignment when total submissions reach required quantity", () => {
		const snapshot = resolveSalesPipelineSnapshot(
			baseEvidence({
				production: {
					configuredRequirement: true,
					requiredQty: 5,
					assignments: [
						{
							id: 1,
							active: true,
							assignedQty: 5,
							completedQty: 0,
							dueDate: "2026-09-01",
						},
						{
							id: 2,
							active: true,
							assignedQty: 1,
							completedQty: 0,
							dueDate: "2026-09-02",
						},
					],
					submissions: [
						{
							id: 10,
							assignmentId: 1,
							active: true,
							quantity: 5,
						},
					],
					aggregate: { total: 5, score: 5, percentage: 100 },
					administrativeCompletion: null,
				},
			}),
		);

		expect(snapshot.production.state).toBe("in_production");
		expect(
			resolveCanonicalWorkspaceMembership(snapshot, {
				workspace: "production",
				scope: "due_today",
				operationalDate: "2026-09-02",
			}).included,
		).toBe(true);
	});
});

describe("canonical workspace membership", () => {
	it("treats fully submitted legacy assignments as completed even when completedAt is stale", () => {
		expect(
			isProductionScheduleAssignmentOpen({
				assignedQty: 2,
				completedQty: 0,
				completedAt: null,
				submissions: [{ quantity: 2, active: true, reviewStatus: "APPROVED" }],
			}),
		).toBe(false);
		expect(
			isProductionScheduleAssignmentOpen({
				assignedQty: 2,
				completedQty: 0,
				completedAt: null,
				submissions: [{ quantity: 1, active: true, reviewStatus: "APPROVED" }],
			}),
		).toBe(true);
	});

	it("gives Calendar, Due Today, and counts the same September 2 order universe", () => {
		const evidence = baseEvidence({
			production: {
				configuredRequirement: true,
				requiredQty: 5,
				assignments: [
					{
						id: 401,
						active: true,
						assignedQty: 3,
						completedQty: 0,
						dueDate: "2026-09-02T08:00:00.000Z",
					},
					{
						id: 402,
						active: true,
						assignedQty: 2,
						completedQty: 0,
						dueDate: "2026-09-02T15:00:00.000Z",
					},
				],
				submissions: [],
				aggregate: { total: 0, score: 0, percentage: 0 },
				administrativeCompletion: null,
			},
		});
		const snapshot = resolveSalesPipelineSnapshot(evidence);

		for (const scope of ["calendar", "due_today"] as const) {
			expect(
				resolveCanonicalWorkspaceMembership(snapshot, {
					workspace: "production",
					scope,
					operationalDate: "2026-09-02",
					from: "2026-09-02",
					to: "2026-09-02",
				}).included,
			).toBe(true);
		}
		expect(snapshot.production.assignmentIds).toEqual([401, 402]);
	});

	it("pins the five September 2 assignment-backed orders at the canonical seam", () => {
		const orders = ["09502PC", "09543PC", "09457DB", "09504PC", "09455PC"];
		const snapshots = orders.map((orderNo, index) =>
			resolveSalesPipelineSnapshot(
				baseEvidence({
					salesOrderId: 600 + index,
					orderNo,
					production: {
						configuredRequirement: true,
						requiredQty: 1,
						assignments: [
							{
								id: 700 + index,
								active: true,
								assignedQty: 1,
								completedQty: 0,
								dueDate: "2026-09-02",
							},
						],
						submissions: [],
						aggregate: null,
						administrativeCompletion: null,
					},
				}),
			),
		);
		const inScope = (scope: "calendar" | "due_today") =>
			snapshots.filter(
				(snapshot) =>
					resolveCanonicalWorkspaceMembership(snapshot, {
						workspace: "production",
						scope,
						operationalDate: "2026-09-02",
						from: "2026-09-02",
						to: "2026-09-02",
					}).included,
			);

		expect(inScope("calendar").map((item) => item.evidence.orderNo)).toEqual(
			orders,
		);
		expect(inScope("due_today").map((item) => item.evidence.orderNo)).toEqual(
			orders,
		);
	});

	it("keeps earlier active work in Past Due and completed work out of open scopes", () => {
		const open = resolveSalesPipelineSnapshot(
			baseEvidence({
				production: {
					configuredRequirement: true,
					requiredQty: 1,
					assignments: [
						{
							id: 501,
							active: true,
							assignedQty: 1,
							completedQty: 0,
							dueDate: "2026-09-01",
						},
					],
					submissions: [],
					aggregate: null,
					administrativeCompletion: null,
				},
			}),
		);
		expect(
			resolveCanonicalWorkspaceMembership(open, {
				workspace: "production",
				scope: "past_due",
				operationalDate: "2026-09-02",
			}).included,
		).toBe(true);

		const completed = resolveSalesPipelineSnapshot({
			...open.evidence,
			production: {
				...open.evidence.production,
				assignments: [
					{
						...open.evidence.production.assignments[0]!,
						completedQty: 1,
						completedAt: "2026-09-01T12:00:00.000Z",
					},
				],
			},
		});
		expect(
			resolveCanonicalWorkspaceMembership(completed, {
				workspace: "production",
				scope: "past_due",
				operationalDate: "2026-09-02",
			}).included,
		).toBe(false);
		expect(
			resolveCanonicalWorkspaceMembership(completed, {
				workspace: "production",
				scope: "completed",
				operationalDate: "2026-09-02",
			}).included,
		).toBe(true);
	});

	it("keeps split and partially delivered Dispatch work out of Fulfillment Completed", () => {
		const partial = resolveSalesPipelineSnapshot(
			baseEvidence({
				production: {
					configuredRequirement: false,
					requiredQty: 0,
					assignments: [],
					submissions: [],
					aggregate: null,
					administrativeCompletion: null,
				},
				fulfillment: {
					configuredRequirement: true,
					requiredQty: 5,
					packedQty: 5,
					dispatches: [
						{
							id: 801,
							active: true,
							itemCount: 1,
							deliveredQty: 3,
							status: "completed",
							proofCompleted: true,
							inventoryCommitted: true,
						},
						{
							id: 802,
							active: true,
							itemCount: 1,
							deliveredQty: 0,
							status: "packed",
							proofCompleted: false,
							inventoryCommitted: false,
						},
					],
					administrativeCompletion: null,
				},
			}),
		);

		expect(partial.fulfillment.state).toBe("partially_fulfilled");
		expect(
			resolveCanonicalWorkspaceMembership(partial, {
				workspace: "fulfillment",
				scope: "completed",
				operationalDate: "2026-09-02",
			}).included,
		).toBe(false);
		expect(
			resolveCanonicalWorkspaceMembership(partial, {
				workspace: "fulfillment",
				scope: "active",
				operationalDate: "2026-09-02",
			}).included,
		).toBe(true);
	});

	it("excludes deleted and non-production orders independently from lifecycle", () => {
		const nonProduction = resolveSalesPipelineSnapshot(
			baseEvidence({
				commercial: {
					status: "open",
					deletedAt: "2026-09-02",
					archivedAt: null,
				},
				production: {
					configuredRequirement: false,
					requiredQty: 0,
					assignments: [],
					submissions: [],
					aggregate: { total: 0, score: 0, percentage: 0 },
					administrativeCompletion: null,
				},
			}),
		);
		const membership = resolveCanonicalWorkspaceMembership(nonProduction, {
			workspace: "production",
			scope: "completed",
			operationalDate: "2026-09-02",
		});
		expect(membership).toMatchObject({
			included: false,
			reasons: expect.arrayContaining(["SOFT_DELETED", "STAGE_NOT_REQUIRED"]),
		});
	});
});

describe("canonical lifecycle filters", () => {
	it("uses the same open assignment evidence for date filters", () => {
		const snapshot = resolveSalesPipelineSnapshot(
			baseEvidence({
				production: {
					configuredRequirement: true,
					requiredQty: 5,
					assignments: [
						{
							id: 901,
							active: true,
							assignedQty: 5,
							completedQty: 0,
							dueDate: "2026-09-02",
						},
					],
					submissions: [],
					aggregate: null,
					administrativeCompletion: null,
				},
			}),
		);

		expect(
			matchesCanonicalSalesPipelineFilter(
				snapshot,
				{ productionStatus: "due today" },
				"2026-09-02",
			),
		).toBe(true);
		expect(
			matchesCanonicalSalesPipelineFilter(
				snapshot,
				{ productionStatus: "past due" },
				"2026-09-03",
			),
		).toBe(true);
	});

	it("keeps Administrative Completion terminal but distinct from proof", () => {
		const snapshot = resolveSalesPipelineSnapshot(
			baseEvidence({
				production: {
					configuredRequirement: true,
					requiredQty: 5,
					assignments: [],
					submissions: [],
					aggregate: null,
					administrativeCompletion: { active: true, recordId: 77 },
				},
			}),
		);

		expect(snapshot.production.state).toBe("administratively_completed");
		expect(
			matchesCanonicalSalesPipelineFilter(
				snapshot,
				{ productionCompletion: "completed" },
				"2026-09-02",
			),
		).toBe(true);
		expect(
			matchesCanonicalSalesPipelineFilter(
				snapshot,
				{ production: "pending" },
				"2026-09-02",
			),
		).toBe(false);
	});
});

describe("audience projections", () => {
	it("maps customer wording from the canonical snapshot without leaking internal evidence", () => {
		const snapshot = resolveSalesPipelineSnapshot(baseEvidence());
		const projection = projectSalesPipelineForAudience(snapshot, "customer");

		expect(projection.revision).toBe(snapshot.revision);
		expect(projection.status.code).toBe("processing");
		expect(projection).not.toHaveProperty("provenance");
		expect(projection).not.toHaveProperty("conflicts");
	});
});
