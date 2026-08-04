import { describe, expect, it } from "bun:test";
import { canManageManualActivityNote } from "./manual-activity-notes";

describe("manual activity note permissions", () => {
	it("allows authors and Super Admin to manage manual notes", () => {
		expect(
			canManageManualActivityNote({
				channel: "sales_info",
				actorUserId: 7,
				authorUserId: 7,
				isSuperAdmin: false,
			}),
		).toBe(true);
		expect(
			canManageManualActivityNote({
				channel: "inventory_inbound",
				actorUserId: 1,
				authorUserId: 7,
				isSuperAdmin: true,
			}),
		).toBe(true);
	});

	it("rejects other users and system lifecycle activity", () => {
		expect(
			canManageManualActivityNote({
				channel: "sales_info",
				actorUserId: 8,
				authorUserId: 7,
				isSuperAdmin: false,
			}),
		).toBe(false);
		expect(
			canManageManualActivityNote({
				channel: "inventory_inbound_activity",
				actorUserId: 7,
				authorUserId: 7,
				isSuperAdmin: true,
			}),
		).toBe(false);
		expect(
			canManageManualActivityNote({
				channel: "sales_info",
				activityType: "activity_note_revision",
				actorUserId: 7,
				authorUserId: 7,
				isSuperAdmin: true,
			}),
		).toBe(false);
	});
});
