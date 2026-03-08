import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo } from "react";

export type JobFormV2Action = "submit" | "create" | "update" | "re-assign";

type NullableNumber = number | null | undefined;

const ACTIONS: JobFormV2Action[] = ["submit", "create", "update", "re-assign"];

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseInteger(value: string | string[] | undefined) {
  const text = firstValue(value);
  if (!text) return null;
  const parsed = Number.parseInt(text, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBoolean(value: string | string[] | undefined) {
  const text = firstValue(value);
  if (text === "true" || text === "1") return true;
  if (text === "false" || text === "0") return false;
  return undefined;
}

function parseAction(value: string | string[] | undefined) {
  const text = firstValue(value) as JobFormV2Action | undefined;
  if (!text) return undefined;
  return ACTIONS.includes(text) ? text : undefined;
}

function stringifyInteger(value: NullableNumber) {
  if (value === null || value === undefined) return undefined;
  return String(value);
}

export interface JobFormV2Params {
  step: number | null;
  redirectStep: number | null;
  projectId: number | null;
  jobId: number | null;
  unitId: number | null;
  builderTaskId: number | null;
  userId: number | null;
  modelId: number | null;
  admin?: boolean;
  action?: JobFormV2Action;
  jobType?: string;
}

export function useJobFormV2Params() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const state = useMemo(
    () => ({
      step: parseInteger(params.step),
      redirectStep: parseInteger(params.redirectStep),
      projectId: parseInteger(params._projectId),
      jobId: parseInteger(params._jobId),
      unitId: parseInteger(params._unitId),
      builderTaskId: parseInteger(params._builderTaskId),
      userId: parseInteger(params._userId),
      modelId: parseInteger(params._modelId),
      admin: parseBoolean(params.admin),
      action: parseAction(params.action),
      jobType: firstValue(params.jobType),
    }),
    [params],
  );

  const clearParams = useCallback(() => {
    router.setParams({
      step: undefined,
      redirectStep: undefined,
      _projectId: undefined,
      _jobId: undefined,
      _unitId: undefined,
      _builderTaskId: undefined,
      _userId: undefined,
      _modelId: undefined,
      admin: undefined,
      action: undefined,
      jobType: undefined,
    });
  }, [router]);

  const setParams = useCallback(
    (newParams: Partial<JobFormV2Params> | null) => {
      if (!newParams) {
        clearParams();
        return;
      }

      const next: Record<string, string | undefined> = {};
      if (Object.prototype.hasOwnProperty.call(newParams, "step")) {
        next.step = stringifyInteger(newParams.step);
      }
      if (Object.prototype.hasOwnProperty.call(newParams, "redirectStep")) {
        next.redirectStep = stringifyInteger(newParams.redirectStep);
      }
      if (Object.prototype.hasOwnProperty.call(newParams, "projectId")) {
        next._projectId = stringifyInteger(newParams.projectId);
      }
      if (Object.prototype.hasOwnProperty.call(newParams, "jobId")) {
        next._jobId = stringifyInteger(newParams.jobId);
      }
      if (Object.prototype.hasOwnProperty.call(newParams, "unitId")) {
        next._unitId = stringifyInteger(newParams.unitId);
      }
      if (Object.prototype.hasOwnProperty.call(newParams, "builderTaskId")) {
        next._builderTaskId = stringifyInteger(newParams.builderTaskId);
      }
      if (Object.prototype.hasOwnProperty.call(newParams, "userId")) {
        next._userId = stringifyInteger(newParams.userId);
      }
      if (Object.prototype.hasOwnProperty.call(newParams, "modelId")) {
        next._modelId = stringifyInteger(newParams.modelId);
      }
      if (Object.prototype.hasOwnProperty.call(newParams, "admin")) {
        next.admin = newParams.admin === undefined ? undefined : newParams.admin ? "true" : "false";
      }
      if (Object.prototype.hasOwnProperty.call(newParams, "action")) {
        next.action = newParams.action;
      }
      if (Object.prototype.hasOwnProperty.call(newParams, "jobType")) {
        next.jobType = newParams.jobType;
      }
      router.setParams(next);
    },
    [clearParams, router],
  );

  return {
    ...state,
    opened: !!state.step,
    setParams,
  };
}
