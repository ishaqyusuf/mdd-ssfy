// apps/expo-app/src/components/forms/job/job-form-step.tsx
import { View, Text, ScrollView, Pressable } from "react-native";

import { Icon } from "@/components/ui/icon";
import { JobFormTaskItems } from "./job-form-task-item";
import { JobFormExtras } from "./job-form-extras";
import { JobFormFooter } from "./job-form-footer";
import { useJobFormContext } from "@/hooks/use-job-form-2";
import { KeyboardAvoidingView, Platform } from "react-native";
import { Textarea } from "@/components/ui/textarea";
import { Controller } from "react-hook-form";

export function JobFormStep() {
  const ctx = useJobFormContext();
  // const formTask = ctx?.formData?.tasks;
  // const taskList = useMemo(() => {
  //   const d =
  //     ctx?.costData?.list?.filter((c) => !!formTask?.[c?.uid]?.maxQty) || [];
  //   return d;
  // }, [ctx?.costData, formTask]);
  // if (!taskList?.length)
  //   return (
  //     <View className="flex flex-row justify-center">
  //       <Text className="text-muted-foreground">No Task</Text>
  //     </View>
  //   );
  return (
    <View className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={160 + 47}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 180 }}>
          <View className="flex-1 px-4 pt-2 gap-10">
            {/* Job Info Section */}
            <View className="space-y-4">
              <View className="flex-col gap-8">
                <View className="flex-col gap-2">
                  <Text className="text-sm font-semibold text-muted-foreground ml-2">
                    Job Title <Text className="text-primary">*</Text>
                  </Text>
                  <Pressable
                    onPress={(e) => {
                      ctx?.setTab("project");
                    }}
                    className="relative justify-center"
                  >
                    <View
                      className="flex w-full rounded-xl border border-borders border-muted-foreground bg-card h-14 px-5 flex-row items-center text-base text-foreground"
                      // placeholder="e.g. Smith Residence Renovation"
                      // defaultValue="Project Alpha (Default)"
                    >
                      <Text className="text-foreground">
                        {[ctx?.formData?.title, ctx?.formData?.subtitle]
                          ?.filter(Boolean)
                          ?.join(" - ")}
                      </Text>
                    </View>

                    <Icon
                      name="Pencil"
                      className="absolute right-4 text-muted-foreground"
                      size={20}
                    />
                  </Pressable>
                </View>
                <View className="flex-col gap-2">
                  <Text className="text-sm font-semibold text-muted-foreground ml-2">
                    Description
                    <Text className="text-xs font-normal opacity-70">
                      (Optional)
                    </Text>
                  </Text>
                  <Controller
                    control={ctx.form.control}
                    name="description"
                    render={({ field, fieldState }) => (
                      <Textarea
                        // defaultValue={ctx.form.getValues('additionalCost')}
                        value={field.value!}
                        onChangeText={field.onChange}
                        multiline
                        className="flex w-full rounded-lg border border-muted-foreground bg-card min-h-[120px] px-5 py-4 text-base text-foreground align-text-top"
                        placeholder="Enter specific job details, access codes, or warnings..."
                        placeholderClassName="text-foreground"
                      />
                    )}
                  />
                </View>
              </View>
            </View>

            {/* Unit Tasks List */}
            <View>
              <View className="flex-row items-center justify-between mb-4 px-2">
                <Text className="text-lg font-bold text-foreground">
                  Unit Tasks List
                </Text>
                {/* <Pressable>
                <Text className="text-primary text-sm font-bold">
                  + Add Custom
                </Text>
              </Pressable> */}
              </View>
              <View className="space-y-3">
                <JobFormTaskItems />
              </View>
            </View>

            {/* Extras Section */}
            <JobFormExtras />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <JobFormFooter />
    </View>
  );
}
