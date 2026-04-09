import { _push } from "@/components/static-router";
import { getSessionProfile } from "@/lib/session-store";

function getJobType(role) {
  return role === "1099 Contractor" ? "installation" : "punchout";
}

type JobLike = {
  id?: number | string | null;
  controlId?: string | number | null;
  userId?: number | string | null;
  builderTaskId?: number | string | null;
  modelId?: number | string | null;
  unitId?: number | string | null;
  user?: {
    id?: number | string | null;
  } | null;
  project?: {
    id?: number | string | null;
  };
  home?: {
    id?: number | string | null;
    communityTemplateId?: number | string | null;
  } | null;
};

export function isAdminUser() {
  const role = getSessionProfile()?.role?.name;
  return role === "Admin" || role === "Super Admin";
}

function pushJobFormV2(job: JobLike, action: "submit" | "re-assign") {
  const userId = job?.user?.id ?? job?.userId ?? null;
  const unitId = job?.home?.id ?? job?.unitId ?? null;
  const modelId = job?.home?.communityTemplateId ?? job?.modelId ?? null;
  const builderTaskId = job?.builderTaskId ?? null;
  const formStep = action === "re-assign" ? "5" : "4";
  const projectId = job?.project?.id ?? null;

  _push?.({
    pathname: "/job-form",
    params: {
      action,
      admin: action === "re-assign" ? "true" : "false",
      _jobId: job?.id ? job.id : undefined,
      _userId: userId ? userId : undefined,
      _unitId: unitId ? unitId : undefined,
      _modelId: modelId ? modelId : undefined,
      _builderTaskId: builderTaskId ? builderTaskId : undefined,
      _projectId: projectId ? projectId : undefined,
      step: formStep,
    },
  } as any);
}

export function editJob(job: JobLike) {
  if (!job) return;

  const isAdmin = isAdminUser();
  pushJobFormV2(job, isAdmin ? "re-assign" : "submit");
}

function openJob(job: JobLike) {
  if (!job?.id) return;

  _push?.(`/job/${job.id}` as any);
}

function openJobAlert(
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
