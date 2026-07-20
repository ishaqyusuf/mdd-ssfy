import { describe, expect, it } from "bun:test";
import { storefrontLifecycleCutoffs } from "./lifecycle";

describe("storefrontLifecycleCutoffs", () => {
	it("uses stable retention windows", () => {
		const now = new Date("2026-07-20T12:00:00.000Z");
		const result = storefrontLifecycleCutoffs(now);

		expect(result.abandonedCartAt.toISOString()).toBe(
			"2026-07-06T12:00:00.000Z",
		);
		expect(result.deleteRecoveryTokenAt.toISOString()).toBe(
			"2026-06-20T12:00:00.000Z",
		);
	});
});
