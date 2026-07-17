import type { NotificationOptions } from "@notifications/base";
import type { NotificationJobInput } from "@notifications/schemas";

function isDirectRecipientEmailChannel(
	channel: NotificationJobInput["channel"],
) {
	return (
		channel === "auth_new_device_login" ||
		channel === "auth_master_password_login_alert" ||
		channel === "dealer_magic_login_link" ||
		channel === "dealer_password_reset" ||
		channel === "simple_sales_document_email" ||
		channel === "composed_sales_document_email" ||
		channel === "customer_statement" ||
		channel === "sales_customer_payment_received"
	);
}

export function getNotificationRecipientOptions(
	channel: NotificationJobInput["channel"],
	recipients: NotificationJobInput["recipients"],
): Pick<
	NotificationOptions,
	"recipients" | "includeChannelSubscribers" | "allowFallbackRecipient"
> {
	if (isDirectRecipientEmailChannel(channel)) {
		return {
			recipients: undefined,
			includeChannelSubscribers: false,
			allowFallbackRecipient: false,
		};
	}

	return {
		recipients:
			recipients?.map((recipient) => ({
				ids: recipient.ids,
				role: recipient.role,
			})) ?? undefined,
	};
}
