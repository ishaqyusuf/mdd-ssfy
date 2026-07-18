import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const source = readFileSync(
	resolve(dirname(fileURLToPath(import.meta.url)), "columns.tsx"),
	"utf8",
);
const salesMenuSource = readFileSync(
	resolve(
		dirname(fileURLToPath(import.meta.url)),
		"..",
		"..",
		"sales-menu.tsx",
	),
	"utf8",
);

describe("sales orders payment review action", () => {
	it("uses the requested reviewed action label", () => {
		expect(source.includes("\n\t\t\t\t\t\tReviewed\n\t\t\t\t\t</Button>")).toBe(
			true,
		);
		expect(source.includes("\n\t\t\t\t\t\tReview\n\t\t\t\t\t</Button>")).toBe(
			false,
		);
		expect(salesMenuSource.includes("\n\t\t\t\t\tReviewed\n")).toBe(true);
		expect(salesMenuSource.includes("\n\t\t\t\t\tReview\n")).toBe(false);
	});

	it("delegates successful refreshes to the central mutation event", () => {
		expect(
			source.includes("sales.markLatestPaymentReviewed.mutationOptions"),
		).toBe(true);
		expect(source.includes("invalidatePageTabsForPathKeys")).toBe(false);
		expect(source.includes("const invalidateSalesOrders")).toBe(false);
	});
});
