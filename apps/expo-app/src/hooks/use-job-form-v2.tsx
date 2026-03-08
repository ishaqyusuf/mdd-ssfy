import { _qc, _trpc } from "@/components/static-trpc";
import { Toast } from "@/components/ui/toast";
import { useZodForm } from "@/components/use-zod-form";
import { useAuthContext } from "@/hooks/use-auth";
import { useNotificationTrigger } from "@/hooks/use-notification-trigger";
import {
  JobFormV2Action,
  useJobFormV2Params,
} from "@/hooks/use-job-form-v2-params";
import { isAdminUser } from "@/lib/job";
import { getSessionProfile } from "@/lib/session-store";
import { useTRPC } from "@/trpc/client";
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
import { JobFormSchema, jobFormSchema } from "@community/schema";

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
  const notification = useNotificationTrigger();

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
  const [isInstallCostStepActive, setIsInstallCostStepActive] = useState(false);
  const [installCostBuilderTaskId, setInstallCostBuilderTaskId] = useState<
    number | null
  >(null);

  useEffect(() => {
    if (!params.step) {
      params.setParams({ step: 1, admin, action });
    }
  }, [action, admin, params]);

  const form = useZodForm(jobFormSchema, {
    defaultValues: {
      // coWorker: {
      //   id: undefined,
      //   name: undefined,
      // },
      unit: {
        id: params.unitId!,
      },
      user: {
        id: params.userId,
      },
      // projectId: null,
      // title: "",
      // description: "",
      // homeId: null,
      // subtitle: null,
      // additionalCost: undefined as any,
      // additionalReason: "",
      // status: admin ? "Assigned" : "Started",
      // adminMode: admin,
    },
  });

  const shouldLoadDefaults =
    !!params.unitId &&
    params.builderTaskId !== null &&
    params.builderTaskId !== undefined &&
    !!resolvedUserId &&
    !!params.modelId;
  // consoleLog("PARAMS", params,shouldLoadDefaults);

  const { data: defaultValues, isPending: isDefaultValuesPending } = useQuery(
    trpc.community.getJobForm.queryOptions(
      shouldLoadDefaults
        ? {
            unitId: params.unitId!,
            builderTaskId:
              params.builderTaskId && params.builderTaskId > 0
                ? params.builderTaskId
                : null,
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

  useEffect(() => {
    if (defaultValues) {
      const normalizedTaskRecord = Object.fromEntries(
        (((defaultValues as any)?.job?.tasks || []) as any[]).map(
          (task, index) => {
            const key = String(task?.modelTaskId || task?.id || index);
            return [
              key,
              {
                qty: task?.qty ?? null,
                maxQty: task?.maxQty ?? null,
                cost: task?.rate ?? 0,
                title: task?.installCostModel?.title || key,
                modelTaskId: task?.modelTaskId ?? null,
                taskId: task?.id ?? null,
              },
            ];
          },
        ),
      );

      form.reset({
        ...(defaultValues as any),
        unit: {
          id: params.unitId,
        },
        user: {
          id: resolvedUserId,
        },
        isCustom: !!(defaultValues as any)?.job?.isCustom,
        tasks:
          Object.keys(normalizedTaskRecord).length > 0
            ? (normalizedTaskRecord as any)
            : ((defaultValues as any)?.tasks as any),
      });
    }
  }, [defaultValues, form, params.unitId, resolvedUserId, params.userId]);

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
  const [savedData, setSavedData] = useState<{ id?: number } | null>(null);
  const {
    mutate: saveJobForm,
    isPending: isSaving,
    error: saveJobError,
  } = useMutation(
    _trpc.community.saveJobForm.mutationOptions({
      onSuccess(data, args) {
        _qc.invalidateQueries({
          queryKey: _trpc.jobs.getJobs.queryKey(),
        });
        _qc.invalidateQueries({
          queryKey: _trpc.community.getJobForm.queryKey(),
        });
        // setSavedData(data as any);
        if (args?.requestTaskConfig) {
          Toast.show(
            "Job saved and configuration request submitted. You will be notified via email and app. You can finish job form and submit once notified.",
            {
              type: "success",
            },
          );
          return;
        }
        setCompleted(true);
      },
      meta: {
        toastTitle: {
          error: "Failed to save job",
          loading: "Saving job...",
          success: "Job saved",
          show: true,
        },
      },
    }),
  );
  consoleLog("ERROR", {
    saveJobError,
    isSaving,
  });
  const hasMissingTaskConfiguration = useMemo(() => {
    const builderTaskId = (defaultValues as any)?.builderTaskId;
    const isCustom = !!(defaultValues as any)?.job?.isCustom;
    const tasks = ((defaultValues as any)?.job?.tasks || []) as any[];
    if (!builderTaskId || isCustom) return false;
    if (!tasks.length) return true;
    return tasks.every((task) => !task?.maxQty || Number(task.maxQty) <= 0);
  }, [defaultValues]);

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
    if (isInstallCostStepActive) {
      setIsInstallCostStepActive(false);
      return;
    }

    if (completed) {
      setCompleted(false);
      return;
    }

    if (initialStep <= 1) {
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
  }, [
    completed,
    initialStep,
    isInstallCostStepActive,
    params,
    router,
    setStep,
  ]);

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
      // form.setValue("projectId", project.id);
      // form.setValue("title", project.title || "");
      // form.setValue("homeId", null);
      // form.setValue("subtitle", null as any);
      // form.setValue("addon", project?.addon || 0);
      // form.setValue("tasks", {} as any);

      params.setParams({
        projectId: project.id,
        unitId: null,
        modelId: null,
        builderTaskId: null,
        step: clamp(initialStep + 1, 1, tabs.length),
      });
    },
    [initialStep, params, tabs.length],
  );

  const selectTask = useCallback(
    (builderTaskId: number) => {
      params.setParams({
        builderTaskId,
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
      // const subtitle = [unit.modelName, `lot:${unit.lot}`, `blk:${unit.block}`]
      //   .filter(Boolean)
      //   .join(" ")
      //   .trim();

      // form.setValue("homeId", homeId as any);
      // form.setValue("subtitle", subtitle || null);

      // const nextTasks = Object.fromEntries(
      //   Object.entries(unit.costing || {})
      //     .filter(([uid, value]) => !!uid && !!value)
      //     .map(([uid, value]) => [
      //       uid,
      //       {
      //         maxQty: +value,
      //         qty: null,
      //         cost: costData?.data?.list?.find((item) => item.uid === uid)
      //           ?.cost,
      //       },
      //     ]),
      // );

      // form.setValue("tasks", nextTasks as any);

      params.setParams({
        unitId: homeId,
        modelId: unit.modelId || null,
        step: clamp(initialStep + 1, 1, tabs.length),
      });
    },
    [costData?.data?.list, initialStep, params, tabs.length],
  );

  const buildSaveJobFormPayload = useCallback(
    (options?: { requestTaskConfig?: boolean }) => {
      if (!defaultValues) return null;
      if (!params.unitId || !resolvedUserId) return null;

      const requestTaskConfig = !!options?.requestTaskConfig;
      const defaultJob = (defaultValues as any)?.job || {};
      const defaultMeta = defaultJob.meta || {};
      const values = form.getValues() as any;
      const formTasks = values?.tasks || {};
      const selectedProject = (projectList || []).find(
        (project: any) => project?.id === params.projectId,
      );
      const selectedUnit = (unitOptions || []).find(
        (unit: any) => unit?.id === params.unitId,
      );
      const selectedTask = (taskOptions || []).find(
        (task: any) => task?.id === params.builderTaskId,
      );
      const fallbackTitle =
        values?.title ||
        defaultJob.title ||
        selectedProject?.title ||
        "Job Request";
      const fallbackSubtitle =
        values?.subtitle ||
        defaultJob.subtitle ||
        [selectedUnit?.modelName, selectedTask?.taskName]
          .filter(Boolean)
          .join(" - ") ||
        null;
      const hasModelConfigured =
        params.modelId !== null && params.modelId !== undefined;
      const isCustom = hasModelConfigured ? !!values?.isCustom : true;

      const tasks = hasModelConfigured
        ? Object.entries(formTasks as Record<string, any>)
            .map(([key, task]) => {
              const numericKey = Number(key);
              const modelTaskId =
                task?.modelTaskId ??
                (Number.isFinite(numericKey) ? numericKey : null);
              if (!modelTaskId) return null;
              return {
                id: task?.taskId ?? undefined,
                modelTaskId,
                rate: Number(task?.cost || 0),
                qty: task?.qty ?? null,
                maxQty: task?.maxQty ?? null,
              };
            })
            .filter(Boolean)
        : [];

      let status =
        values?.status || defaultJob.status || (admin ? "Assigned" : "Started");
      if (isCustom) status = "Submitted";
      if (defaultJob.id && status === "Assigned") status = "Submitted";
      if (!admin && status === "Started") status = "Submitted";
      if (requestTaskConfig) status = "In Progress";

      return {
        adminMode: admin,
        unit: {
          id: params.unitId,
        },
        user: {
          id: resolvedUserId,
        },
        builderTaskId: defaultValues.builderTaskId!,
        // modelInstallTaskIds: defaultValues.communityModelInstallTaskIds!,
        requestTaskConfig,
        modelId: params.modelId!,
        job: {
          id: defaultJob.id || undefined,
          amount: total || 0,
          description: values?.description || defaultJob.description || "",
          isCustom,
          adminNote: defaultJob.adminNote ?? null,
          title: fallbackTitle,
          subtitle: fallbackSubtitle,
          status,
          tasks: tasks as any[],
          meta: {
            addon:
              values?.addon ?? defaultMeta.addon ?? selectedProject?.addon ?? 0,
            addonPercent: defaultMeta.addonPercent ?? 0,
            additionalCostReason:
              values?.additionalReason ??
              defaultMeta.additionalCostReason ??
              "",
            additional_cost:
              values?.additionalCost ?? defaultMeta.additional_cost ?? null,
          },
        },
      } satisfies JobFormSchema;
    },
    [
      admin,
      defaultValues,
      form,
      params.modelId,
      params.projectId,
      params.builderTaskId,
      params.unitId,
      projectList,
      resolvedUserId,
      taskOptions,
      total,
      unitOptions,
    ],
  );

  const handleSubmit = useCallback(() => {
    form.handleSubmit(
      () => {
        const payload = buildSaveJobFormPayload();
        if (!payload) {
          Toast.show("Unable to save job right now.", {
            type: "error",
          });
          return;
        }
        saveJobForm(payload);
      },
      (formErrors) => {
        setErrors(formErrors);
        Toast.show("Error. Invalid form data.", {
          type: "error",
        });
      },
    )();
  }, [buildSaveJobFormPayload, form, saveJobForm]);

  const requestTaskConfiguration = useCallback(() => {
    setSavedData(null);
    if (!defaultValues?.builderTaskId) {
      Toast.show("Builder task is required before requesting configuration.", {
        type: "error",
      });
      return;
    }
    if (!params.modelId) {
      Toast.show("Model is required before requesting configuration.", {
        type: "error",
      });
      return;
    }
    const payload = buildSaveJobFormPayload({
      requestTaskConfig: true,
    });
    if (!payload) {
      Toast.show("Unable to request configuration right now.", {
        type: "error",
      });
      return;
    }
    // console.log("Requesting task configuration with payload:", payload);
    // return;
    saveJobForm(payload);
  }, [
    buildSaveJobFormPayload,
    defaultValues?.builderTaskId,
    params.modelId,
    saveJobForm,
  ]);

  const openInstallCostStep = useCallback((builderTaskId?: number | null) => {
    setInstallCostBuilderTaskId(builderTaskId || null);
    setIsInstallCostStepActive(true);
  }, []);

  const closeInstallCostStep = useCallback(() => {
    setIsInstallCostStepActive(false);
  }, []);

  const clearRequestTaskConfigurationState = useCallback(() => {
    setSavedData(null);
  }, []);

  const reset = useCallback(() => {
    setCompleted(false);
    setSavedData(null);
    setIsInstallCostStepActive(false);
    form.reset({});
    params.setParams({
      step: 1,
      redirectStep: null,
      projectId: null,
      jobId: null,
      unitId: null,
      builderTaskId: null,
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
    isInstallCostStepActive,
    installCostBuilderTaskId,
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
    isSaving,
    savedData,
    isRequestingTaskConfiguration: isSaving,
    requestTaskConfigurationData: savedData,
    errors,
    hasMissingTaskConfiguration,
    requestTaskConfiguration,
    clearRequestTaskConfigurationState,
    openInstallCostStep,
    closeInstallCostStep,
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
