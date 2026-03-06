export const channelNames = [
  "job_assigned",
  "job_submitted",
  "job_approved",
  "job_rejected",
  "job_review_requested",
  "job_deleted",
  "job_install_tasks_qty_request",
  "job_task_configure_request",
  "sales_checkout_success",
  "sales_email_reminder",
  "sales_dispatch_assigned",
  "sales_dispatch_cancelled",
  "sales_dispatch_completed",
  "sales_dispatch_in_progress",
  "sales_dispatch_created",
  "sales_dispatch_date_updated",
  "sales_dispatch_queued",
  "sales_dispatch_unassigned",
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
export const channelsConfig: Partial<{
  [key in ChannelName]: {
    title: string;
    priority: number;
    category: ChannelCategory;
    published?: boolean;
  };
}> = {
  job_assigned: {
    title: "Triggered when a job is assigned to a contractor",
    priority: 5,
    category: "Community",
  },
  job_install_tasks_qty_request: {
    title:
      "Triggered when a contractor requests to update the quantity of install tasks for a job",
    priority: 5,
    category: "Community",
  },
  job_task_configure_request: {
    title:
      "Triggered when a contractor tries to submit a job but install task list is missing",
    priority: 5,
    category: "Community",
  },
  job_submitted: {
    title: "Triggered when a contractor submits a job for review",
    priority: 5,
    category: "Community",
  },
  job_approved: {
    title: "Triggered when a submitted job is approved",
    priority: 5,
    category: "Community",
  },
  job_rejected: {
    title: "Triggered when a submitted job is rejected",
    priority: 5,
    category: "Community",
  },
  job_review_requested: {
    title: "Triggered when a reviewer requests changes on a submitted job",
    priority: 5,
    category: "Community",
  },
  job_deleted: {
    title: "Triggered when a job is deleted",
    priority: 5,
    category: "Community",
  },
  sales_checkout_success: {
    title: "Triggered when a sales checkout is successful",
    priority: 5,
    category: "Sales",
  },
  sales_email_reminder: {
    title: "Triggered when a sales reminder email is sent",
    priority: 5,
    category: "Sales",
  },
  sales_dispatch_unassigned: {
    title: "Triggered when a dispatch is unassigned from a driver",
    priority: 5,
    category: "Sales",
  },
  sales_dispatch_date_updated: {
    title: "Triggered when a dispatch due date is updated",
    priority: 5,
    category: "Sales",
  },
  sales_dispatch_queued: {
    title: "Triggered when a dispatch is queued",
    priority: 5,
    category: "Sales",
  },
  sales_dispatch_cancelled: {
    title: "Triggered when a dispatch is cancelled",
    priority: 5,
    category: "Sales",
  },
  sales_dispatch_completed: {
    title: "Triggered when a dispatch is completed",
    priority: 5,
    category: "Sales",
  },
  sales_dispatch_in_progress: {
    title: "Triggered when a dispatch moves to in progress",
    priority: 5,
    category: "Sales",
  },
  sales_request_packing: {
    title:
      "Triggered when driver submits a request for unavailable packing items",
    priority: 5,
    category: "Sales",
  },
  dispatch_packing_delay: {
    title:
      "Triggered when driver marks pending production item as ready but not yet updated in system",
    priority: 5,
    category: "Sales",
  },
};
