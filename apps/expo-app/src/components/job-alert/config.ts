export type JobAlertType =
  | "request-submitted"
  | "submitted"
  | "assigned"
  | "re-assigned"
  | "approved"
  | "rejected";

type AlertTone = "success" | "info" | "danger";

type JobAlertConfig = {
  title: string;
  subtitle: string;
  description: string;
  tone: AlertTone;
};

export const JOB_ALERT_CONFIG: Record<JobAlertType, JobAlertConfig> = {
  "request-submitted": {
    title: "Request Sent Successfully",
    subtitle: "Configuration Submitted",
    description:
      "Your task configuration request was sent. Admin will review it and notify you when this job is ready.",
    tone: "success",
  },
  submitted: {
    title: "Submission Complete",
    subtitle: "Job Submitted",
    description:
      "This job has been submitted and is now waiting for admin review.",
    tone: "success",
  },
  assigned: {
    title: "Job Assigned",
    subtitle: "Assignment Complete",
    description:
      "The job has been assigned to the selected contractor successfully.",
    tone: "success",
  },
  "re-assigned": {
    title: "Job Re-Assigned",
    subtitle: "Assignment Updated",
    description:
      "The contractor assignment has been updated and the job is ready to continue.",
    tone: "info",
  },
  approved: {
    title: "Job Approved",
    subtitle: "Review Complete",
    description:
      "This job passed review and is now approved for the next stage.",
    tone: "success",
  },
  rejected: {
    title: "Job Rejected",
    subtitle: "Review Complete",
    description:
      "This job was rejected during review. Check notes and update the job before resubmitting.",
    tone: "danger",
  },
};

export function normalizeJobAlert(value: string): JobAlertType {
  if (value in JOB_ALERT_CONFIG) {
    return value as JobAlertType;
  }
  return "submitted";
}

