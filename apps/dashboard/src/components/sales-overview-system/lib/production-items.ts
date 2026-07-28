type ProductionTabItemLike =
	| {
			itemConfig?: {
				production?: boolean | null;
			} | null;
	  }
	| null
	| undefined;

export function getProductionTabItems<T extends ProductionTabItemLike>(
	items?: T[] | null,
) {
	return (items || []).filter((item) => !!item?.itemConfig?.production);
}

export function getProductionTabItemCount(
	items?: ProductionTabItemLike[] | null,
) {
	return getProductionTabItems(items).length;
}
