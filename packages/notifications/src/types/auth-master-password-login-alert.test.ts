// @ts-expect-error package typecheck does not include Bun test types.
import { describe, expect, test } from "bun:test";
import { authMasterPasswordLoginAlert } from "./auth-master-password-login-alert";

const payload = {
	accountName: "Jane Manager",
	accountEmail: "jane@example.com",
	appSurface: "www" as const,
	loginAt: "2026-06-04T12:00:00.000Z",
	ipAddress: "127.0.0.1",
	userAgent: "Unit test browser",
	sessionId: "session-123",
	actorLabel: "Master password",
	supportEmail: "support@gndprodesk.com",
};

describe("authMasterPasswordLoginAlert", () => {
	test("builds an email around the accessed account", () => {
		const contact = authMasterPasswordLoginAlert.createDirectEmailContact?.(
			payload,
			{
				id: 0,
				profileId: 0,
				name: "GND Security",
				email: "noreply@gndprodesk.com",
				role: "employee",
			},
		);

		expect(contact?.email).toBe(payload.accountEmail);
		expect(contact?.emailNotification).toBe(true);

		const email = authMasterPasswordLoginAlert.createEmail?.(
			payload,
			{
				id: 0,
				profileId: 0,
				name: "GND Security",
				email: "noreply@gndprodesk.com",
				role: "employee",
			},
			contact!,
			{},
		);

		expect(email?.template).toBe("auth-master-password-login-alert");
		expect(email?.to).toEqual([payload.accountEmail]);
		expect(email?.subject).toBe("Master password login activity");
		expect(email?.data).toMatchObject({
			accountName: payload.accountName,
			accountEmail: payload.accountEmail,
			appSurface: payload.appSurface,
			sessionId: payload.sessionId,
		});
	});
});
