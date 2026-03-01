import { _qc, _trpc } from "@/components/static-trpc";
import { Toast } from "@/components/ui/toast";
import { useZodForm } from "@/components/use-zod-form";
import { useAuthContext } from "@/hooks/use-auth";
import {
  JobFormV2Action,
  useJobFormV2Params,
} from "@/hooks/use-job-form-v2-params";
import { getJobType, isAdminUser } from "@/lib/job";
import { getSessionProfile } from "@/lib/session-store";
import { useTRPC } from "@/trpc/client";
import { createJobSchema } from "@community/create-job-schema";
import { consoleLog, sum } from "@gnd/utils";
import { skipToken, useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useWatch } from "react-hook-form";

export interface JobFormV2Props {
  admin?: boolean;
  action?: JobFormV2Action;
}

const TABS = ["user", "project", "task", "unit", "form"] as const;
export type JobFormV2Tab = (typeof TABS)[number] | "completed";
type EmployeeRole =
  | "Production"
  | "Admin"
  | "1099 Contractor"
  | "Super Admin"
  | "Punchout";

type JobFormV2ContextType = ReturnType<typeof useCreateJobFormV2Context>;

const JobFormV2Context = createContext<JobFormV2ContextType>(
  undefined as never,
);
export const JobFormV2Provider = JobFormV2Context.Provider;

const getWorkerRoles = (jobType?: string): EmployeeRole[] => {
  const normalized = (jobType || "installation").toLowerCase();
  const roleMap: Record<string, EmployeeRole> = {
    installation: "1099 Contractor",
    punchout: "Punchout",
    maintenance: "1099 Contractor",
  };
  const role = roleMap[normalized];

  return role ? [role] : ["1099 Contractor", "Punchout"];
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export function useCreateJobFormV2Context(props: JobFormV2Props) {
  const router = useRouter();
  const auth = useAuthContext();
  const trpc = useTRPC();
  const params = useJobFormV2Params();

  const admin = isAdminUser();
  const action = props.action ?? params.action ?? "create";
  const jobType = params.jobType;
  const profile = getSessionProfile();
  const allowedRoles: EmployeeRole[] = [
    "Production",
    "Admin",
    "1099 Contractor",
    "Super Admin",
    "Punchout",
  ];
  const profileRole = profile?.role?.name;
  const safeProfileRole: EmployeeRole =
    allowedRoles.find((role) => role === profileRole) || "1099 Contractor";

  const tabs = useMemo(
    () => (admin ? [...TABS] : TABS.filter((tab) => tab !== "user")),
    [admin],
  );
  const resolvedUserId = admin
    ? params.userId
    : (params.userId ?? auth?.profile?.user?.id);

  const initialStep = clamp(params.step || 1, 1, tabs.length);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!params.step) {
      params.setParams({ step: 1, admin, action });
    }
  }, [action, admin, params]);

  const form = useZodForm(createJobSchema, {
    defaultValues: {
      coWorker: {
        id: undefined,
        name: undefined,
      },
      projectId: null,
      title: "",
      description: "",
      homeId: null,
      subtitle: null,
      additionalCost: undefined as any,
      additionalReason: "",
      status: admin ? "Assigned" : "Started",
    },
  });

  const shouldLoadDefaults =
    !!params.unitId &&
    params.taskId !== null &&
    params.taskId !== undefined &&
    !!resolvedUserId &&
    !!params.modelId;
  // consoleLog("PARAMS", params,shouldLoadDefaults);

  const {
    data: defaultValues,
    isPending: isDefaultValuesPending,
    error,
  } = useQuery(
    trpc.community.getJobForm.queryOptions(
      shouldLoadDefaults
        ? {
            unitId: params.unitId!,
            taskId: params.taskId && params.taskId > 0 ? params.taskId : null,
            jobId: params.jobId,
            userId: resolvedUserId!,
            modelId: params.modelId!,
          }
        : skipToken,
      {
        enabled: shouldLoadDefaults,
      },
    ),
  );
  consoleLog("...", {
    defaultValues,
    error,
  });

  useEffect(() => {
    if (defaultValues) {
      form.reset({
        ...(defaultValues as any),
        unit: {
          id: params.unitId,
        },
        user: {
          id: params.userId,
        },
      });
    }
  }, [defaultValues, form, params.unitId, resolvedUserId]);

  const workerRoles = admin ? getWorkerRoles(jobType) : [safeProfileRole];
  const { data: users, isPending: isUsersPending } = useQuery(
    _trpc.hrm.getEmployees.queryOptions({
      roles: workerRoles,
      size: 100,
    }),
  );

  const { data: projectList, isPending: isProjectsPending } = useQuery(
    _trpc.community.projectsList.queryOptions(),
  );
  const { data: costData } = useQuery(
    _trpc.jobs.getInstallCosts.queryOptions({}),
  );
  const { data: unitOptions, isPending: isUnitsPending } = useQuery(
    _trpc.community.getProjectUnitsWithJobStats.queryOptions(
      {
        projectId: params.projectId!,
      },
      {
        enabled: !!params.projectId,
      },
    ),
  );
  const { data: taskOptions, isPending: isTasksPending } = useQuery(
    _trpc.community.getBuilderTasksForProject.queryOptions(
      {
        projectId: params.projectId!,
        homeId: params.unitId || -1,
      },
      {
        enabled: !!params.projectId,
      },
    ),
  );

  const formData = useWatch({ control: form.control }) as any;
  const total = useMemo(() => {
    const tasks = Object.values(formData?.tasks || {}) as {
      qty?: number;
      cost?: number;
    }[];

    const taskTotal = sum(
      tasks.map((task) => (+task?.qty! || 0) * (+task?.cost! || 0)),
    );
    const addon = +formData?.addon || 0;
    const extra = +formData?.additionalCost || 0;
    return sum([taskTotal, addon, extra]);
  }, [formData]);

  const [errors, setErrors] = useState<any>(null);
  const {
    mutate: saveJob,
    isPending: isSaving,
    data: savedData,
  } = useMutation(
    _trpc.jobs.createJob.mutationOptions({
      onSuccess() {
        _qc.invalidateQueries({
          queryKey: _trpc.jobs.getJobs.queryKey(),
        });
        setCompleted(true);
      },
      meta: {
        toastTitle: {
          error: "Unable to complete",
          loading: "Processing...",
          success: "Done!",
        },
      },
    }),
  );

  const setStep = useCallback(
    (nextStep: number) => {
      setCompleted(false);
      params.setParams({
        step: clamp(nextStep, 1, tabs.length),
        admin,
        action,
      });
    },
    [action, admin, params, tabs.length],
  );

  const currentTab: JobFormV2Tab = completed
    ? "completed"
    : tabs[initialStep - 1]!;

  const nextStep = useCallback(() => {
    if (completed) return;
    setStep(initialStep + 1);
  }, [completed, initialStep, setStep]);

  const prevStep = useCallback(() => {
    if (completed) {
      setCompleted(false);
      return;
    }

    if (initialStep <= 1) {
      params.setParams(null);
      const canGoBack =
        typeof (router as any).canGoBack === "function"
          ? (router as any).canGoBack()
          : true;
      if (canGoBack) {
        router.back();
      } else {
        router.replace(
          (isAdminUser() ? "/(job-admin)" : "/(installers)") as any,
        );
      }
      return;
    }

    setStep(initialStep - 1);
  }, [completed, initialStep, params, router, setStep]);

  const selectUser = useCallback(
    (userId: number) => {
      params.setParams({
        userId,
        step: clamp(initialStep + 1, 1, tabs.length),
      });
    },
    [initialStep, params, tabs.length],
  );

  const selectProject = useCallback(
    (project: { id: number; title?: string; addon?: number }) => {
      form.setValue("projectId", project.id);
      form.setValue("title", project.title || "");
      form.setValue("homeId", null);
      form.setValue("subtitle", null as any);
      form.setValue("addon", project?.addon || 0);
      form.setValue("tasks", {} as any);

      params.setParams({
        projectId: project.id,
        unitId: null,
        modelId: null,
        taskId: null,
        step: clamp(initialStep + 1, 1, tabs.length),
      });
    },
    [form, initialStep, params, tabs.length],
  );

  const selectTask = useCallback(
    (taskId: number) => {
      params.setParams({
        taskId,
        step: clamp(initialStep + 1, 1, tabs.length),
      });
    },
    [initialStep, params, tabs.length],
  );

  const selectUnit = useCallback(
    (unit: {
      id: number;
      modelId?: number;
      modelName?: string;
      lot?: string | number;
      block?: string | number;
      costing?: Record<string, number | string>;
    }) => {
      const homeId = unit.id === -1 ? null : unit.id;
      const subtitle = [unit.modelName, `lot:${unit.lot}`, `blk:${unit.block}`]
        .filter(Boolean)
        .join(" ")
        .trim();

      form.setValue("homeId", homeId as any);
      form.setValue("subtitle", subtitle || null);

      const nextTasks = Object.fromEntries(
        Object.entries(unit.costing || {})
          .filter(([uid, value]) => !!uid && !!value)
          .map(([uid, value]) => [
            uid,
            {
              maxQty: +value,
              qty: null,
              cost: costData?.data?.list?.find((item) => item.uid === uid)
                ?.cost,
            },
          ]),
      );

      form.setValue("tasks", nextTasks as any);

      params.setParams({
        unitId: homeId,
        modelId: unit.modelId || null,
        step: clamp(initialStep + 1, 1, tabs.length),
      });
    },
    [costData?.data?.list, form, initialStep, params, tabs.length],
  );

  const handleSubmit = useCallback(() => {
    form.handleSubmit(
      (values) => {
        const payload: any = {
          ...values,
        };

        if (!admin) {
          payload.worker = {
            id: auth?.profile?.user?.id,
          };
          payload.type = getJobType(profile?.role?.name);
        }

        if (payload.isCustom) payload.status = "Submitted";
        if (payload.id && payload.status === "Assigned")
          payload.status = "Submitted";

        saveJob(payload);
      },
      (formErrors) => {
        setErrors(formErrors);
        Toast.show("Error. Invalid form data.", {
          type: "error",
        });
      },
    )();
  }, [admin, auth?.profile?.user?.id, form, profile?.role?.name, saveJob]);

  const reset = useCallback(() => {
    setCompleted(false);
    form.reset({});
    params.setParams({
      step: 1,
      redirectStep: null,
      projectId: null,
      jobId: null,
      unitId: null,
      taskId: null,
      userId: null,
      modelId: null,
      admin,
      action,
    });
  }, [action, admin, form, params]);

  return {
    admin,
    action,
    params,
    form,
    formData,
    tabs,
    step: initialStep,
    currentTab,
    completed,
    setCompleted,
    setStep,
    nextStep,
    prevStep,
    total,
    defaultValues,
    isDefaultValuesPending,
    projectList: projectList || [],
    users: users?.data || [],
    isUsersPending,
    taskOptions: taskOptions || [],
    unitOptions: unitOptions || [],
    isProjectsPending,
    isUnitsPending,
    isTasksPending,
    costData: costData?.data,
    selectUser,
    selectProject,
    selectTask,
    selectUnit,
    handleSubmit,
    saveJob,
    isSaving,
    savedData,
    errors,
    reset,
  };
}

export function useJobFormV2Context() {
  const context = useContext(JobFormV2Context);
  if (!context) {
    throw new Error(
      "useJobFormV2Context must be used within JobFormV2Provider",
    );
  }

  return context;
}
