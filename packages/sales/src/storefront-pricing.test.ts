import { describe, expect, test } from "bun:test";
import {
	type StorefrontPromotionCandidate,
	applyStorefrontPromotion,
	isStorefrontPromotionEligible,
	selectStorefrontPromotion,
	storefrontPricingSnapshotFingerprint,
	toPublicStorefrontPricing,
} from "./storefront-pricing";

const now = new Date("2026-07-24T16:00:00.000Z");

function promotion(
	overrides: Partial<StorefrontPromotionCandidate> = {},
): StorefrontPromotionCandidate {
	return {
		id: "summer",
		publicTitle: "Summer Sale",
		badgeText: "20% OFF",
		bannerText: "Save on summer projects",
		bannerHref: "/categories/doors",
		percentageOff: 20,
		priority: 0,
		audienceMode: "EVERYONE",
		scopeMode: "ALL_OFFERS",
		startsAt: new Date("2026-07-01T00:00:00.000Z"),
		endsAt: new Date("2026-08-01T00:00:00.000Z"),
		customerIds: [],
		customerProfileIds: [],
		categoryIds: [],
		offerIds: [],
		...overrides,
	};
}

describe("storefront promotion eligibility", () => {
	test("uses inclusive starts and exclusive ends", () => {
		const campaign = promotion();
		expect(
			isStorefrontPromotionEligible(campaign, {
				now: campaign.startsAt,
				customerId: null,
				customerProfileId: null,
				categoryId: "doors",
				offerId: "door",
			}),
		).toBe(true);
		expect(
			isStorefrontPromotionEligible(campaign, {
				now: campaign.endsAt ?? now,
				customerId: null,
				customerProfileId: null,
				categoryId: "doors",
				offerId: "door",
			}),
		).toBe(false);
	});

	test("matches a targeted shopper by customer or profile", () => {
		const campaign = promotion({
			audienceMode: "TARGETED",
			customerIds: [41],
			customerProfileIds: [7],
		});
		const base = {
			now,
			categoryId: "doors",
			offerId: "door",
		};
		expect(
			isStorefrontPromotionEligible(campaign, {
				...base,
				customerId: 41,
				customerProfileId: null,
			}),
		).toBe(true);
		expect(
			isStorefrontPromotionEligible(campaign, {
				...base,
				customerId: null,
				customerProfileId: 7,
			}),
		).toBe(true);
		expect(
			isStorefrontPromotionEligible(campaign, {
				...base,
				customerId: null,
				customerProfileId: null,
			}),
		).toBe(false);
	});

	test("matches a targeted product by offer or category", () => {
		const campaign = promotion({
			scopeMode: "TARGETED",
			categoryIds: ["doors"],
			offerIds: ["special-moulding"],
		});
		const base = {
			now,
			customerId: null,
			customerProfileId: null,
		};
		expect(
			isStorefrontPromotionEligible(campaign, {
				...base,
				categoryId: "doors",
				offerId: "plain-door",
			}),
		).toBe(true);
		expect(
			isStorefrontPromotionEligible(campaign, {
				...base,
				categoryId: "mouldings",
				offerId: "special-moulding",
			}),
		).toBe(true);
		expect(
			isStorefrontPromotionEligible(campaign, {
				...base,
				categoryId: "shelf",
				offerId: "hinges",
			}),
		).toBe(false);
	});
});

describe("storefront promotion selection and money", () => {
	test("selects one best campaign without stacking", () => {
		const winner = selectStorefrontPromotion([
			promotion({ id: "ten", percentageOff: 10, priority: 100 }),
			promotion({ id: "twenty", percentageOff: 20, priority: 0 }),
			promotion({ id: "fifteen", percentageOff: 15, priority: 50 }),
		]);
		expect(winner?.id).toBe("twenty");
	});

	test("uses priority, newest start, then id for equal percentages", () => {
		const winner = selectStorefrontPromotion([
			promotion({ id: "b", priority: 2 }),
			promotion({ id: "a", priority: 2 }),
			promotion({
				id: "older-high-priority",
				priority: 3,
				startsAt: new Date("2026-06-01T00:00:00.000Z"),
			}),
		]);
		expect(winner?.id).toBe("older-high-priority");

		const stable = selectStorefrontPromotion([
			promotion({ id: "b", priority: 2 }),
			promotion({ id: "a", priority: 2 }),
		]);
		expect(stable?.id).toBe("a");
	});

	test("rounds a full-line percentage discount and exposes a safe DTO", () => {
		const priced = applyStorefrontPromotion({
			listLineTotal: 199.99,
			quantity: 3,
			promotion: promotion({ percentageOff: 17.5 }),
			pricedAt: now,
		});
		expect(priced.discountAmount).toBe(35);
		expect(priced.lineTotal).toBe(164.99);
		expect(priced.unitPrice).toBe(55);
		expect(toPublicStorefrontPricing(priced)).toEqual({
			currency: "USD",
			listPrice: 66.66,
			salePrice: 55,
			listLineTotal: 199.99,
			saleLineTotal: 164.99,
			discountAmount: 35,
			percentageOff: 17.5,
			promotionTitle: "Summer Sale",
			badgeText: "20% OFF",
			isOnSale: true,
			isFrom: false,
		});
		expect(JSON.stringify(toPublicStorefrontPricing(priced))).not.toContain(
			"priority",
		);
	});

	test("fingerprints every field that can make a stored price stale", () => {
		const priced = applyStorefrontPromotion({
			listLineTotal: 100,
			quantity: 2,
			promotion: promotion(),
			profile: {
				id: 7,
				title: "Retail",
				coefficient: 2,
				updatedAt: "2026-07-24T12:00:00.000Z",
				source: "CUSTOMER",
			},
			pricedAt: now,
		});
		const fingerprint = storefrontPricingSnapshotFingerprint(priced);
		expect(
			storefrontPricingSnapshotFingerprint({
				...priced,
				promotion: { ...priced.promotion, percentageOff: 25 },
			}),
		).not.toBe(fingerprint);
		expect(
			storefrontPricingSnapshotFingerprint({
				...priced,
				profile: { ...priced.profile, coefficient: 3 },
			}),
		).not.toBe(fingerprint);
		expect(
			storefrontPricingSnapshotFingerprint({
				...priced,
				lineTotal: 79,
			}),
		).not.toBe(fingerprint);
	});
});
