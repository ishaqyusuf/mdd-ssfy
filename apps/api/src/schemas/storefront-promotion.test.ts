import { describe, expect, test } from "bun:test";
import { storefrontPromotionInputSchema } from "./storefront-promotion";

const base = {
	internalName: "Summer 2026",
	publicTitle: "Summer Sale",
	badgeText: "20% OFF",
	percentageOff: 20,
	priority: 0,
	audienceMode: "EVERYONE" as const,
	scopeMode: "ALL_OFFERS" as const,
	startsAt: "2026-07-24T12:00:00.000Z",
	endsAt: "2026-08-24T12:00:00.000Z",
	customerIds: [],
	customerProfileIds: [],
	categoryIds: [],
	offerIds: [],
};

describe("storefront promotion input", () => {
	test("accepts an automatic public campaign", () => {
		const parsed = storefrontPromotionInputSchema.parse(base);
		expect(parsed.percentageOff).toBe(20);
		expect(parsed.startsAt).toBeInstanceOf(Date);
	});

	test("requires targets for targeted audience and product scope", () => {
		const result = storefrontPromotionInputSchema.safeParse({
			...base,
			audienceMode: "TARGETED",
			scopeMode: "TARGETED",
		});
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.issues.map((issue) => issue.path[0])).toEqual([
			"customerIds",
			"offerIds",
		]);
	});

	test("rejects unsafe banner paths and inverted schedules", () => {
		const result = storefrontPromotionInputSchema.safeParse({
			...base,
			bannerHref: "https://example.com/collect",
			endsAt: "2026-07-01T00:00:00.000Z",
		});
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.issues.map((issue) => issue.path[0])).toContain(
			"bannerHref",
		);
		expect(result.error.issues.map((issue) => issue.path[0])).toContain(
			"endsAt",
		);
	});
});
