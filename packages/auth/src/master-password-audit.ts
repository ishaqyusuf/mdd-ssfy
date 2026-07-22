import { normalizeLoginDevice } from "./new-device-login";

export type MasterPasswordUsageType = "LOGIN" | "SALES_REP_TRANSFER";
export type MasterPasswordUsagePlatform = "WEBSITE" | "MOBILE" | "UNKNOWN";

type MasterPasswordAuditClient = {
	masterPasswordLoginAudit: {
		create(input: {
			data: {
				targetUserId: number | null;
				targetUserName: string | null;
				targetUserEmail: string | null;
				appSurface: string;
				usageType: MasterPasswordUsageType;
				platform: MasterPasswordUsagePlatform;
				ipAddress: string | null;
				countryCode: string | null;
				browser: string;
				userAgent: string | null;
				sessionId: string | null;
				requestId: string | null;
				resourceType: string | null;
				resourceId: string | null;
				loginAt: Date;
			};
		}): Promise<unknown>;
	};
};

export type RecordMasterPasswordUsageInput = {
	usageType: MasterPasswordUsageType;
	targetUserId: number | null;
	targetUserName: string | null;
	targetUserEmail: string | null;
	appSurface: string;
	platform: MasterPasswordUsagePlatform;
	ipAddress: string | null;
	countryCode: string | null;
	userAgent: string | null;
	sessionId: string | null;
	requestId: string | null;
	resourceType: string | null;
	resourceId: string | null;
	occurredAt?: Date;
};

export function recordMasterPasswordUsage(
	db: MasterPasswordAuditClient,
	input: RecordMasterPasswordUsageInput,
) {
	const device = normalizeLoginDevice(input.userAgent);

	return db.masterPasswordLoginAudit.create({
		data: {
			targetUserId: input.targetUserId,
			targetUserName: input.targetUserName,
			targetUserEmail: input.targetUserEmail,
			appSurface: input.appSurface,
			usageType: input.usageType,
			platform: input.platform,
			ipAddress: input.ipAddress,
			countryCode: input.countryCode,
			browser: device.browser,
			userAgent: input.userAgent,
			sessionId: input.sessionId,
			requestId: input.requestId,
			resourceType: input.resourceType,
			resourceId: input.resourceId,
			loginAt: input.occurredAt ?? new Date(),
		},
	});
}
