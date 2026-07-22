import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

function source(name: string) {
	return readFileSync(new URL(`./${name}`, import.meta.url), "utf8");
}

describe("high-risk tRPC permission boundaries", () => {
	test("employee administration is not exposed as anonymous mutations", () => {
		const hrm = source("hrm.route.ts");
		for (const mutation of [
			"resetEmployeePassword",
			"deleteEmployee",
			"revokeEmployee",
			"restoreEmployeeAccess",
			"setEmployeeBugReportingAccess",
			"saveEmployee",
			"getEmployeeForm",
		]) {
			expect(hrm).toContain(`${mutation}: protectedProcedure`);
		}
	});

	test("profile, document, and notification writes require a session", () => {
		const user = source("user.route.ts");
		for (const mutation of [
			"updateProfile",
			"changePassword",
			"saveDocument",
			"uploadDocumentAsset",
			"saveDocumentReviewNote",
			"deleteDocument",
			"updateNotificationPreferences",
		]) {
			expect(user).toContain(`${mutation}: protectedProcedure`);
		}

		const notes = source("notes.route.ts");
		for (const mutation of [
			"syncNotificationChannels",
			"updateNotificationChannel",
			"addNotificationChannelRole",
			"removeNotificationChannelRole",
			"addNotificationChannelSubscriber",
			"removeNotificationChannelSubscriber",
			"saveInboundNote",
			"saveNote",
		]) {
			expect(notes).toContain(`${mutation}: protectedProcedure`);
		}
	});
});
