import { View } from "react-native";
import { Input } from "@/components/ui/input-2";
import { Button } from "@/components/ui/button";
import { LegendList } from "@legendapp/list";
import { useJobFormContext } from "@/hooks/use-job-form";
import { useCallback, useMemo } from "react";
import { Text } from "@/components/ui/text";
// import { consoleLog } from "@gnd/utils";
// import { Controller } from "react-hook-form";
import { cn } from "@/lib/utils";
import { useJobFormStore } from "@/stores/use-job-form-store";
import { Controller } from "react-hook-form";
import { consoleLog } from "@gnd/utils";
import { getSessionProfile } from "@/lib/session-store";
import { useToast } from "@/context/toast-context";
import { toastStyles } from "@root/styles/toast";
import { Icon } from "@/components/ui/icon";
export function Step3Tasks() {
  const ctx = useJobFormContext();

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
    return;
    const values = store.form;
    const profile = getSessionProfile();
    const role = profile?.role?.name;
    values.type = role == "1099 Contractor" ? "installation" : "punchout";
    form.reset(values);
    setTimeout(() => {
      form.handleSubmit(
        (e) => {
          consoleLog("SUBMITTING>>", e);
          ctx.saveJob(e);
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
  const store = useJobFormStore();
  const formTask = store.form.tasks; //ctx.form.watch("tasks");
  const form = ctx.form;
  const renderItem = ({ item }) => {
    // const taskQty = formTask?.[item.uid]?.qty ?? 0;
    const qtyName = `tasks.${item.uid}.qty` as any;
    // const qty = form.watch(qtyName);
    return (
      <View className="p-4 border-b border-gray-200 dark:border-gray-700 flex-row justify-between items-center">
        <View>
          <Text className="text-lg text-gray-800 dark:text-gray-200">
            {item.title}
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            Rate: ${item.cost}/unit
          </Text>
        </View>
        {/* <Input className="w-20 h-10 text-center" /> */}
        <View className="w-20">
          <Controller
            control={form.control}
            name={qtyName}
            render={({
              field: { onChange, onBlur, value },
              fieldState: { error },
            }) => (
              <>
                <Input
                  placeholder="Qty"
                  // onBlur={onBlur}
                  onChangeText={(e) => {
                    console.log(e);
                    // onChange(+e);
                    store.update(`form.${qtyName}` as any, +e);
                  }}
                  value={store.form.tasks?.[item.uid]?.qty}
                  autoCapitalize="none"
                  keyboardType="numeric"
                  // textContentType="emailAddress"
                  className={cn("font-semibold", error && "border-red-500")}
                />
              </>
            )}
          />
          {/* <Input
            keyboardType="numeric"
            value={qty}
            onChangeText={(e) => {
              form.setValue(qtyPath, +e);
            }}
            placeholder="Qty"
            placeholderTextColor={
              colorScheme === "dark" ? "#9CA3AF" : "#6B7280"
            }
          /> */}
        </View>
      </View>
    );
  };
  const taskList = useMemo(() => {
    const d =
      ctx?.costData?.list?.filter((c) => !!formTask?.[c?.uid]?.maxQty) || [];
    return d;
  }, [ctx?.costData, formTask]);
  if (!taskList?.length)
    return (
      <View className="flex flex-row justify-center">
        <Text className="text-muted-foreground">No Task</Text>
      </View>
    );
  return (
    <LegendList
      data={taskList}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      ListFooterComponent={
        <View className=" py-4">
          <Button
            size={"lg"}
            onPress={handleSubmit}
            // onPress={form.handleSubmit(handleSubmit, (errors) => {
            //   console.log(errors);
            //   if (!errors.tasks) {
            //     handleSubmit();
            //   }
            // })}
          >
            <Text>Submit Job</Text>
          </Button>
        </View>
      }
    />
  );
}
