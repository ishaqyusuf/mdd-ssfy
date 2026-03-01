import { SearchInput } from "@/components/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { useJobFormV2Context } from "@/hooks/use-job-form-v2";
import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
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
  const { unitOptions, params, selectUnit, isUnitsPending } = useJobFormV2Context();
  const [query, setQuery] = useState("");
  const listRef = useRef<ScrollView>(null);
  const positionsRef = useRef<Record<number, number>>({});
  const hasScrolledRef = useRef(false);

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
      <SearchInput placeholder="Search unit..." value={query} onChangeText={setQuery} className="px-0" />
      <ScrollView
        ref={listRef}
        style={{ flex: 1 }}
        contentContainerClassName="gap-3 pb-8"
        showsVerticalScrollIndicator={false}
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
              onPress={() =>
                selectUnit({
                  id: unit.id,
                  modelId: unit.modelId,
                  modelName: unit.modelName || undefined,
                  lot: unit.lot || undefined,
                  block: unit.block || undefined,
                  costing: (unit as any).costing,
                })
              }
              onLayout={(event) => {
                positionsRef.current[unit.id] = event.nativeEvent.layout.y;
              }}
            >
              <NeoCard className={selected ? "border-primary bg-primary/10" : "bg-card"}>
                <View className="flex-row items-start justify-between gap-3">
                  <View>
                    <Text className="text-base font-black text-foreground">{unit.modelName}</Text>
                    <Text className="text-xs uppercase tracking-[1px] text-muted-foreground">
                      Lot {unit.lot} / Block {unit.block}
                    </Text>
                  </View>
                  <View className="rounded-full bg-primary px-3 py-1">
                    <Text className="text-[10px] uppercase text-primary-foreground">{unit.jobCount} jobs</Text>
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
