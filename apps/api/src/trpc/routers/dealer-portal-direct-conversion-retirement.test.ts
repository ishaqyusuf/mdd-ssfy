import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
	new URL("./dealer-portal.route.ts", import.meta.url),
	"utf8",
);

describe("dealer direct quote conversion retirement", () => {
	test("keeps the legacy endpoint hard-disabled with an actionable message", () => {
		expect(source).toContain("convertQuoteToOrder: dealerProtectedProcedure");
		expect(source).toContain("Direct quote conversion has been retired");
		expect(source).not.toContain(
			"return convertDealerPortalQuoteToOrder(ctx.db, ctx.dealer.id, input.id)",
		);
	});
});
