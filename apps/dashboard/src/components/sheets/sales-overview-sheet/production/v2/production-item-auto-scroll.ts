export const PRODUCTION_ITEM_SCROLL_VIEWPORT_SELECTOR =
	"[data-radix-scroll-area-viewport]";
export const PRODUCTION_ITEM_SCROLL_TOP_GAP = 12;
// Radix uses a 200ms accordion animation; keep a small layout buffer before
// measuring so a closing item above the target cannot pull it past the top.
export const PRODUCTION_ITEM_ACCORDION_SETTLE_MS = 300;

type ProductionItemScrollMetrics = {
	itemTop: number;
	scrollTop: number;
	viewportHeight: number;
	viewportTop: number;
};

export function isProductionItemBelowViewportMidpoint({
	itemTop,
	viewportHeight,
	viewportTop,
}: Pick<
	ProductionItemScrollMetrics,
	"itemTop" | "viewportHeight" | "viewportTop"
>) {
	return itemTop > viewportTop + viewportHeight / 2;
}

export function getProductionItemAlignedScrollTop({
	itemTop,
	scrollTop,
	viewportTop,
}: Pick<ProductionItemScrollMetrics, "itemTop" | "scrollTop" | "viewportTop">) {
	return Math.max(
		0,
		scrollTop + itemTop - viewportTop - PRODUCTION_ITEM_SCROLL_TOP_GAP,
	);
}
