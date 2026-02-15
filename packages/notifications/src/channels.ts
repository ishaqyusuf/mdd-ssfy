export const channelNames = [
  "job_assigned",
  "job_submitted",
  "job_approved",
  "job_rejected",
  "job_review_requested",
  "job_deleted",
  "sales_checkout_success",
] as const;

export const channelsConfig: {
  [key in (typeof channelNames)[number]]: { title: string; priority: number };
} = {
  job_assigned: {
    title: "Triggered when a job is assigned to a contractor",
    priority: 5,
  },
  job_submitted: {
    title: "Triggered when a contractor submits a job for review",
    priority: 5,
  },
  job_approved: {
    title: "Triggered when a submitted job is approved",
    priority: 5,
  },
  job_rejected: {
    title: "Triggered when a submitted job is rejected",
    priority: 5,
  },
  job_review_requested: {
    title: "Triggered when a reviewer requests changes on a submitted job",
    priority: 5,
  },
  job_deleted: {
    title: "Triggered when a job is deleted",
    priority: 5,
  },
  sales_checkout_success: {
    title: "Triggered when a sales checkout is successful",
    priority: 5,
  },
};
