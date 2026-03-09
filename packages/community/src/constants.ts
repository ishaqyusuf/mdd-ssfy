export const COMMUNITY_BLOCKS_INVENTORY_CATEGORY_TITLE = "Community Blocks"; //7
export const COMMUNITY_SECTIONS_INVENTORY_CATEGORY_TITLE = "Community Field"; //8
export const COMMUNITY_LISTINGS_INVENTORY_CATEGORY_TITLE = "Community Item"; //9

const COMMUNITY_CATEGORIES = [
  COMMUNITY_BLOCKS_INVENTORY_CATEGORY_TITLE,
  COMMUNITY_SECTIONS_INVENTORY_CATEGORY_TITLE,
  COMMUNITY_LISTINGS_INVENTORY_CATEGORY_TITLE,
] as const;
export type CommunityCategory = (typeof COMMUNITY_CATEGORIES)[number];

export const INSTALL_COST_DEFAULT_UNITS = ["PCS", "FT", "SQFT", "HOURS"];

export const JOBS_SHOW_OPTIONS = [
  "all",
  "custom",
  "paid",
  "pending-payment",
] as const;
export const JobShowRecordOptions: Record<
  (typeof JOBS_SHOW_OPTIONS)[number],
  string
> = {
  all: "All Jobs",
  custom: "Custom Jobs",
  paid: "Paid Jobs",
  "pending-payment": "Pending Payment",
} as const;

export const JOB_STATUS_OPTIONS = [
  "Submitted",
  "Assigned",
  "Rejected",
  "Approved",
  "Config Requested",
  "In Progress",
] as const;
export type JobStatus = (typeof JOB_STATUS_OPTIONS)[number];
export type IsJobStatus = Record<JobStatus, boolean>;
// export const IsJobStatus: Record<(typeof JOB_STATUS_OPTIONS)[number], string> =

export const JOB_FORM_ACTION_OPTIONS = [
  "submit",
  "update",
  "re-assign",
  "request-task-config",
  "approve",
  "reject",
] as const;
export type JobFormAction = (typeof JOB_FORM_ACTION_OPTIONS)[number];
