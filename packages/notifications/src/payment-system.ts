import type { Db } from "@gnd/db";
import type {
	PaymentSystemNotificationEvent,
	PaymentSystemNotificationType,
	SalesCheckoutSuccessNotificationPayload,
	SalesPaymentRecordedNotificationPayload,
	SalesPaymentRefundedNotificationPayload,
} from "@gnd/sales";
import { NotificationService } from "./services/triggers";

type TriggerTasksClient = {
	trigger: (taskId: string, payload: unknown) => Promise<unknown>;
};

type PaymentSystemPayloadByType = {
	sales_checkout_success: SalesCheckoutSuccessNotificationPayload;
	sales_payment_recorded: SalesPaymentRecordedNotificationPayload;
	sales_payment_refunded: SalesPaymentRefundedNotificationPayload;
};

type PaymentSystemTypedEvent<TType extends PaymentSystemNotificationType> =
	PaymentSystemNotificationEvent<PaymentSystemPayloadByType[TType]> & {
		type: TType;
	};

export interface PaymentSystemNotificationContext {
	db: Db;
	userId?: number | null;
}

async function sendPaymentSystemNotification<
	TType extends PaymentSystemNotificationType,
>(
	tasks: TriggerTasksClient,
	ctx: PaymentSystemNotificationContext,
	event: PaymentSystemTypedEvent<TType>,
) {
	if (!event.recipientEmployeeId || event.author.id == null) return;

	const service = new NotificationService(tasks, ctx).setEmployeeRecipients(
		event.recipientEmployeeId,
	);

	await service.send(event.type, {
		author: event.author,
		payload: event.payload,
	});
}

export async function sendPaymentSystemNotifications(
	tasks: TriggerTasksClient,
	ctx: PaymentSystemNotificationContext,
	events: PaymentSystemNotificationEvent[],
) {
	for (const event of events) {
		switch (event.type) {
			case "sales_checkout_success":
				await sendPaymentSystemNotification(tasks, ctx, event);
				break;
			case "sales_payment_recorded":
				await sendPaymentSystemNotification(tasks, ctx, event);
				break;
			case "sales_payment_refunded":
				await sendPaymentSystemNotification(tasks, ctx, event);
				break;
		}
	}
}
