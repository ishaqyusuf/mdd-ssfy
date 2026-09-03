import type { Database, Prisma, TransactionClient } from "@gnd/db";
import { sum } from "@gnd/utils";
import {
	type SalesPipelineAdministrativeCompletion,
	type SalesPipelineSnapshot,
	resolveSalesPipelineSnapshot,
} from "./sales-pipeline";

export const salesPipelineOrderSelect = {
	id: true,
	orderId: true,
	status: true,
	prodStatus: true,
	deletedAt: true,
	archivedAt: true,
	grandTotal: true,
	amountDue: true,
	updatedAt: true,
	inventoryProjection: {
		select: {
			status: true,
			needCount: true,
			completedAt: true,
			updatedAt: true,
		},
	},
	stat: {
		where: { deletedAt: null },
		orderBy: { type: "asc" as const },
		select: {
			type: true,
			total: true,
			score: true,
			percentage: true,
		},
	},
	completionRecords: {
		where: { state: "ACTIVE" },
		orderBy: [{ recordedAt: "desc" as const }, { id: "desc" as const }],
		select: {
			id: true,
			milestone: true,
			completionMethod: true,
			recordedAt: true,
			effectiveAt: true,
			recordedById: true,
		},
	},
	itemControls: {
		where: { deletedAt: null },
		orderBy: { uid: "asc" as const },
		select: {
			uid: true,
			produceable: true,
			shippable: true,
			qtyControls: {
				where: { deletedAt: null },
				orderBy: { type: "asc" as const },
				select: {
					type: true,
					total: true,
					itemTotal: true,
					qty: true,
					updatedAt: true,
				},
			},
		},
	},
	assignments: {
		where: { deletedAt: null },
		orderBy: { id: "asc" as const },
		select: {
			id: true,
			assignedToId: true,
			qtyAssigned: true,
			qtyCompleted: true,
			lhQty: true,
			rhQty: true,
			dueDate: true,
			assignedAt: true,
			completedAt: true,
			updatedAt: true,
			submissions: {
				where: { deletedAt: null },
				orderBy: { id: "asc" as const },
				select: {
					id: true,
					qty: true,
					lhQty: true,
					rhQty: true,
					createdAt: true,
					updatedAt: true,
					materialReview: { select: { status: true, updatedAt: true } },
				},
			},
		},
	},
	deliveries: {
		where: { deletedAt: null },
		orderBy: { id: "asc" as const },
		select: {
			id: true,
			status: true,
			meta: true,
			dueDate: true,
			driverId: true,
			updatedAt: true,
			items: {
				where: { deletedAt: null },
				orderBy: { id: "asc" as const },
				select: { id: true, qty: true, updatedAt: true },
			},
			_count: { select: { stockAllocations: true } },
		},
	},
} satisfies Prisma.SalesOrdersSelect;

export type SalesPipelineOrderRow = Prisma.SalesOrdersGetPayload<{
	select: typeof salesPipelineOrderSelect;
}>;

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function qtyControlTotal(
	control: SalesPipelineOrderRow["itemControls"][number],
	type: string,
) {
	const qty = control.qtyControls.find((item) => item.type === type);
	return Number(qty?.total ?? qty?.itemTotal ?? qty?.qty ?? 0);
}

function configuredRequirement(
	controls: SalesPipelineOrderRow["itemControls"],
	key: "produceable" | "shippable",
) {
	if (controls.length === 0) return null;
	return controls.some((control) => control[key] === true);
}

function administrativeCompletion(
	row: SalesPipelineOrderRow,
	milestone: "PRODUCTION_COMPLETED" | "FULFILLMENT_COMPLETED",
): SalesPipelineAdministrativeCompletion | null {
	const record = (row.completionRecords ?? []).find(
		(completion) => completion.milestone === milestone,
	);
	return record
		? {
				recordId: record.id,
				method: record.completionMethod,
				recordedAt: record.recordedAt,
				effectiveAt: record.effectiveAt,
				recordedById: record.recordedById,
			}
		: null;
}

function maxEvidenceDate(row: SalesPipelineOrderRow) {
	const values = [
		row.updatedAt,
		row.inventoryProjection?.updatedAt,
		...(row.completionRecords ?? []).map((item) => item.recordedAt),
		...(row.itemControls ?? []).flatMap((item) =>
			item.qtyControls.map((control) => control.updatedAt),
		),
		...(row.assignments ?? []).flatMap((assignment) => [
			assignment.updatedAt,
			...assignment.submissions.flatMap((submission) => [
				submission.updatedAt,
				submission.materialReview?.updatedAt,
			]),
		]),
		...(row.deliveries ?? []).flatMap((delivery) => [
			delivery.updatedAt,
			...delivery.items.map((item) => item.updatedAt),
		]),
	]
		.filter((value): value is Date => value instanceof Date)
		.map((value) => value.getTime());
	return new Date(Math.max(row.updatedAt?.getTime() ?? 0, ...values));
}

export function resolveSalesPipelineSnapshotFromOrder(
	row: SalesPipelineOrderRow,
): SalesPipelineSnapshot {
	const itemControls = row.itemControls ?? [];
	const assignments = row.assignments ?? [];
	const deliveries = row.deliveries ?? [];
	const stats = row.stat ?? [];
	const productionRequired = configuredRequirement(itemControls, "produceable");
	const fulfillmentRequired = configuredRequirement(itemControls, "shippable");
	const productionQty = sum(
		itemControls
			.filter((control) => control.produceable)
			.map((control) => qtyControlTotal(control, "qty")),
	);
	const fulfillmentQty = sum(
		itemControls
			.filter((control) => control.shippable)
			.map((control) => qtyControlTotal(control, "qty")),
	);
	const packedQty = sum(
		itemControls.map((control) => qtyControlTotal(control, "packed")),
	);
	const aggregate = stats.find((stat) => stat.type === "prodCompleted");
	const dispatches = deliveries.map((delivery) => {
		const meta = asRecord(delivery.meta);
		const proof = asRecord(meta.dispatchCompletion);
		const inventory = asRecord(meta.inventoryDispatch);
		const itemQty = sum(delivery.items.map((item) => item.qty));
		const proofCompleted = proof.status === "completed";
		return {
			id: delivery.id,
			active: !["cancelled", "canceled"].includes(
				String(delivery.status ?? "")
					.trim()
					.toLowerCase(),
			),
			itemCount: delivery.items.length,
			requiredQty: itemQty,
			packedQty: itemQty,
			deliveredQty: proofCompleted ? itemQty : 0,
			status: delivery.status,
			dueDate: delivery.dueDate,
			driverId: delivery.driverId,
			proofCompleted,
			inventoryCommitted:
				delivery._count.stockAllocations === 0 ||
				inventory.status === "consumed",
		};
	});

	return resolveSalesPipelineSnapshot({
		salesOrderId: row.id,
		orderNo: row.orderId,
		commercial: {
			status: row.status,
			deletedAt: row.deletedAt,
			archivedAt: row.archivedAt,
		},
		payment: {
			total: Number(row.grandTotal || 0),
			amountDue: Number(row.amountDue || 0),
		},
		material: {
			applicability:
				row.inventoryProjection == null
					? "unknown"
					: Number(row.inventoryProjection.needCount || 0) > 0
						? "required"
						: "not_required",
			requiredQty: Number(row.inventoryProjection?.needCount || 0),
			readyQty: row.inventoryProjection?.completedAt
				? Number(row.inventoryProjection.needCount || 0)
				: 0,
			state: row.inventoryProjection?.status,
		},
		production: {
			configuredRequirement: productionRequired,
			requiredQty:
				productionQty ||
				sum(
					assignments.map((assignment) =>
						Number(
							assignment.qtyAssigned ||
								sum([assignment.lhQty, assignment.rhQty]),
						),
					),
				),
			assignments: assignments.map((assignment) => ({
				id: assignment.id,
				active: true,
				assignedQty: Number(
					assignment.qtyAssigned || sum([assignment.lhQty, assignment.rhQty]),
				),
				completedQty: Number(assignment.qtyCompleted || 0),
				dueDate: assignment.dueDate,
				assignedToId: assignment.assignedToId,
				startedAt: assignment.assignedAt,
				completedAt: assignment.completedAt,
			})),
			submissions: assignments.flatMap((assignment) =>
				assignment.submissions.map((submission) => ({
					id: submission.id,
					assignmentId: assignment.id,
					active: true,
					quantity: Number(
						submission.qty || sum([submission.lhQty, submission.rhQty]),
					),
					reviewStatus: submission.materialReview?.status,
					createdAt: submission.createdAt,
				})),
			),
			aggregate: aggregate
				? {
						total: Number(aggregate.total || 0),
						score: Number(aggregate.score || 0),
						percentage: Number(aggregate.percentage || 0),
						updatedAt: row.updatedAt,
					}
				: null,
			administrativeCompletion: administrativeCompletion(
				row,
				"PRODUCTION_COMPLETED",
			),
		},
		fulfillment: {
			configuredRequirement: fulfillmentRequired,
			requiredQty: fulfillmentQty,
			packedQty,
			dispatches,
			administrativeCompletion: administrativeCompletion(
				row,
				"FULFILLMENT_COMPLETED",
			),
		},
		legacy: {
			orderStatus: row.status,
			productionStatus: row.prodStatus,
			fulfillmentStatus: deliveries[0]?.status,
		},
		evidenceUpdatedAt: maxEvidenceDate(row),
	});
}

export async function getSalesPipelineSnapshots(
	db: Database | TransactionClient,
	salesOrderIds: number[],
) {
	if (salesOrderIds.length === 0)
		return new Map<number, SalesPipelineSnapshot>();
	const ids = Array.from(new Set(salesOrderIds));
	const snapshots = new Map<number, SalesPipelineSnapshot>();
	for (let index = 0; index < ids.length; index += 250) {
		const rows = await db.salesOrders.findMany({
			where: { id: { in: ids.slice(index, index + 250) } },
			select: salesPipelineOrderSelect,
		});
		for (const row of rows) {
			snapshots.set(row.id, resolveSalesPipelineSnapshotFromOrder(row));
		}
	}
	return snapshots;
}
