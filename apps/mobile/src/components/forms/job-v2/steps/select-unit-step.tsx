import { SearchInput } from "@/components/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { Toast } from "@/components/ui/toast";
import { useJobFormV2Context } from "@/hooks/use-job-form-v2";
import { _trpc } from "@/components/static-trpc";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { NeoCard } from "../ui/neo-card";
import { StepEmptyState } from "../ui/step-states";

function UnitStepSkeleton() {
  return (
    <View className="flex-1 gap-3">
      <Skeleton className="h-14 w-full rounded-full" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerClassName="gap-3 pb-8"
        showsVerticalScrollIndicator={false}
      >
        {Array.from({ length: 6 }).map((_, index) => (
          <NeoCard key={index} className="bg-card">
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1 gap-2">
                <Skeleton className="h-5 w-2/3 rounded-md" />
                <Skeleton className="h-3 w-1/2 rounded-md" />
              </View>
              <Skeleton className="h-6 w-14 rounded-full" />
            </View>
          </NeoCard>
        ))}
      </ScrollView>
    </View>
  );
}

export function SelectUnitStep() {
  const {
    unitOptions,
    params,
    selectUnit,
    isUnitsPending,
    isRefreshing,
    refreshCurrentStep,
  } = useJobFormV2Context();
  const [query, setQuery] = useState("");
  const [generatingUnitId, setGeneratingUnitId] = useState<number | null>(null);
  const listRef = useRef<ScrollView>(null);
  const positionsRef = useRef<Record<number, number>>({});
  const hasScrolledRef = useRef(false);
  const { mutateAsync: generateModelForUnit } = useMutation(
    _trpc.community.generateModelForUnit.mutationOptions({
      meta: {
        toastTitle: {
          // error: "Unable to configure unit model",
          // loading: "Configuring model...",
          // success: "Model configured",
          // show: true,
        },
      },
    }),
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return unitOptions;
    return unitOptions.filter((item) => {
      const model = String(item?.modelName || "").toLowerCase();
      const lot = String(item?.lot || "").toLowerCase();
      const block = String(item?.block || "").toLowerCase();
      return model.includes(q) || lot.includes(q) || block.includes(q);
    });
  }, [query, unitOptions]);

  useEffect(() => {
    hasScrolledRef.current = false;
  }, [params.unitId]);

  useEffect(() => {
    if (hasScrolledRef.current) return;
    const selectedId = params.unitId;
    if (!selectedId || isUnitsPending) return;
    const y = positionsRef.current[selectedId];
    if (y === undefined) return;
    hasScrolledRef.current = true;
    requestAnimationFrame(() =>
      listRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true }),
    );
  }, [isUnitsPending, params.unitId, results.length]);

  if (isUnitsPending) return <UnitStepSkeleton />;

  return (
    <View className="flex-1 gap-3">
      <SearchInput
        placeholder="Search unit..."
        value={query}
        onChangeText={setQuery}
        className="px-0"
      />
      <ScrollView
        ref={listRef}
        style={{ flex: 1 }}
        contentContainerClassName="gap-3 pb-8"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshCurrentStep}
          />
        }
      >
        {!params.projectId ? (
          <StepEmptyState
            title="Project required"
            description="Select a project first to load units."
          />
        ) : null}

        {!!params.projectId && !isUnitsPending && !results.length ? (
          <StepEmptyState
            title="No units found"
            description="No units match this search for the selected project."
          />
        ) : null}

        {results.map((unit) => {
          const selected = params.unitId === unit.id;
          return (
            <TouchableOpacity
              key={unit.id}
              className="active:opacity-85"
              onPress={async () => {
                try {
                  let nextModelId = unit.modelId;
                  if (!nextModelId) {
                    setGeneratingUnitId(unit.id);
                    const generated = await generateModelForUnit({
                      unitId: unit.id,
                    });
                    nextModelId = generated?.modelId || null!;
                  }
                  // return;
                  selectUnit({
                    id: unit.id,
                    modelId: nextModelId,
                    modelName: unit.modelName || undefined,
                    lot: unit.lot || undefined,
                    block: unit.block || undefined,
                    costing: (unit as any).costing,
                  });
                } catch {
                  Toast.show("Failed to configure community model for unit.", {
                    type: "error",
                  });
                } finally {
                  setGeneratingUnitId(null);
                }
              }}
              disabled={generatingUnitId === unit.id}
              onLayout={(event) => {
                positionsRef.current[unit.id] = event.nativeEvent.layout.y;
              }}
            >
              <NeoCard
                className={
                  selected ? "border-primary bg-primary/10" : "bg-card"
                }
              >
                <View className="flex-row items-start justify-between gap-3">
                  <View>
                    <Text className="text-base font-black text-foreground">
                      Lot {unit.lot} / Block {unit.block}
                    </Text>
                    <Text className="text-xs uppercase tracking-[1px] text-muted-foreground">
                      {unit.modelName}
                    </Text>
                    {!unit.modelId ? (
                      <Text className="mt-1 text-[11px] text-muted-foreground">
                        {generatingUnitId === unit.id
                          ? "Configuring community model..."
                          : "Community model missing - auto-configure on select"}
                      </Text>
                    ) : null}
                  </View>
                  <View className="rounded-full bg-primary px-3 py-1">
                    <Text className="text-[10px] uppercase text-primary-foreground">
                      {unit.jobCount} jobs
                    </Text>
                  </View>
                </View>
              </NeoCard>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
