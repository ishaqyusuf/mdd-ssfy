import type { Db } from "@gnd/db";

export type ReconciliationSeverity = "info" | "warning" | "error";

export type InventoryReconciliationDomain =
	| "sales_inventory_sync"
	| "shipment_allocation"
	| "component_fulfillment";

export type InventoryReconciliationSample = {
	domain: InventoryReconciliationDomain;
	severity: ReconciliationSeverity;
	salesOrderId?: number | null;
	orderId?: string | null;
	lineItemId?: number | null;
	salesItemId?: number | null;
	componentId?: number | null;
	message: string;
	expected?: number | string | null;
	actual?: number | string | null;
};

export type InventoryReconciliationDomainSummary = {
	domain: InventoryReconciliationDomain;
	checkedCount: number;
	driftCount: number;
	severity: ReconciliationSeverity;
	skippedCount: number;
	skippedReasons: string[];
	samples: InventoryReconciliationSample[];
};

export type InventoryReconciliationReportInput = {
	salesOrderId?: number | null;
	limit?: number;
	sampleLimit?: number;
	cursorId?: number | null;
};

export type InventoryReconciliationReport = {
	mode: "dry-run";
	status: "synced" | "needs_review" | "partial";
	salesOrderId: number | null;
	checkedLineCount: number;
	totalDriftCount: number;
	skippedComparisonCount: number;
	nextCursorId: number | null;
	hasMore: boolean;
	domains: Record<
		InventoryReconciliationDomain,
		InventoryReconciliationDomainSummary
	>;
};

type QtyLike = {
	qty?: number | null;
	status?: string | null;
	packingStatus?: string | null;
	delivery?: {
		status?: string | null;
	} | null;
};

export type InventoryReconciliationComponentLike = {
	id?: number | null;
	qty?: number | null;
	qtyAllocated?: number | null;
	qtyInbound?: number | null;
	qtyReceived?: number | null;
	status?: string | null;
	stockAllocations?: QtyLike[] | null;
	inboundDemands?: Array<{
		qty?: number | null;
		qtyReceived?: number | null;
		status?: string | null;
	}> | null;
};

export type InventoryReconciliationLineLike = {
	id?: number | null;
	qty?: number | null;
	saleId?: number | null;
	sale?: {
		id?: number | null;
		orderId?: string | null;
	} | null;
	salesItemId?: number | null;
	salesItem?: {
		id?: number | null;
		qty?: number | null;
		itemDeliveries?: QtyLike[] | null;
	} | null;
	components?: InventoryReconciliationComponentLike[] | null;
};

function numberValue(value?: number | null) {
	return Math.max(0, Number(value || 0));
}

function roundQuantity(value: number) {
	return Math.round(value * 1000) / 1000;
}

function sumBy<T>(items: T[] | null | undefined, read: (item: T) => number) {
	return (items || []).reduce((total, item) => total + read(item), 0);
}

function isCompletedDelivery(delivery: QtyLike) {
	const deliveryStatus = String(delivery.delivery?.status || "").toLowerCase();
	const lineStatus = String(delivery.status || "").toLowerCase();
	return (
		deliveryStatus === "completed" ||
		deliveryStatus === "delivered" ||
		lineStatus === "completed" ||
		lineStatus === "delivered"
	);
}

function allocationQty(
	component: InventoryReconciliationComponentLike,
	statuses: string[],
) {
	const statusSet = new Set(statuses);
	return sumBy(component.stockAllocations, (allocation) =>
		statusSet.has(String(allocation.status || ""))
			? numberValue(allocation.qty)
			: 0,
	);
}

function unitsCoveredByComponents(
	line: InventoryReconciliationLineLike,
	readComponentQty: (component: InventoryReconciliationComponentLike) => number,
) {
	const orderedQty = numberValue(line.qty ?? line.salesItem?.qty ?? 0);
	const components = line.components || [];
	const required = components.filter((component) => numberValue(component.qty) > 0);
	const blockingComponents = required.length ? required : components;

	if (orderedQty <= 0 || !blockingComponents.length) return 0;

	const units = blockingComponents.map((component) => {
		const componentQty = numberValue(component.qty);
		const perUnitQty = componentQty > 0 ? componentQty / orderedQty : 1;
		if (perUnitQty <= 0) return orderedQty;

		return Math.floor(readComponentQty(component) / perUnitQty);
	});

	return roundQuantity(Math.max(0, Math.min(orderedQty, ...units)));
}

export function expectedLineShipmentAllocationDrift(
	line: InventoryReconciliationLineLike,
) {
	const shippedQty = sumBy(line.salesItem?.itemDeliveries, (delivery) =>
		isCompletedDelivery(delivery) ? numberValue(delivery.qty) : 0,
	);
	const consumedQty = unitsCoveredByComponents(line, (component) =>
		allocationQty(component, ["consumed"]),
	);
	const delta = roundQuantity(shippedQty - consumedQty);

	return {
		shippedQty,
		consumedQty,
		delta,
		drift: Math.abs(delta) > 0.001,
	};
}

export function expectedComponentFulfillmentStatus(
	component: InventoryReconciliationComponentLike,
) {
	const qtyRequired = numberValue(component.qty);
	const qtyAllocated = allocationQty(component, [
		"approved",
		"reserved",
		"picked",
		"consumed",
	]);
	const qtyInbound = sumBy(component.inboundDemands, (demand) =>
		demand.status === "cancelled" ? 0 : numberValue(demand.qty),
	);
	const qtyReceived = sumBy(component.inboundDemands, (demand) =>
		demand.status === "cancelled" ? 0 : numberValue(demand.qtyReceived),
	);

	if (qtyRequired <= 0) return "cancelled";
	if (qtyReceived > 0 && qtyReceived < qtyInbound) return "partially_received";
	if (qtyReceived >= qtyInbound && qtyInbound > 0) {
		return qtyAllocated + qtyReceived >= qtyRequired
			? "fulfilled"
			: "partially_received";
	}
	if (qtyAllocated >= qtyRequired && qtyInbound <= 0) return "allocated";
	if (qtyAllocated > 0 && qtyInbound > 0) return "partially_allocated";
	if (qtyInbound > 0) return "inbound_required";
	return "pending";
}

function emptyDomain(
	domain: InventoryReconciliationDomain,
): InventoryReconciliationDomainSummary {
	return {
		domain,
		checkedCount: 0,
		driftCount: 0,
		severity: "info",
		skippedCount: 0,
		skippedReasons: [],
		samples: [],
	};
}

function addSkippedReason(
	domain: InventoryReconciliationDomainSummary,
	reason: string,
) {
	domain.skippedCount += 1;
	if (!domain.skippedReasons.includes(reason)) {
		domain.skippedReasons.push(reason);
	}
}

function addSample(
	domain: InventoryReconciliationDomainSummary,
	sample: InventoryReconciliationSample,
	sampleLimit: number,
) {
	domain.driftCount += 1;
	if (sample.severity === "error") domain.severity = "error";
	if (sample.severity === "warning" && domain.severity === "info") {
		domain.severity = "warning";
	}
	if (domain.samples.length < sampleLimit) {
		domain.samples.push(sample);
	}
}

export function buildInventoryReconciliationReportFromLines(
	lines: InventoryReconciliationLineLike[],
	input: {
		salesOrderId?: number | null;
		sampleLimit?: number;
		nextCursorId?: number | null;
		hasMore?: boolean;
	} = {},
): InventoryReconciliationReport {
	const sampleLimit = Math.min(Math.max(input.sampleLimit || 10, 1), 50);
	const domains = {
		sales_inventory_sync: emptyDomain("sales_inventory_sync"),
		shipment_allocation: emptyDomain("shipment_allocation"),
		component_fulfillment: emptyDomain("component_fulfillment"),
	};

	for (const line of lines) {
		domains.sales_inventory_sync.checkedCount += 1;
		if (!line.components?.length) {
			addSkippedReason(
				domains.shipment_allocation,
				"Inventory line has no component rows to compare with shipment state.",
			);
			addSkippedReason(
				domains.component_fulfillment,
				"Inventory line has no component rows to compare with fulfillment state.",
			);
			addSample(
				domains.sales_inventory_sync,
				{
					domain: "sales_inventory_sync",
					severity: "error",
					salesOrderId: line.saleId ?? line.sale?.id ?? null,
					orderId: line.sale?.orderId ?? null,
					lineItemId: line.id ?? null,
					salesItemId: line.salesItemId ?? line.salesItem?.id ?? null,
					message: "Inventory line has no component rows.",
				},
				sampleLimit,
			);
			continue;
		}

		if (!line.salesItem) {
			addSkippedReason(
				domains.shipment_allocation,
				"Inventory line has no linked legacy sales item to compare with delivery state.",
			);
			continue;
		}

		domains.shipment_allocation.checkedCount += 1;
		const shipmentDrift = expectedLineShipmentAllocationDrift(line);
		if (shipmentDrift.drift) {
			addSample(
				domains.shipment_allocation,
				{
					domain: "shipment_allocation",
					severity: "error",
					salesOrderId: line.saleId ?? line.sale?.id ?? null,
					orderId: line.sale?.orderId ?? null,
					lineItemId: line.id ?? null,
					salesItemId: line.salesItemId ?? line.salesItem?.id ?? null,
					message:
						"Completed delivery quantity does not match consumed inventory allocation quantity.",
					expected: shipmentDrift.shippedQty,
					actual: shipmentDrift.consumedQty,
				},
				sampleLimit,
			);
		}

		for (const component of line.components) {
			domains.component_fulfillment.checkedCount += 1;
			const expectedStatus = expectedComponentFulfillmentStatus(component);
			const actualStatus = component.status || "pending";
			if (expectedStatus !== actualStatus) {
				addSample(
					domains.component_fulfillment,
					{
						domain: "component_fulfillment",
						severity: "warning",
						salesOrderId: line.saleId ?? line.sale?.id ?? null,
						orderId: line.sale?.orderId ?? null,
						lineItemId: line.id ?? null,
						salesItemId: line.salesItemId ?? line.salesItem?.id ?? null,
						componentId: component.id ?? null,
						message:
							"Line item component status does not match allocation/inbound state.",
						expected: expectedStatus,
						actual: actualStatus,
					},
					sampleLimit,
				);
			}
		}
	}

	const totalDriftCount = Object.values(domains).reduce(
		(total, domain) => total + domain.driftCount,
		0,
	);
	const skippedComparisonCount = Object.values(domains).reduce(
		(total, domain) => total + domain.skippedCount,
		0,
	);
	const status: InventoryReconciliationReport["status"] =
		totalDriftCount > 0 || skippedComparisonCount > 0
			? "needs_review"
			: input.hasMore
				? "partial"
				: "synced";

	return {
		mode: "dry-run",
		status,
		salesOrderId: input.salesOrderId ?? null,
		checkedLineCount: lines.length,
		totalDriftCount,
		skippedComparisonCount,
		nextCursorId: input.nextCursorId ?? null,
		hasMore: !!input.hasMore,
		domains,
	};
}

export async function getInventoryReconciliationReport(
	db: Db,
	input: InventoryReconciliationReportInput = {},
): Promise<InventoryReconciliationReport> {
	const limit = Math.min(Math.max(input.limit || 50, 1), 200);
	const lineItems = await db.lineItem.findMany({
		where: {
			deletedAt: null,
			lineItemType: "SALE",
			saleId: input.salesOrderId || undefined,
			id: input.cursorId
				? {
						gt: input.cursorId,
					}
				: undefined,
		},
		orderBy: {
			id: "asc",
		},
		take: limit + 1,
		select: {
			id: true,
			qty: true,
			saleId: true,
			sale: {
				select: {
					id: true,
					orderId: true,
				},
			},
			salesItemId: true,
			salesItem: {
				select: {
					id: true,
					qty: true,
					itemDeliveries: {
						where: {
							deletedAt: null,
						},
						select: {
							qty: true,
							status: true,
							packingStatus: true,
							delivery: {
								select: {
									status: true,
								},
							},
						},
					},
				},
			},
			components: {
				where: {
					status: {
						not: "cancelled",
					},
				},
				select: {
					id: true,
					qty: true,
					qtyAllocated: true,
					qtyInbound: true,
					qtyReceived: true,
					status: true,
					stockAllocations: {
						where: {
							deletedAt: null,
						},
						select: {
							qty: true,
							status: true,
						},
					},
					inboundDemands: {
						where: {
							deletedAt: null,
						},
						select: {
							qty: true,
							qtyReceived: true,
							status: true,
						},
					},
				},
			},
		},
	});
	const slice = lineItems.slice(0, limit);
	const last = slice.at(-1);

	return buildInventoryReconciliationReportFromLines(slice, {
		salesOrderId: input.salesOrderId ?? null,
		sampleLimit: input.sampleLimit,
		nextCursorId: lineItems.length > limit ? (last?.id ?? null) : null,
		hasMore: lineItems.length > limit,
	});
}
