export const channelNames = [
	"job_assigned",
	"job_submitted",
	"job_approved",
	"job_rejected",
	"job_review_requested",
	"job_deleted",
	"job_install_tasks_qty_request",
	"job_task_configure_request",
	"job_task_configured",
	"sales_checkout_success",
	"sales_payment_recorded",
	"sales_payment_refunded",
	"sales_info",
	"sales_item_info",
	"sales_dispatch_info",
	"sales_email_reminder",
	"simple_sales_email_reminder",
	"sales_reminder_schedule_admin_notification",
	"sales_dispatch_assigned",
	"sales_dispatch_cancelled",
	"sales_dispatch_completed",
	"sales_dispatch_packed",
	"sales_dispatch_packing_reset",
	"sales_dispatch_in_progress",
	"sales_dispatch_trip_canceled",
	"sales_dispatch_created",
	"sales_dispatch_date_updated",
	"sales_dispatch_queued",
	"sales_dispatch_unassigned",
	"sales_marked_as_production_completed",
	"sales_back_order",
	"sales_dispatch_late",
	"sales_production_assigned",
	"sales_production_unassigned",
	"sales_production_started",
	"sales_production_submitted",
	"sales_production_item_completed",
	"sales_production_submission_cancelled",
	"sales_production_all_completed",
	"sales_request_packing",
	"dispatch_packing_delay",
	"sales_dispatch_duplicate_alert",
] as const;
export type ChannelName = (typeof channelNames)[number];
export const priorityStrings = [
	"Low",
	"Medium",
	"High",
	"Critical",
	"Urgent",
] as const;
export type PriorityString = (typeof priorityStrings)[number];

export const channelCategories = ["Community", "Sales"] as const;
export type ChannelCategory = (typeof channelCategories)[number];

export type ChannelConfig = {
	name: string;
	description: string;
	priority: number;
	category: ChannelCategory;
	published?: boolean;
};

export const channelsConfig: Partial<{
	[key in ChannelName]: ChannelConfig;
}> = {
	job_assigned: {
		name: "Job Assigned",
		description: "Send when a job is assigned to a contractor.",
		priority: 5,
		category: "Community",
	},
	job_install_tasks_qty_request: {
		name: "Install Task Quantity Requested",
		description:
			"Send when a contractor requests an install task quantity update.",
		priority: 5,
		category: "Community",
	},
	job_task_configure_request: {
		name: "Task Configuration Requested",
		description:
			"Send when a contractor cannot submit a job because install tasks are missing.",
		priority: 5,
		category: "Community",
	},
	job_task_configured: {
		name: "Task Configuration Completed",
		description: "Send when requested job task configuration is completed.",
		priority: 5,
		category: "Community",
	},
	job_submitted: {
		name: "Job Submitted",
		description: "Send when a contractor submits a job for review.",
		priority: 5,
		category: "Community",
	},
	job_approved: {
		name: "Job Approved",
		description: "Send when a submitted job is approved.",
		priority: 5,
		category: "Community",
	},
	job_rejected: {
		name: "Job Rejected",
		description: "Send when a submitted job is rejected.",
		priority: 5,
		category: "Community",
	},
	job_review_requested: {
		name: "Job Review Requested",
		description: "Send when a reviewer requests changes on a submitted job.",
		priority: 5,
		category: "Community",
	},
	job_deleted: {
		name: "Job Deleted",
		description: "Send when a job is deleted.",
		priority: 5,
		category: "Community",
	},
	sales_checkout_success: {
		name: "Sales Checkout Successful",
		description: "Send when a sales checkout succeeds.",
		priority: 5,
		category: "Sales",
	},
	sales_payment_recorded: {
		name: "Sales Payment Recorded",
		description: "Send when a payment is recorded against a sales order.",
		priority: 5,
		category: "Sales",
	},
	sales_payment_refunded: {
		name: "Sales Payment Refunded",
		description: "Send when a refund is recorded against a sales order.",
		priority: 5,
		category: "Sales",
	},
	sales_info: {
		name: "Sales Info",
		description: "Send sales notes and info updates.",
		priority: 5,
		category: "Sales",
	},
	sales_item_info: {
		name: "Sales Item Info",
		description: "Send sales item notes and info updates.",
		priority: 5,
		category: "Sales",
	},
	sales_dispatch_info: {
		name: "Sales Dispatch Info",
		description: "Send sales dispatch notes and info updates.",
		priority: 5,
		category: "Sales",
	},
	sales_email_reminder: {
		name: "Sales Email Reminder",
		description: "Send when a sales reminder email is sent.",
		priority: 5,
		category: "Sales",
	},
	simple_sales_email_reminder: {
		name: "Simple Sales Email Reminder",
		description:
			"Send reminder email from minimal sales input and enrich payload server-side.",
		priority: 5,
		category: "Sales",
	},
	sales_reminder_schedule_admin_notification: {
		name: "Sales Reminder Schedule Admin Notification",
		description:
			"Send schedule run summary to admins including delivery stats and skipped sales.",
		priority: 5,
		category: "Sales",
	},
	sales_dispatch_assigned: {
		name: "Dispatch Assigned",
		description: "Send when a dispatch is assigned to a driver.",
		priority: 5,
		category: "Sales",
	},
	sales_dispatch_unassigned: {
		name: "Dispatch Unassigned",
		description: "Send when a dispatch is unassigned from a driver.",
		priority: 5,
		category: "Sales",
	},
	sales_dispatch_date_updated: {
		name: "Dispatch Date Updated",
		description: "Send when a dispatch due date is updated.",
		priority: 5,
		category: "Sales",
	},
	sales_dispatch_queued: {
		name: "Dispatch Queued",
		description: "Send when a dispatch is queued.",
		priority: 5,
		category: "Sales",
	},
	sales_dispatch_cancelled: {
		name: "Dispatch Cancelled",
		description: "Send when a dispatch is cancelled.",
		priority: 5,
		category: "Sales",
	},
	sales_dispatch_completed: {
		name: "Dispatch Completed",
		description: "Send when a dispatch is completed.",
		priority: 5,
		category: "Sales",
	},
	sales_dispatch_packed: {
		name: "Dispatch Packed",
		description: "Send when dispatch packing is updated.",
		priority: 5,
		category: "Sales",
	},
	sales_dispatch_packing_reset: {
		name: "Dispatch Packing Reset",
		description:
			"Send when dispatch packing is reset and status returns to queue.",
		priority: 5,
		category: "Sales",
	},
	sales_dispatch_in_progress: {
		name: "Dispatch In Progress",
		description: "Send when a dispatch moves to in progress.",
		priority: 5,
		category: "Sales",
	},
	sales_dispatch_trip_canceled: {
		name: "Dispatch Trip Canceled",
		description: "Send when an active dispatch trip is canceled.",
		priority: 5,
		category: "Sales",
	},
	sales_dispatch_created: {
		name: "Dispatch Created",
		description: "Send when a dispatch is created.",
		priority: 5,
		category: "Sales",
	},
	sales_back_order: {
		name: "Sales Back Order",
		description: "Send when a sales order is moved to back order.",
		priority: 5,
		category: "Sales",
	},
	sales_dispatch_late: {
		name: "Dispatch Late",
		description: "Send when a dispatch becomes late.",
		priority: 5,
		category: "Sales",
	},
	sales_production_assigned: {
		name: "Production Assigned",
		description: "Send when production work is assigned.",
		priority: 5,
		category: "Sales",
	},
	sales_production_unassigned: {
		name: "Production Unassigned",
		description: "Send when production work is unassigned.",
		priority: 5,
		category: "Sales",
	},
	sales_production_started: {
		name: "Production Started",
		description: "Send when production starts.",
		priority: 5,
		category: "Sales",
	},
	sales_production_submitted: {
		name: "Production Submitted",
		description: "Send when production is submitted.",
		priority: 5,
		category: "Sales",
	},
	sales_production_item_completed: {
		name: "Production Item Completed",
		description: "Send when a production item is completed.",
		priority: 5,
		category: "Sales",
	},
	sales_production_submission_cancelled: {
		name: "Production Submission Cancelled",
		description: "Send when a production submission is cancelled.",
		priority: 5,
		category: "Sales",
	},
	sales_production_all_completed: {
		name: "Production All Completed",
		description: "Send when all production items are completed.",
		priority: 5,
		category: "Sales",
	},
	sales_marked_as_production_completed: {
		name: "Sales Marked Production Completed",
		description: "Send when a sales order is marked as production completed.",
		priority: 5,
		category: "Sales",
	},
	sales_request_packing: {
		name: "Packing Requested",
		description: "Send when a driver requests unavailable packing items.",
		priority: 5,
		category: "Sales",
	},
	dispatch_packing_delay: {
		name: "Dispatch Packing Delay",
		description:
			"Send when a pending production item is marked ready but not yet updated in the system.",
		priority: 5,
		category: "Sales",
	},
	sales_dispatch_duplicate_alert: {
		name: "Dispatch Duplicate Alert",
		description:
			"Send when a driver reports duplicate dispatch rows that need admin resolution.",
		priority: 5,
		category: "Sales",
	},
};

export type ChannelOption = {
	label: string;
	value: ChannelName;
	description: string;
	disabled?: boolean;
};

type ChannelOptionsInput = {
	names?: readonly string[];
	channel?: string | ChannelName | null;
};

const channelNameSet = new Set<string>(channelNames);

export function isChannelName(value: string): value is ChannelName {
	return channelNameSet.has(value);
}

function toTitleCase(value: string) {
	return value
		.split("_")
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

export function getChannelsOptionList(input: ChannelOptionsInput = {}) {
	const { names, channel } = input;
	const selectedChannels =
		channel && isChannelName(channel)
			? ([channel] as const)
			: (names || channelNames).filter((name): name is ChannelName =>
					isChannelName(name),
				);

	return selectedChannels.map<ChannelOption>((value) => {
		const config = channelsConfig[value];
		return {
			value,
			label: config?.name || toTitleCase(value),
			description: config?.description || `Send ${toTitleCase(value)} updates.`,
		};
	});
}

export const channelsOptionList = getChannelsOptionList();
