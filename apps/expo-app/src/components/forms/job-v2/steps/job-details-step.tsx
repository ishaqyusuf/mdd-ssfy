import { useJobFormV2Context } from "@/hooks/use-job-form-v2";
import { Skeleton } from "@/components/ui/skeleton";
import { Controller } from "react-hook-form";
import { Text, TextInput, View } from "react-native";
import { NeoCard } from "../ui/neo-card";
import { StepEmptyState } from "../ui/step-states";

function NumberInput({ value, onChangeText }: { value: any; onChangeText: (text: string) => void }) {
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

export function JobDetailsStep() {
  const { form, defaultValues, isDefaultValuesPending, params, total } = useJobFormV2Context();
  const isCustom = form.watch("isCustom") || params.taskId === -1;

  if (isDefaultValuesPending) {
    return (
      <NeoCard className="bg-card">
        <View className="gap-2">
          <Skeleton className="h-4 w-1/3 rounded-md" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-12 w-full rounded-2xl" />
        </View>
      </NeoCard>
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

  return (
    <View className="gap-3 pb-2">
      <NeoCard className="bg-card">
        <Text className="text-xs uppercase tracking-[1px] text-muted-foreground">Summary</Text>
        <Text className="text-sm font-bold text-foreground">{defaultValues?.unit?.projectTitle || "Project"}</Text>
        <Text className="text-xs text-muted-foreground">{defaultValues?.unit?.modelName || "Unit"}</Text>
      </NeoCard>

      <NeoCard className="bg-card">
        <Text className="mb-2 text-xs uppercase tracking-[1px] text-muted-foreground">Description</Text>
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
          <Text className="mb-2 text-xs uppercase tracking-[1px] text-muted-foreground">Custom Cost</Text>
          <Controller
            control={form.control}
            name="additionalCost"
            render={({ field }) => (
              <NumberInput
                value={field.value}
                onChangeText={(text) => field.onChange(text ? Number(text) : null)}
              />
            )}
          />
        </NeoCard>
      ) : (
        <NeoCard className="bg-card">
          <Text className="mb-2 text-xs uppercase tracking-[1px] text-muted-foreground">Task Quantities</Text>
          {Object.entries((form.watch("tasks") || {}) as Record<string, any>).map(([uid, task]) => (
            <View key={uid} className="mb-2 flex-row items-center gap-3 rounded-2xl border border-border/80 bg-background p-3">
              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground">{uid}</Text>
                <Text className="text-xs text-muted-foreground">Max: {task?.maxQty || 0}</Text>
              </View>
              <Controller
                control={form.control}
                name={`tasks.${uid}.qty` as any}
                render={({ field }) => (
                  <View className="w-24">
                    <NumberInput
                      value={field.value}
                      onChangeText={(text) => field.onChange(text ? Number(text) : null)}
                    />
                  </View>
                )}
              />
            </View>
          ))}
        </NeoCard>
      )}

      <NeoCard className="bg-primary">
        <Text className="text-[11px] uppercase tracking-[1px] text-primary-foreground/80">Total</Text>
        <Text className="text-3xl font-black text-primary-foreground">${Number(total || 0).toFixed(2)}</Text>
      </NeoCard>
    </View>
  );
}
