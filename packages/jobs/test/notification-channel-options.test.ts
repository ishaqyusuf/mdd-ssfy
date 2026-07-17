import { describe, expect, it } from "bun:test";
import { getNotificationRecipientOptions } from "../src/tasks/notifications/channel-options";

describe("getNotificationRecipientOptions", () => {
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
