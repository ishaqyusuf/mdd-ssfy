import { describe, expect, it } from "bun:test";
import {
	SALES_PIPELINE_CONTRACT_VERSION,
	resolveSalesPipelineSnapshot,
	salesOrderListProjectionVersion,
} from "@gnd/sales";
import {
	buildShadowLatencyEvidence,
	classifyAdministrativeResolutionPolicy,
	classifyConflictSourceFacts,
	classifyProjectionFreshnessObservations,
	classifyShadowMembershipDifferences,
	collectSalesPipelineShadowReport,
	countShadowMembershipReasons,
	isUnsafeShadowTransition,
	percentile95,
	simulateAdministrativeResolution,
	withShadowDatabaseReadRetry,
} from "./sales-pipeline-shadow-report";

describe("Sales Pipeline shadow report", () => {
	it("does not classify an audited administrative completion as unsafe", () => {
		const snapshot = resolveSalesPipelineSnapshot({
			salesOrderId: 90,
			orderNo: "SO-90",
			commercial: { status: "fulfilled" },
			payment: { total: 100, amountDue: 0 },
			material: { applicability: "not_required", requiredQty: 0, readyQty: 0 },
			production: {
				configuredRequirement: true,
				requiredQty: 0,
				assignments: [],
				submissions: [],
				aggregate: null,
				administrativeCompletion: null,
			},
			fulfillment: {
				configuredRequirement: true,
				requiredQty: 1,
				packedQty: 1,
				dispatches: [
					{
						id: 90,
						active: true,
						itemCount: 1,
						deliveredQty: 0,
						status: "completed",
						proofCompleted: false,
						inventoryCommitted: true,
					},
				],
				administrativeCompletion: {
					recordId: "completion-90",
					method: "STATUS_ONLY",
					recordedAt: "2026-09-06T00:00:00.000Z",
				},
			},
		});

		expect(snapshot.headline.code).toBe("administratively_completed");
		expect(snapshot.conflicts).toHaveLength(1);
		expect(
			isUnsafeShadowTransition(snapshot, "fulfilled", {
				fulfillmentRecords: new Map([
					["completion-90", new Set(["FULFILLMENT_PROOF_INCOMPLETE"])],
				]),
			}),
		).toBe(false);
		expect(
			isUnsafeShadowTransition(snapshot, "fulfilled", {
				fulfillmentRecords: new Map([
					["completion-90", new Set(["OTHER_CONFLICT"])],
				]),
			}),
		).toBe(true);
		expect(isUnsafeShadowTransition(snapshot, "fulfilled")).toBe(true);
	});

	it("classifies the operational fact shape behind cross-stage conflicts", () => {
		const snapshot = resolveSalesPipelineSnapshot({
			salesOrderId: 92,
			orderNo: "SO-92",
			commercial: { status: "open" },
			payment: { total: 100, amountDue: 0 },
			material: {
				applicability: "not_required",
				requiredQty: 0,
				readyQty: 0,
			},
			production: {
				configuredRequirement: false,
				requiredQty: 1,
				assignments: [
					{
						id: 92,
						active: true,
						assignedQty: 1,
						completedQty: 1,
						completedAt: "2026-09-01T10:00:00.000Z",
					},
					{
						id: 94,
						active: true,
						assignedQty: 0,
						completedQty: 0,
						completedAt: null,
					},
					{
						id: 95,
						active: true,
						assignedQty: 1,
						completedQty: 0,
						completedAt: null,
					},
				],
				submissions: [
					{
						id: 95,
						assignmentId: 95,
						active: true,
						quantity: 1,
						reviewStatus: "PENDING_REVIEW",
					},
				],
				aggregate: null,
				administrativeCompletion: null,
			},
			fulfillment: {
				configuredRequirement: true,
				requiredQty: 1,
				packedQty: 1,
				dispatches: [
					{
						id: 93,
						active: true,
						itemCount: 1,
						deliveredQty: 1,
						status: "completed",
						proofCompleted: false,
						inventoryCommitted: false,
					},
				],
				administrativeCompletion: null,
			},
		});

		expect(snapshot.conflicts.map((conflict) => conflict.code)).toEqual([
			"PRODUCTION_NOT_REQUIRED_WITH_OPERATIONAL_EVIDENCE",
			"FULFILLMENT_PROOF_INCOMPLETE",
		]);
		expect(classifyConflictSourceFacts(snapshot)).toEqual({
			productionAssignmentShape: "open_completion_evidenced_and_indeterminate",
			activeProductionAssignments: 3,
			openProductionAssignments: 1,
			openProductionAssignmentIds: [95],
			completionEvidencedProductionAssignments: 1,
			completionEvidencedProductionAssignmentIds: [92],
			indeterminateProductionAssignments: 1,
			indeterminateProductionAssignmentIds: [94],
			fulfillmentEvidenceGap: "proof_and_inventory_missing",
			completedItemDispatches: 1,
			missingProofDispatches: 1,
			missingProofDispatchIds: [93],
			missingInventoryDispatches: 1,
			missingInventoryDispatchIds: [93],
		});
	});

	it("reports status-only policy actionability without authorizing a write", () => {
		const snapshot = resolveSalesPipelineSnapshot({
			salesOrderId: 91,
			orderNo: "SO-91",
			commercial: { status: "open" },
			payment: { total: 100, amountDue: 100 },
			material: {
				applicability: "not_required",
				requiredQty: 0,
				readyQty: 0,
			},
			production: {
				configuredRequirement: false,
				requiredQty: 1,
				assignments: [
					{
						id: 91,
						active: true,
						assignedQty: 1,
						completedQty: 0,
						completedAt: null,
					},
				],
				submissions: [],
				aggregate: null,
				administrativeCompletion: null,
			},
			fulfillment: {
				configuredRequirement: false,
				requiredQty: 0,
				packedQty: 0,
				dispatches: [],
				administrativeCompletion: null,
			},
		});

		expect(classifyAdministrativeResolutionPolicy(snapshot)).toEqual({
			readyMilestones: ["production"],
			production: expect.objectContaining({ status: "ready" }),
			fulfillment: expect.objectContaining({ status: "rejected" }),
			notAuthorization: true,
		});
		const evidenceBeforeSimulation = structuredClone(snapshot.evidence);
		expect(simulateAdministrativeResolution(snapshot)).toEqual({
			eligibleMilestones: ["production"],
			resultingHeadline: "administratively_completed",
			resultingProductionState: "administratively_completed",
			resultingFulfillmentState: "not_required",
			remainingBlockingConflictCodes: [
				"PRODUCTION_NOT_REQUIRED_WITH_OPERATIONAL_EVIDENCE",
			],
			operationalFactsChanged: false,
			notAuthorization: true,
		});
		expect(snapshot.evidence).toEqual(evidenceBeforeSimulation);
	});

	it("refuses an empty audit instead of reporting zero differences and latency", async () => {
		await expect(
			collectSalesPipelineShadowReport({
				readProjections: async () => [],
				readSnapshots: async () => new Map(),
			}),
		).rejects.toThrow("No eligible projections");
	});

	it("blocks unresolved revision drift even while the source keeps changing", async () => {
		let reads = 0;
		const report = await collectSalesPipelineShadowReport({
			readProjections: async () => [
				{
					salesOrderId: 1,
					orderId: "SO-1",
					pipelineRevision: "old",
					payload: {},
				},
			],
			readSnapshots: async () =>
				new Map([
					[1, { ...shadowSnapshot(), revision: `revision-${++reads}` }],
				]),
		});
		expect(report.concurrentFreshnessDifferences).toBe(1);
		expect(report.staleProjectionDifferences).toBe(1);
	});

	it("retains every unsafe transition in a dedicated evidence sample", async () => {
		const snapshot = shadowSnapshot();
		const unsafeSnapshot = {
			...snapshot,
			conflicts: [
				...snapshot.conflicts,
				{
					code: "PRODUCTION_NOT_REQUIRED_WITH_OPERATIONAL_EVIDENCE" as const,
					dimensions: ["production"],
					severity: "blocking" as const,
					message: "Conflicting operational evidence",
				},
			],
		};
		const ordinaryRows = Array.from({ length: 51 }, (_, index) => ({
			salesOrderId: index + 1,
			orderId: `SO-${index + 1}`,
			pipelineRevision: snapshot.revision,
			payload: { pipelineLegacyPresentation: { status: "completed" } },
		}));
		const rows = [
			...ordinaryRows,
			{
				salesOrderId: 52,
				orderId: "SO-UNSAFE",
				pipelineRevision: unsafeSnapshot.revision,
				payload: { pipelineLegacyPresentation: { status: "completed" } },
			},
		];
		const report = await collectSalesPipelineShadowReport({
			readProjections: async (query) => {
				const selectedIds = (
					query.where?.salesOrderId as { in?: number[] } | undefined
				)?.in;
				if (selectedIds) {
					return rows.filter((row) => selectedIds.includes(row.salesOrderId));
				}
				const after = query.cursor?.salesOrderId ?? 0;
				return rows
					.filter((row) => row.salesOrderId > after)
					.slice(0, query.take ?? 20);
			},
			readSnapshots: async () =>
				new Map([
					...ordinaryRows.map((row) => [row.salesOrderId, snapshot] as const),
					[52, unsafeSnapshot],
				]),
		});

		expect(report.unsafeTransitionDifferences).toBe(1);
		expect(report.samples).toHaveLength(50);
		expect(report.samples.some((sample) => sample.salesOrderId === 52)).toBe(
			false,
		);
		expect(report.unsafeTransitionSamples).toEqual([
			expect.objectContaining({
				salesOrderId: 52,
				orderNo: "SO-UNSAFE",
				legacyHeadline: "completed",
				blockingConflictCodes: [
					"PRODUCTION_NOT_REQUIRED_WITH_OPERATIONAL_EVIDENCE",
				],
				unsafe: true,
			}),
		]);
	});

	it.each([true, false])(
		"retains missing canonical evidence in the blocking audit (missing initially: %s)",
		async (missingInitially) => {
			let reads = 0;
			const report = await collectSalesPipelineShadowReport({
				readProjections: async () => [
					{
						salesOrderId: 1,
						orderId: "SO-1",
						pipelineRevision: "old",
						payload: {},
					},
				],
				readSnapshots: async () => {
					reads += 1;
					return !missingInitially && reads === 1
						? new Map([[1, shadowSnapshot()]])
						: new Map();
				},
			});
			expect(report.comparedOrders).toBe(1);
			expect(report.staleProjectionDifferences).toBe(1);
			expect(report.samples[0]?.differenceCodes).toContain(
				"CANONICAL_EVIDENCE_MISSING",
			);
		},
	);

	it.each(["state", "version", "pipelineContractVersion"] as const)(
		"blocks a projection that loses %s eligibility during revalidation",
		async (field) => {
			const snapshot = shadowSnapshot();
			let reads = 0;
			const report = await collectSalesPipelineShadowReport({
				readProjections: async (query) => {
					reads += 1;
					const row = {
						salesOrderId: 1,
						orderId: "SO-1",
						pipelineRevision: reads === 1 ? "old" : snapshot.revision,
						payload: {},
						state: "ready",
						version: salesOrderListProjectionVersion(),
						pipelineContractVersion: SALES_PIPELINE_CONTRACT_VERSION,
					};
					const actualEligibility = reads > 1 ? "ineligible" : row[field];
					return query.where?.[field] &&
						query.where[field] !== actualEligibility
						? []
						: [row];
				},
				readSnapshots: async () => new Map([[1, snapshot]]),
			});
			expect(report.comparedOrders).toBe(1);
			expect(report.staleProjectionDifferences).toBe(1);
		},
	);

	it("calculates p95 from measured database/resolver batch durations", () => {
		expect(percentile95([])).toBe(0);
		expect(percentile95([1, 3, 2, 100, 4, 5, 6, 7, 8, 9, 10])).toBe(100);
		expect(
			percentile95(Array.from({ length: 100 }, (_, index) => index + 1)),
		).toBe(95);
	});

	it("gates on served projection reads while retaining resolver audit latency", () => {
		expect(
			buildShadowLatencyEvidence({
				projectionPageLatencies: [80, 100, 120],
				resolverAuditLatencies: [4_000, 5_000, 6_000],
			}),
		).toEqual({
			p95LatencyMs: 120,
			latencyMeasurement: {
				kind: "materialized-projection-page-read",
				sampleCount: 3,
				pageSize: 20,
			},
			auditResolverP95LatencyMs: 6_000,
			auditResolverLatencyMeasurement: {
				kind: "fresh-canonical-resolver-batch",
				sampleCount: 3,
				resolverBatchSize: 100,
			},
		});
	});

	it("requires a repeated mismatch before treating live-scan revision drift as persistent", () => {
		expect(
			classifyProjectionFreshnessObservations([
				{ projectionRevision: "old", snapshotRevision: "new" },
				{ projectionRevision: "new", snapshotRevision: "new" },
			]),
		).toBe("fresh");
		expect(
			classifyProjectionFreshnessObservations([
				{ projectionRevision: "old", snapshotRevision: "new-1" },
				{ projectionRevision: "new-1", snapshotRevision: "new-2" },
				{ projectionRevision: "new-2", snapshotRevision: "new-3" },
			]),
		).toBe("concurrent_change");
		expect(
			classifyProjectionFreshnessObservations([
				{ projectionRevision: "old", snapshotRevision: "new" },
				{ projectionRevision: "old", snapshotRevision: "new" },
			]),
		).toBe("persistent_stale");
	});

	it("retries transient production reads and resets the connection", async () => {
		let attempts = 0;
		let resets = 0;
		const result = await withShadowDatabaseReadRetry(
			async () => {
				attempts += 1;
				if (attempts < 3) {
					throw Object.assign(new Error("Can't reach database server"), {
						code: "P1001",
					});
				}
				return "connected";
			},
			{
				attempts: 3,
				delayMs: 0,
				resetConnection: async () => {
					resets += 1;
				},
			},
		);

		expect(result).toBe("connected");
		expect(attempts).toBe(3);
		expect(resets).toBe(2);
	});

	it("does not retry non-connection failures", async () => {
		let attempts = 0;
		await expect(
			withShadowDatabaseReadRetry(
				async () => {
					attempts += 1;
					throw new Error("invalid query");
				},
				{ attempts: 3, delayMs: 0 },
			),
		).rejects.toThrow("invalid query");
		expect(attempts).toBe(1);
	});

	it("summarizes every review reason for representative conflict sampling", () => {
		expect(
			countShadowMembershipReasons([
				{
					membershipClassification: "review_required",
					membershipReasons: [
						"PRODUCTION_APPLICABILITY_UNKNOWN",
						"FULFILLMENT_APPLICABILITY_CONFLICT",
					],
				},
				{
					membershipClassification: "explained",
					membershipReasons: ["PRODUCTION_EXPLICITLY_NOT_REQUIRED"],
				},
				{
					membershipClassification: "review_required",
					membershipReasons: ["PRODUCTION_APPLICABILITY_UNKNOWN"],
				},
			]),
		).toEqual({
			FULFILLMENT_APPLICABILITY_CONFLICT: 1,
			PRODUCTION_APPLICABILITY_UNKNOWN: 2,
		});
	});
});

function shadowSnapshot() {
	return resolveSalesPipelineSnapshot({
		salesOrderId: 1,
		orderNo: "SO-1",
		commercial: { status: "open" },
		payment: { total: 100, amountDue: 100 },
		material: { applicability: "not_required", requiredQty: 0, readyQty: 0 },
		production: {
			configuredRequirement: false,
			requiredQty: 0,
			assignments: [],
			submissions: [],
			aggregate: null,
			administrativeCompletion: null,
		},
		fulfillment: {
			configuredRequirement: false,
			requiredQty: 0,
			packedQty: 0,
			dispatches: [],
			administrativeCompletion: null,
		},
	});
}

describe("Sales Pipeline shadow membership classification", () => {
	it("explains intentional non-required and terminal semantic differences", () => {
		const snapshot = resolveSalesPipelineSnapshot({
			salesOrderId: 1,
			orderNo: "SO-1",
			commercial: { status: "open" },
			payment: { total: 100, amountDue: 0 },
			material: {
				applicability: "not_required",
				requiredQty: 0,
				readyQty: 0,
			},
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
				requiredQty: 1,
				packedQty: 1,
				dispatches: [
					{
						id: 4,
						active: true,
						itemCount: 1,
						deliveredQty: 1,
						status: "completed",
						proofCompleted: true,
						inventoryCommitted: true,
					},
				],
				administrativeCompletion: null,
			},
		});

		expect(
			classifyShadowMembershipDifferences(snapshot, [
				{
					code: "PRODUCTION_MEMBERSHIP_MISMATCH",
					legacy: true,
					canonical: false,
				},
				{
					code: "FULFILLMENT_MEMBERSHIP_MISMATCH",
					legacy: true,
					canonical: false,
				},
			]),
		).toEqual({
			classification: "explained",
			reasons: [
				"FULFILLMENT_OPERATIONALLY_COMPLETED",
				"PRODUCTION_EXPLICITLY_NOT_REQUIRED",
			],
		});
	});

	it("classifies unknown applicability as explicit operator review", () => {
		const unknown = resolveSalesPipelineSnapshot({
			salesOrderId: 2,
			orderNo: "SO-2",
			commercial: { status: "open" },
			payment: { total: 100, amountDue: 100 },
			material: {
				applicability: "not_required",
				requiredQty: 0,
				readyQty: 0,
			},
			production: {
				configuredRequirement: null,
				requiredQty: 0,
				assignments: [],
				submissions: [],
				aggregate: null,
				administrativeCompletion: null,
			},
			fulfillment: {
				configuredRequirement: false,
				requiredQty: 0,
				packedQty: 0,
				dispatches: [],
				administrativeCompletion: null,
			},
		});
		expect(
			classifyShadowMembershipDifferences(unknown, [
				{
					code: "PRODUCTION_MEMBERSHIP_MISMATCH",
					legacy: true,
					canonical: false,
				},
			]),
		).toEqual({
			classification: "review_required",
			reasons: ["PRODUCTION_APPLICABILITY_UNKNOWN"],
		});
	});

	it("explains a current required stage only from concrete current evidence", () => {
		const required = resolveSalesPipelineSnapshot({
			salesOrderId: 3,
			orderNo: "SO-3",
			commercial: { status: "open" },
			payment: { total: 100, amountDue: 100 },
			material: {
				applicability: "not_required",
				requiredQty: 0,
				readyQty: 0,
			},
			production: {
				configuredRequirement: true,
				requiredQty: 2,
				assignments: [],
				submissions: [],
				aggregate: null,
				administrativeCompletion: null,
			},
			fulfillment: {
				configuredRequirement: false,
				requiredQty: 0,
				packedQty: 0,
				dispatches: [],
				administrativeCompletion: null,
			},
		});
		expect(
			classifyShadowMembershipDifferences(required, [
				{
					code: "PRODUCTION_MEMBERSHIP_MISMATCH",
					legacy: false,
					canonical: true,
				},
			]),
		).toEqual({
			classification: "explained",
			reasons: [
				"PRODUCTION_CURRENT_REQUIRED_QUANTITY",
				"PRODUCTION_EXPLICIT_CURRENT_REQUIREMENT",
			],
		});
	});

	it("leaves an inconsistent membership direction unexplained", () => {
		const completed = resolveSalesPipelineSnapshot({
			salesOrderId: 4,
			orderNo: "SO-4",
			commercial: { status: "open" },
			payment: { total: 100, amountDue: 0 },
			material: {
				applicability: "not_required",
				requiredQty: 0,
				readyQty: 0,
			},
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
				requiredQty: 1,
				packedQty: 1,
				dispatches: [
					{
						id: 8,
						active: true,
						itemCount: 1,
						deliveredQty: 1,
						status: "completed",
						proofCompleted: true,
						inventoryCommitted: true,
					},
				],
				administrativeCompletion: null,
			},
		});
		expect(
			classifyShadowMembershipDifferences(completed, [
				{
					code: "FULFILLMENT_MEMBERSHIP_MISMATCH",
					legacy: false,
					canonical: true,
				},
			]),
		).toEqual({
			classification: "unexplained",
			reasons: ["FULFILLMENT_UNEXPLAINED_MEMBERSHIP_DIRECTION"],
		});
	});
});
