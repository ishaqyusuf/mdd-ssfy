import { beforeEach, describe, expect, it, mock } from "bun:test";
import {
	buildPackingDispatchAllocationKey,
	buildPackingEvidenceRevision,
} from "@gnd/sales/packing-report-review";

const packCanonical = mock(async () => ({ created: 1, skipped: 0 }));
const resetSales = mock(async () => undefined);
const createProductionEvidence = mock(async () => undefined);
const createTimelineActivity = mock(async () => ({ id: 1 }));
const resolveTimelineSender = mock(async () => 99);
const repairReceivedInboundNeeds = mock(async () => ({
	inboundIds: [],
	changedCount: 0,
	updatedDemandCount: 0,
	recomputedComponentCount: 0,
	affectedSalesOrderIds: [],
}));
let saleInformation: any = { order: { id: 91 }, items: [] };
const allocationKey = buildPackingDispatchAllocationKey({
	dispatchId: 41,
	productionSubmissionId: 72,
	salesOrderItemId: 81,
});
const defaultGuardedPolicy = {
	enabled: true,
	allowAwaitingProductionSubmission: true,
	allowPendingMaterialReview: true,
	reviewMode: "BLOCK_DELIVERY_UNTIL_APPROVED" as const,
	notifySalesRep: true,
	createProductionEvidenceOnApproval: true,
	revision: 1,
	changedAt: "2026-08-28T12:00:00.000Z",
};

mock.module("@sales/sales-control/actions", () => ({
	createSalesAssignmentAction: createProductionEvidence,
	packDispatchItemsAction: packCanonical,
	resetSalesAction: resetSales,
	submitNonProductionsAction: mock(async () => undefined),
}));
mock.module("@sales/sales-control/get-sale-information", () => ({
	getSaleInformation: async () => saleInformation,
}));
mock.module("./sales-form-activity", () => ({
	createSalesFormTimelineActivity: createTimelineActivity,
	getSalesActivitySenderContactId: resolveTimelineSender,
}));
mock.module("@gnd/inventory/inbound", () => ({
	repairReceivedInboundNeedsForSalesOrder: repairReceivedInboundNeeds,
}));

const {
	decidePackingReport,
	getPackingReportContext,
	reconcilePendingGuardedPackingDispatches,
	submitPackingReport,
} = await import("./packing-reports");

function evidenceDb(policy?: unknown) {
	const reports: any[] = [];
	const transactionOptions: any[] = [];
	let driverId = 7;
	let dispatchStatus = "queue";
	const now = new Date("2026-08-23T10:00:00.000Z");
	const db: any = {
		settings: {
			findFirst: async () =>
				policy ? { meta: { guardedPacking: policy } } : null,
		},
		$queryRaw: async () => [{ id: 41 }],
		$transaction: async (fn: (tx: any) => unknown, options?: unknown) => {
			transactionOptions.push(options);
			return fn(db);
		},
		orderDelivery: {
			findFirst: async () => ({
				id: 41,
				salesOrderId: 91,
				status: dispatchStatus,
				driverId,
				updatedAt: now,
				order: { orderId: "09100PC" },
			}),
			update: async ({ data }: any) => {
				if (data.status) dispatchStatus = data.status;
			},
		},
		orderItemDelivery: {
			findMany: async () => [
				{
					id: 701,
					orderItemId: 81,
					orderProductionSubmissionId: 72,
					qty: 3,
					lhQty: 0,
					rhQty: 0,
					status: "queue",
					packingStatus: null,
					updatedAt: now,
				},
			],
		},
		orderProductionSubmissions: {
			findMany: async () => [
				{
					id: 72,
					salesOrderItemId: 81,
					qty: 3,
					lhQty: 0,
					rhQty: 0,
					updatedAt: now,
					assignment: { salesItemControlUid: "door-81" },
					materialReview: { id: 61, status: "PENDING", updatedAt: now },
					item: { description: "Door", dykeDescription: null },
					itemDeliveries: [],
					packingReports: reports.filter(
						(report) => report.status === "PENDING",
					),
				},
			],
		},
		salesPackingReport: {
			findMany: async ({ where }: any = {}) =>
				where?.orderProductionSubmissionId === null
					? reports.filter(
							(report) => report.orderProductionSubmissionId === null,
						)
					: reports,
			findUnique: async ({ where }: any) =>
				reports.find(
					(report) =>
						(where.idempotencyKey &&
							report.idempotencyKey === where.idempotencyKey) ||
						(where.openKey && report.openKey === where.openKey),
				) || null,
			create: async ({ data }: any) => {
				const report = { id: 1, updatedAt: now, ...data };
				reports.push(report);
				return { id: report.id, status: report.status };
			},
		},
	};
	return {
		db,
		reports,
		now,
		transactionOptions,
		setDriverId: (value: number) => {
			driverId = value;
		},
		setDispatchStatus: (value: string) => {
			dispatchStatus = value;
		},
		getDispatchStatus: () => dispatchStatus,
	};
}

function awaitingSubmissionDb(policy?: unknown) {
	const reports: any[] = [];
	const allocations: any[] = [];
	const now = new Date("2026-08-23T10:00:00.000Z");
	const item = {
		itemConfig: { production: true, shipping: true },
		itemId: 81,
		controlUid: "door-81",
		title: "Entry Door",
		qty: { qty: 3, lh: 0, rh: 0 },
		deliverables: [] as Array<{
			submissionId: number;
			qty: { qty: number; lh: number; rh: number };
		}>,
	};
	saleInformation = { order: { id: 91 }, items: [item] };
	const dispatch = {
		id: 41,
		salesOrderId: 91,
		status: "queue",
		driverId: 7,
		updatedAt: now,
		order: { orderId: "09100PC" },
	};
	const db: any = {
		settings: {
			findFirst: async () =>
				policy ? { meta: { guardedPacking: policy } } : null,
		},
		$queryRaw: async () => [{ id: 41 }],
		$transaction: async (fn: (tx: any) => unknown) => fn(db),
		orderDelivery: {
			findFirst: async () => dispatch,
			update: async ({ data }: any) => Object.assign(dispatch, data),
		},
		orderItemDelivery: {
			findMany: async () => allocations.filter((row) => !row.deletedAt),
			create: async ({ data }: any) => {
				const allocation = {
					id: 701,
					updatedAt: now,
					deletedAt: null,
					...data,
				};
				allocations.push(allocation);
				return { id: allocation.id };
			},
			update: async ({ where, data }: any) => {
				Object.assign(
					allocations.find((row) => row.id === where.id),
					data,
				);
			},
		},
		orderProductionSubmissions: { findMany: async () => [] },
		salesPackingReport: {
			findMany: async ({ where }: any = {}) => {
				if (where?.orderProductionSubmissionId === null) {
					return reports
						.filter(
							(report) =>
								report.orderProductionSubmissionId === null &&
								report.status === "PENDING",
						)
						.map((report) => ({
							id: report.id,
							salesOrderItemId: report.salesOrderItemId,
							salesItemControlUid: report.salesItemControlUid,
							qty: report.qty,
							lhQty: report.lhQty,
							rhQty: report.rhQty,
							updatedAt: report.updatedAt,
						}));
				}
				return reports;
			},
			findUnique: async ({ where }: any) =>
				reports.find(
					(report) =>
						(where.idempotencyKey &&
							report.idempotencyKey === where.idempotencyKey) ||
						(where.openKey && report.openKey === where.openKey),
				) || null,
			findUniqueOrThrow: async ({ where }: any) => {
				const report = reports.find((candidate) => candidate.id === where.id);
				if (!report) throw new Error("Report not found");
				return {
					...report,
					delivery: { status: dispatch.status, deletedAt: null },
				};
			},
			create: async ({ data }: any) => {
				const report = {
					id: 1,
					createdAt: now,
					updatedAt: now,
					reviewedAt: null,
					...data,
				};
				reports.push(report);
				return { id: report.id, status: report.status };
			},
			updateMany: async ({ where, data }: any) => {
				const report = reports.find(
					(candidate) =>
						candidate.id === where.id && candidate.status === where.status,
				);
				if (!report) return { count: 0 };
				Object.assign(report, data);
				return { count: 1 };
			},
			update: async ({ where, data }: any) => {
				Object.assign(
					reports.find((candidate) => candidate.id === where.id),
					data,
				);
			},
		},
	};
	return { db, reports, allocations, item, now, dispatch };
}

function approvalEvidence(materialReviewStatus: "PENDING" | "APPROVED") {
	const now = new Date("2026-08-23T10:00:00.000Z");
	const dispatch = {
		id: 41,
		salesOrderId: 91,
		status: "queue",
		driverId: 7,
		updatedAt: now,
		order: { orderId: "09100PC" },
	};
	const dispatchAllocations = [
		{
			id: 701,
			orderItemId: 81,
			orderProductionSubmissionId: 72,
			qty: 3,
			lhQty: 0,
			rhQty: 0,
			status: "queue",
			packingStatus: null,
			updatedAt: now,
		},
	];
	const submissions = [
		{
			id: 72,
			salesOrderItemId: 81,
			qty: 3,
			lhQty: 0,
			rhQty: 0,
			updatedAt: now,
			materialReview: {
				id: 61,
				status: materialReviewStatus,
				updatedAt: now,
			},
			item: { description: "Door", dykeDescription: null },
			itemDeliveries: [{ qty: 1, lhQty: 0, rhQty: 0, updatedAt: now }],
			packingReports: [],
		},
	];
	const snapshot = {
		dispatch: {
			id: dispatch.id,
			salesOrderId: dispatch.salesOrderId,
			status: dispatch.status,
			updatedAt: dispatch.updatedAt,
		},
		dispatchAllocations,
		submissions: submissions.map((submission) => ({
			id: submission.id,
			salesOrderItemId: submission.salesOrderItemId,
			qty: submission.qty,
			lhQty: submission.lhQty,
			rhQty: submission.rhQty,
			updatedAt: submission.updatedAt,
			materialReview: submission.materialReview,
			packed: submission.itemDeliveries,
		})),
	};

	return {
		now,
		dispatch,
		dispatchAllocations,
		submissions,
		revision: buildPackingEvidenceRevision(snapshot),
	};
}

function packingDecisionDb(input: {
	evidence: ReturnType<typeof approvalEvidence>;
	reportRevision?: string;
	qty?: number;
	reportPolicy?: unknown;
	effectivePolicy?: unknown;
}) {
	const updates: unknown[] = [];
	const { evidence } = input;
	const report = {
		id: 1,
		salesOrderId: 91,
		orderDeliveryId: 41,
		salesOrderItemId: 81,
		orderProductionSubmissionId: 72,
		submittedById: 7,
		reviewedById: null,
		status: "PENDING",
		reason: "UPSTREAM_PRODUCTION_REVIEW",
		idempotencyKey: "packing-idempotency-1",
		openKey: "dispatch:41:submission:72",
		dispatchAllocationKey: allocationKey,
		dispatchAllocationItemId: 701,
		qty: input.qty ?? 2,
		lhQty: 0,
		rhQty: 0,
		manifestRevision: input.reportRevision ?? evidence.revision,
		evidenceSnapshot: input.reportPolicy ? { policy: input.reportPolicy } : {},
		note: null,
		decisionNote: null,
		submittedAt: evidence.now,
		reviewedAt: null,
		rejectedAt: null,
		cancelledAt: null,
		createdAt: evidence.now,
		updatedAt: evidence.now,
		delivery: { status: evidence.dispatch.status, deletedAt: null },
	};
	const tx = {
		settings: {
			findFirst: async () =>
				input.effectivePolicy
					? { meta: { guardedPacking: input.effectivePolicy } }
					: null,
		},
		$queryRaw: async () => [{ id: 41 }],
		orderDelivery: { findFirst: async () => evidence.dispatch },
		orderItemDelivery: {
			findMany: async () => evidence.dispatchAllocations,
			update: async () => undefined,
		},
		orderProductionSubmissions: {
			findMany: async () => evidence.submissions,
		},
		salesPackingReport: {
			findMany: async () => [],
			findUniqueOrThrow: async () => report,
			update: async ({ data }: { data: unknown }) => updates.push(data),
			updateMany: async ({ data }: { data: unknown }) => {
				updates.push(data);
				return { count: 1 };
			},
		},
	};

	return {
		db: {
			$transaction: async (fn: (client: unknown) => unknown) => fn(tx),
		} as unknown as Parameters<typeof decidePackingReport>[0],
		updates,
	};
}

describe("packing report application service", () => {
	beforeEach(() => {
		packCanonical.mockClear();
		resetSales.mockClear();
		createProductionEvidence.mockClear();
		createTimelineActivity.mockClear();
		resolveTimelineSender.mockClear();
		repairReceivedInboundNeeds.mockClear();
		saleInformation = { order: { id: 91 }, items: [] };
	});

	it("stores pending evidence with the authenticated actor and replays idempotently", async () => {
		const { db, reports, transactionOptions } = evidenceDb();
		const context = await getPackingReportContext(db, 41);
		const reportableLine = context.reportableLines[0];
		expect(reportableLine).toBeDefined();
		if (!reportableLine) throw new Error("Expected reportable packing line");
		const input = {
			dispatchId: 41,
			productionSubmissionId: 72,
			dispatchAllocationKey: reportableLine.dispatchAllocationKey,
			qty: 2,
			lhQty: 0,
			rhQty: 0,
			manifestRevision: context.manifestRevision,
			idempotencyKey: "packing-idempotency-1",
			physicallyVerified: true as const,
		};
		await expect(
			submitPackingReport(db, input, { id: 7, scope: "assignment" }),
		).resolves.toMatchObject({
			status: "PENDING",
			idempotentReplay: false,
		});
		expect(reports[0]).toMatchObject({
			submittedById: 7,
			orderDeliveryId: 41,
			orderProductionSubmissionId: 72,
			dispatchAllocationItemId: 701,
			qty: 2,
		});
		await expect(
			submitPackingReport(db, input, { id: 7, scope: "assignment" }),
		).resolves.toMatchObject({
			status: "PENDING",
			idempotentReplay: true,
		});
		expect(reports).toHaveLength(1);
		expect(createTimelineActivity).toHaveBeenCalledTimes(1);
		expect(transactionOptions).toEqual([
			{ isolationLevel: "Serializable" },
			{ isolationLevel: "Serializable" },
		]);
	});

	it("applies the master toggle and each eligible blocker setting", async () => {
		saleInformation = {
			order: { id: 91 },
			items: [
				{
					itemConfig: { production: true, shipping: true },
					itemId: 81,
					controlUid: "door-81",
					title: "Door",
					qty: { qty: 3, lh: 0, rh: 0 },
					deliverables: [],
				},
			],
		};
		const disabled = await getPackingReportContext(
			evidenceDb({ ...defaultGuardedPolicy, enabled: false }).db,
			41,
		);
		expect(disabled.reportableLines).toEqual([]);

		const noMaterial = await getPackingReportContext(
			evidenceDb({
				...defaultGuardedPolicy,
				allowPendingMaterialReview: false,
			}).db,
			41,
		);
		expect(noMaterial.reportableLines).toEqual([]);

		const noAwaiting = await getPackingReportContext(
			awaitingSubmissionDb({
				...defaultGuardedPolicy,
				allowAwaitingProductionSubmission: false,
			}).db,
			41,
		);
		expect(noAwaiting.reportableLines).toEqual([]);
	});

	it("marks a fully covered dispatch ready under the non-blocking review mode", async () => {
		saleInformation = {
			order: { id: 91 },
			items: [
				{
					itemConfig: { production: true, shipping: true },
					itemId: 81,
					controlUid: "door-81",
					title: "Door",
					qty: { qty: 3, lh: 0, rh: 0 },
					deliverables: [],
				},
			],
		};
		const fixture = evidenceDb({
			...defaultGuardedPolicy,
			reviewMode: "ALLOW_DELIVERY_WHILE_PENDING",
		});
		const context = await getPackingReportContext(fixture.db, 41);
		const line = context.reportableLines[0];
		if (!line) throw new Error("Expected reportable packing line");
		await submitPackingReport(
			fixture.db,
			{
				dispatchId: 41,
				productionSubmissionId: 72,
				salesItemControlUid: "door-81",
				dispatchAllocationKey: line.dispatchAllocationKey,
				qty: 3,
				lhQty: 0,
				rhQty: 0,
				manifestRevision: context.manifestRevision,
				idempotencyKey: "packing-nonblocking",
				physicallyVerified: true,
			},
			{ id: 7, scope: "assignment" },
		);
		expect(fixture.getDispatchStatus()).toBe("packed");
	});

	it("demotes a non-blocking dispatch when its covering report is rejected", async () => {
		saleInformation = {
			order: { id: 91 },
			items: [
				{
					itemConfig: { production: true, shipping: true },
					itemId: 81,
					controlUid: "door-81",
					title: "Door",
					qty: { qty: 3, lh: 0, rh: 0 },
					deliverables: [],
				},
			],
		};
		const fixture = awaitingSubmissionDb({
			...defaultGuardedPolicy,
			reviewMode: "ALLOW_DELIVERY_WHILE_PENDING",
		});
		const context = await getPackingReportContext(fixture.db, 41);
		const line = context.reportableLines[0];
		if (!line) throw new Error("Expected reportable packing line");
		await submitPackingReport(
			fixture.db,
			{
				dispatchId: 41,
				productionSubmissionId: null,
				salesItemControlUid: "door-81",
				dispatchAllocationKey: line.dispatchAllocationKey,
				qty: 3,
				lhQty: 0,
				rhQty: 0,
				manifestRevision: context.manifestRevision,
				idempotencyKey: "packing-nonblocking-reject",
				physicallyVerified: true,
			},
			{ id: 7, scope: "assignment" },
		);
		expect(fixture.dispatch.status).toBe("packed");
		await decidePackingReport(
			fixture.db,
			{
				reportId: fixture.reports[0].id,
				expectedUpdatedAt: fixture.reports[0].updatedAt,
				action: "REJECT",
				note: "Not physically verified",
			},
			{ id: 20, name: "Manager" },
		);
		expect(fixture.dispatch.status).toBe("queue");
		expect(resetSales).toHaveBeenCalledTimes(1);
	});

	it("makes an existing fully verified pending dispatch ready when the policy is relaxed", async () => {
		const policy = { ...defaultGuardedPolicy } as {
			reviewMode:
				| "BLOCK_DELIVERY_UNTIL_APPROVED"
				| "ALLOW_DELIVERY_WHILE_PENDING";
			[key: string]: unknown;
		};
		saleInformation = {
			order: { id: 91 },
			items: [
				{
					itemConfig: { production: true, shipping: true },
					itemId: 81,
					controlUid: "door-81",
					title: "Door",
					qty: { qty: 3, lh: 0, rh: 0 },
					deliverables: [],
				},
			],
		};
		const fixture = evidenceDb(policy);
		const context = await getPackingReportContext(fixture.db, 41);
		const line = context.reportableLines[0];
		if (!line) throw new Error("Expected reportable packing line");
		await submitPackingReport(
			fixture.db,
			{
				dispatchId: 41,
				productionSubmissionId: 72,
				dispatchAllocationKey: line.dispatchAllocationKey,
				qty: 3,
				lhQty: 0,
				rhQty: 0,
				manifestRevision: context.manifestRevision,
				idempotencyKey: "packing-relaxed-after-submit",
				physicallyVerified: true,
			},
			{ id: 7, scope: "assignment" },
		);
		fixture.setDispatchStatus("missing items");
		policy.reviewMode = "ALLOW_DELIVERY_WHILE_PENDING";

		await expect(
			reconcilePendingGuardedPackingDispatches(fixture.db, [41]),
		).resolves.toEqual({ readyDispatchIds: [41] });
		expect(fixture.getDispatchStatus()).toBe("packed");
		expect(fixture.reports).toHaveLength(1);
		expect(fixture.reports[0]?.status).toBe("PENDING");
	});

	it("reports awaiting-production quantities and creates canonical evidence on approval", async () => {
		const fixture = awaitingSubmissionDb();
		const context = await getPackingReportContext(fixture.db, 41);
		const line = context.reportableLines[0];
		expect(line).toMatchObject({
			productionSubmissionId: null,
			salesOrderItemId: 81,
			itemUid: "door-81",
			remaining: { qty: 3, lhQty: 0, rhQty: 0 },
		});
		if (!line) throw new Error("Expected awaiting-production packing line");

		const submitted = await submitPackingReport(
			fixture.db,
			{
				dispatchId: 41,
				productionSubmissionId: null,
				salesItemControlUid: "door-81",
				dispatchAllocationKey: line.dispatchAllocationKey,
				qty: 2,
				lhQty: 0,
				rhQty: 0,
				manifestRevision: context.manifestRevision,
				idempotencyKey: "packing-awaiting-production",
				physicallyVerified: true,
			},
			{ id: 7, scope: "assignment" },
		);
		expect(submitted).toMatchObject({ status: "PENDING" });
		expect(fixture.reports[0]).toMatchObject({
			reason: "AWAITING_PRODUCTION_SUBMISSION",
			salesItemControlUid: "door-81",
			orderProductionSubmissionId: null,
		});

		createProductionEvidence.mockImplementationOnce(async () => {
			fixture.item.deliverables = [
				{
					submissionId: 72,
					qty: { qty: 2, lh: 0, rh: 0 },
				},
			];
		});
		await expect(
			decidePackingReport(
				fixture.db,
				{
					reportId: 1,
					expectedUpdatedAt: fixture.now,
					action: "APPROVE",
					note: "Confirmed complete",
				},
				{ id: 20, name: "Sales Manager" },
			),
		).resolves.toMatchObject({ status: "APPROVED" });
		expect(createProductionEvidence).toHaveBeenCalledWith(
			fixture.db,
			expect.objectContaining({
				salesId: 91,
				authorId: 20,
				submit: true,
				submissionMeta: {
					source: "packing_review_approval",
					packingReportId: 1,
				},
			}),
		);
		expect(packCanonical.mock.calls[0]?.[0]).toBe(fixture.db);
		expect(packCanonical.mock.calls[0]?.[1]).toMatchObject({
			approvedPackingReportId: 1,
			packItems: {
				packingLines: [
					{
						salesItemId: 81,
						submissionId: 72,
						qty: { qty: 2, lh: 0, rh: 0 },
					},
				],
			},
		});
		expect(createTimelineActivity).toHaveBeenCalledTimes(2);
	});

	it("approves an awaiting-production report without creating evidence when configured", async () => {
		const fixture = awaitingSubmissionDb({
			...defaultGuardedPolicy,
			createProductionEvidenceOnApproval: false,
		});
		const context = await getPackingReportContext(fixture.db, 41);
		const line = context.reportableLines[0];
		if (!line) throw new Error("Expected awaiting-production packing line");
		await submitPackingReport(
			fixture.db,
			{
				dispatchId: 41,
				productionSubmissionId: null,
				salesItemControlUid: "door-81",
				dispatchAllocationKey: line.dispatchAllocationKey,
				qty: 3,
				lhQty: 0,
				rhQty: 0,
				manifestRevision: context.manifestRevision,
				idempotencyKey: "packing-no-production-evidence",
				physicallyVerified: true,
			},
			{ id: 7, scope: "assignment" },
		);
		await expect(
			decidePackingReport(
				fixture.db,
				{
					reportId: 1,
					expectedUpdatedAt: fixture.now,
					action: "APPROVE",
					note: "Verified without generated production evidence",
				},
				{ id: 20, name: "Sales Manager" },
			),
		).resolves.toMatchObject({ status: "APPROVED" });
		expect(createProductionEvidence).not.toHaveBeenCalled();
		expect(packCanonical).not.toHaveBeenCalled();
		expect(fixture.allocations[0]).toMatchObject({
			packingStatus: "packed",
			packedBy: "Sales Manager",
			deletedAt: null,
		});
	});

	it("rejects a stale manifest revision before writing", async () => {
		const { db, reports } = evidenceDb();
		await expect(
			submitPackingReport(
				db,
				{
					dispatchId: 41,
					productionSubmissionId: 72,
					dispatchAllocationKey: "packing_allocation_stale",
					qty: 1,
					lhQty: 0,
					rhQty: 0,
					manifestRevision: "packing_stale",
					idempotencyKey: "packing-idempotency-2",
					physicallyVerified: true,
				},
				{ id: 7, scope: "assignment" },
			),
		).rejects.toThrow("evidence changed");
		expect(reports).toHaveLength(0);
	});

	it("rechecks assignment authority after locking the dispatch", async () => {
		const assigned = evidenceDb();
		const context = await getPackingReportContext(assigned.db, 41);
		const line = context.reportableLines[0];
		if (!line) throw new Error("Expected reportable packing line");
		assigned.setDriverId(8);
		const input = {
			dispatchId: 41,
			productionSubmissionId: 72,
			dispatchAllocationKey: line.dispatchAllocationKey,
			qty: 1,
			lhQty: 0,
			rhQty: 0,
			manifestRevision: context.manifestRevision,
			idempotencyKey: "packing-reassigned-driver",
			physicallyVerified: true as const,
		};
		await expect(
			submitPackingReport(assigned.db, input, {
				id: 7,
				scope: "assignment",
			}),
		).rejects.toThrow("assignment changed");
		expect(assigned.reports).toHaveLength(0);

		await expect(
			submitPackingReport(assigned.db, input, { id: 20, scope: "role" }),
		).resolves.toMatchObject({ status: "PENDING" });
	});

	it("allows missing-items pre-trip reports but rejects post-start dispatches", async () => {
		const makeInput = async (fixture: ReturnType<typeof evidenceDb>) => {
			const context = await getPackingReportContext(fixture.db, 41);
			const line = context.reportableLines[0];
			if (!line) throw new Error("Expected reportable packing line");
			return {
				dispatchId: 41,
				productionSubmissionId: 72,
				dispatchAllocationKey: line.dispatchAllocationKey,
				qty: 1,
				lhQty: 0,
				rhQty: 0,
				manifestRevision: context.manifestRevision,
				idempotencyKey: `packing-state-${fixture.now.getTime()}`,
				physicallyVerified: true as const,
			};
		};
		const missing = evidenceDb();
		missing.setDispatchStatus("missing items");
		await expect(
			submitPackingReport(missing.db, await makeInput(missing), {
				id: 7,
				scope: "assignment",
			}),
		).resolves.toMatchObject({ status: "PENDING" });

		const started = evidenceDb();
		started.setDispatchStatus("in progress");
		await expect(
			submitPackingReport(started.db, await makeInput(started), {
				id: 7,
				scope: "assignment",
			}),
		).rejects.toThrow("completed or cancelled");
	});

	it("rejects without canonical packing and approves through exact canonical authority", async () => {
		const now = new Date("2026-08-23T10:00:00.000Z");
		const evidence = approvalEvidence("PENDING");

		const rejected = packingDecisionDb({ evidence });
		await decidePackingReport(
			rejected.db,
			{
				reportId: 1,
				expectedUpdatedAt: now,
				action: "REJECT",
				note: "Not verified",
			},
			{ id: 20, name: "Manager" },
		);
		expect(packCanonical).not.toHaveBeenCalled();
		expect(repairReceivedInboundNeeds).not.toHaveBeenCalled();
		expect(rejected.updates[0]).toMatchObject({
			status: "REJECTED",
			openKey: null,
		});
		expect(resetSales).toHaveBeenCalledTimes(1);
		resetSales.mockClear();

		const approved = packingDecisionDb({ evidence });
		await decidePackingReport(
			approved.db,
			{
				reportId: 1,
				expectedUpdatedAt: now,
				action: "APPROVE",
				note: "Verified",
			},
			{ id: 20, name: "Manager" },
		);
		expect(packCanonical).toHaveBeenCalledTimes(1);
		expect(repairReceivedInboundNeeds).toHaveBeenCalledWith(expect.anything(), {
			salesOrderId: 91,
			actorUserId: 20,
		});
		expect(packCanonical.mock.calls[0]?.[1]).toMatchObject({
			approvedPackingReportId: 1,
			authorId: 20,
			packItems: {
				packingLines: [{ qty: { qty: 3, lh: 0, rh: 0 } }],
			},
		});
		expect(resetSales).toHaveBeenCalledTimes(1);
	});

	it("binds a split production submission to each exact dispatch allocation", async () => {
		const { db } = evidenceDb();
		const context = await getPackingReportContext(db, 41);
		const dispatchBKey = buildPackingDispatchAllocationKey({
			dispatchId: 42,
			productionSubmissionId: 72,
			salesOrderItemId: 81,
		});
		expect(dispatchBKey).not.toBe(
			context.reportableLines[0]?.dispatchAllocationKey,
		);
		await expect(
			submitPackingReport(
				db,
				{
					dispatchId: 41,
					productionSubmissionId: 72,
					dispatchAllocationKey: dispatchBKey,
					qty: 1,
					lhQty: 0,
					rhQty: 0,
					manifestRevision: context.manifestRevision,
					idempotencyKey: "packing-dispatch-b-key",
					physicallyVerified: true,
				},
				{ id: 7, scope: "assignment" },
			),
		).rejects.toThrow("another dispatch");
	});

	it("recovers an exact concurrent idempotency winner and conflicts otherwise", async () => {
		const existing = {
			id: 9,
			submittedById: 7,
			orderDeliveryId: 41,
			orderProductionSubmissionId: 72,
			dispatchAllocationKey: allocationKey,
			dispatchAllocationItemId: 701,
			manifestRevision: "packing_revision",
			qty: 1,
			lhQty: 0,
			rhQty: 0,
			note: null,
			status: "PENDING",
		};
		const db: any = {
			$transaction: async () => {
				throw Object.assign(new Error("unique"), { code: "P2002" });
			},
			salesPackingReport: {
				findUnique: async () => existing,
			},
		};
		const input = {
			dispatchId: 41,
			productionSubmissionId: 72,
			dispatchAllocationKey: allocationKey,
			manifestRevision: "packing_revision",
			qty: 1,
			lhQty: 0,
			rhQty: 0,
			idempotencyKey: "packing-contention-key",
			physicallyVerified: true as const,
		};
		await expect(
			submitPackingReport(db, input, { id: 7, scope: "assignment" }),
		).resolves.toMatchObject({
			reportId: 9,
			idempotentReplay: true,
		});
		await expect(
			submitPackingReport(
				db,
				{ ...input, qty: 2 },
				{ id: 7, scope: "assignment" },
			),
		).rejects.toThrow("another request");
	});

	it("retains the immutable report when its source submission is cancelled", async () => {
		const fixture = evidenceDb();
		const context = await getPackingReportContext(fixture.db, 41);
		const line = context.reportableLines[0];
		if (!line) throw new Error("Expected reportable packing line");
		await submitPackingReport(
			fixture.db,
			{
				dispatchId: 41,
				productionSubmissionId: 72,
				dispatchAllocationKey: line.dispatchAllocationKey,
				qty: 1,
				lhQty: 0,
				rhQty: 0,
				manifestRevision: context.manifestRevision,
				idempotencyKey: "packing-source-cancelled",
				physicallyVerified: true,
			},
			{ id: 7, scope: "assignment" },
		);
		fixture.db.orderProductionSubmissions.findMany = async () => [];
		const cancelled = await getPackingReportContext(fixture.db, 41);
		expect(cancelled.reportableLines).toEqual([]);
		expect(cancelled.reports).toHaveLength(1);
	});

	it("re-evaluates the target line and rejects resolved upstream state", async () => {
		const now = new Date("2026-08-23T10:00:00.000Z");
		const resolved = packingDecisionDb({
			evidence: approvalEvidence("APPROVED"),
			qty: 1,
		});
		await expect(
			decidePackingReport(
				resolved.db,
				{
					reportId: 1,
					expectedUpdatedAt: now,
					action: "APPROVE",
					note: "Approve",
				},
				{ id: 20, name: "Manager" },
			),
		).rejects.toThrow("use normal packing");
		expect(packCanonical).not.toHaveBeenCalled();
	});

	it("keeps blocking-policy decisions read-only after the trip starts", async () => {
		const evidence = approvalEvidence("PENDING");
		evidence.dispatch.status = "in progress";
		const late = packingDecisionDb({ evidence });
		await expect(
			decidePackingReport(
				late.db,
				{
					reportId: 1,
					expectedUpdatedAt: evidence.now,
					action: "REJECT",
					note: "Too late",
				},
				{ id: 20, name: "Manager" },
			),
		).rejects.toThrow("passed the packing review stage");
		expect(late.updates).toHaveLength(0);
	});

	it("allows a non-blocking review decision while the trip is in progress", async () => {
		const evidence = approvalEvidence("PENDING");
		evidence.dispatch.status = "in progress";
		const nonBlockingPolicy = {
			...defaultGuardedPolicy,
			reviewMode: "ALLOW_DELIVERY_WHILE_PENDING" as const,
		};
		const active = packingDecisionDb({
			evidence,
			reportPolicy: nonBlockingPolicy,
			effectivePolicy: nonBlockingPolicy,
		});
		await expect(
			decidePackingReport(
				active.db,
				{
					reportId: 1,
					expectedUpdatedAt: evidence.now,
					action: "APPROVE",
					note: "Reviewed during the trip",
				},
				{ id: 20, name: "Manager" },
			),
		).resolves.toMatchObject({ status: "APPROVED" });
		expect(packCanonical).not.toHaveBeenCalled();
	});

	it("keeps an older strict report reviewable after the current policy releases the trip", async () => {
		const evidence = approvalEvidence("PENDING");
		evidence.dispatch.status = "in progress";
		const active = packingDecisionDb({
			evidence,
			reportPolicy: defaultGuardedPolicy,
			effectivePolicy: {
				...defaultGuardedPolicy,
				reviewMode: "ALLOW_DELIVERY_WHILE_PENDING",
				revision: 1,
			},
		});
		await expect(
			decidePackingReport(
				active.db,
				{
					reportId: 1,
					expectedUpdatedAt: evidence.now,
					action: "REJECT",
					note: "Reviewed after policy release",
				},
				{ id: 20, name: "Manager" },
			),
		).resolves.toMatchObject({ status: "REJECTED" });
	});

	it("makes non-blocking reviews read-only after delivery is complete", async () => {
		const evidence = approvalEvidence("PENDING");
		evidence.dispatch.status = "completed";
		const completed = packingDecisionDb({
			evidence,
			reportPolicy: {
				...defaultGuardedPolicy,
				reviewMode: "ALLOW_DELIVERY_WHILE_PENDING",
			},
			effectivePolicy: {
				...defaultGuardedPolicy,
				reviewMode: "ALLOW_DELIVERY_WHILE_PENDING",
			},
		});
		await expect(
			decidePackingReport(
				completed.db,
				{
					reportId: 1,
					expectedUpdatedAt: evidence.now,
					action: "REJECT",
					note: "Too late",
				},
				{ id: 20, name: "Manager" },
			),
		).rejects.toThrow("passed the packing review stage");
	});
});
