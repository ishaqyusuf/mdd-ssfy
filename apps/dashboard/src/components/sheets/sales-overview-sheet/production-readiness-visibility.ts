import { getProductionTabItems } from "@/components/sales-overview-system/lib/production-items";

type QuantityLike = {
	lh?: number | null;
	qty?: number | null;
	rh?: number | null;
};

type ProductionReadinessItemLike =
	| {
			itemConfig?: {
				production?: boolean | null;
			} | null;
			analytics?: {
				stats?: {
					prodAssigned?: QuantityLike | null;
					prodCompleted?: QuantityLike | null;
				} | null;
			} | null;
	  }
	| null
	| undefined;

function quantityTotal(quantity?: QuantityLike | null) {
	const total = Number(quantity?.qty || 0);

	return total || Number(quantity?.lh || 0) + Number(quantity?.rh || 0);
}

export function shouldShowProductionReadiness(
	items?: ProductionReadinessItemLike[] | null,
) {
	const productionItems = getProductionTabItems(items);
	if (!productionItems.length) return false;

	return !productionItems.some((item) => {
		const stats = item?.analytics?.stats;

		return (
			quantityTotal(stats?.prodAssigned) > 0 ||
			quantityTotal(stats?.prodCompleted) > 0
		);
	});
}
