import type { MobileAccessPlatform } from "@api/schemas/mobile-access";

export interface MobileAccessInvitationAdapter {
	readonly mode: "manual" | "app-store-connect-api";
	prepareRecordedInvitation(input: {
		platform: MobileAccessPlatform;
		externalReference?: string;
	}): {
		invitationProvider: string;
		externalReference: string | null;
	};
}

export const manualMobileAccessInvitationAdapter: MobileAccessInvitationAdapter =
	{
		mode: "manual",
		prepareRecordedInvitation(input) {
			return {
				invitationProvider:
					input.platform === "IOS"
						? "MANUAL_PUBLIC_APP_STORE_GUIDANCE"
						: "MANUAL_ANDROID_DISTRIBUTION",
				externalReference: input.externalReference ?? null,
			};
		},
	};
