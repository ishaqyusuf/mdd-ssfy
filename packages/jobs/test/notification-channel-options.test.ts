import { describe, expect, it } from "bun:test";
import { getNotificationRecipientOptions } from "../src/tasks/notifications/channel-options";

describe("getNotificationRecipientOptions", () => {
	it("requires inbox delivery for explicitly addressed completion notices", () => {
		expect(getNotificationRecipientOptions("sales_dispatch_completed", [{ ids: [42], role: "employee" }])).toEqual({
			recipients: [{ ids: [42], role: "employee" }],
			forceInAppRecipients: true,
		});
	});

	it("does not force completion broadcasts without an explicit recipient", () => {
		expect(getNotificationRecipientOptions("sales_dispatch_completed", []).forceInAppRecipients).toBeUndefined();
	});
	it("bypasses subscribers and fallback delivery for customer payment receipts", () => {
		expect(
			getNotificationRecipientOptions("sales_customer_payment_received", [
				{ ids: [42], role: "employee" },
			]),
		).toEqual({
			recipients: undefined,
			includeChannelSubscribers: false,
			allowFallbackRecipient: false,
		});
	});

	it("keeps operational notifications on subscriber delivery", () => {
		expect(
			getNotificationRecipientOptions("sales_payment_recorded", [
				{ ids: [42], role: "employee" },
			]),
		).toEqual({
			recipients: [{ ids: [42], role: "employee" }],
		});
	});
});
