import { beforeEach, describe, expect, it, mock } from "bun:test";
import {
	buildPackingDispatchAllocationKey,
	buildPackingEvidenceRevision,
} from "@gnd/sales/packing-report-review";

const packCanonical = mock(async () => ({ created: 1, skipped: 0 }));
const resetSales = mock(async () => undefined);
const allocationKey = buildPackingDispatchAllocationKey({
	dispatchId: 41,
	dispatchAllocationItemId: 701,
	productionSubmissionId: 72,
});

mock.module("@sales/sales-control/actions", () => ({
	packDispatchItemsAction: packCanonical,
	resetSalesAction: resetSales,
}));
mock.module("@sales/sales-control/get-sale-information", () => ({
	getSaleInformation: async () => ({ order: { id: 91 }, items: [] }),
}));

const { decidePackingReport, getPackingReportContext, submitPackingReport } =
	await import("./packing-reports");

function evidenceDb() {
	const reports: any[] = [];
	const transactionOptions: any[] = [];
	let driverId = 7;
	let dispatchStatus = "queue";
	const now = new Date("2026-08-23T10:00:00.000Z");
	const db: any = {
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
			findMany: async () => reports,
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
	};
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
		evidenceSnapshot: {},
		note: null,
		decisionNote: null,
		submittedAt: evidence.now,
		reviewedAt: null,
		rejectedAt: null,
		cancelledAt: null,
		createdAt: evidence.now,
		updatedAt: evidence.now,
		delivery: { status: "queue", deletedAt: null },
	};
	const tx = {
		$queryRaw: async () => [{ id: 41 }],
		orderDelivery: { findFirst: async () => evidence.dispatch },
		orderItemDelivery: {
			findMany: async () => evidence.dispatchAllocations,
		},
		orderProductionSubmissions: {
			findMany: async () => evidence.submissions,
		},
		salesPackingReport: {
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
		expect(transactionOptions).toEqual([
			{ isolationLevel: "Serializable" },
			{ isolationLevel: "Serializable" },
		]);
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
		expect(rejected.updates[0]).toMatchObject({
			status: "REJECTED",
			openKey: null,
		});

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
			dispatchAllocationItemId: 702,
			productionSubmissionId: 72,
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

	it("re-evaluates approval evidence and rejects changed or resolved upstream state", async () => {
		const now = new Date("2026-08-23T10:00:00.000Z");
		const changed = packingDecisionDb({
			evidence: approvalEvidence("PENDING"),
			reportRevision: "packing_original",
			qty: 1,
		});
		await expect(
			decidePackingReport(
				changed.db,
				{
					reportId: 1,
					expectedUpdatedAt: now,
					action: "APPROVE",
					note: "Approve",
				},
				{ id: 20, name: "Manager" },
			),
		).rejects.toThrow("evidence changed");

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
});
