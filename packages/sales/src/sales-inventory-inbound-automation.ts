import type { NewInboundShipmentStatus } from "@gnd/inventory";

export type SalesInventoryInboundAutomationDemand = {
	id: number;
	inboundShipmentItem: {
		inboundId: number;
		inbound: {
			status: string;
		};
	} | null;
	inventoryVariant: {
		inventory: {
			defaultSupplierId: number | null;
		};
		supplierVariants: Array<{
			supplierId: number;
			preferred: boolean;
			active: boolean;
		}>;
	};
};

export type SalesInventoryInboundAutomationPlan = {
	targetShipmentStatus: NewInboundShipmentStatus;
	inboundIdsToStart: number[];
	createGroups: Array<{
		supplierId: number | null;
		demandIds: number[];
	}>;
	unresolvedDemandIds: number[];
};

export function resolveSalesInventoryDemandSupplierId(
	demand: SalesInventoryInboundAutomationDemand,
) {
	const activeSupplierVariants =
		demand.inventoryVariant.supplierVariants.filter((row) => row.active);
	const preferredRows = activeSupplierVariants.filter((row) => row.preferred);
	if (preferredRows.length === 1) return preferredRows[0]?.supplierId ?? null;
	if (preferredRows.length > 1) return null;

	const defaultSupplierId = demand.inventoryVariant.inventory.defaultSupplierId;
	if (defaultSupplierId) return defaultSupplierId;

	return activeSupplierVariants.length === 1
		? (activeSupplierVariants[0]?.supplierId ?? null)
		: null;
}

export function planSalesInventoryInboundAutomation(input: {
	demands: SalesInventoryInboundAutomationDemand[];
	targetShipmentStatus: NewInboundShipmentStatus;
}): SalesInventoryInboundAutomationPlan {
	const inboundIdsToStart = new Set<number>();
	const demandIdsBySupplier = new Map<number | null, number[]>();
	const unresolvedDemandIds: number[] = [];

	for (const demand of input.demands) {
		if (demand.inboundShipmentItem) {
			if (
				input.targetShipmentStatus === "in_progress" &&
				demand.inboundShipmentItem.inbound.status === "pending"
			) {
				inboundIdsToStart.add(demand.inboundShipmentItem.inboundId);
			}
			continue;
		}

		const supplierId = resolveSalesInventoryDemandSupplierId(demand);
		if (!supplierId) {
			unresolvedDemandIds.push(demand.id);
		}

		const current = demandIdsBySupplier.get(supplierId) ?? [];
		current.push(demand.id);
		demandIdsBySupplier.set(supplierId, current);
	}

	return {
		targetShipmentStatus: input.targetShipmentStatus,
		inboundIdsToStart: Array.from(inboundIdsToStart).sort((a, b) => a - b),
		createGroups: Array.from(demandIdsBySupplier.entries())
			.sort(([supplierA], [supplierB]) => {
				if (supplierA == null) return supplierB == null ? 0 : 1;
				if (supplierB == null) return -1;
				return supplierA - supplierB;
			})
			.map(([supplierId, demandIds]) => ({
				supplierId,
				demandIds: demandIds.sort((a, b) => a - b),
			})),
		unresolvedDemandIds: unresolvedDemandIds.sort((a, b) => a - b),
	};
}

/** @deprecated Use planSalesInventoryInboundAutomation. */
export function planOrderedInboundAutomation(
	demands: SalesInventoryInboundAutomationDemand[],
) {
	const plan = planSalesInventoryInboundAutomation({
		demands,
		targetShipmentStatus: "in_progress",
	});

	return {
		inboundIdsToStart: plan.inboundIdsToStart,
		createGroups: plan.createGroups,
		skippedDemandIds: plan.unresolvedDemandIds,
	};
}
