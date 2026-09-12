import { describe, expect, it } from "bun:test";

import { collectIosReleaseReadiness } from "./ios-release-readiness";

describe("iOS TestFlight release readiness", () => {
	it("keeps every local release invariant green", async () => {
		const checks = await collectIosReleaseReadiness();
		expect(checks.filter((item) => !item.ok)).toEqual([]);
		expect(checks.length).toBeGreaterThanOrEqual(15);
	});
});
