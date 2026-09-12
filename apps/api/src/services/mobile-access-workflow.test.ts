import { describe, expect, it } from "bun:test";

import {
	canTransitionMobileAccessRequest,
	mobileAccessStatusTimestamp,
	nextMobileAccessStatuses,
} from "./mobile-access-workflow";

describe("mobile access workflow", () => {
	it("allows the expected happy path and terminal installed state", () => {
		expect(canTransitionMobileAccessRequest("REQUESTED", "APPROVED")).toBe(
			true,
		);
		expect(canTransitionMobileAccessRequest("APPROVED", "INVITED")).toBe(true);
		expect(canTransitionMobileAccessRequest("INVITED", "ACCEPTED")).toBe(true);
		expect(canTransitionMobileAccessRequest("ACCEPTED", "INSTALLED")).toBe(
			true,
		);
		expect(nextMobileAccessStatuses("INSTALLED")).toEqual([]);
	});

	it("rejects skipped and backward transitions", () => {
		expect(canTransitionMobileAccessRequest("REQUESTED", "INVITED")).toBe(
			false,
		);
		expect(canTransitionMobileAccessRequest("INVITED", "APPROVED")).toBe(false);
		expect(canTransitionMobileAccessRequest("INSTALLED", "REQUESTED")).toBe(
			false,
		);
	});

	it("lets rejected or cancelled employees request again", () => {
		expect(canTransitionMobileAccessRequest("REJECTED", "REQUESTED")).toBe(
			true,
		);
		expect(canTransitionMobileAccessRequest("CANCELLED", "REQUESTED")).toBe(
			true,
		);
	});

	it("maps lifecycle timestamps without client attribution", () => {
		const now = new Date("2026-09-12T12:00:00.000Z");
		expect(mobileAccessStatusTimestamp("INVITED", now)).toEqual({
			invitedAt: now,
		});
		expect(mobileAccessStatusTimestamp("REQUESTED", now)).toEqual({});
	});
});
