import type { Database } from "@gnd/db";
import {
	updateActivityStatus,
	updateAllActivitiesStatus,
} from "@notifications/activities";

type NotificationStatus = "unread" | "read" | "archived";

export function acknowledgeSalesHandoffEscalationNotification(
	db: Database,
	input: { actorUserId: number; notificationActivityId: number; now?: Date },
) {
	return db.salesHandoffActionEscalationRecipient.updateMany({
		where: {
			recipientUserId: input.actorUserId,
			notificationActivityId: input.notificationActivityId,
			acknowledgedAt: null,
		},
		data: { acknowledgedAt: input.now ?? new Date() },
	});
}

export function acknowledgeAllSalesHandoffEscalationNotifications(
	db: Database,
	input: {
		actorUserId: number;
		notificationActivityIds: number[];
		now?: Date;
	},
) {
	return db.salesHandoffActionEscalationRecipient.updateMany({
		where: {
			recipientUserId: input.actorUserId,
			notificationActivityId: { in: input.notificationActivityIds },
			acknowledgedAt: null,
		},
		data: { acknowledgedAt: input.now ?? new Date() },
	});
}

export function updateNotificationStatusWithSalesHandoffAcknowledgement(
	db: Database,
	input: {
		actorUserId: number;
		notePadContactId: number;
		notificationActivityId: number;
		status: NotificationStatus;
	},
) {
	return db.$transaction(async (tx) => {
		const transactionDb = tx as unknown as Database;
		const result = await updateActivityStatus(
			transactionDb,
			input.notificationActivityId,
			input.status,
			input.notePadContactId,
		);
		if (input.status !== "unread") {
			await acknowledgeSalesHandoffEscalationNotification(transactionDb, {
				actorUserId: input.actorUserId,
				notificationActivityId: input.notificationActivityId,
			});
		}
		return result;
	});
}

export function updateAllNotificationStatusesWithSalesHandoffAcknowledgement(
	db: Database,
	input: {
		actorUserId: number;
		notePadContactId: number;
		status: NotificationStatus;
		fromStatus?: NotificationStatus[];
	},
) {
	return db.$transaction(async (tx) => {
		const transactionDb = tx as unknown as Database;
		const acknowledgedActivities =
			input.status === "unread"
				? []
				: await transactionDb.noteRecipients.findMany({
						where: {
							notePadContactId: input.notePadContactId,
							deletedAt: null,
							...(input.fromStatus?.length
								? { status: { in: input.fromStatus } }
								: {}),
						},
						select: { notePadId: true },
					});
		const result = await updateAllActivitiesStatus(transactionDb, {
			notePadContactId: input.notePadContactId,
			status: input.status,
			fromStatus: input.fromStatus,
		});
		if (acknowledgedActivities.length) {
			await acknowledgeAllSalesHandoffEscalationNotifications(transactionDb, {
				actorUserId: input.actorUserId,
				notificationActivityIds: acknowledgedActivities.map(
					(activity) => activity.notePadId,
				),
			});
		}
		return result;
	});
}
