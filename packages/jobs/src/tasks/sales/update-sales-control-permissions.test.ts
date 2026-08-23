import { describe, expect, it } from "bun:test";

const source = await Bun.file(
	new URL("./update-sales-control.ts", import.meta.url),
).text();

describe("update-sales-control permissions", () => {
	it("rechecks and sanitizes every task actor before resolving a write", () => {
		expect(source).toContain("salesControlTaskPermissionKeys.map");
		expect(source).toContain("userHasPermission(");
		expect(source).toContain("authorizeSalesControlTaskInput(");
		expect(source).toContain(
			"const authorizedInput = await authorizeTaskInput",
		);
		expect(source).toContain("resolveActionHandler(authorizedInput)");
		expect(source.indexOf("userHasPermission(")).toBeLessThan(
			source.indexOf("await enforceSpecialOrderForAction"),
		);
	});
});
