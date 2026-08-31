import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
	new URL("./dispatch.route.ts", import.meta.url),
	"utf8",
);

describe("dispatch packing error presentation", () => {
	test("preserves actionable precondition messages without mislabeling conflicts", () => {
		const mapper = source.slice(
			source.indexOf("function dispatchPackingTrpcError"),
			source.indexOf("function assertMobilePackingCommandsEnabled"),
		);
		expect(mapper).toContain('error.code === "INVALID_SCOPE"');
		expect(mapper).toContain('code: "VALIDATION_FAILED"');
		expect(mapper).toContain('transportCode: "PRECONDITION_FAILED"');
		expect(mapper).toContain("Inventory stock is not ready");
		expect(mapper).toContain("error instanceof PackingReportError");
		expect(mapper).toContain('error.code === "NOT_REPORTABLE"');
		expect(mapper).toContain("publicMessage: error.message");
		expect(mapper).toContain('error.code === "FORBIDDEN"');
		expect(mapper).not.toContain('? "FORBIDDEN"');
	});
});
