import type { TRPCContext } from "@api/trpc/init";
import { Prisma, type TransactionClient } from "@gnd/db";
import {
	type DecidePackingReportInput,
	PackingReportError,
	type SubmitPackingReportInput,
	addPackingQty,
	assertPackingQtyWithinRemaining,
	buildPackingDispatchAllocationKey,
	buildPackingEvidenceRevision,
	buildPackingReportOpenKey,
	lockPackingDispatchScope,
	remainingPackingQty,
} from "@gnd/sales/packing-report-review";
import {
	packDispatchItemsAction,
	resetSalesAction,
} from "@sales/sales-control/actions";
import { getSaleInformation } from "@sales/sales-control/get-sale-information";
import type { SalesDispatchStatus } from "@sales/types";

type Db = TRPCContext["db"];
type PackingDb = Db | TransactionClient;

function activeDispatchStatus(status: string | null) {
	return [
		"queue",
		"packing",
		"packing queue",
		"missing items",
		"packed",
	].includes(status || "");
}

function canonicalQty(row: {
	qty: number;
	lhQty: number | null;
	rhQty: number | null;
}) {
	const lhQty = Number(row.lhQty || 0);
	const rhQty = Number(row.rhQty || 0);
	return lhQty > 0 || rhQty > 0
		? { qty: 0, lhQty, rhQty }
		: { qty: Number(row.qty || 0), lhQty: 0, rhQty: 0 };
}

async function loadPackingEvidence(db: PackingDb, dispatchId: number) {
	const dispatch = await db.orderDelivery.findFirst({
		where: { id: dispatchId, deletedAt: null },
		select: {
			id: true,
			salesOrderId: true,
			status: true,
			driverId: true,
			updatedAt: true,
			order: { select: { orderId: true } },
		},
	});
	if (!dispatch) {
		throw new PackingReportError("STALE_SCOPE", "Dispatch was not found.");
	}

	const [dispatchAllocations, submissions] = await Promise.all([
		db.orderItemDelivery.findMany({
			where: {
				orderDeliveryId: dispatch.id,
				orderId: dispatch.salesOrderId,
				deletedAt: null,
				orderProductionSubmissionId: { not: null },
			},
			orderBy: { id: "asc" },
			select: {
				id: true,
				orderItemId: true,
				orderProductionSubmissionId: true,
				qty: true,
				lhQty: true,
				rhQty: true,
				status: true,
				packingStatus: true,
				updatedAt: true,
			},
		}),
		db.orderProductionSubmissions.findMany({
			where: {
				salesOrderId: dispatch.salesOrderId,
				deletedAt: null,
				salesOrderItemId: { not: null },
			},
			orderBy: { id: "asc" },
			select: {
				id: true,
				salesOrderItemId: true,
				qty: true,
				lhQty: true,
				rhQty: true,
				updatedAt: true,
				assignment: { select: { salesItemControlUid: true } },
				materialReview: { select: { id: true, status: true, updatedAt: true } },
				item: { select: { description: true, dykeDescription: true } },
				itemDeliveries: {
					where: {
						orderDeliveryId: dispatch.id,
						deletedAt: null,
						packingStatus: "packed",
					},
					select: { qty: true, lhQty: true, rhQty: true, updatedAt: true },
				},
				packingReports: {
					where: { orderDeliveryId: dispatch.id, status: "PENDING" },
					select: {
						id: true,
						qty: true,
						lhQty: true,
						rhQty: true,
						updatedAt: true,
					},
				},
			},
		}),
	]);

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
		dispatch,
		dispatchAllocations,
		submissions,
		snapshot,
		revision: buildPackingEvidenceRevision(snapshot),
	};
}

function reportableLine(
	evidence: Awaited<ReturnType<typeof loadPackingEvidence>>,
	productionSubmissionId: number,
) {
	const submission = evidence.submissions.find(
		(row) => row.id === productionSubmissionId,
	);
	if (!submission || !submission.salesOrderItemId) {
		throw new PackingReportError(
			"STALE_SCOPE",
			"Packing allocation is no longer in this dispatch scope.",
		);
	}
	const exactAllocations = evidence.dispatchAllocations.filter(
		(row) =>
			row.orderProductionSubmissionId === submission.id &&
			row.orderItemId === submission.salesOrderItemId,
	);
	const openAllocations = exactAllocations.filter(
		(row) => row.packingStatus !== "packed",
	);
	if (openAllocations.length > 1) {
		throw new PackingReportError(
			"STALE_SCOPE",
			"Packing submission has ambiguous allocation rows in this dispatch. Resolve the dispatch allocation first.",
		);
	}
	const dispatchAllocation = openAllocations[0] || null;
	const dispatchAllocationKey = buildPackingDispatchAllocationKey({
		dispatchId: evidence.dispatch.id,
		productionSubmissionId: submission.id,
		salesOrderItemId: submission.salesOrderItemId,
	});
	const submissionAvailable = canonicalQty(submission);
	const allocationAvailable = dispatchAllocation
		? canonicalQty(dispatchAllocation)
		: submissionAvailable;
	const available = {
		qty: Math.min(submissionAvailable.qty, allocationAvailable.qty),
		lhQty: Math.min(submissionAvailable.lhQty, allocationAvailable.lhQty),
		rhQty: Math.min(submissionAvailable.rhQty, allocationAvailable.rhQty),
	};
	const canonical = submission.itemDeliveries.map(canonicalQty);
	const pending = submission.packingReports.map(canonicalQty);
	return {
		submission,
		salesOrderItemId: submission.salesOrderItemId,
		available,
		remaining: remainingPackingQty(available, ...canonical, ...pending),
		dispatchAllocationKey,
		dispatchAllocationItemId: dispatchAllocation?.id || null,
	};
}

export async function getPackingReportContext(db: Db, dispatchId: number) {
	const evidence = await loadPackingEvidence(db, dispatchId);
	const reports = await db.salesPackingReport.findMany({
		where: { orderDeliveryId: dispatchId },
		orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
		take: 50,
		select: {
			id: true,
			salesOrderItemId: true,
			status: true,
			reason: true,
			qty: true,
			lhQty: true,
			rhQty: true,
			note: true,
			decisionNote: true,
			submittedAt: true,
			reviewedAt: true,
			updatedAt: true,
			productionSubmission: {
				select: {
					id: true,
					item: { select: { description: true, dykeDescription: true } },
					assignment: { select: { salesItemControlUid: true } },
				},
			},
			submittedBy: { select: { id: true, name: true } },
			reviewedBy: { select: { id: true, name: true } },
		},
	});

	return {
		dispatch: evidence.dispatch,
		manifestRevision: evidence.revision,
		reportableLines: evidence.submissions.flatMap((submission) => {
			if (
				!submission.salesOrderItemId ||
				submission.materialReview?.status !== "PENDING" ||
				submission.packingReports.length > 0
			) {
				return [];
			}
			let line: ReturnType<typeof reportableLine>;
			try {
				line = reportableLine(evidence, submission.id);
			} catch (error) {
				if (
					error instanceof PackingReportError &&
					error.code === "STALE_SCOPE"
				) {
					return [];
				}
				throw error;
			}
			if (
				line.remaining.qty + line.remaining.lhQty + line.remaining.rhQty <=
				0
			) {
				return [];
			}
			return [
				{
					productionSubmissionId: submission.id,
					salesOrderItemId: submission.salesOrderItemId,
					itemUid: submission.assignment?.salesItemControlUid || null,
					dispatchAllocationKey: line.dispatchAllocationKey,
					title:
						submission.item?.description ||
						submission.item?.dykeDescription ||
						`Item #${submission.salesOrderItemId}`,
					remaining: line.remaining,
				},
			];
		}),
		reports,
	};
}

type PackingReportActor = { id: number; scope: "role" | "assignment" };

function replayPackingReport(
	existing: Prisma.SalesPackingReportGetPayload<Record<string, never>>,
	input: SubmitPackingReportInput,
	actor: PackingReportActor,
) {
	const matches =
		existing.submittedById === actor.id &&
		existing.orderDeliveryId === input.dispatchId &&
		existing.orderProductionSubmissionId === input.productionSubmissionId &&
		existing.dispatchAllocationKey === input.dispatchAllocationKey &&
		existing.qty === input.qty &&
		existing.lhQty === input.lhQty &&
		existing.rhQty === input.rhQty &&
		(existing.note || null) === (input.note || null);
	if (!matches) {
		throw new PackingReportError(
			"IDEMPOTENCY_CONFLICT",
			"Packing report idempotency key belongs to another request.",
		);
	}
	if (existing.status === "REJECTED" || existing.status === "CANCELLED") {
		throw new PackingReportError(
			"IDEMPOTENCY_CONFLICT",
			"This packing report is closed. Start a new report.",
		);
	}
	return {
		reportId: existing.id,
		status: existing.status,
		idempotentReplay: true,
	};
}

export async function submitPackingReportInTransaction(
	tx: TransactionClient,
	input: SubmitPackingReportInput,
	actor: PackingReportActor,
) {
	await lockPackingDispatchScope(tx, input.dispatchId);
	const lockedDispatch = await tx.orderDelivery.findFirst({
		where: { id: input.dispatchId, deletedAt: null },
		select: { driverId: true },
	});
	if (!lockedDispatch) {
		throw new PackingReportError("STALE_SCOPE", "Dispatch was not found.");
	}
	if (actor.scope === "assignment" && lockedDispatch.driverId !== actor.id) {
		throw new PackingReportError(
			"FORBIDDEN",
			"Dispatch assignment changed before the packing report was saved.",
		);
	}
	const existing = await tx.salesPackingReport.findUnique({
		where: { idempotencyKey: input.idempotencyKey },
	});
	if (existing) return replayPackingReport(existing, input, actor);

	const evidence = await loadPackingEvidence(tx, input.dispatchId);
	if (!activeDispatchStatus(evidence.dispatch.status)) {
		throw new PackingReportError(
			"STALE_SCOPE",
			"Packing reports cannot be added to a completed or cancelled dispatch.",
		);
	}
	if (evidence.revision !== input.manifestRevision) {
		throw new PackingReportError(
			"STALE_EVIDENCE",
			"Packing evidence changed. Refresh before reporting verified quantity.",
		);
	}
	const line = reportableLine(evidence, input.productionSubmissionId);
	if (line.dispatchAllocationKey !== input.dispatchAllocationKey) {
		throw new PackingReportError(
			"STALE_SCOPE",
			"Packing allocation belongs to another dispatch or changed. Refresh before reporting.",
		);
	}
	if (line.submission.materialReview?.status !== "PENDING") {
		throw new PackingReportError(
			"NOT_REPORTABLE",
			"This quantity is not blocked by unresolved upstream evidence. Use normal packing.",
		);
	}
	assertPackingQtyWithinRemaining(input, line.remaining);
	const openKey = buildPackingReportOpenKey({
		dispatchId: evidence.dispatch.id,
		dispatchAllocationKey: line.dispatchAllocationKey,
	});
	if (await tx.salesPackingReport.findUnique({ where: { openKey } })) {
		throw new PackingReportError(
			"IDEMPOTENCY_CONFLICT",
			"A packing report is already pending for this dispatch allocation.",
		);
	}
	let allocationItemId = line.dispatchAllocationItemId;
	let reportEvidence = evidence;
	if (!allocationItemId) {
		const allocation = await tx.orderItemDelivery.create({
			data: {
				orderId: evidence.dispatch.salesOrderId,
				orderItemId: line.salesOrderItemId,
				orderDeliveryId: evidence.dispatch.id,
				orderProductionSubmissionId: line.submission.id,
				qty: input.qty || input.lhQty + input.rhQty,
				lhQty: input.lhQty,
				rhQty: input.rhQty,
				status: evidence.dispatch.status,
				packingStatus: "packing review",
				packedBy: null,
				meta: {
					source: "guarded_packing_report",
					idempotencyKey: input.idempotencyKey,
				},
				note: input.note,
			},
			select: { id: true },
		});
		allocationItemId = allocation.id;
		reportEvidence = await loadPackingEvidence(tx, input.dispatchId);
	}
	const report = await tx.salesPackingReport.create({
		data: {
			salesOrderId: evidence.dispatch.salesOrderId,
			orderDeliveryId: evidence.dispatch.id,
			salesOrderItemId: line.salesOrderItemId,
			orderProductionSubmissionId: line.submission.id,
			dispatchAllocationKey: line.dispatchAllocationKey,
			dispatchAllocationItemId: allocationItemId,
			submittedById: actor.id,
			status: "PENDING",
			reason: "UPSTREAM_PRODUCTION_REVIEW",
			idempotencyKey: input.idempotencyKey,
			openKey,
			qty: input.qty,
			lhQty: input.lhQty,
			rhQty: input.rhQty,
			manifestRevision: reportEvidence.revision,
			evidenceSnapshot: reportEvidence.snapshot as Prisma.InputJsonValue,
			note: input.note,
		},
		select: { id: true, status: true },
	});
	return {
		reportId: report.id,
		status: report.status,
		idempotentReplay: false,
	};
}

export async function submitPackingReport(
	db: Db,
	input: SubmitPackingReportInput,
	actor: PackingReportActor,
) {
	try {
		return await db.$transaction(
			(tx) => submitPackingReportInTransaction(tx, input, actor),
			{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
		);
	} catch (error) {
		if ((error as { code?: string }).code !== "P2002") throw error;
		const existing = await db.salesPackingReport.findUnique({
			where: { idempotencyKey: input.idempotencyKey },
		});
		if (existing) return replayPackingReport(existing, input, actor);
		throw new PackingReportError(
			"IDEMPOTENCY_CONFLICT",
			"A packing report is already pending for this dispatch allocation.",
		);
	}
}

export async function decidePackingReport(
	db: Db,
	input: DecidePackingReportInput,
	actor: { id: number; name: string },
) {
	return db.$transaction(
		async (tx) => {
			let report = await tx.salesPackingReport.findUniqueOrThrow({
				where: { id: input.reportId },
				include: { delivery: { select: { status: true, deletedAt: true } } },
			});
			await lockPackingDispatchScope(tx, report.orderDeliveryId);
			report = await tx.salesPackingReport.findUniqueOrThrow({
				where: { id: input.reportId },
				include: { delivery: { select: { status: true, deletedAt: true } } },
			});
			if (report.status !== "PENDING") {
				if (
					(report.status === "APPROVED" && input.action === "APPROVE") ||
					(report.status === "REJECTED" && input.action === "REJECT")
				) {
					return {
						reportId: report.id,
						status: report.status,
						idempotentReplay: true,
					};
				}
				throw new PackingReportError(
					"STALE_SCOPE",
					`Packing report is already ${report.status.toLowerCase()}.`,
				);
			}
			if (report.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()) {
				throw new PackingReportError(
					"STALE_EVIDENCE",
					"Packing report changed. Refresh before deciding.",
				);
			}
			if (input.action === "REJECT") {
				await tx.orderItemDelivery.update({
					where: { id: report.dispatchAllocationItemId },
					data: {
						packingStatus: "packing review rejected",
						deletedAt: new Date(),
					},
				});
				await tx.salesPackingReport.update({
					where: { id: report.id },
					data: {
						status: "REJECTED",
						openKey: null,
						reviewedById: actor.id,
						decisionNote: input.note,
						reviewedAt: new Date(),
						rejectedAt: new Date(),
					},
				});
				return {
					reportId: report.id,
					status: "REJECTED" as const,
					idempotentReplay: false,
				};
			}

			if (
				report.delivery.deletedAt ||
				!activeDispatchStatus(report.delivery.status)
			) {
				throw new PackingReportError(
					"STALE_SCOPE",
					"Dispatch scope is no longer active. Reject this report instead.",
				);
			}
			const freshEvidence = await loadPackingEvidence(
				tx as Db,
				report.orderDeliveryId,
			);
			const submission = freshEvidence.submissions.find(
				(row) =>
					row.id === report.orderProductionSubmissionId &&
					row.salesOrderItemId === report.salesOrderItemId,
			);
			if (!submission) {
				throw new PackingReportError(
					"STALE_SCOPE",
					"Packing allocation is no longer active.",
				);
			}
			if (submission.materialReview?.status !== "PENDING") {
				throw new PackingReportError(
					"STALE_EVIDENCE",
					submission.materialReview?.status === "APPROVED"
						? "Upstream production review is now approved. Reject this stale report and use normal packing."
						: "Upstream production evidence no longer supports this packing report.",
				);
			}
			const freshLine = reportableLine(
				freshEvidence,
				report.orderProductionSubmissionId,
			);
			if (freshLine.dispatchAllocationKey !== report.dispatchAllocationKey) {
				throw new PackingReportError(
					"STALE_SCOPE",
					"Packing allocation moved to another dispatch or changed after reporting.",
				);
			}
			if (
				freshLine.dispatchAllocationItemId !== report.dispatchAllocationItemId
			) {
				throw new PackingReportError(
					"STALE_SCOPE",
					"Packing allocation identity changed after reporting.",
				);
			}
			const existingCanonical = addPackingQty(
				...submission.itemDeliveries.map(canonicalQty),
			);
			const remaining = remainingPackingQty(
				canonicalQty(submission),
				existingCanonical,
			);
			assertPackingQtyWithinRemaining(report, remaining);

			const claimed = await tx.salesPackingReport.updateMany({
				where: {
					id: report.id,
					status: "PENDING",
					updatedAt: report.updatedAt,
				},
				data: {
					status: "APPROVED",
					openKey: null,
					reviewedById: actor.id,
					decisionNote: input.note,
					reviewedAt: new Date(),
				},
			});
			if (claimed.count !== 1) {
				throw new PackingReportError(
					"STALE_EVIDENCE",
					"Packing report was decided concurrently. Refresh before retrying.",
				);
			}
			await tx.orderItemDelivery.update({
				where: { id: report.dispatchAllocationItemId },
				data: {
					packingStatus: "packing review approved",
					deletedAt: new Date(),
				},
			});
			const sales = await getSaleInformation(
				tx as Db,
				{ salesId: report.salesOrderId },
				{ persistDerivedState: true },
			);
			await packDispatchItemsAction(tx as Db, {
				data: sales,
				authorId: actor.id,
				authorName: actor.name,
				approvedPackingReportId: report.id,
				update: true,
				packItems: {
					dispatchId: report.orderDeliveryId,
					dispatchStatus:
						(report.delivery.status as SalesDispatchStatus | null) || "queue",
					packMode: "selection",
					packingLines: [
						{
							salesItemId: report.salesOrderItemId,
							submissionId: report.orderProductionSubmissionId,
							qty: {
								qty: existingCanonical.qty + report.qty,
								lh: existingCanonical.lhQty + report.lhQty,
								rh: existingCanonical.rhQty + report.rhQty,
							},
							note: report.note || undefined,
						},
					],
				},
			});
			await resetSalesAction(tx as Db, report.salesOrderId);
			return {
				reportId: report.id,
				status: "APPROVED" as const,
				idempotentReplay: false,
			};
		},
		{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
	);
}
