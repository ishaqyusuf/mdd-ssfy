import { _trpc } from "@/components/static-trpc";
import { useZodForm } from "@/components/use-zod-form";
import { getSessionProfile } from "@/lib/session-store";
import { useJobFormStore } from "@/stores/use-job-form-store";
import { createJobSchema } from "@community/create-job-schema";
import { consoleLog } from "@gnd/utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState } from "react";

type JobFormContextType = ReturnType<typeof useCreateJobFormContext>;
export const JobFormContext = createContext<JobFormContextType>(
  undefined as any
);
export const JobFormProvider = JobFormContext.Provider;
export const useCreateJobFormContext = (ref) => {
  //   const onDismiss = () => {
  //     console.log("Job Form Dismissed");
  //   };
  const form = useZodForm(createJobSchema, {
    defaultValues: {
      // coWorkerId: undefined,
      coWorker: {
        id: undefined,
        name: undefined,
      },
      projectId: null,
      title: "",
      description: null,
      homeId: null,
      subtitle: null,
    },
  });

  const { data: projectList } = useQuery(
    _trpc.community.projectsList.queryOptions()
  );
  const { data: costData } = useQuery(
    _trpc.jobs.getInstallCosts.queryOptions({})
  );
  const profile = getSessionProfile();
  const { data: users } = useQuery(
    _trpc.hrm.getEmployees.queryOptions({
      roles: [profile?.role?.name],
    })
  );
  // const [projectId, homeId] = form.watch(["projectId", "homeId"]);
  const [tab, setTab] = useState<any>("0");
  // const [title, subtitle, showCharges] = form.watch([
  //   "title",
  //   "subtitle",
  //   "includeAdditionalCharges",
  // ]);
  const store = useJobFormStore();
  useEffect(() => {
    form.reset(store.form);
  }, [store.form]);
  // const formData = form.watch();
  const formData = store.form;
  // const formData = useMemo(() => __formData, [__formData]);
  // useEffect(() => {
  //   console.log(formData);
  // }, [formData]);
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
        jobType: "installation",
      },
      {
        enabled: !!projectId,
      }
    )
  );
  const { mutate: saveJob, isPending: isSaving } = useMutation(
    _trpc.jobs.createJob.mutationOptions({
      onSuccess(data, variables, onMutateResult, context) {
        consoleLog("SUCCESS", data);
      },
      onError(error, variables, onMutateResult, context) {
        consoleLog("ERROR", error);
      },
      meta: {
        toastTitle: {
          error: "Unable to complete",
          loading: "Processing...",
          success: "Done!.",
        },
      },
    })
  );
  //@ts-ignore
  const [, setOpened] = useState(false);
  const onChange = (e) => {
    const closed = e === -1;
    setOpened(!closed);
    if (closed) {
      form.reset({});
      // reset form
    }
    console.log("Job Form Changed: ", e);
  };
  // const [unit,setUnit] = useStat
  const selectUnit = (unit, onSelect) => {
    // form.setValue("homeId", unit.id);
    // form.setValue("subtitle", unit.name);
    store.update("form.homeId", unit.id);
    store.update("form.subtitle", unit.name);
    // setTab("tasks");
    const tasks = Object.fromEntries(
      Object.entries(unit.costing || {})
        ?.filter(([k, v]) => !!v)
        .map(([k, v]) => [
          k,
          {
            maxQty: +(v as any),
            qty: null,
            cost: costData?.data?.list?.find((a) => a.uid === k)?.cost,
          },
        ])
    );
    store.update("form.tasks", tasks);
    // form.reset(store.form)
    // form.setValue("tasks", tasks);
    onSelect();
    // setTab("tasks");
  };
  const selectProject = (project, onSelect) => {
    // console.log(projectId);
    const oldProjectId = store.form.projectId; //form.getValues("projectId");
    store.update("form.projectId", project.id);
    store.update("form.title", project.title);
    // form.setValue("projectId", project.id);
    // form.setValue("title", project.title);
    // console.log({ project });
    if (oldProjectId !== project.id) {
      // form.setValue("homeId", null);
      store.update("form.homeId", null);
      store.update("form.subtitle", null);
      store.update("form.tasks", {});
      // form.setValue("subtitle", null);
      // form.setValue("tasks", {});
    }
    onSelect(project);
    // setTab("unit");
  };

  return {
    ref,
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
    saveJob,
    projectId,
    homeId,
    title,
    subtitle,
    showCharges,
    users,
    formData,
  };
};
export const useJobFormContext = () => {
  const context = useContext(JobFormContext);
  if (context === undefined) {
    throw new Error("useJobFormContext must be used within a JobFormProvider");
  }
  return context;
};
