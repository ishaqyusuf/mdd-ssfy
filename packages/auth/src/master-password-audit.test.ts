import { describe, expect, test } from "bun:test";

import { recordMasterPasswordUsage } from "./master-password-audit";

describe("recordMasterPasswordUsage", () => {
	test("normalizes device evidence and writes transfer context", async () => {
		const calls: unknown[] = [];
		const db = {
			masterPasswordLoginAudit: {
				create: async (payload: unknown) => {
					calls.push(payload);
					return { id: "audit-id" };
				},
			},
		};

		await recordMasterPasswordUsage(db, {
			usageType: "SALES_REP_TRANSFER",
			targetUserId: 42,
			targetUserName: "Pablo Cruz",
			targetUserEmail: "pablo@example.com",
			appSurface: "www",
			platform: "WEBSITE",
			ipAddress: "203.0.113.10",
			countryCode: "US",
			userAgent:
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36",
			sessionId: null,
			requestId: "request-id",
			resourceType: "order",
			resourceId: "08890PC",
			occurredAt: new Date("2026-07-22T12:00:00.000Z"),
		});

		expect(calls).toEqual([
			{
				data: {
					targetUserId: 42,
					targetUserName: "Pablo Cruz",
					targetUserEmail: "pablo@example.com",
					appSurface: "www",
					usageType: "SALES_REP_TRANSFER",
					platform: "WEBSITE",
					ipAddress: "203.0.113.10",
					countryCode: "US",
					browser: "Chrome",
					userAgent:
						"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36",
					sessionId: null,
					requestId: "request-id",
					resourceType: "order",
					resourceId: "08890PC",
					loginAt: new Date("2026-07-22T12:00:00.000Z"),
				},
			},
		]);
	});
});
