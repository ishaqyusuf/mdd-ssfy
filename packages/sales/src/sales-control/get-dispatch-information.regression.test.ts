import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
	new URL("./get-dispatch-information.ts", import.meta.url),
	"utf8",
);

describe("dispatch overview delivery-item scope", () => {
	test("loads every active dispatch allocation, including unpacked rows", () => {
		expect(source).toContain("db.orderItemDelivery.findMany");
		expect(source).toContain("deletedAt: null");
		expect(source).not.toContain('packingStatus: "packed" as');
	});

	test("falls back to the sales item when legacy allocation linkage is missing", () => {
		expect(source).toContain("i.itemId === item.orderItemId");
	});
});
