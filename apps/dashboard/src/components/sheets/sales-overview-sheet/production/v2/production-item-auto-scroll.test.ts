import { describe, expect, it } from "bun:test";

import {
	PRODUCTION_ITEM_SCROLL_TOP_GAP,
	getProductionItemAlignedScrollTop,
	isProductionItemBelowViewportMidpoint,
} from "./production-item-auto-scroll";

describe("production item auto-scroll", () => {
	it("only activates below the sheet viewport midpoint", () => {
		const viewport = {
			viewportHeight: 700,
			viewportTop: 160,
		};

		expect(
			isProductionItemBelowViewportMidpoint({
				...viewport,
				itemTop: 510,
			}),
		).toBe(false);
		expect(
			isProductionItemBelowViewportMidpoint({
				...viewport,
				itemTop: 511,
			}),
		).toBe(true);
	});

	it("aligns the item near the viewport top without producing negative scroll", () => {
		expect(
			getProductionItemAlignedScrollTop({
				itemTop: 655,
				scrollTop: 60,
				viewportTop: 167,
			}),
		).toBe(548 - PRODUCTION_ITEM_SCROLL_TOP_GAP);

		expect(
			getProductionItemAlignedScrollTop({
				itemTop: 100,
				scrollTop: 0,
				viewportTop: 167,
			}),
		).toBe(0);
	});
});
