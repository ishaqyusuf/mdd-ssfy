import { describe, expect, it } from "bun:test";

import { getDriverManifestItemPresentation } from "./driver-item-presentation";

describe("driver manifest item presentation", () => {
	it("removes financial and repeated quantity content from a door line", () => {
		const result = getDriverManifestItemPresentation({
			title: "H.C 2pnl sqr top (Carrara) 1-3/8",
			productTitle: "H.C 2pnl sqr top (Carrara) 1-3/8",
			subtitle: 'Pre-hung door | 30" × 80" | LH | 7 LH | $ 12.00/qty labor',
			itemType: "Pre-hung door",
			sectionTitle: "Pre-hung door",
			size: '30" × 80"',
			handingLabel: "LH × 7",
			totalQty: { lh: 7 },
		});

		expect(result).toEqual({
			title: "H.C 2PNL SQR TOP (CARRARA) 1-3/8",
			description: 'Pre-hung door · 30" × 80" · LH',
		});
		expect(JSON.stringify(result)).not.toMatch(/labor|cost|\$|7 LH/i);
	});

	it("uses the safe first subtitle segment for a legacy identifier", () => {
		expect(
			getDriverManifestItemPresentation({
				title: "Sales Item 167295",
				productTitle: "Sales Item 167295",
				subtitle: "Garage Door Bottom Seal | Garage hardware | 16 ft",
				itemType: "Garage hardware",
			}),
		).toEqual({
			title: "GARAGE DOOR BOTTOM SEAL",
			description: "Garage hardware · 16 ft",
		});
	});

	it("does not repeat a product type already contained in the title", () => {
		expect(
			getDriverManifestItemPresentation({
				title: "Garage door bottom seal",
				itemType: "Garage door",
				sectionTitle: "Garage Door",
				size: "16 ft",
			}),
		).toEqual({
			title: "GARAGE DOOR BOTTOM SEAL",
			description: "16 ft",
		});
	});

	it("removes a colon-formatted quantity from a packed row subtitle", () => {
		expect(
			getDriverManifestItemPresentation({
				title: "Flat board primed FJ S4S 1 x 6",
				subtitle: "mouldings · QTY: 12",
				itemType: "mouldings",
				totalQty: { qty: 12 },
			}),
		).toEqual({
			title: "FLAT BOARD PRIMED FJ S4S 1 X 6",
			description: "mouldings",
		});
	});
});
