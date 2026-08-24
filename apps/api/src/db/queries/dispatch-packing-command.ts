import { createHash } from "node:crypto";

import type { TRPCContext } from "@api/trpc/init";
import { Prisma, type TransactionClient } from "@gnd/db";
import {
	type PackingPlanItem,
	buildGuardedPackingPlan,
} from "@gnd/sales/dispatch-packing-plan";
import {
	assertNoPendingPackingReports,
	lockPackingDispatchScope,
} from "@gnd/sales/packing-report-review";
import { releaseDispatchBoundInventory } from "@gnd/sales/sales-fulfillment-plan";
import {
	packDispatchItemsAction,
	resetSalesAction,
	submitNonProductionsAction,
} from "@sales/sales-control/actions";
import { getSaleInformation } from "@sales/sales-control/get-sale-information";
import type { SalesDispatchStatus } from "@sales/types";

import { getDispatchInventoryManifest } from "./dispatch-inventory";
import { prepareAndPickDispatchInventoryInTransaction } from "./dispatch-inventory-actions";
import {
	getPackingReportContext,
	submitPackingReportInTransaction,
} from "./packing-reports";

type DbLike = TRPCContext["db"] | TransactionClient;

export type DispatchPackingQuantity = {
	qty?: number | null;
	lh?: number | null;
	rh?: number | null;
};

export type ConfirmDispatchPackingInput = {
	dispatchId: number;
	requestId: string;
	expectedManifestRevision: string;
	replaceExisting: boolean;
	items: Array<{
		salesItemId: number;
		itemUid?: string | null;
		title?: string | null;
		qty: DispatchPackingQuantity;
		note?: string | null;
	}>;
};

type PackingActor = {
	id: number;
	name: string;
	scope: "role" | "assignment";
	canReleasePicked: boolean;
};

export class DispatchPackingCommandError extends Error {
	constructor(
		readonly code:
			| "STALE_MANIFEST"
			| "IDEMPOTENCY_CONFLICT"
			| "INVALID_SCOPE"
			| "TERMINAL_DISPATCH"
			| "UNAVAILABLE_QUANTITY",
		message: string,
		readonly manifestRevision?: string,
	) {
		super(message);
		this.name = "DispatchPackingCommandError";
	}
}

function asJsonRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function compactQuantity(value: DispatchPackingQuantity) {
	const lh = Math.max(0, Number(value.lh || 0));
	const rh = Math.max(0, Number(value.rh || 0));
	return lh > 0 || rh > 0
		? { qty: 0, lh, rh }
		: { qty: Math.max(0, Number(value.qty || 0)), lh: 0, rh: 0 };
}

export function commandFingerprint(input: ConfirmDispatchPackingInput) {
	return createHash("sha256")
		.update(
			JSON.stringify({
				dispatchId: input.dispatchId,
				replaceExisting: input.replaceExisting,
				items: input.items
					.map((item) => ({
						salesItemId: item.salesItemId,
						itemUid: item.itemUid || null,
						title: item.title || null,
						qty: compactQuantity(item.qty),
						note: item.note?.trim() || null,
					}))
					.sort((a, b) =>
						`${a.salesItemId}:${a.itemUid || ""}`.localeCompare(
							`${b.salesItemId}:${b.itemUid || ""}`,
						),
					),
			}),
		)
		.digest("hex");
}

type PackingCommandRecord = {
	requestId: string;
	fingerprint: string;
	completedAt: string;
};

function commandRecords(meta: unknown): PackingCommandRecord[] {
	const value = asJsonRecord(meta).mobilePackingCommands;
	if (!Array.isArray(value)) return [];
	return value.flatMap((entry) => {
		const row = asJsonRecord(entry);
		return typeof row.requestId === "string" &&
			typeof row.fingerprint === "string" &&
			typeof row.completedAt === "string"
			? [
					{
						requestId: row.requestId,
						fingerprint: row.fingerprint,
						completedAt: row.completedAt,
					},
				]
			: [];
	});
}

export function isPackingCommandReplay(
	meta: unknown,
	requestId: string,
	fingerprint: string,
) {
	const previous = commandRecords(meta).find(
		(record) => record.requestId === requestId,
	);
	if (!previous) return false;
	if (previous.fingerprint !== fingerprint) {
		throw new DispatchPackingCommandError(
			"IDEMPOTENCY_CONFLICT",
			"Packing request id was already used for different content.",
		);
	}
	return true;
}

export function assertPackingManifestRevision(
	currentRevision: string,
	expectedRevision: string,
) {
	if (currentRevision !== expectedRevision) {
		throw new DispatchPackingCommandError(
			"STALE_MANIFEST",
			"Packing changed. Refresh before confirming quantities.",
			currentRevision,
		);
	}
}

export async function getDispatchPackingCommandRevision(
	db: DbLike,
	dispatchId: number,
) {
	const dispatch = await db.orderDelivery.findFirst({
		where: { id: dispatchId, deletedAt: null },
		select: { id: true, salesOrderId: true, status: true, driverId: true },
	});
	if (!dispatch) {
		throw new DispatchPackingCommandError(
			"INVALID_SCOPE",
			"Dispatch was not found.",
		);
	}
	const [inventory, packingRows, reports] = await Promise.all([
		getDispatchInventoryManifest(db as TRPCContext["db"], {
			salesOrderId: dispatch.salesOrderId,
			orderDeliveryId: dispatch.id,
		}),
		db.orderItemDelivery.findMany({
			where: { orderDeliveryId: dispatch.id, deletedAt: null },
			orderBy: { id: "asc" },
			select: {
				id: true,
				orderItemId: true,
				orderProductionSubmissionId: true,
				qty: true,
				lhQty: true,
				rhQty: true,
				packingStatus: true,
				updatedAt: true,
			},
		}),
		db.salesPackingReport.findMany({
			where: { orderDeliveryId: dispatch.id, status: "PENDING" },
			orderBy: { id: "asc" },
			select: { id: true, status: true, updatedAt: true },
		}),
	]);
	return createHash("sha256")
		.update(
			JSON.stringify({
				dispatch: {
					id: dispatch.id,
					salesOrderId: dispatch.salesOrderId,
					status: dispatch.status,
					driverId: dispatch.driverId,
				},
				inventoryRevision: inventory.revision,
				packingRows,
				reports,
			}),
		)
		.digest("hex");
}

function findSaleItem(
	info: Awaited<ReturnType<typeof getSaleInformation>>,
	request: ConfirmDispatchPackingInput["items"][number],
) {
	return (
		(request.itemUid
			? info.items.find((item) => item.controlUid === request.itemUid)
			: null) || info.items.find((item) => item.itemId === request.salesItemId)
	);
}

async function buildLegacyPlan(
	tx: TransactionClient,
	dispatchId: number,
	requests: ConfirmDispatchPackingInput["items"],
	authorId: number,
) {
	let info = await getSaleInformation(
		tx as TRPCContext["db"],
		{
			salesId: (
				await tx.orderDelivery.findUniqueOrThrow({ where: { id: dispatchId } })
			).salesOrderId,
		},
		{ persistDerivedState: true },
	);

	const plan = async () => {
		const context = await getPackingReportContext(
			tx as TRPCContext["db"],
			dispatchId,
		);
		const items: PackingPlanItem[] = requests.map((request) => {
			const item = findSaleItem(info, request);
			return {
				salesItemId: request.salesItemId,
				itemUid:
					request.itemUid || item?.controlUid || `item-${request.salesItemId}`,
				title: request.title || item?.title || `Item #${request.salesItemId}`,
				requested: compactQuantity(request.qty),
				deliverables: (item?.deliverables || []).map((entry) => ({
					submissionId: Number(entry.submissionId),
					qty: entry.qty,
				})),
				note: request.note?.trim() || undefined,
			};
		});
		return buildGuardedPackingPlan(items, context.reportableLines);
	};

	let result = await plan();
	const canMaterialize = requests.some((request) => {
		const item = findSaleItem(info, request);
		return item && item.itemConfig?.production === false;
	});
	if (result.unavailable.length && canMaterialize) {
		await submitNonProductionsAction(tx as never, {
			data: info,
			authorId,
		});
		info = await getSaleInformation(
			tx as TRPCContext["db"],
			{ salesId: info.order.id },
			{ persistDerivedState: true },
		);
		result = await plan();
	}
	return { info, result };
}

export async function confirmDispatchPacking(
	db: TRPCContext["db"],
	input: ConfirmDispatchPackingInput,
	actor: PackingActor,
) {
	const fingerprint = commandFingerprint(input);
	return db.$transaction(
		async (tx) => {
			await lockPackingDispatchScope(tx, input.dispatchId);
			const dispatch = await tx.orderDelivery.findFirst({
				where: { id: input.dispatchId, deletedAt: null },
				select: {
					id: true,
					salesOrderId: true,
					status: true,
					driverId: true,
					meta: true,
				},
			});
			if (!dispatch) {
				throw new DispatchPackingCommandError(
					"INVALID_SCOPE",
					"Dispatch was not found.",
				);
			}
			if (actor.scope === "assignment" && dispatch.driverId !== actor.id) {
				throw new DispatchPackingCommandError(
					"INVALID_SCOPE",
					"Dispatch assignment changed. Refresh before packing.",
				);
			}
			if (
				["completed", "delivered", "cancelled"].includes(dispatch.status || "")
			) {
				throw new DispatchPackingCommandError(
					"TERMINAL_DISPATCH",
					"Completed or cancelled dispatches cannot be packed.",
				);
			}

			if (isPackingCommandReplay(dispatch.meta, input.requestId, fingerprint)) {
				return {
					status: dispatch.status,
					idempotent: true,
					manifestRevision: await getDispatchPackingCommandRevision(
						tx,
						dispatch.id,
					),
					packedLineCount: 0,
					pendingReportIds: [] as number[],
				};
			}
			await assertNoPendingPackingReports(tx as TRPCContext["db"], {
				dispatchId: dispatch.id,
				salesOrderId: dispatch.salesOrderId,
			});

			const currentRevision = await getDispatchPackingCommandRevision(
				tx,
				dispatch.id,
			);
			assertPackingManifestRevision(
				currentRevision,
				input.expectedManifestRevision,
			);

			const inventoryManifest = await getDispatchInventoryManifest(
				tx as TRPCContext["db"],
				{
					salesOrderId: dispatch.salesOrderId,
					orderDeliveryId: dispatch.id,
				},
			);
			if (
				inventoryManifest.scope.inventoryLineCount > 0 &&
				!inventoryManifest.scope.resolved
			) {
				throw new DispatchPackingCommandError(
					"INVALID_SCOPE",
					"Inventory scope is ambiguous. Assign exact dispatch items before packing.",
				);
			}
			const inventoryIds = new Set(
				inventoryManifest.lines.flatMap((line) =>
					line.salesItemId ? [line.salesItemId] : [],
				),
			);
			const inventoryRequests = input.items.filter((item) =>
				inventoryIds.has(item.salesItemId),
			);
			const legacyRequests = input.items.filter(
				(item) => !inventoryIds.has(item.salesItemId),
			);

			if (input.replaceExisting) {
				await releaseDispatchBoundInventory(tx, {
					orderDeliveryId: dispatch.id,
					allowPickedRelease: actor.canReleasePicked,
					note: `Replaced by packing request ${input.requestId}`,
				});
				await tx.orderItemDelivery.updateMany({
					where: {
						orderDeliveryId: dispatch.id,
						orderId: dispatch.salesOrderId,
						deletedAt: null,
						packingStatus: { not: "unpacked" },
					},
					data: { packingStatus: "unpacked", unpackedBy: actor.name },
				});
			}

			let packedLineCount = 0;
			let guardedLines: ReturnType<
				typeof buildGuardedPackingPlan
			>["guardedLines"] = [];
			if (legacyRequests.length) {
				const legacy = await buildLegacyPlan(
					tx,
					dispatch.id,
					legacyRequests,
					actor.id,
				);
				if (legacy.result.unavailable.length) {
					throw new DispatchPackingCommandError(
						"UNAVAILABLE_QUANTITY",
						`Unavailable quantity: ${legacy.result.unavailable
							.map((item) => item.title)
							.slice(0, 3)
							.join(", ")}`,
					);
				}
				guardedLines = legacy.result.guardedLines;
				if (legacy.result.packingLines.length) {
					const packed = await packDispatchItemsAction(tx as never, {
						data: legacy.info,
						authorId: actor.id,
						authorName: actor.name,
						update: true,
						packItems: {
							dispatchId: dispatch.id,
							dispatchStatus:
								(dispatch.status as SalesDispatchStatus | null) || "queue",
							packMode: "selection",
							packingLines: legacy.result.packingLines,
						},
					});
					packedLineCount += packed.created;
				}
			}

			if (inventoryRequests.length) {
				const duplicateIds = inventoryRequests
					.map((item) => item.salesItemId)
					.filter((id, index, values) => values.indexOf(id) !== index);
				if (duplicateIds.length) {
					throw new DispatchPackingCommandError(
						"INVALID_SCOPE",
						"Inventory-backed packing contains duplicate sales items.",
					);
				}
				const inventory = await prepareAndPickDispatchInventoryInTransaction(
					tx,
					{
						salesOrderId: dispatch.salesOrderId,
						orderDeliveryId: dispatch.id,
						items: inventoryRequests.map((item) => ({
							salesItemId: item.salesItemId,
							qty: compactQuantity(item.qty).qty,
							lhQty: compactQuantity(item.qty).lh,
							rhQty: compactQuantity(item.qty).rh,
						})),
					},
				);
				packedLineCount += inventory.pickedCount;
			}

			const pendingReportIds: number[] = [];
			for (const [index, guarded] of guardedLines.entries()) {
				const context = await getPackingReportContext(
					tx as TRPCContext["db"],
					dispatch.id,
				);
				const currentLine = context.reportableLines.find(
					(line) =>
						line.productionSubmissionId === guarded.productionSubmissionId &&
						line.salesOrderItemId === guarded.salesOrderItemId,
				);
				if (!currentLine) {
					throw new DispatchPackingCommandError(
						"STALE_MANIFEST",
						"Guarded packing evidence changed. Refresh before retrying.",
					);
				}
				const report = await submitPackingReportInTransaction(
					tx,
					{
						dispatchId: dispatch.id,
						productionSubmissionId: guarded.productionSubmissionId,
						dispatchAllocationKey: currentLine.dispatchAllocationKey,
						manifestRevision: context.manifestRevision,
						idempotencyKey: `${input.requestId}:guarded:${index}`,
						physicallyVerified: true,
						qty: guarded.qty,
						lhQty: guarded.lhQty,
						rhQty: guarded.rhQty,
						note: guarded.note,
					},
					actor,
				);
				pendingReportIds.push(report.reportId);
			}

			if (pendingReportIds.length) {
				await tx.orderDelivery.update({
					where: { id: dispatch.id },
					data: { status: "missing items" },
				});
			}
			await resetSalesAction(tx as never, dispatch.salesOrderId);
			const records = commandRecords(dispatch.meta)
				.filter((record) => record.requestId !== input.requestId)
				.slice(-19);
			await tx.orderDelivery.update({
				where: { id: dispatch.id },
				data: {
					meta: {
						...asJsonRecord(dispatch.meta),
						mobilePackingCommands: [
							...records,
							{
								requestId: input.requestId,
								fingerprint,
								completedAt: new Date().toISOString(),
							},
						],
					} as Prisma.InputJsonValue,
				},
			});
			const finalDispatch = await tx.orderDelivery.findUniqueOrThrow({
				where: { id: dispatch.id },
				select: { status: true },
			});
			return {
				status: finalDispatch.status,
				idempotent: false,
				manifestRevision: await getDispatchPackingCommandRevision(
					tx,
					dispatch.id,
				),
				packedLineCount,
				pendingReportIds,
			};
		},
		{
			isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
			maxWait: 10_000,
			timeout: 30_000,
		},
	);
}

export async function resetDispatchPacking(
	db: TRPCContext["db"],
	input: Pick<
		ConfirmDispatchPackingInput,
		"dispatchId" | "requestId" | "expectedManifestRevision"
	>,
	actor: Pick<PackingActor, "id" | "name">,
) {
	const fingerprint = createHash("sha256")
		.update(JSON.stringify({ dispatchId: input.dispatchId, command: "reset" }))
		.digest("hex");
	return db.$transaction(
		async (tx) => {
			await lockPackingDispatchScope(tx, input.dispatchId);
			const dispatch = await tx.orderDelivery.findFirst({
				where: { id: input.dispatchId, deletedAt: null },
				select: { id: true, salesOrderId: true, status: true, meta: true },
			});
			if (!dispatch) {
				throw new DispatchPackingCommandError(
					"INVALID_SCOPE",
					"Dispatch was not found.",
				);
			}
			if (isPackingCommandReplay(dispatch.meta, input.requestId, fingerprint)) {
				return {
					status: dispatch.status,
					idempotent: true,
					unpackedCount: 0,
					releasedAllocationIds: [] as number[],
					manifestRevision: await getDispatchPackingCommandRevision(
						tx,
						dispatch.id,
					),
				};
			}
			await assertNoPendingPackingReports(tx as TRPCContext["db"], {
				dispatchId: dispatch.id,
				salesOrderId: dispatch.salesOrderId,
			});
			if (
				["completed", "delivered", "cancelled"].includes(dispatch.status || "")
			) {
				throw new DispatchPackingCommandError(
					"TERMINAL_DISPATCH",
					"Completed or cancelled dispatches cannot be reset.",
				);
			}
			const revision = await getDispatchPackingCommandRevision(tx, dispatch.id);
			assertPackingManifestRevision(revision, input.expectedManifestRevision);
			const released = await releaseDispatchBoundInventory(tx, {
				orderDeliveryId: dispatch.id,
				allowPickedRelease: true,
				note: `Packing reset ${input.requestId} by ${actor.name}`,
			});
			const unpacked = await tx.orderItemDelivery.updateMany({
				where: {
					orderDeliveryId: dispatch.id,
					orderId: dispatch.salesOrderId,
					deletedAt: null,
					packingStatus: { not: "unpacked" },
				},
				data: { packingStatus: "unpacked", unpackedBy: actor.name },
			});
			const records = commandRecords(dispatch.meta)
				.filter((record) => record.requestId !== input.requestId)
				.slice(-19);
			await tx.orderDelivery.update({
				where: { id: dispatch.id },
				data: {
					status: "queue",
					deliveredAt: null,
					meta: {
						...asJsonRecord(dispatch.meta),
						mobilePackingCommands: [
							...records,
							{
								requestId: input.requestId,
								fingerprint,
								completedAt: new Date().toISOString(),
							},
						],
					} as Prisma.InputJsonValue,
				},
			});
			await resetSalesAction(tx as never, dispatch.salesOrderId);
			return {
				status: "queue" as const,
				idempotent: false,
				unpackedCount: unpacked.count,
				releasedAllocationIds: released.releasedAllocationIds,
				manifestRevision: await getDispatchPackingCommandRevision(
					tx,
					dispatch.id,
				),
			};
		},
		{
			isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
			maxWait: 10_000,
			timeout: 30_000,
		},
	);
}
