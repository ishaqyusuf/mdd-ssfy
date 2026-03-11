import type { NotificationHandler } from "../base";
import {
	type SalesReminderScheduleAdminNotificationInput,
	type SalesReminderScheduleAdminNotificationTags,
	salesReminderScheduleAdminNotificationSchema,
} from "../schemas";

const toLabel = (value: string) =>
	value.charAt(0).toUpperCase() + value.slice(1);

export const salesReminderScheduleAdminNotification: NotificationHandler = {
	schema: salesReminderScheduleAdminNotificationSchema,
	createActivityWithoutContact: true,
	createActivity(data: SalesReminderScheduleAdminNotificationInput, author) {
		const payload: SalesReminderScheduleAdminNotificationTags = {
			type: "sales_reminder_schedule_admin_notification",
			source: "system",
			priority: 5,
			triggerType: data.triggerType,
			statusUsed: data.statusUsed,
			foundSalesCount: data.foundSalesCount,
			deliveredGroupCount: data.deliveredGroupCount,
			failedGroupCount: data.failedGroupCount,
			skippedSalesCount: data.skippedSalesCount,
		};

		return {
			type: "sales_reminder_schedule_admin_notification",
			source: "system",
			subject: "Sales reminder schedule summary",
			headline: `${toLabel(data.triggerType)} run: ${data.deliveredGroupCount} delivered, ${data.failedGroupCount} failed, ${data.skippedSalesCount} skipped.`,
			authorId: author.id,
			tags: payload,
		};
	},
	createEmail(data, author, user, args) {
		return {
			...args,
			template: "sales-reminder-schedule-admin-notification",
			to: [user.email],
			subject: `Sales Reminder ${toLabel(data.triggerType)} Summary: ${data.deliveredGroupCount} sent`,
			data: {
				recipientName: user.name,
				authorName: author.name,
				...data,
			},
		};
	},
};
