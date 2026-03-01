import { _push } from "@/components/static-router";
import { getSessionProfile } from "@/lib/session-store";

export function getJobType(role) {
  return role === "1099 Contractor" ? "installation" : "punchout";
}

type JobLike = {
  id?: number | string | null;
  controlId?: string | number | null;
};

function isAdminUser() {
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
  if (job.controlId) {
    if (isAdmin) {
      _push?.(`/(job-admin)/re-assign/${job.controlId}` as any);
      return;
    }
    _push?.(`/(installers)/submit/${job.controlId}` as any);
    return;
  }

  pushJobFormV2(job, isAdmin ? "re-assign" : "submit");
}

export function openJob(job: JobLike) {
  if (!job?.id) return;

  const isAdmin = isAdminUser();
  if (job.controlId) {
    _push?.(`${isAdmin ? "/(job-admin)/job" : "/(installers)/job"}/${job.id}` as any);
    return;
  }

  _push?.({
    pathname: "/job-overview-v2",
    params: {
      jobId: String(job.id),
      admin: isAdmin ? "true" : "false",
    },
  } as any);
}
