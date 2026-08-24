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
	subtitle?: string | null;
	title?: string | null;
	totalQty?: QuantityLike | null;
};

const LEGACY_SALES_ITEM_TITLE = /^sales item(?:\s+#?)?\d+$/i;

function cleanText(value: unknown) {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalized(value: string) {
	return value.trim().toLowerCase();
}

function formatOrderedQuantity(qty: QuantityLike | null | undefined) {
	const single = Math.max(0, Number(qty?.qty || 0));
	const left = Math.max(0, Number(qty?.lh || 0));
	const right = Math.max(0, Number(qty?.rh || 0));
	const total = single || left + right;
	return `QTY ${total}`;
}

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
		return item.itemConfig?.production !== false && quantityTotal(item.totalQty) > 0
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
	const rawTitle = cleanText(item.title);
	const rawSubtitle = cleanText(item.subtitle);
	const productTitle = cleanText(item.productTitle);
	const itemType = cleanText(item.itemType);
	const handingLabel = cleanText(item.handingLabel);
	const titleIsLegacyId = rawTitle
		? LEGACY_SALES_ITEM_TITLE.test(rawTitle)
		: false;
	const usableProductTitle =
		productTitle && !LEGACY_SALES_ITEM_TITLE.test(productTitle)
			? productTitle
			: null;
	const title = (
		(titleIsLegacyId ? rawSubtitle : rawTitle) ||
		rawSubtitle ||
		usableProductTitle ||
		"Untitled item"
	).toUpperCase();
	const candidates = [
		rawSubtitle,
		itemType && normalized(itemType) !== "item" ? itemType : null,
		cleanText(item.sectionTitle),
		cleanText(item.size),
		handingLabel && normalized(handingLabel) !== "not applicable"
			? handingLabel
			: null,
		formatOrderedQuantity(item.totalQty),
	];
	const seen = new Set([normalized(title)]);
	const description = candidates
		.filter((value): value is string => Boolean(value))
		.filter((value) => {
			const key = normalized(value);
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		})
		.join(" · ");

	return {
		title,
		description:
			rawSubtitle || description || formatOrderedQuantity(item.totalQty),
	};
}
