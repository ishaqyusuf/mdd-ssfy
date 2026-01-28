// apps/expo-app/src/components/forms/job/job-form-step.tsx

import { Icon } from "@/components/ui/icon";
import { JobFormTaskItems } from "./job-form-task-item";
import { JobFormExtras } from "./job-form-extras";
import { JobFormFooter } from "./job-form-footer";
import { useJobFormContext } from "@/hooks/use-job-form-2";
import {
  KeyboardAvoidingView,
  Platform,
  View,
  Text,
  ScrollView,
  Pressable,
} from "react-native";
import { Textarea } from "@/components/ui/textarea";
import { Controller } from "react-hook-form";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input-2";
import { cn } from "@/lib/utils";
import { Toast } from "@/components/ui/toast";
import { formatMoney } from "@gnd/utils";

export function JobFormStep() {
  const ctx = useJobFormContext();

  return (
    <View className="flex-1">
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
                      className="flex w-full rounded-xl border border-border bg-card h-14 px-5 flex-row items-center text-base text-foreground"
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
                    {ctx?.formData?.isCustom ? (
                      <Text>*</Text>
                    ) : (
                      <Text className="text-xs font-normal opacity-70">
                        (Optional)
                      </Text>
                    )}
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
                        className={cn(
                          "flex w-full rounded-lg  bg-card min-h-30 px-5 py-4 text-base text-foreground align-text-top",
                          fieldState?.error && "border-destructive",
                        )}
                        placeholder="Enter specific job details, access codes, or warnings..."
                        placeholderClassName="text-foreground"
                      />
                    )}
                  />
                </View>
              </View>
            </View>
            {!ctx?.formData?.isCustom || (
              <View className="">
                <View className="gap-4">
                  <View className="flex-col gap-2">
                    <Text className="text-sm font-semibold text-muted-foreground ml-2">
                      Amount
                    </Text>
                    <View className="relative justify-center">
                      <Text className="absolute z-10 left-5 text-muted-foreground font-bold">
                        USD
                      </Text>
                      <Controller
                        control={ctx.form.control}
                        name="additionalCost"
                        render={({ field, fieldState }) => (
                          <Input
                            // defaultValue={ctx.form.getValues('additionalCost')}
                            value={String(field.value ? field.value : "")}
                            onChangeText={(t) => {
                              if (t?.length) field.onChange(+t);
                              // else field.onChange(null);
                              // ctx.form.setValue("additionalCost", +t);
                            }}
                            className={cn(
                              "flex w-full rounded-xl border h-14 pl-15 pr-5 text-base text-foreground",
                              fieldState?.error && "border-destructive",
                            )}
                            placeholder="0.00"
                            inputMode="decimal"
                          />
                        )}
                      />
                    </View>
                  </View>
                </View>
              </View>
            )}
            {ctx?.state?.allowCustomJobs && (
              <Controller
                control={ctx.form.control}
                name="isCustom"
                render={({ field, fieldState }) => (
                  <Pressable
                    onPress={(e) => {
                      if (
                        ctx.formData?.id &&
                        ctx.formData?.status == "Assigned"
                      ) {
                        Toast.show("Error. Action not applicable", {
                          type: "error",
                        });
                        return;
                      }
                      field?.onChange(!field?.value);
                    }}
                    className="flex-row bg-card p-4 rounded-lg shadow"
                  >
                    <View>
                      <Text className="text-lg font-bold">Custom Job</Text>
                      <Text>Enter custom job details manually</Text>
                    </View>
                    <View className="flex-1"></View>
                    <Switch
                      checked={!!field?.value}
                      onCheckedChange={(e) => {}}
                      className=""
                    />
                  </Pressable>
                )}
              />
            )}

            <View className="bg-card p-4 rounded-lg shadow">
              <View className="flex items-center flex-row justify-between px-2">
                <View className="flex flex-col">
                  <Text className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                    Project Addon
                  </Text>
                  <Text className="text-xs text-gray-500 dark:text-gray-400">
                    Default project-specific addition
                  </Text>
                </View>
                <View className="flex flex-row items-center gap-2 bg-muted dark:bg-surface-dark px-4 py-2 rounded-full border border-muted-foreground/50">
                  <Text className="text-base font-bold text-primary">
                    ${formatMoney(ctx?.formData?.addon || 0)}
                  </Text>
                  <Text className="">
                    <Icon
                      name="Lock"
                      className="size-12 text-muted-foreground"
                    />
                  </Text>
                </View>
              </View>
            </View>
            {/* Unit Tasks List */}
            {ctx?.formData?.isCustom || (
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
            )}

            {/* Extras Section */}
            <JobFormExtras />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <JobFormFooter />
    </View>
  );
}
