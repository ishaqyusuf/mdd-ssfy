import { describe, expect, it } from "bun:test";
import { isLegacyPoOnlySaveResponse } from "./save-scope";

describe("new sales form save scope", () => {
	it("isolates only the explicit legacy P.O.-only response", () => {
		expect(isLegacyPoOnlySaveResponse({ saveScope: "legacy-po-only" })).toBe(
			true,
		);
		expect(isLegacyPoOnlySaveResponse({ saveScope: "full" })).toBe(false);
		expect(isLegacyPoOnlySaveResponse({})).toBe(false);
		expect(isLegacyPoOnlySaveResponse(null)).toBe(false);
	});
});
