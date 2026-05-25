// @ts-expect-error packages/db typecheck does not include Bun test types.
import { describe, expect, it } from "bun:test";
import {
	buildShortUrl,
	createShortLink,
	findOrCreateShortLinkForTarget,
	isShortLinkExpired,
	normalizeShortLinkSlug,
} from "./short-links";

describe("short link helpers", () => {
	it("normalizes custom slugs to lowercase kebab-case", () => {
		expect(normalizeShortLinkSlug("  Lorem Ipsum!!  ")).toBe("lorem-ipsum");
		expect(normalizeShortLinkSlug("Invoice_123")).toBe("invoice-123");
	});

	it("rejects empty and reserved slugs", () => {
		expect(() => normalizeShortLinkSlug("!!!")).toThrow("required");
		expect(() => normalizeShortLinkSlug("admin")).toThrow("reserved");
	});

	it("builds public /sh urls", () => {
		expect(buildShortUrl("lorem-ipsum", "https://gndprodesk.com/")).toBe(
			"https://gndprodesk.com/sh/lorem-ipsum",
		);
	});

	it("detects expired short links", () => {
		expect(isShortLinkExpired(new Date(Date.now() - 1000))).toBe(true);
		expect(isShortLinkExpired(new Date(Date.now() + 1000))).toBe(false);
		expect(isShortLinkExpired(null)).toBe(false);
	});

	it("retries generated slug collisions", async () => {
		let createCount = 0;
		const db = {
			shortLink: {
				create: async ({ data }: { data: Record<string, unknown> }) => {
					createCount += 1;
					if (createCount === 1) {
						throw Object.assign(new Error("duplicate"), { code: "P2002" });
					}
					return data;
				},
			},
		};

		const link = await createShortLink(
			db as unknown as Parameters<typeof createShortLink>[0],
			{
				targetUrl: "https://gndprodesk.com/p/sales-document-v2?token=abc",
			},
		);

		expect(createCount).toBe(2);
		expect(link.targetUrl).toBe(
			"https://gndprodesk.com/p/sales-document-v2?token=abc",
		);
	});

	it("reuses active source links for repeated SMS targets", async () => {
		const existing = {
			slug: "abc123",
			targetUrl: "https://gndprodesk.com/checkout/token/v2",
			expiresAt: new Date(Date.now() + 60_000),
		};
		const db = {
			shortLink: {
				findFirst: async () => existing,
				create: async () => {
					throw new Error("should not create");
				},
			},
		};

		await expect(
			findOrCreateShortLinkForTarget(
				db as unknown as Parameters<typeof findOrCreateShortLinkForTarget>[0],
				{
					targetUrl: existing.targetUrl,
					sourceType: "sms",
					sourceId: "payment-token-1",
				},
			),
		).resolves.toBe(existing);
	});
});
