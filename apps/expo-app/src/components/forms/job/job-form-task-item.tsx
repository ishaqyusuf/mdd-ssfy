// apps/expo-app/src/components/forms/job/job-form-task-item.tsx
import { View, Text, TextInput, Pressable } from "react-native";
import { Icon } from "@/components/ui/icon";
import { useJobFormContext } from "@/hooks/use-job-form-2";
import { useToast } from "@/context/toast-context";
import { Controller } from "react-hook-form";
import { useMemo } from "react";
import { LegendList } from "@legendapp/list";
import { useColors } from "@/hooks/use-color";
import { sum } from "@gnd/utils";
import { cn } from "@/lib/utils";

function JobFormTaskItem(task: {
  fieldName: string;
  title: string;
  cost: any;
  uid: string;
}) {
  const { form, errors } = useJobFormContext();
  const colors = useColors();
  return (
    <View className="flex-row items-center justify-between p-4 rounded-lg bg-card my-2 border-b border-border">
      <View className="flex-col flex-1 pr-4">
        <Text className="text-base font-semibold text-foreground">
          {task.title}
        </Text>
        <Text className="text-sm text-muted-foreground font-medium">
          ${task.cost.toFixed(2)}{" "}
          <Text className="text-xs opacity-70">/unit</Text>
        </Text>
      </View>

      <Controller
        control={form.control}
        name={task?.fieldName}
        render={({
          field: { onChange, onBlur, value },
          fieldState: { error },
        }) => (
          <View
            className={cn(
              "flex-row items-center bg-muted rounded-full p-1 border border-border",
              errors?.tasks?.[task?.uid] && "border-destructive"
            )}
          >
            <Pressable
              disabled={!value}
              onPress={(e) => {
                onChange(sum([value, -1]));
              }}
              className="size-8 flex items-center justify-center rounded-full bg-card dark:bg-border"
            >
              <Icon
                name="Minus"
                size={14}
                className="text-foreground font-bold"
              />
            </Pressable>
            <View className="text-center flex-row items-center">
              <TextInput
                // className="w-10 bg-transparent text-center text-foreground font-bold text-base"
                // className="w-10 text-foreground bg-transparent font-bold text-base"
                style={{
                  alignContent: "center",
                  fontSize: 16,
                  width: 40,
                  fontWeight: 700,
                  color: colors.foreground,
                  backgroundColor: "transparent",
                  textAlign: "center",
                  justifyContent: "center",
                  alignItems: "center",
                }}
                keyboardType="number-pad"
                defaultValue={String(value || "")}
                value={String(value || "")}
                onChangeText={onChange}
                placeholder="0"
                placeholderClassName=""
              />
            </View>
            <Pressable
              // disabled={!value}
              onPress={(e) => {
                onChange(sum([value, 1]));
              }}
              className="size-8 flex items-center justify-center rounded-full bg-primary"
            >
              <Icon
                name="Plus"
                size={14}
                className="text-primary-foreground font-bold"
              />
            </Pressable>
          </View>
        )}
      />

      {/* <QuantityStepper name={task.fieldName} control={form.control} /> */}
    </View>
  );
}

export function JobFormTaskItems() {
  const ctx = useJobFormContext();

  // const { show } = useToast();

  const formTask = ctx.formData.tasks; //ctx.form.watch("tasks");
  // const form = ctx.form;
  const renderItem = ({ item }) => {
    // const taskQty = formTask?.[item.uid]?.qty ?? 0;
    const fieldName = `tasks.${item.uid}.qty` as any;
    // const qty = form.watch(qtyName);

    return (
      <>
        <JobFormTaskItem
          {...{ fieldName, uid: item.uid, title: item.title, cost: item.cost }}
        />
      </>
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
    <>
      <LegendList
        data={taskList}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
      />
    </>
  );
}
