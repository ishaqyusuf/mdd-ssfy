import { _push } from "@/components/static-router";
import { getSessionProfile } from "@/lib/session-store";

export function getJobType(role) {
  return role === "1099 Contractor" ? "installation" : "punchout";
}

type JobLike = {
  id?: number | string | null;
  controlId?: string | number | null;
};

export function isAdminUser() {
  const role = getSessionProfile()?.role?.name;
  return role === "Admin" || role === "Super Admin";
}

function pushJobFormV2(job: JobLike, action: "submit" | "re-assign") {
  _push?.({
    pathname: "/job-form",
    params: {
      action,
      admin: action === "re-assign" ? "true" : "false",
      _jobId: job?.id ? String(job.id) : undefined,
      step: "1",
    },
  } as any);
}

export function editJob(job: JobLike) {
  if (!job) return;

  const isAdmin = isAdminUser();
  pushJobFormV2(job, isAdmin ? "re-assign" : "submit");
}

export function openJob(job: JobLike) {
  if (!job?.id) return;

  _push?.(`/job/${job.id}` as any);
}

export function openJobAlert(
  jobId: number | string,
  alert:
    | "request-submitted"
    | "submitted"
    | "assigned"
    | "re-assigned"
    | "approved"
    | "rejected",
) {
  _push?.(`/job/${jobId}/alert/${alert}` as any);
}
