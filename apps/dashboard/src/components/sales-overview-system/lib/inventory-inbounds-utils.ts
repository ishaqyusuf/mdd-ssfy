export type InventoryInboundCountState =
	| "loading"
	| "pending"
	| "covered"
	| "empty";

export type InventoryAvailabilityState = "empty" | "partial" | "complete";

export type InventoryCoverageDisplay = {
	requiredQty: number;
	coveredQty: number;
	orderedQty: number;
	orderedOfQty: number;
	showCovered: boolean;
	showOrdered: boolean;
};

export function resolveInventoryCoverageDisplay(input: {
	qtyRequired?: number | null;
	qtyAllocated?: number | null;
	qtyReceived?: number | null;
	qtyInboundLinkedOpen?: number | null;
}): InventoryCoverageDisplay {
	const requiredQty = Math.max(0, Number(input.qtyRequired || 0));
	const coveredQty = Math.min(
		requiredQty,
		Math.max(0, Number(input.qtyAllocated || 0)) +
			Math.max(0, Number(input.qtyReceived || 0)),
	);
	const orderedOfQty = Math.max(0, requiredQty - coveredQty);
	const orderedQty = Math.min(
		orderedOfQty,
		Math.max(0, Number(input.qtyInboundLinkedOpen || 0)),
	);

	return {
		requiredQty,
		coveredQty,
		orderedQty,
		orderedOfQty,
		showCovered: coveredQty > 0 || orderedQty === 0,
		showOrdered: orderedQty > 0,
	};
}

export function resolveInventoryAvailabilityState(input: {
	qtyCovered?: number | null;
	qtyRequired?: number | null;
}): InventoryAvailabilityState {
	const required = Math.max(0, Number(input.qtyRequired || 0));
	const covered = Math.max(0, Number(input.qtyCovered || 0));
	if (required > 0 && covered >= required) return "complete";
	if (covered > 0) return "partial";
	return "empty";
}

export function isInventoryNeedRow(input: {
	requirementStatus?: string | null;
	trackingPolicy?: string | null;
	inventoryProductKind?: string | null;
	inventoryCategoryProductKind?: string | null;
}) {
	return (
		input.requirementStatus === "required" &&
		input.trackingPolicy === "tracked" &&
		input.inventoryProductKind !== "component" &&
		input.inventoryCategoryProductKind !== "component"
	);
}

export function getInboundOrderableQty(input: {
	qtyPending?: number | null;
	qtyInboundLinkedOpen?: number | null;
}) {
	return Math.max(
		0,
		Number(input.qtyPending || 0) - Number(input.qtyInboundLinkedOpen || 0),
	);
}

export function getPendingInventoryQty(
	rows: Array<{
		trackingPolicy?: string | null;
		inventoryProductKind?: string | null;
		inventoryCategoryProductKind?: string | null;
		qtyPending?: number | null;
	}>,
) {
	return rows.reduce((total, row) => {
		if (
			row.trackingPolicy !== "tracked" ||
			row.inventoryProductKind === "component" ||
			row.inventoryCategoryProductKind === "component"
		) {
			return total;
		}
		return total + Math.max(0, Number(row.qtyPending || 0));
	}, 0);
}

export function canMarkInventoryNeedsAvailable(input: {
	canMarkAvailable: boolean;
	pendingQty: number;
	isReadOnly?: boolean;
}) {
	return (
		input.canMarkAvailable &&
		!input.isReadOnly &&
		Number(input.pendingQty || 0) > 0
	);
}

export function shouldShowInventoryNeedsActions(input: {
	segment: "stock" | "inbounds" | "non_stock";
	needCount: number;
}) {
	return input.segment === "stock" && Number(input.needCount || 0) > 0;
}

export function shouldAutoSyncSalesInventory(input: {
	salesOrderId: number;
	applicabilityState?: string | null;
	canManualSync: boolean;
	canSync: boolean;
	hasAttempted: boolean;
}) {
	return (
		input.salesOrderId > 0 &&
		(input.applicabilityState === "not_synced" ||
			input.applicabilityState === "failed") &&
		input.canManualSync &&
		input.canSync &&
		!input.hasAttempted
	);
}

export function shouldShowInventoryInboundForm(input: {
	isOpen: boolean;
	canCreateInbound: boolean;
	inboundRowCount: number;
	pendingQty: number;
}) {
	return (
		input.isOpen &&
		input.canCreateInbound &&
		Number(input.inboundRowCount || 0) > 0 &&
		Number(input.pendingQty || 0) > 0
	);
}

export function areAllInventoryNeedsFulfilled(
	rows: Array<{ status?: string | null }>,
) {
	return rows.length > 0 && rows.every((row) => row.status === "fulfilled");
}

export function resolveInventoryInboundCountState(input: {
	shipmentCount?: number | null;
	pendingQty: number;
	isLoading: boolean;
}) {
	if (input.isLoading) return "loading" as const;
	if (Number(input.shipmentCount || 0) > 0) return "pending" as const;
	return input.pendingQty > 0 ? ("pending" as const) : ("empty" as const);
}

export function getInventoryInboundEmptyStateCopy(input: {
	pendingQty: number;
	shipmentCount?: number | null;
}) {
	if (input.pendingQty > 0) {
		return {
			title: `${input.pendingQty.toLocaleString()} inventory still needed`,
			description:
				"No linked inbound covers this remaining stock requirement yet.",
		};
	}
	if (Number(input.shipmentCount || 0) > 0) {
		return {
			title: "No open inbound shipments",
			description: "Linked inbound work has been completed or closed.",
		};
	}
	return {
		title: "No inbound shipments",
		description:
			"Create an inbound when this order needs stock from a supplier.",
	};
}
