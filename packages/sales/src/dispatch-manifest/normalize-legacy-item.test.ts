import { describe, expect, it } from "bun:test";

import { normalizeLegacyDispatchManifestItem } from "./normalize-legacy-item";

describe("legacy dispatch manifest item", () => {
	it("shows LH and RH evidence when a pre-hung door has no saved swing", () => {
		const item = normalizeLegacyDispatchManifestItem({
			title: "2 Panel Square Top",
			sectionTitle: "Pre-hung Door",
			size: "36 x 80",
			swing: null,
			doorId: 91,
			orderedQty: { lh: 2, rh: 1 },
			packedQty: { lh: 1, rh: 1 },
		});

		expect(item).toMatchObject({
			itemType: "Pre-hung Door",
			productTitle: "2 Panel Square Top",
			size: "36 x 80",
			handingLabel: "LH × 2 · RH × 1",
			detailCompleteness: "complete",
			missingFields: [],
			orderedQty: { qty: 0, lh: 2, rh: 1, total: 3 },
			packedQty: { qty: 0, lh: 1, rh: 1, total: 2 },
			remainingQty: { qty: 0, lh: 1, rh: 0, total: 1 },
		});
	});

	it("marks a pre-hung row incomplete instead of inventing handing", () => {
		const item = normalizeLegacyDispatchManifestItem({
			title: "Craftsman Door",
			sectionTitle: "Pre-hung Door",
			size: "32 x 80",
			doorId: 92,
			orderedQty: { qty: 1 },
			packedQty: {},
		});

		expect(item.handingLabel).toBe("Handing not recorded");
		expect(item.detailCompleteness).toBe("incomplete");
		expect(item.missingFields).toEqual(["handing"]);
	});

	it("flags contradictory saved swing and quantity evidence for review", () => {
		const item = normalizeLegacyDispatchManifestItem({
			title: "Shaker Door",
			sectionTitle: "Pre-hung Door",
			size: "30 x 80",
			swing: "LH",
			doorId: 93,
			orderedQty: { rh: 1 },
			packedQty: {},
		});

		expect(item.handingLabel).toBe("RH × 1");
		expect(item.detailCompleteness).toBe("review_required");
		expect(item.warnings).toEqual([
			"Saved swing conflicts with the ordered LH/RH quantity.",
		]);
	});
});
