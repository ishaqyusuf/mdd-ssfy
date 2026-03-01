import { _qc, _trpc } from "@/components/static-trpc";
import { Toast } from "@/components/ui/toast";
import { useZodForm } from "@/components/use-zod-form";
import { getJobType } from "@/lib/job";
import { getSessionProfile } from "@/lib/session-store";
import { useTRPC } from "@/trpc/client";
import { createJobSchema } from "@community/create-job-schema";
import { consoleLog, sum } from "@gnd/utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useWatch } from "react-hook-form";
import { BackHandler } from "react-native";
import { useAuthContext } from "./use-auth";

type JobFormContextType = ReturnType<typeof useCreateJobFormContext>;
export const JobFormContext = createContext<JobFormContextType>(
  undefined as any,
);
export const JobFormContextProvider = JobFormContext.Provider as any;
export type JobFormTabs =
  | "project"
  | "unit"
  | "main"
  | "coworker"
  | "completed"
  | "assign-to";
export const JobFormProvider = JobFormContext.Provider;
export interface JobFormProps {
  admin?: boolean;
  controlId?: string;
  type?: string;
  action?: "submit" | "create" | "update" | "re-assign";
}
export const useCreateJobFormContext = (props: JobFormProps) => {
  const form = useZodForm(createJobSchema, {
    defaultValues: {
      // coWorkerId: undefined,
      controlId: props.controlId || undefined,
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
      status: props.admin ? "Assigned" : "Started",
    },
  });
  const rootTab = useCallback<() => JobFormTabs>(() => {
    switch (props.action) {
      case "re-assign":
        return "assign-to";
      case "submit":
        return "main";
    }
    return props.admin ? "assign-to" : "project";
  }, [props]);
  const [tabHistory, setTabHistory] = useState<JobFormTabs[]>([rootTab()]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // return true = block default behavior
        // return false = allow system back

        const count = tabHistory?.length;

        if (count === 1) {
          ///close
          // router.
          return false;
        }
        setTabHistory((c) => {
          const [, ...re] = c;
          return [...re];
        });
        return true;
      };

      const sub = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );
      return () => sub.remove();
    }, [tabHistory]),
  );
  const { data: projectList } = useQuery(
    _trpc.community.projectsList.queryOptions(),
  );
  const { data: costData } = useQuery(
    _trpc.jobs.getInstallCosts.queryOptions({}),
  );
  const profile = getSessionProfile();
  const type = (props.type || "installation")?.toLowerCase();
  // const type = props.type;
  const role = {
    installation: "1099 Contractor",
    punchout: "Punchout",
    maintenance: "Deco-Shutter Installer",
  }[type];

  const { data: users } = useQuery(
    _trpc.hrm.getEmployees.queryOptions({
      roles: props.admin
        ? [role] //["1099 Contractor", "Punchout"]
        : [profile?.role?.name!],
      size: 100,
    }),
  );

  const formData = useWatch({
    control: form.control,
  });

  const {
    projectId,
    homeId,
    subtitle,
    title,
    includeAdditionalCharges: showCharges,
  } = formData;
  const { data: jobsListData } = useQuery(
    _trpc.community.getUnitJobs.queryOptions(
      {
        projectId: projectId!,
        jobType: type,
      },
      {
        enabled: !!projectId,
      },
    ),
  );
  const { data: jobData } = useQuery(
    _trpc.jobs.getJobForm.queryOptions(
      {
        controlId: props.controlId!,
      },
      {
        enabled: !!props.controlId,
      },
    ),
  );
  useEffect(() => {
    if (jobData) form.reset(jobData);
  }, [jobData]);
  const getAddon = (formData) => {
    const { isCustom, homeId, projectId, addon: _addon } = formData || {};
    const addon = isCustom || !homeId || !projectId ? 0 : _addon || 0;
    return addon;
  };
  const total = useMemo(() => {
    const taskCost = sum(
      Object.entries(formData?.tasks! || {}).map(([k, v]) =>
        sum([+v?.qty! * +(v?.cost || 0)]),
      ),
    );
    if (formData?.isCustom) return formData.additionalCost;
    const addon = getAddon(formData);
    return sum([addon, taskCost, formData.additionalCost]);
  }, [formData]);

  const [errors, setErrors] = useState<any>(null);
  const {
    mutate: saveJob,
    data: savedData,
    isPending: isSaving,
  } = useMutation(
    _trpc.jobs.createJob.mutationOptions({
      onSuccess(data, variables, onMutateResult, context) {
        // consoleLog("SUCCESS", data);
        // createToast("task_completed", {});
        _qc.invalidateQueries({
          queryKey: _trpc.jobs.getJobs.queryKey(),
        });
        setTab("completed");
      },
      onError(error, variables, onMutateResult, context) {
        console.log({ error, variables });
      },
      meta: {
        toastTitle: {
          error: "Unable to complete",
          loading: "Processing...",
          success: "Done!.",
        },
      },
    }),
  );
  const auth = useAuthContext();
  //@ts-ignore
  const [, setOpened] = useState(false);
  const onChange = (e) => {
    const closed = e === -1;
    setOpened(!closed);
    if (closed) {
      form.reset({});
      // reset form
    }
    // console.log("Job Form Changed: ", e);
  };
  // const [unit,setUnit] = useStat
  const selectUnit = (unit, onSelect) => {
    if (unit.id === -1) unit.id = null;
    form.setValue("homeId", unit.id);
    form.setValue("subtitle", unit.name);

    const tasks = Object.fromEntries(
      Object.entries(unit.costing || {})
        ?.filter(([k, v]) => !!v && !!k)
        .map(([k, v]) => [
          k,
          {
            maxQty: +(v as any),
            qty: null,
            cost: costData?.data?.list?.find((a) => a.uid === k)?.cost,
          },
        ]),
    );
    // store.update("form.tasks", tasks);
    // form.reset(store.form)
    form.setValue("tasks", tasks);
    onSelect();
    // setTab("tasks");
  };
  const selectProject = (project, onSelect) => {
    if (project.id === -1) project.id = null;
    const oldProjectId = form.getValues("projectId");

    form.setValue("projectId", project.id);
    form.setValue("title", project.title);

    if (oldProjectId !== project.id) {
      form.setValue("homeId", null);
      form.setValue("addon", project.addon || 0);

      form.setValue("subtitle", null);
      form.setValue("tasks", {});
    }
    onSelect(project);
  };
  const router = useRouter();
  const navigateBack = () => {
    const count = tabHistory?.length;
    if (count === 1) {
      ///close
      router.back();
      return;
    }
    setTabHistory((c) => {
      const [, ...re] = c;
      return [...re];
    });
  };
  const setTab = (val: JobFormTabs) => {
    setTabHistory((c) => [val, ...c]);
  };
  const tab = tabHistory?.[0];

  const handleSubmit = () => {
    setTimeout(() => {
      form.handleSubmit(
        (e) => {
          const values = formData;
          if (!props.admin) {
            values.worker = {
              id: auth?.profile?.user?.id,
            };
          }
          // if (!values?.projectId || !values?.homeId || values.isCustom)
          //   values.addon = null;
          if (!props.admin) {
            const profile = getSessionProfile();
            const role = profile?.role?.name;
            values.type = getJobType(role);
          }
          if (values.isCustom) values.status = "Submitted";
          if (values.id && values.status === "Assigned") {
            values.status = "Submitted";
          }
          saveJob(values as any);
        },
        (errs) => {
          setErrors(errs);

          Toast.show("Error. Invalid form data.", {
            type: "error",
          });
        },
      )();
    }, 250);
  };
  const reset = () => {
    setTabHistory([rootTab()]);
    form.reset({});
  };
  const { data: jobSettings } = useQuery(
    useTRPC().settings.getJobSettings.queryOptions(),
  );
  // console.log({ jobSettings });
  return {
    ...props,
    state: {
      showTaskQty: props.admin || jobSettings?.meta?.showTaskQty,
      allowCustomJobs: props.admin || jobSettings?.meta?.allowCustomJobs,
    },
    form,
    costData: costData?.data,
    // onDismiss,
    onChange,
    projectList,
    jobsListData,
    tab,
    setTab,
    selectProject,
    selectUnit,
    handleSubmit,
    isSaving,
    saveJob,
    projectId,
    homeId,
    title,
    subtitle,
    showCharges,
    users,
    navigateBack,
    formData,
    tabHistory,
    // setTabHistory,
    reset,
    total,
    savedData,
    errors,
  };
};
export const useJobFormContext = () => {
  const context = useContext(JobFormContext);
  if (context === undefined) {
    throw new Error("useJobFormContext must be used within a JobFormProvider");
  }
  return context;
};
