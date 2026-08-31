import { getDriverManifestItemPresentation } from "@gnd/sales/dispatch-manifest/driver-item-presentation";

type QuantityLike = {
	qty?: number | null;
	lh?: number | null;
	rh?: number | null;
};

type DispatchPackingItemLike = {
	availableQty?: QuantityLike | null;
	handingLabel?: string | null;
	itemConfig?: { production?: boolean | null } | null;
	itemType?: string | null;
	listedQty?: QuantityLike | null;
	packedQty?: QuantityLike | null;
	productTitle?: string | null;
	sectionTitle?: string | null;
	size?: string | null;
	swing?: string | null;
	subtitle?: string | null;
	title?: string | null;
	totalQty?: QuantityLike | null;
};

function quantityTotal(qty: QuantityLike | null | undefined) {
	const single = Math.max(0, Number(qty?.qty || 0));
	const left = Math.max(0, Number(qty?.lh || 0));
	const right = Math.max(0, Number(qty?.rh || 0));
	return single || left + right;
}

export function getDispatchPackingItemStatusText(
	item: DispatchPackingItemLike,
) {
	const packed = quantityTotal(item.packedQty);
	const listed = quantityTotal(item.listedQty);
	const available = quantityTotal(item.availableQty);
	const target = listed > 0 ? listed : packed + available;

	if (target <= 0) {
		return item.itemConfig?.production !== false &&
			quantityTotal(item.totalQty) > 0
			? "Awaiting production submission"
			: "No packable qty";
	}
	if (packed >= target) return `Packed ${packed}/${target}`;
	if (packed > 0) return `Partially packed ${packed}/${target}`;
	return `Not packed 0/${target}`;
}

export function getDispatchPackingItemPresentation(
	item: DispatchPackingItemLike,
) {
	return getDriverManifestItemPresentation(item);
}
