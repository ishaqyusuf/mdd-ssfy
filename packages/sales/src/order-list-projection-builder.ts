import type { Db } from "@gnd/db";
import { getNameInitials } from "@gnd/utils";
import { timeAgo } from "@gnd/utils/dayjs";
import { channelNames } from "@gnd/utils/notification-channels";
import { isControlReadV2Enabled, withSalesListControl } from "./control";
import {
	salesOrderListProjectionVersion,
	serializeSalesOrderListRow,
} from "./order-list-read-model";
import { getSalesOrderLifecycleStatusInfo } from "./order-status";
import { repairSalesInvoiceCccDisplay } from "./payment-system";
import { getSalesPriorityLabel, normalizeSalesPriority } from "./priority";
import { readSalesFormPo } from "./sales-form/application/legacy-metadata";
import { resolveSalesInventoryApplicability } from "./sales-inventory-applicability";
import { resolveSalesInventoryLegacyCompatibility } from "./sales-inventory-legacy-compatibility";
import { resolveSalesInventoryTrackingPolicy } from "./sales-inventory-tracking-policy";
import { getSpecialOrderStatusLabel } from "./special-order";
import { withSalesControl } from "./utils/with-sales-control";

export type RefreshSalesOrderListProjectionInput = {
	salesOrderId: number;
	sourceUpdatedAt: Date;
};

type InventoryInboundSummary = {
	id: number;
	status: string | null;
};

type InventoryInboundOwnership = {
	hasInventoryInbound: boolean;
	linkedInboundIds: number[];
	linkedInbounds: InventoryInboundSummary[];
	linkedInboundCount: number;
	linkedDemandCount: number;
	primaryInboundStatus: string | null;
	canUseManualInboundStatus: boolean;
};

type ProjectionRepository = {
	upsert(args: {
		where: { salesOrderId: number };
		create: Record<string, unknown>;
		update: Record<string, unknown>;
	}): Promise<unknown>;
};

function projectionRepository(db: Db): ProjectionRepository {
	return (db as unknown as { salesOrderListProjection: ProjectionRepository })
		.salesOrderListProjection;
}

function emptyInboundOwnership(): InventoryInboundOwnership {
	return {
		hasInventoryInbound: false,
		linkedInboundIds: [],
		linkedInbounds: [],
		linkedInboundCount: 0,
		linkedDemandCount: 0,
		primaryInboundStatus: null,
		canUseManualInboundStatus: true,
	};
}

function sourceRevision(row: {
	updatedAt: Date | null;
	createdAt: Date | null;
}) {
	return row.updatedAt ?? row.createdAt ?? new Date(0);
}

function titleCaseStatus(status?: string | null) {
	if (!status || status === "N/A") return status === "N/A" ? "N/A" : "Pending";
	return status
		.split(" ")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

function productionLabel(status?: string | null) {
	return !status || status === "N/A" ? "Pending" : titleCaseStatus(status);
}

function statStatus(stat?: {
	percentage: number | null;
	score: number | null;
	total: number | null;
}) {
	const percentage = Number(stat?.percentage ?? 0);
	const total = Number(stat?.total ?? 0);
	if (percentage === 0 && total === 0) return "N/A";
	if (percentage === 0) return "pending";
	if (percentage > 0 && percentage < 100) return "in progress";
	if (percentage === 100) return "completed";
	return "unknown";
}

function dispatchStat(
	stats: Array<{
		type: string;
		percentage: number | null;
		score: number | null;
		total: number | null;
	}>,
) {
	const dispatchTypes = new Set([
		"dispatchAssigned",
		"dispatchInProgress",
		"dispatchCompleted",
	]);
	return stats
		.filter((stat) => dispatchTypes.has(stat.type))
		.reduce(
			(total, stat) => ({
				percentage: total.percentage + Number(stat.percentage ?? 0),
				score: total.score + Number(stat.score ?? 0),
				total: total.total + Number(stat.total ?? 0),
			}),
			{ percentage: 0, score: 0, total: 0 },
		);
}

function serializeTagValue(value: unknown) {
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

async function getNoteCounts(
	db: Db,
	orders: Array<{ id: number; orderId: string }>,
) {
	if (!orders.length) return new Map<number, number>();
	const ids = orders.map((order) => serializeTagValue(order.id));
	const orderIds = orders.map((order) => serializeTagValue(order.orderId));
	const notes = await db.notePad.findMany({
		where: {
			deletedAt: null,
			tags: {
				some: {
					tagName: "channel",
					deletedAt: null,
					tagValue: {
						in: channelNames.map((channel) => serializeTagValue(channel)),
					},
				},
			},
			OR: [
				{
					tags: {
						some: {
							tagName: "salesId",
							deletedAt: null,
							tagValue: { in: ids },
						},
					},
				},
				{
					tags: {
						some: {
							tagName: "salesNo",
							deletedAt: null,
							tagValue: { in: orderIds },
						},
					},
				},
			],
		},
		select: {
			tags: {
				where: {
					deletedAt: null,
					tagName: { in: ["salesId", "salesNo"] },
				},
				select: { tagName: true, tagValue: true },
			},
		},
	});
	const idLookup = new Map(
		ids.map((value, index) => [value, orders[index]!.id]),
	);
	const orderIdLookup = new Map(
		orderIds.map((value, index) => [value, orders[index]!.id]),
	);
	const counts = new Map<number, number>();
	for (const note of notes) {
		const matched = new Set<number>();
		for (const tag of note.tags) {
			const id =
				tag.tagName === "salesId"
					? idLookup.get(tag.tagValue)
					: orderIdLookup.get(tag.tagValue);
			if (id) matched.add(id);
		}
		for (const id of matched) counts.set(id, (counts.get(id) ?? 0) + 1);
	}
	return counts;
}

async function getInboundOwnership(db: Db, salesOrderIds: number[]) {
	const result = new Map<number, InventoryInboundOwnership>(
		salesOrderIds.map((id) => [id, emptyInboundOwnership()]),
	);
	if (!salesOrderIds.length) return result;
	const demands = await db.inboundDemand.findMany({
		where: {
			deletedAt: null,
			inboundShipmentItemId: { not: null },
			status: { not: "cancelled" },
			inboundShipmentItem: {
				deletedAt: null,
				inbound: {
					deletedAt: null,
					status: { not: "cancelled" },
				},
			},
			lineItemComponent: {
				parent: {
					saleId: { in: salesOrderIds },
					deletedAt: null,
				},
			},
		},
		select: {
			inboundShipmentItem: {
				select: {
					inboundId: true,
					inbound: { select: { status: true } },
				},
			},
			lineItemComponent: {
				select: { parent: { select: { saleId: true } } },
			},
		},
	});
	const inboundsByOrder = new Map<
		number,
		Map<number, InventoryInboundSummary>
	>();
	for (const demand of demands) {
		const salesOrderId = demand.lineItemComponent.parent.saleId;
		if (!salesOrderId) continue;
		const current = result.get(salesOrderId) ?? emptyInboundOwnership();
		current.linkedDemandCount += 1;
		const inboundId = demand.inboundShipmentItem?.inboundId;
		if (typeof inboundId === "number") {
			const inbounds = inboundsByOrder.get(salesOrderId) ?? new Map();
			inbounds.set(inboundId, {
				id: inboundId,
				status: demand.inboundShipmentItem?.inbound?.status ?? null,
			});
			inboundsByOrder.set(salesOrderId, inbounds);
		}
		result.set(salesOrderId, current);
	}
	for (const salesOrderId of salesOrderIds) {
		const current = result.get(salesOrderId) ?? emptyInboundOwnership();
		const linkedInbounds = Array.from(
			inboundsByOrder.get(salesOrderId)?.values() ?? [],
		).sort((left, right) => left.id - right.id);
		current.linkedInbounds = linkedInbounds;
		current.linkedInboundIds = linkedInbounds.map((inbound) => inbound.id);
		current.linkedInboundCount = linkedInbounds.length;
		current.hasInventoryInbound = linkedInbounds.length > 0;
		current.primaryInboundStatus =
			linkedInbounds.length === 1 ? (linkedInbounds[0]?.status ?? null) : null;
		current.canUseManualInboundStatus = linkedInbounds.length === 0;
		result.set(salesOrderId, current);
	}
	return result;
}

export async function refreshSalesOrderListProjections(
	db: Db,
	inputs: RefreshSalesOrderListProjectionInput[],
) {
	const requestedById = new Map(
		inputs.map((input) => [input.salesOrderId, input.sourceUpdatedAt]),
	);
	const orders = await db.salesOrders.findMany({
		where: { id: { in: [...requestedById.keys()] } },
		select: {
			id: true,
			orgId: true,
			customerId: true,
			salesRepId: true,
			orderId: true,
			slug: true,
			type: true,
			status: true,
			prodStatus: true,
			priority: true,
			createdAt: true,
			updatedAt: true,
			deletedAt: true,
			meta: true,
			grandTotal: true,
			amountDue: true,
			paymentDueDate: true,
			deliveryOption: true,
			inventoryStatus: true,
			dealerAuthId: true,
			specialOrderDeclaration: true,
			specialOrderStatus: true,
			specialOrderRevision: true,
			currentSpecialOrderRequestId: true,
			currentSpecialOrderApprovalId: true,
			customer: {
				select: {
					id: true,
					name: true,
					businessName: true,
					phoneNo: true,
					email: true,
					address: true,
				},
			},
			billingAddress: {
				select: { phoneNo: true, address1: true, address2: true, name: true },
			},
			shippingAddress: {
				select: { phoneNo: true, address1: true, address2: true, name: true },
			},
			salesRep: { select: { name: true } },
			stat: {
				where: { deletedAt: null },
				select: { type: true, percentage: true, score: true, total: true },
			},
			deliveries: {
				where: { deletedAt: null },
				select: {
					status: true,
					_count: { select: { items: { where: { deletedAt: null } } } },
				},
			},
			inventoryProjection: {
				select: {
					status: true,
					needCount: true,
					source: true,
					completedAt: true,
				},
			},
		},
	});
	const currentOrders = orders.filter((order) => {
		const requestedRevision = requestedById.get(order.id);
		return requestedRevision?.getTime() === sourceRevision(order).getTime();
	});
	if (!currentOrders.length) {
		return {
			requested: inputs.length,
			persisted: 0,
			skippedAsStale: inputs.length,
		};
	}
	const ids = currentOrders.map((order) => order.id);
	const requestIds = currentOrders
		.map((order) => order.currentSpecialOrderRequestId)
		.filter((id): id is string => Boolean(id));
	const [noteCounts, inboundOwnership, requirementRows, specialRequests] =
		await Promise.all([
			getNoteCounts(db, currentOrders),
			getInboundOwnership(db, ids),
			db.lineItem.findMany({
				where: {
					saleId: { in: ids },
					deletedAt: null,
					lineItemType: "SALE",
					components: { some: { required: true, qty: { gt: 0 } } },
				},
				select: {
					saleId: true,
					components: {
						where: { required: true, qty: { gt: 0 } },
						select: {
							inventoryId: true,
							inventoryVariantId: true,
							inventory: {
								select: { id: true, productKind: true, stockMode: true },
							},
							inventoryVariant: { select: { id: true } },
							inventoryCategory: {
								select: { productKind: true, stockMode: true },
							},
							subComponent: {
								select: {
									defaultInventory: {
										select: { id: true, productKind: true, stockMode: true },
									},
									inventoryCategory: {
										select: { productKind: true, stockMode: true },
									},
								},
							},
						},
					},
				},
			}),
			db.specialOrderApprovalRequest.findMany({
				where: { id: { in: requestIds } },
				select: { id: true, status: true, expiresAt: true },
			}),
		]);
	const requirementCounts = new Map<number, number>();
	for (const requirementRow of requirementRows) {
		if (!requirementRow.saleId) continue;
		const count = requirementRow.components.filter(
			(component) =>
				resolveSalesInventoryTrackingPolicy(component) === "tracked",
		).length;
		requirementCounts.set(
			requirementRow.saleId,
			(requirementCounts.get(requirementRow.saleId) ?? 0) + count,
		);
	}
	const requestById = new Map(
		specialRequests.map((request) => [request.id, request]),
	);
	const baseRows = currentOrders.map((order) => {
		const invoice = repairSalesInvoiceCccDisplay({
			baseTotal: order.grandTotal,
			meta: order.meta,
		});
		const amountDue = Math.max(Number(order.amountDue ?? 0), 0);
		const amountPaid = Number(order.grandTotal ?? 0) - amountDue;
		const productionStat = order.stat.find(
			(stat) => stat.type === "prodCompleted",
		);
		const dispatchCompletedStat = order.stat.find(
			(stat) => stat.type === "dispatchCompleted",
		);
		const deliveriesWithItems = order.deliveries.filter(
			(delivery) => delivery._count.items > 0,
		);
		const prioritizedDelivery =
			deliveriesWithItems.find((delivery) => delivery.status === "completed") ??
			deliveriesWithItems[0];
		const productionState =
			Number(dispatchCompletedStat?.percentage ?? 0) === 100 ||
			prioritizedDelivery?.status === "completed"
				? "completed"
				: statStatus(productionStat);
		const fulfillmentState =
			prioritizedDelivery?.status === "completed"
				? "completed"
				: statStatus(dispatchStat(order.stat));
		const customerName =
			order.customer?.businessName ||
			order.customer?.name ||
			order.shippingAddress?.name ||
			"Unknown customer";
		const currentRequest = order.currentSpecialOrderRequestId
			? requestById.get(order.currentSpecialOrderRequestId)
			: null;
		const linkState = !currentRequest
			? null
			: currentRequest.status === "ACTIVE" &&
					currentRequest.expiresAt > new Date()
				? "ACTIVE"
				: currentRequest.status === "EXPIRED" ||
						currentRequest.expiresAt <= new Date()
					? "EXPIRED"
					: null;
		return {
			id: order.id,
			uuid: order.orderId,
			slug: order.slug,
			orderId: order.orderId.toUpperCase(),
			createdAt: order.createdAt,
			salesDate: timeAgo(order.createdAt),
			displayName: customerName,
			customerName,
			customerPhone:
				order.billingAddress?.phoneNo ??
				order.customer?.phoneNo ??
				order.shippingAddress?.phoneNo ??
				"-",
			customerId: order.customer?.id,
			email: order.customer?.email,
			accountNo:
				order.customer?.phoneNo ??
				(order.customer?.id ? `cust-${order.customer.id}` : null),
			type: order.type,
			address:
				order.shippingAddress?.address1 ||
				order.shippingAddress?.address2 ||
				order.billingAddress?.address1 ||
				order.billingAddress?.address2 ||
				"No address",
			salesRepName: order.salesRep?.name ?? "Unassigned",
			salesRepInitial: getNameInitials(order.salesRep?.name ?? "") || "",
			poNo:
				readSalesFormPo((order.meta ?? {}) as Record<string, unknown>) || "-",
			inboundStatus: order.inventoryStatus || null,
			isDealerSale: Number(order.dealerAuthId ?? 0) > 0,
			noteCount: noteCounts.get(order.id) ?? 0,
			deliveryOption: order.deliveryOption ?? "pickup",
			priority: normalizeSalesPriority(order.priority),
			priorityLabel: getSalesPriorityLabel(order.priority),
			specialOrder: {
				declaration: order.specialOrderDeclaration,
				status: order.specialOrderStatus,
				revision: order.specialOrderRevision,
				currentRequestId: order.currentSpecialOrderRequestId,
				currentApprovalId: order.currentSpecialOrderApprovalId,
				label: getSpecialOrderStatusLabel({
					declaration: order.specialOrderDeclaration,
					status: order.specialOrderStatus,
				}),
				linkState,
				currentRequestExpiresAt: currentRequest?.expiresAt ?? null,
			},
			baseInvoiceTotal: invoice.baseTotal,
			displayCcc: invoice.ccc,
			invoiceTotal: invoice.totalWithCcc,
			amountPaid,
			amountDue,
			displayAmountPaid: amountPaid,
			displayAmountDue: repairSalesInvoiceCccDisplay({
				baseTotal: amountDue,
				meta: order.meta,
			}).totalWithCcc,
			latestPaymentReview: null,
			due: amountDue,
			paymentDueDate: order.paymentDueDate,
			invoiceStatus: amountDue <= 0 ? "paid" : "outstanding",
			orderStatus: order.status || null,
			prodStatus: order.prodStatus || null,
			productionState,
			productionLabel: productionLabel(productionState),
			fulfillmentState,
			fulfillmentLabel: titleCaseStatus(fulfillmentState),
			inventoryInboundOwnership:
				inboundOwnership.get(order.id) ?? emptyInboundOwnership(),
			inventoryProjection: order.inventoryProjection,
		};
	});
	const controlledRows = isControlReadV2Enabled()
		? await withSalesListControl(baseRows, db)
		: await withSalesControl(baseRows, db);
	const projectedRows = controlledRows.map((row) => {
		const productionState =
			row.control.productionStatus !== "unknown"
				? row.control.productionStatus
				: row.productionState;
		const fulfillmentState =
			row.control.dispatchStatus !== "unknown"
				? row.control.dispatchStatus
				: row.fulfillmentState;
		const lifecycle = getSalesOrderLifecycleStatusInfo({
			orderStatus: row.orderStatus,
			legacyProductionStatus: row.prodStatus,
			productionStatus: productionState,
			fulfillmentStatus: fulfillmentState,
			hasProductionWork: productionState === "N/A" ? false : undefined,
			packed: row.control.packed,
			pendingPacking: row.control.pendingPacking,
			pendingDispatch: row.control.pendingDispatch,
			packables: row.control.packables,
		});
		const existingInventoryNeedCount = requirementCounts.get(row.id) ?? 0;
		const { inventoryProjection, ...payload } = row;
		return {
			...payload,
			productionState,
			productionLabel: productionLabel(productionState),
			fulfillmentState,
			fulfillmentLabel: titleCaseStatus(fulfillmentState),
			status: lifecycle.status,
			statusLabel: lifecycle.label,
			statusTone: lifecycle.tone,
			inventoryApplicability: resolveSalesInventoryApplicability({
				lifecycleStatus: lifecycle.status,
				projection: inventoryProjection,
				existingInventoryNeedCount,
			}),
			inventoryLegacyCompatibility: resolveSalesInventoryLegacyCompatibility({
				legacyStatus: row.inboundStatus,
				lifecycleStatus: lifecycle.status,
				inventoryRowCount: existingInventoryNeedCount,
				projectionStatus: inventoryProjection?.status,
				projectionNeedCount: inventoryProjection?.needCount,
				projectionSource: inventoryProjection?.source,
				linkedInboundCount: row.inventoryInboundOwnership.linkedInboundCount,
			}),
		};
	});
	const projectedById = new Map(projectedRows.map((row) => [row.id, row]));
	const repository = projectionRepository(db);
	let persisted = 0;
	let skippedAsStale = inputs.length - currentOrders.length;
	for (const order of currentOrders) {
		const row = projectedById.get(order.id);
		if (!row) continue;
		const revision = sourceRevision(order);
		const latestSource = await db.salesOrders.findUnique({
			where: { id: order.id },
			select: { createdAt: true, updatedAt: true },
		});
		if (
			!latestSource ||
			sourceRevision(latestSource).getTime() !== revision.getTime()
		) {
			skippedAsStale += 1;
			continue;
		}
		const projection = {
			orgId: order.orgId,
			salesRepId: order.salesRepId,
			customerId: order.customerId,
			orderId: order.orderId,
			slug: order.slug,
			type: order.type,
			status: order.status,
			prodStatus: order.prodStatus,
			amountDue: order.amountDue,
			invoiceTotal: order.grandTotal,
			salesCreatedAt: order.createdAt,
			salesDeletedAt: order.deletedAt,
			sourceUpdatedAt: revision,
			version: salesOrderListProjectionVersion(),
			state: "ready",
			payload: serializeSalesOrderListRow(row),
			lastError: null,
			projectedAt: new Date(),
		};
		await repository.upsert({
			where: { salesOrderId: order.id },
			create: { salesOrderId: order.id, ...projection },
			update: projection,
		});
		persisted += 1;
	}
	return {
		requested: inputs.length,
		persisted,
		skippedAsStale,
	};
}
