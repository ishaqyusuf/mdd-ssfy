"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-expect-error packages/db typecheck does not include Bun test types.
const bun_test_1 = require("bun:test");
const short_links_1 = require("./short-links");
(0, bun_test_1.describe)("short link helpers", () => {
    (0, bun_test_1.it)("normalizes custom slugs to lowercase kebab-case", () => {
        (0, bun_test_1.expect)((0, short_links_1.normalizeShortLinkSlug)("  Lorem Ipsum!!  ")).toBe("lorem-ipsum");
        (0, bun_test_1.expect)((0, short_links_1.normalizeShortLinkSlug)("Invoice_123")).toBe("invoice-123");
    });
    (0, bun_test_1.it)("rejects empty and reserved slugs", () => {
        (0, bun_test_1.expect)(() => (0, short_links_1.normalizeShortLinkSlug)("!!!")).toThrow("required");
        (0, bun_test_1.expect)(() => (0, short_links_1.normalizeShortLinkSlug)("admin")).toThrow("reserved");
    });
    (0, bun_test_1.it)("builds public /sh urls", () => {
        (0, bun_test_1.expect)((0, short_links_1.buildShortUrl)("lorem-ipsum", "https://gndprodesk.com/")).toBe("https://gndprodesk.com/sh/lorem-ipsum");
    });
    (0, bun_test_1.it)("detects expired short links", () => {
        (0, bun_test_1.expect)((0, short_links_1.isShortLinkExpired)(new Date(Date.now() - 1000))).toBe(true);
        (0, bun_test_1.expect)((0, short_links_1.isShortLinkExpired)(new Date(Date.now() + 1000))).toBe(false);
        (0, bun_test_1.expect)((0, short_links_1.isShortLinkExpired)(null)).toBe(false);
    });
    (0, bun_test_1.it)("retries generated slug collisions", async () => {
        let createCount = 0;
        const db = {
            shortLink: {
                create: async ({ data }) => {
                    createCount += 1;
                    if (createCount === 1) {
                        throw Object.assign(new Error("duplicate"), { code: "P2002" });
                    }
                    return data;
                },
            },
        };
        const link = await (0, short_links_1.createShortLink)(db, {
            targetUrl: "https://gndprodesk.com/p/sales-document-v2?token=abc",
        });
        (0, bun_test_1.expect)(createCount).toBe(2);
        (0, bun_test_1.expect)(link.targetUrl).toBe("https://gndprodesk.com/p/sales-document-v2?token=abc");
    });
    (0, bun_test_1.it)("reuses active source links for repeated SMS targets", async () => {
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
        await (0, bun_test_1.expect)((0, short_links_1.findOrCreateShortLinkForTarget)(db, {
            targetUrl: existing.targetUrl,
            sourceType: "sms",
            sourceId: "payment-token-1",
        })).resolves.toBe(existing);
    });
});
