import { describe, expect, it } from "bun:test";

import { resolveLegacySalesOverviewMode } from "./mode";

describe("resolveLegacySalesOverviewMode", () => {
	it("honors an explicit dispatch request for order and production admins", () => {
		expect(
			resolveLegacySalesOverviewMode({
				requestedMode: "dispatch-modal",
				viewMode: "general",
			}),
		).toBe("dispatch-modal");
	});

	it("keeps assigned production users in their restricted production mode", () => {
		expect(
			resolveLegacySalesOverviewMode({
				assignedTo: 77,
				requestedMode: "dispatch-modal",
				viewMode: "general",
			}),
		).toBe("assigned-production");
	});

	it("uses the role-derived dispatch mode when no explicit mode is requested", () => {
		expect(
			resolveLegacySalesOverviewMode({
				viewMode: "dispatch-modal",
			}),
		).toBe("dispatch-modal");
	});
});
