import { _trpc } from "@/components/static-trpc";
import { Icon } from "@/components/ui/icon";
import { useZodForm } from "@/components/use-zod-form";
import { useToast } from "@/context/toast-context";
import { getSessionProfile } from "@/lib/session-store";
import { createJobSchema } from "@api/db/queries/jobs";
import { consoleLog } from "@gnd/utils";
import { toastStyles } from "@root/styles/toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { createContext, useCallback, useContext, useState } from "react";
import { useWatch } from "react-hook-form";
import { BackHandler, Text, View } from "react-native";

type JobFormContextType = ReturnType<typeof useCreateJobFormContext>;
export const JobFormContext = createContext<JobFormContextType>(
  undefined as any
);

export type JobFormTabs =
  | "project"
  | "unit"
  | "main"
  | "coworker"
  | "completed";
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
  const [tabHistory, setTabHistory] = useState<JobFormTabs[]>(["project"]);
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // return true = block default behavior
        // return false = allow system back

        const count = tabHistory?.length;
        console.log(tabHistory);
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
        onBackPress
      );
      return () => sub.remove();
    }, [tabHistory])
  );
  const { data: projectList } = useQuery(
    _trpc.community.projectsList.queryOptions()
  );
  const { data: costData } = useQuery(
    _trpc.jobs.getInstallCosts.queryOptions({})
  );
  const profile = getSessionProfile();
  const { data: users } = useQuery(
    _trpc.hrm.getEmployees.queryOptions({
      roles: [profile?.role?.name!],
    })
  );
  // const [projectId, homeId] = form.watch(["projectId", "homeId"]);
  // const [title, subtitle, showCharges] = form.watch([
  //   "title",
  //   "subtitle",
  //   "includeAdditionalCharges",
  // ]);
  // const store = useJobFormStore();
  // useEffect(() => {
  //   form.reset(store.form);
  // }, [store.form]);
  // const formData = form.watch();
  const formData = useWatch({
    control: form.control,
  });
  // const formData = store.form;
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
    form.setValue("homeId", unit.id);
    form.setValue("subtitle", unit.name);
    // store.update("form.homeId", unit.id);
    // store.update("form.subtitle", unit.name);
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
    // store.update("form.tasks", tasks);
    // form.reset(store.form)
    form.setValue("tasks", tasks);
    onSelect();
    // setTab("tasks");
  };
  const selectProject = (project, onSelect) => {
    // console.log(projectId);
    const oldProjectId = form.getValues("projectId");
    // store.update("form.projectId", project.id);
    // store.update("form.title", project.title);
    form.setValue("projectId", project.id);
    form.setValue("title", project.title);
    // console.log({ project });
    if (oldProjectId !== project.id) {
      form.setValue("homeId", null);
      // store.update("form.homeId", null);
      // store.update("form.subtitle", null);
      // store.update("form.tasks", {});
      form.setValue("subtitle", null);
      form.setValue("tasks", {});
    }
    onSelect(project);
    // setTab("unit");
  };

  const navigateBack = () => {
    const count = tabHistory?.length;
    if (count === 1) {
      ///close
      // router.
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

  const { show } = useToast();
  const createToast = useCallback(
    (type: string, task?: any) => {
      const toastConfigs = {
        task_created: {
          icon: "plus.circle.fill",
          color: "#10B981",
          title: "Task Created",
          description: "New task added to your board",
        },
        task_completed: {
          icon: "checkmark.circle.fill",
          color: "#10B981",
          title: "Task Completed! 🎉",
          description: task ? `${task.title} marked as done` : "Task completed",
        },
        task_assigned: {
          icon: "person.badge.plus",
          color: "#3B82F6",
          title: "Task Assigned",
          description: task ? `Assigned to ${task.assignee}` : "Task assigned",
        },
        deadline_reminder: {
          icon: "clock.badge.exclamationmark",
          color: "#F59E0B",
          title: "Deadline Reminder",
          description: "3 tasks due tomorrow",
        },
        sync_success: {
          icon: "arrow.triangle.2.circlepath",
          color: "#10B981",
          title: "Sync Complete",
          description: "All changes saved to cloud",
        },
        team_notification: {
          icon: "bell.badge",
          color: "#8B5CF6",
          title: "Team Update",
          description: "Sarah completed 3 tasks",
        },
        priority_changed: {
          icon: "exclamationmark.triangle.fill",
          color: "#EF4444",
          title: "Priority Updated",
          description: task
            ? `Task marked as ${task.priority}`
            : "Priority changed",
        },
      };

      const config = toastConfigs[type as keyof typeof toastConfigs];
      if (!config) return;

      const toastContent = (
        <View style={toastStyles.toastContent}>
          <Icon name="Check" size={22} />
          {/* <SymbolView
               name={config.icon as SFSymbol}
               size={20}
               tintColor={config.color}
             /> */}
          <View style={toastStyles.toastTextContainer}>
            <Text style={toastStyles.toastTitle}>{config.title}</Text>
            <Text style={toastStyles.toastDescription}>
              {config.description}
            </Text>
          </View>
        </View>
      );

      const options: any = { position: "bottom", duration: 3000 };

      if (
        type === "task_completed"
        // && task
      ) {
        options.action = {
          label: "Undo",
          // onPress: () => handleTaskAction("undo", task),
        };
        options.duration = 4000;
      }

      show(toastContent, options);
    },
    [show]
  );
  const handleSubmit = () => {
    createToast("task_completed", {});
    setTab("completed");
    // return;
    const values = formData;
    const profile = getSessionProfile();
    const role = profile?.role?.name;
    values.type = role == "1099 Contractor" ? "installation" : "punchout";
    // form.reset(values);
    setTimeout(() => {
      form.handleSubmit(
        (e) => {
          consoleLog("SUBMITTING>>", e);
          saveJob(e);
        },
        (errs) => {
          console.log(errs);
          console.log(values);
        }
      )();
      // form.trigger().then((e) => {
      //   console.log({ e });
      // });
      // ctx.setTab("meta");
      // consoleLog("Form value", values);
      // Object.entries(values.tasks).map(([a, b]) => {
      //   if (b.qty) consoleLog(a, b);
      // });
      // ctx.saveJob(values);
    }, 250);
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
    setTabHistory,
  };
};
export const useJobFormContext = () => {
  const context = useContext(JobFormContext);
  if (context === undefined) {
    throw new Error("useJobFormContext must be used within a JobFormProvider");
  }
  return context;
};
