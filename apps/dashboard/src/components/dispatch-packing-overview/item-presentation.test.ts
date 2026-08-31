import { describe, expect, test } from "bun:test";

import {
	getDispatchPackingItemPresentation,
	getDispatchPackingItemStatusText,
} from "./item-presentation";

describe("dispatch packing item presentation", () => {
	test("replaces a legacy item title without repeating structured details", () => {
		expect(
			getDispatchPackingItemPresentation({
				title: "Sales Item 167295",
				subtitle: "H.C 2PNL SQR TOP (CARRARA) 1-3/8",
				itemType: "Door",
				size: '30" × 80"',
				handingLabel: "LH × 7",
				totalQty: { lh: 7 },
			}),
		).toEqual({
			title: "H.C 2PNL SQR TOP (CARRARA) 1-3/8",
			description: 'Door · 30" × 80" · LH',
		});
	});

	test("always capitalizes the item title", () => {
		expect(
			getDispatchPackingItemPresentation({
				title: "Baseboard 5180 FJ",
				subtitle: "Moulding | Primed finger-jointed pine | 16 ft",
				itemType: "Moulding",
				sectionTitle: "Moulding",
				handingLabel: "Not applicable",
				totalQty: { qty: 35 },
			}),
		).toEqual({
			title: "BASEBOARD 5180 FJ",
			description: "Moulding · Primed finger-jointed pine · 16 ft",
		});
	});

	test("removes labor, price, and repeated quantity details", () => {
		expect(
			getDispatchPackingItemPresentation({
				title: "H.C 2pnl sqr top (Carrara) 1-3/8",
				subtitle: 'Pre-hung door | 30" × 80" | LH | 7 LH | $ 12.00/qty labor',
				itemType: "Pre-hung door",
				size: '30" × 80"',
				handingLabel: "LH × 7",
				totalQty: { lh: 7 },
			}),
		).toEqual({
			title: "H.C 2PNL SQR TOP (CARRARA) 1-3/8",
			description: 'Pre-hung door · 30" × 80" · LH',
		});
		expect(
			/labor|cost|\$|7 LH/i.test(
				JSON.stringify(
					getDispatchPackingItemPresentation({
						title: "Door",
						subtitle: "$ 12.00/qty labor | 7 LH",
					}),
				),
			),
		).toBe(false);
	});

	test("keeps an API-sanitized driver description idempotent", () => {
		expect(
			getDispatchPackingItemPresentation({
				title: "Garage door",
				subtitle: "Garage door · 2-6 x 6-8 · LH",
				itemType: "Garage door",
				size: "2-6 x 6-8",
				handingLabel: "LH × 1",
				totalQty: { lh: 1 },
			}),
		).toEqual({
			title: "GARAGE DOOR",
			description: "2-6 x 6-8 · LH",
		});
	});

	test("explains when ordered production has not produced a packable submission", () => {
		expect(
			getDispatchPackingItemStatusText({
				itemConfig: { production: true },
				totalQty: { lh: 1, rh: 1 },
				availableQty: { qty: 0 },
				listedQty: { qty: 0 },
				packedQty: { qty: 0 },
			}),
		).toBe("Awaiting production submission");
	});
});
