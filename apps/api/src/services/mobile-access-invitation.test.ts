import { describe, expect, it } from "bun:test";

import { manualMobileAccessInvitationAdapter } from "./mobile-access-invitation";

describe("manual mobile access guidance", () => {
	it("records public App Store guidance without an Apple portal invitation", () => {
		expect(
			manualMobileAccessInvitationAdapter.prepareRecordedInvitation({
				platform: "IOS",
			}),
		).toEqual({
			invitationProvider: "MANUAL_PUBLIC_APP_STORE_GUIDANCE",
			externalReference: null,
		});
	});

	it("preserves Android manual distribution", () => {
		expect(
			manualMobileAccessInvitationAdapter.prepareRecordedInvitation({
				platform: "ANDROID",
				externalReference: "distribution-ticket-1",
			}),
		).toEqual({
			invitationProvider: "MANUAL_ANDROID_DISTRIBUTION",
			externalReference: "distribution-ticket-1",
		});
	});
});
