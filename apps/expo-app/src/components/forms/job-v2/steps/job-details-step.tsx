import { useJobFormV2Context } from "@/hooks/use-job-form-v2";
import { Skeleton } from "@/components/ui/skeleton";
import { Controller } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { NeoCard } from "../ui/neo-card";
import { StepEmptyState } from "../ui/step-states";
import { MissingTaskConfig } from "./missing-task-config";
import { Icon } from "@/components/ui/icon";
import { ModelInstallCostV2Step } from "../model-install-cost-v2-modal";
import { ConfigRequestSuccessStep } from "./config-request-success-step";

function NumberInput({
  value,
  onChangeText,
}: {
  value: any;
  onChangeText: (text: string) => void;
}) {
  return (
    <TextInput
      value={value === null || value === undefined ? "" : String(value)}
      onChangeText={(text) => onChangeText(text.replace(/[^0-9.]/g, ""))}
      keyboardType="decimal-pad"
      className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground"
      placeholder="0"
      placeholderTextColor="hsl(var(--muted-foreground))"
    />
  );
}

function parseQty(text: string, maxQty?: number | null) {
  if (!text) return null;
  const parsed = Number(text);
  if (Number.isNaN(parsed)) return null;
  if (maxQty === null || maxQty === undefined) return parsed;
  return Math.min(parsed, Number(maxQty) || 0);
}

export function JobDetailsStep() {
  const {
    form,
    defaultValues,
    isDefaultValuesPending,
    params,
    total,
    hasMissingTaskConfiguration,
    isInstallCostStepActive,
    openInstallCostStep,
    admin,
    installCostBuilderTaskId,
    requestTaskConfiguration,
    isRequestingTaskConfiguration,
    requestTaskConfigurationData,
    projectList,
    unitOptions,
    tabs,
    setStep,
  } = useJobFormV2Context();
  const isCustom = form.watch("isCustom") || params.taskId === -1;
  const taskRows = Object.entries(
    (form.watch("tasks") || {}) as Record<string, any>,
  );
  const selectedProject = (projectList || []).find(
    (project: any) => project?.id === params.projectId,
  );
  const selectedUnit = (unitOptions || []).find(
    (unit: any) => unit?.id === params.unitId,
  );
  const modelMissing = !params.modelId;

  if (requestTaskConfigurationData?.id) {
    return <ConfigRequestSuccessStep />;
  }

  if (modelMissing) {
    const unitModelName = selectedUnit?.modelName || "Unknown Model";
    const projectName = selectedProject?.title || "Unknown Project";
    const unitStepIndex = Math.max(1, tabs.indexOf("unit") + 1);

    return (
      <View className="gap-3">
        <NeoCard className="border-border bg-card">
          <View className="mb-2 h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Icon name="TriangleAlert" className="text-destructive" size={20} />
          </View>
          {admin ? (
            <>
              <Text className="text-base font-black text-foreground">
                Community model not configured for unit
              </Text>
              <Text className="mt-2 text-sm text-muted-foreground">
                {`${unitModelName}, ${projectName}. Configure now.`}
              </Text>
              <Pressable
                onPress={() => setStep(unitStepIndex)}
                className="mt-4 flex-row items-center justify-center rounded-2xl border border-border bg-background px-4 py-3 active:opacity-80"
              >
                <Icon name="Wrench" className="text-foreground" size={16} />
                <Text className="ml-2 font-semibold text-foreground">
                  Configure Now
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text className="text-base font-black text-foreground">
                Community model configuration missing
              </Text>
              <Text className="mt-2 text-sm text-muted-foreground">
                Notify admin for configuration.
              </Text>
              <Pressable
                onPress={requestTaskConfiguration}
                className="mt-4 flex-row items-center justify-center rounded-2xl bg-primary px-4 py-3 active:opacity-90"
                disabled={isRequestingTaskConfiguration}
              >
                <Icon
                  name="Mail"
                  className="text-primary-foreground"
                  size={16}
                />
                <Text className="ml-2 font-semibold text-primary-foreground">
                  {isRequestingTaskConfiguration
                    ? "Notifying..."
                    : "Notify Admin"}
                </Text>
              </Pressable>
              {requestTaskConfigurationData?.id ? (
                <Text className="mt-3 text-xs text-muted-foreground">
                  Admins notified successful. You will be notified when the
                  configuration is available.
                </Text>
              ) : null}
            </>
          )}
        </NeoCard>
      </View>
    );
  }
  if (isDefaultValuesPending) {
    return (
      <View className="flex-1 gap-3">
        <NeoCard className="bg-card">
          <Skeleton className="h-3 w-16 rounded-md" />
          <Skeleton className="mt-2 h-5 w-2/3 rounded-md" />
          <Skeleton className="mt-2 h-3 w-1/3 rounded-md" />
        </NeoCard>

        <NeoCard className="bg-card">
          <Skeleton className="h-3 w-20 rounded-md" />
          <Skeleton className="mt-2 h-28 w-full rounded-2xl" />
        </NeoCard>

        <NeoCard className="bg-card">
          <Skeleton className="h-3 w-24 rounded-md" />
          <View className="mt-2 gap-2">
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
          </View>
        </NeoCard>

        <NeoCard className="bg-primary">
          <Skeleton className="h-3 w-14 rounded-md bg-primary-foreground/40" />
          <Skeleton className="mt-2 h-8 w-32 rounded-md bg-primary-foreground/50" />
        </NeoCard>
      </View>
    );
  }

  if (!defaultValues) {
    return (
      <StepEmptyState
        title="Details not ready"
        description="Complete previous selections to load the detail form."
      />
    );
  }

  if (isInstallCostStepActive) {
    return (
      <ModelInstallCostV2Step
        modelId={params.modelId}
        initialBuilderTaskId={
          installCostBuilderTaskId ||
          (defaultValues as any)?.builderTaskId ||
          null
        }
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 120 : 24}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerClassName="gap-3 pb-36"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        automaticallyAdjustKeyboardInsets
      >
        <NeoCard className="bg-card">
          <Text className="text-xs uppercase tracking-[1px] text-muted-foreground">
            Summary
          </Text>
          <Text className="text-sm font-bold text-foreground">
            {defaultValues?.unit?.projectTitle || "Project"}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {defaultValues?.unit?.modelName || "Unit"}
          </Text>
        </NeoCard>

        <NeoCard className="bg-card">
          <Text className="mb-2 text-xs uppercase tracking-[1px] text-muted-foreground">
            Description
          </Text>
          <Controller
            control={form.control}
            name="description"
            render={({ field }) => (
              <TextInput
                value={(field.value as string) || ""}
                onChangeText={field.onChange}
                multiline
                numberOfLines={4}
                className="min-h-28 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground"
                placeholder="Write job notes and instructions..."
                placeholderTextColor="hsl(var(--muted-foreground))"
              />
            )}
          />
        </NeoCard>

        {isCustom ? (
          <NeoCard className="bg-card">
            <Text className="mb-2 text-xs uppercase tracking-[1px] text-muted-foreground">
              Custom Cost
            </Text>
            <Controller
              control={form.control}
              name="additionalCost"
              render={({ field }) => (
                <NumberInput
                  value={field.value}
                  onChangeText={(text) =>
                    field.onChange(text ? Number(text) : null)
                  }
                />
              )}
            />
          </NeoCard>
        ) : hasMissingTaskConfiguration ? (
          <MissingTaskConfig />
        ) : (
          <NeoCard className="bg-card">
            <View className="mb-2 flex-row items-center justify-between gap-2">
              <Text className="text-xs uppercase tracking-[1px] text-muted-foreground">
                Task Quantities
              </Text>
              {admin ? (
                <Pressable
                  onPress={() =>
                    openInstallCostStep(
                      (defaultValues as any)?.builderTaskId || null,
                    )
                  }
                  className="flex-row items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 active:opacity-80"
                >
                  <Icon name="Pencil" className="text-foreground" size={12} />
                  <Text className="text-[11px] font-semibold text-foreground">
                    Edit
                  </Text>
                </Pressable>
              ) : null}
            </View>
            <View className="overflow-hidden rounded-2xl border border-border/90">
              <View className="flex-row border-b border-border bg-muted/50 px-3 py-2">
                <Text className="flex-1 text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
                  Item
                </Text>
                <Text className="w-16 text-right text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
                  Rate
                </Text>
                <Text className="w-24 text-center text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
                  Qty
                </Text>
                <Text className="w-16 text-right text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
                  Total
                </Text>
              </View>

              {taskRows.map(([uid, task]) => (
                <View
                  key={uid}
                  className="flex-row items-center border-b border-border/80 bg-background px-3 py-2 last:border-b-0"
                >
                  <View className="flex-1 pr-2">
                    <Text className="text-xs font-semibold uppercase text-foreground">
                      {task?.title || uid}
                    </Text>
                    <Text className="text-[11px] text-muted-foreground">
                      Max: {task?.maxQty || 0}
                    </Text>
                  </View>
                  <Text className="w-16 text-right text-xs text-muted-foreground">
                    ${Number(task?.cost || 0).toFixed(2)}
                  </Text>
                  <Controller
                    control={form.control}
                    name={`tasks.${uid}.qty` as any}
                    render={({ field }) => (
                      <View className="w-24 px-1">
                        <TextInput
                          value={
                            field.value === null || field.value === undefined
                              ? ""
                              : String(field.value)
                          }
                          onChangeText={(text) =>
                            field.onChange(
                              parseQty(
                                text.replace(/[^0-9.]/g, ""),
                                admin ? task?.maxQty : null,
                              ),
                            )
                          }
                          keyboardType="decimal-pad"
                          editable={!admin || Number(task?.maxQty || 0) > 0}
                          className="h-10 rounded-xl border border-border bg-card px-2 text-center text-xs text-foreground"
                          placeholder="0"
                          placeholderTextColor="hsl(var(--muted-foreground))"
                        />
                        {admin ? (
                          <Text className="mt-1 text-center text-[10px] text-muted-foreground">
                            / {task?.maxQty || 0}
                          </Text>
                        ) : null}
                      </View>
                    )}
                  />
                  <Text className="w-16 text-right text-xs font-semibold text-foreground">
                    $
                    {(
                      Number(task?.cost || 0) * Number(task?.qty || 0) || 0
                    ).toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          </NeoCard>
        )}

        <NeoCard className="bg-primary">
          <Text className="text-[11px] uppercase tracking-[1px] text-primary-foreground/80">
            Total
          </Text>
          <Text className="text-3xl font-black text-primary-foreground">
            ${Number(total || 0).toFixed(2)}
          </Text>
        </NeoCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
