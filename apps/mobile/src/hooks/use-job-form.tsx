import { _trpc } from "@/components/static-trpc";
import { useZodForm } from "@/components/use-zod-form";
import { createJobSchema } from "@api/db/queries/jobs";
import { useQuery } from "@tanstack/react-query";
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
    defaultValues: {},
  });
  const { data: projectList } = useQuery(
    _trpc.community.projectsList.queryOptions()
  );
  const { data: costData } = useQuery(
    _trpc.jobs.getInstallCosts.queryOptions({})
  );
  const [projectId] = form.watch(["projectId"]);
  const [tab, setTab] = useState<"project" | "unit" | "tasks">("project");
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
  const selectUnit = (unit) => {
    form.setValue("homeId", unit.id);
    setTab("tasks");
    const tasks = Object.fromEntries(
      Object.entries(unit.costing || {})
        ?.filter(([k, v]) => !!v)
        .map(([k, v]) => [
          k,
          {
            maxQty: +v,
            qty: null,
            rate: costData?.list?.find((a) => a.uid === k)?.cost,
          },
        ])
    );
    form.setValue("tasks", tasks);
    setTab("tasks");
  };
  const selectProject = (project) => {
    form.setValue("projectId", project.id);
    form.setValue("homeId", null);
    form.setValue("tasks", {});
    setTab("unit");
  };
  useEffect(() => {
    console.log({ jobsListData });
  }, [jobsListData]);
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
  };
};
export const useJobFormContext = () => {
  const context = useContext(JobFormContext);
  if (context === undefined) {
    throw new Error("useJobFormContext must be used within a JobFormProvider");
  }
  return context;
};
