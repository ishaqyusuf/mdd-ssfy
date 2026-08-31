import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
	new URL("./general-action-bar.tsx", import.meta.url),
	"utf8",
);

describe("sales overview fulfillment cancellation regression", () => {
	test("passes the displayed lifecycle status into the Mark as menu", () => {
		expect(source).toContain("getSalesOverviewDocumentStatus(data)");
		expect(source).toContain("currentStatus={currentOrderStatus}");
		expect(source).toContain("productionStatus={productionStatus}");
	});
});
