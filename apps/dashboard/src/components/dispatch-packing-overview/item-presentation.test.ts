import { describe, expect, test } from "bun:test";

import {
	getDispatchPackingItemPresentation,
	getDispatchPackingItemStatusText,
} from "./item-presentation";

describe("dispatch packing item presentation", () => {
	test("keeps the exact Production subtitle when replacing a legacy item title", () => {
		expect(
			getDispatchPackingItemPresentation({
				title: "Sales Item 167295",
				subtitle: "H.C 2PNL SQR TOP (CARRARA) 1-3/8",
				itemType: "Door",
				size: '30\" × 80\"',
				handingLabel: "LH × 7",
				totalQty: { lh: 7 },
			}),
		).toEqual({
			title: "H.C 2PNL SQR TOP (CARRARA) 1-3/8",
			description: "H.C 2PNL SQR TOP (CARRARA) 1-3/8",
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
			description: "Moulding | Primed finger-jointed pine | 16 ft",
		});
	});

	test("preserves the canonical Production subtitle when it is available", () => {
		expect(
			getDispatchPackingItemPresentation({
				title: "H.C 2pnl sqr top (Carrara) 1-3/8",
				subtitle:
					'Pre-hung door | 30\" × 80\" | LH | 7 LH | $ 12.00/qty labor',
				itemType: "Pre-hung door",
				size: '30\" × 80\"',
				handingLabel: "LH × 7",
				totalQty: { lh: 7 },
			}),
		).toEqual({
			title: "H.C 2PNL SQR TOP (CARRARA) 1-3/8",
			description:
				'Pre-hung door | 30\" × 80\" | LH | 7 LH | $ 12.00/qty labor',
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
