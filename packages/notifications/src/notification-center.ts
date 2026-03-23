import {
	type DispatchPackingDelayTags,
	type EmployeeDocumentReviewTags,
	type JobSubmittedTags,
	type SalesDispatchAssignedTags,
	type JobTaskConfigureRequestTags,
	type SalesCheckoutSuccessTags,
	type SalesDispatchDuplicateAlertTags,
	type SalesMarkedAsProductionCompletedTags,
	type SalesPaymentRecordedTags,
	dispatchPackingDelayTags,
	employeeDocumentReviewTags,
	jobSubmittedTags,
	jobTaskConfigureRequestTags,
	salesDispatchAssignedTags,
	salesCheckoutSuccessTags,
	salesDispatchDuplicateAlertTags,
	salesMarkedAsProductionCompletedTags,
	salesPaymentRecordedTags,
} from "./schemas";

export type RawNotificationItem = {
	id: string | number;
	subject?: string | null;
	headline?: string | null;
	createdAt?: string | Date | null;
	created_at?: string | Date | null;
	receipt?: {
		status?: "unread" | "read" | "archived" | null;
	} | null;
	tags?: Record<string, unknown> | null;
};

type NotificationActionPayloadMap = {
	job_submitted: Omit<JobSubmittedTags, "type">;
	job_task_configure_request: Omit<JobTaskConfigureRequestTags, "type">;
	employee_document_review: Omit<EmployeeDocumentReviewTags, "type">;
	dispatch_packing_delay: Omit<DispatchPackingDelayTags, "type">;
	sales_dispatch_duplicate_alert: Omit<SalesDispatchDuplicateAlertTags, "type">;
	sales_checkout_success: Omit<SalesCheckoutSuccessTags, "type">;
	sales_payment_recorded: Omit<SalesPaymentRecordedTags, "type">;
	sales_marked_as_production_completed: Omit<
		SalesMarkedAsProductionCompletedTags,
		"type"
	>;
	sales_dispatch_assigned: Omit<SalesDispatchAssignedTags, "type">;
};

export type NotificationActionType = keyof NotificationActionPayloadMap;

export type NotificationAction<
	TType extends NotificationActionType = NotificationActionType,
> = {
	type: TType;
	label: string;
	data: NotificationActionPayloadMap[TType];
};

export type TransformedNotification<
	TType extends NotificationActionType = NotificationActionType,
> = {
	id: string | number;
	type: string;
	title: string;
	description: string;
	createdAt?: string | Date | null;
	notificationDate: string | null;
	status: "unread" | "read" | "archived";
	isClickable: boolean;
	action?: NotificationAction<TType>;
	tags: Record<string, unknown>;
};

export type NotificationActionHandlers<TContext = void> = {
	[K in NotificationActionType]?: (
		data: NotificationActionPayloadMap[K],
		notification: TransformedNotification<K>,
		context: TContext,
	) => void | Promise<void>;
};

export function createNotificationHandlers<TContext = void>(
	handlers: NotificationActionHandlers<TContext>,
) {
	return handlers;
}

function parseType(tags: Record<string, unknown>) {
	const type = tags.type ?? tags.channel;
	return typeof type === "string" ? type : "unknown";
}

function statusFromRaw(
	raw: RawNotificationItem,
): "unread" | "read" | "archived" {
	const status = raw.receipt?.status;
	if (status === "unread" || status === "read" || status === "archived") {
		return status;
	}
	return "read";
}

function parseAction(
	tags: Record<string, unknown>,
): NotificationAction | undefined {
	const type = parseType(tags);

	if (type === "job_submitted") {
		const parsed = jobSubmittedTags.safeParse(tags);
		if (!parsed.success) return undefined;
		return {
			type: "job_submitted",
			label: "View",
			data: parsed.data,
		};
	}

	if (type === "job_task_configure_request") {
		const parsed = jobTaskConfigureRequestTags.safeParse(tags);
		if (!parsed.success) return undefined;
		return {
			type: "job_task_configure_request",
			label: "Configure",
			data: parsed.data,
		};
	}

	if (type === "employee_document_review") {
		const parsed = employeeDocumentReviewTags.safeParse(tags);
		if (!parsed.success) return undefined;
		return {
			type: "employee_document_review",
			label: "Review",
			data: parsed.data,
		};
	}

	if (type === "dispatch_packing_delay") {
		const parsed = dispatchPackingDelayTags.safeParse(tags);
		if (!parsed.success) return undefined;
		return {
			type: "dispatch_packing_delay",
			label: "Approve",
			data: parsed.data,
		};
	}

	if (type === "sales_dispatch_duplicate_alert") {
		const parsed = salesDispatchDuplicateAlertTags.safeParse(tags);
		if (!parsed.success) return undefined;
		return {
			type: "sales_dispatch_duplicate_alert",
			label: "Open Dispatch",
			data: parsed.data,
		};
	}

	if (type === "sales_checkout_success") {
		const parsed = salesCheckoutSuccessTags.safeParse(tags);
		if (!parsed.success) return undefined;
		return {
			type: "sales_checkout_success",
			label: "Open Sale",
			data: parsed.data,
		};
	}

	if (type === "sales_payment_recorded") {
		const parsed = salesPaymentRecordedTags.safeParse(tags);
		if (!parsed.success) return undefined;
		return {
			type: "sales_payment_recorded",
			label: "Open Sale",
			data: parsed.data,
		};
	}

	if (type === "sales_marked_as_production_completed") {
		const parsed = salesMarkedAsProductionCompletedTags.safeParse(tags);
		if (!parsed.success) return undefined;
		return {
			type: "sales_marked_as_production_completed",
			label: "Open Sale",
			data: parsed.data,
		};
	}

	if (type === "sales_dispatch_assigned") {
		const parsed = salesDispatchAssignedTags.safeParse(tags);
		if (!parsed.success) return undefined;
		return {
			type: "sales_dispatch_assigned",
			label: "Open Dispatch",
			data: parsed.data,
		};
	}

	return undefined;
}

function formatNotificationDate(value?: string | Date | null): string | null {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return null;

	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(date);
}

export function transformNotifications(
	items: RawNotificationItem[],
): TransformedNotification[] {
	return items.map((item) => {
		const tags = item.tags ?? {};
		const type = parseType(tags);
		const action = parseAction(tags);
		const createdAt = item.createdAt ?? item.created_at ?? null;
		// console.log("Transforming notifications:", { action, tags });

		return {
			id: item.id,
			type,
			title: item.subject || "Notification",
			description: item.headline || "No details available.",
			createdAt,
			notificationDate: formatNotificationDate(createdAt),
			status: statusFromRaw(item),
			isClickable: Boolean(action),
			action,
			tags,
		};
	});
}

export async function runNotificationAction<TContext>(
	notification: TransformedNotification,
	handlers: NotificationActionHandlers<TContext>,
	context: TContext,
) {
	if (!notification.action) return;
	const handler = handlers[notification.action.type];
	if (!handler) return;

	await handler(
		notification.action.data as never,
		notification as never,
		context,
	);
}
