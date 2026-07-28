type OrderedInboundAutomationDemand = {
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

export type OrderedInboundAutomationPlan = {
	inboundIdsToStart: number[];
	createGroups: Array<{
		supplierId: number;
		demandIds: number[];
	}>;
	skippedDemandIds: number[];
};

function resolveDemandSupplierId(demand: OrderedInboundAutomationDemand) {
	const activeSupplierVariants =
		demand.inventoryVariant.supplierVariants.filter((row) => row.active);
	const preferred = activeSupplierVariants.find((row) => row.preferred);
	if (preferred) return preferred.supplierId;

	const defaultSupplierId = demand.inventoryVariant.inventory.defaultSupplierId;
	if (defaultSupplierId) return defaultSupplierId;

	return activeSupplierVariants.length === 1
		? (activeSupplierVariants[0]?.supplierId ?? null)
		: null;
}

export function planOrderedInboundAutomation(
	demands: OrderedInboundAutomationDemand[],
): OrderedInboundAutomationPlan {
	const inboundIdsToStart = new Set<number>();
	const demandIdsBySupplier = new Map<number, number[]>();
	const skippedDemandIds: number[] = [];

	for (const demand of demands) {
		if (demand.inboundShipmentItem) {
			if (demand.inboundShipmentItem.inbound.status === "pending") {
				inboundIdsToStart.add(demand.inboundShipmentItem.inboundId);
			}
			continue;
		}

		const supplierId = resolveDemandSupplierId(demand);
		if (!supplierId) {
			skippedDemandIds.push(demand.id);
			continue;
		}

		const current = demandIdsBySupplier.get(supplierId) ?? [];
		current.push(demand.id);
		demandIdsBySupplier.set(supplierId, current);
	}

	return {
		inboundIdsToStart: Array.from(inboundIdsToStart).sort((a, b) => a - b),
		createGroups: Array.from(demandIdsBySupplier.entries())
			.sort(([supplierA], [supplierB]) => supplierA - supplierB)
			.map(([supplierId, demandIds]) => ({
				supplierId,
				demandIds: demandIds.sort((a, b) => a - b),
			})),
		skippedDemandIds: skippedDemandIds.sort((a, b) => a - b),
	};
}
