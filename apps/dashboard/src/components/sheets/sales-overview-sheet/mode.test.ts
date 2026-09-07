import { describe, expect, it } from "bun:test";

import {
	resolveLegacySalesOverviewMode,
	shouldShowLegacySalesOverviewInboundStatus,
} from "./mode";

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

describe("shouldShowLegacySalesOverviewInboundStatus", () => {
	it("hides the redundant sheet-header summary from assigned Production workers", () => {
		expect(
			shouldShowLegacySalesOverviewInboundStatus({
				mode: "assigned-production",
				hasSale: true,
				isQuote: false,
			}),
		).toBe(false);
	});

	it("preserves the inbound summary on eligible admin Sales Overview sheets", () => {
		expect(
			shouldShowLegacySalesOverviewInboundStatus({
				mode: "default",
				hasSale: true,
				isQuote: false,
			}),
		).toBe(true);
		expect(
			shouldShowLegacySalesOverviewInboundStatus({
				mode: "default",
				hasSale: true,
				isQuote: true,
			}),
		).toBe(false);
	});
});
