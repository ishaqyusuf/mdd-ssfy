import { formatInventoryCategoryStepLabel } from "../sales-overview-system/lib/inventory-display";

export type InboundDemandDisplayMetadata = {
	componentName: string;
	stepName: string | null;
	variantName: string | null;
};

type SalesInventoryOverviewRowLike = {
	componentName: string;
	stepName?: string | null;
	variantName?: string | null;
	inboundDemandIds?: number[] | null;
};

type InboundDemandLike = {
	id?: number | null;
	lineItemComponent?: {
		parent?: {
			title?: string | null;
		} | null;
	} | null;
	inventoryVariant?: {
		sku?: string | null;
		uid?: string | null;
		inventory?: {
			name?: string | null;
		} | null;
	} | null;
};

export type ResolvedInboundDemandDisplay = {
	title: string;
	subtitle: string | null;
	source: "sales_inventory_overview" | "inbound_demand_queue";
};

export function buildInboundDemandDisplayById(
	rows: SalesInventoryOverviewRowLike[] | null | undefined,
) {
	const displayByDemandId = new Map<number, InboundDemandDisplayMetadata>();

	for (const row of rows || []) {
		for (const demandId of row.inboundDemandIds || []) {
			if (!Number.isInteger(demandId) || demandId <= 0) continue;
			displayByDemandId.set(demandId, {
				componentName: row.componentName,
				stepName: row.stepName || null,
				variantName: row.variantName || null,
			});
		}
	}

	return displayByDemandId;
}

export function resolveInboundDemandDisplay(
	demand: InboundDemandLike,
	displayByDemandId: ReadonlyMap<number, InboundDemandDisplayMetadata>,
): ResolvedInboundDemandDisplay {
	const overviewDisplay = demand.id
		? displayByDemandId.get(demand.id)
		: undefined;
	if (overviewDisplay) {
		const subtitle = [
			formatInventoryCategoryStepLabel(overviewDisplay.stepName),
			overviewDisplay.variantName,
		]
			.filter(Boolean)
			.join(" • ");

		return {
			title: overviewDisplay.componentName.toUpperCase(),
			subtitle: subtitle || null,
			source: "sales_inventory_overview",
		};
	}

	return {
		title:
			demand.lineItemComponent?.parent?.title ||
			demand.inventoryVariant?.inventory?.name ||
			"Inventory demand",
		subtitle:
			demand.inventoryVariant?.sku || demand.inventoryVariant?.uid || null,
		source: "inbound_demand_queue",
	};
}
