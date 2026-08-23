import { describe, expect, test } from "bun:test";

import { getDispatchPackingItemPresentation } from "./item-presentation";

describe("dispatch packing item presentation", () => {
	test("uses the product subtitle instead of a legacy sales-item database label", () => {
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
			description: 'Door · 30\" × 80\" · LH × 7 · QTY 7',
		});
	});

	test("keeps a real title and removes duplicate metadata", () => {
		expect(
			getDispatchPackingItemPresentation({
				title: "BASEBOARD 5180 FJ",
				subtitle: "BASEBOARD 5180 FJ",
				itemType: "Moulding",
				sectionTitle: "Moulding",
				handingLabel: "Not applicable",
				totalQty: { qty: 35 },
			}),
		).toEqual({
			title: "BASEBOARD 5180 FJ",
			description: "Moulding · QTY 35",
		});
	});

	test("preserves the canonical Production subtitle when it is available", () => {
		expect(
			getDispatchPackingItemPresentation({
				title: "H.C 2PNL SQR TOP (CARRARA) 1-3/8",
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
});
