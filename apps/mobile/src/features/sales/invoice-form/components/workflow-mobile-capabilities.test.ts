import { describe, expect, it } from "bun:test";
import {
	canEditMobileServiceLinePricing,
	normalizeMobileWorkflowRoleTitle,
} from "./workflow-mobile-capabilities";

describe("mobile workflow capabilities", () => {
	it("matches web service line pricing access for super admins only", () => {
		expect(canEditMobileServiceLinePricing("Super Admin")).toBe(true);
		expect(canEditMobileServiceLinePricing("super_admin")).toBe(true);
		expect(canEditMobileServiceLinePricing("Admin")).toBe(false);
		expect(canEditMobileServiceLinePricing("Sales")).toBe(false);
		expect(canEditMobileServiceLinePricing(null)).toBe(false);
	});

	it("normalizes role titles before capability checks", () => {
		expect(normalizeMobileWorkflowRoleTitle("  SUPER-admin ")).toBe(
			"super admin",
		);
	});
});
