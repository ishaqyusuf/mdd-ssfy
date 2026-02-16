export const channelNames = [
  "job_assigned",
  "job_submitted",
  "job_approved",
  "job_rejected",
  "job_review_requested",
  "job_deleted",
  "job_install_tasks_qty_request",
  "sales_checkout_success",
] as const;
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
export const channelsConfig: {
  [key in (typeof channelNames)[number]]: {
    title: string;
    priority: number;
    category: ChannelCategory;
  };
} = {
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
};
