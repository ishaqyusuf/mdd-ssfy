import { SearchInput } from "@/components/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { useJobFormV2Context } from "@/hooks/use-job-form-v2";
import { useEffect, useMemo, useRef, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { NeoCard } from "../ui/neo-card";
import { useStepScroll } from "../ui/step-scroll-context";
import { StepEmptyState } from "../ui/step-states";

function UnitStepSkeleton() {
  return (
    <View className="gap-2">
      {Array.from({ length: 4 }).map((_, index) => (
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
    </View>
  );
}

export function SelectUnitStep() {
  const { unitOptions, params, selectUnit, isUnitsPending } = useJobFormV2Context();
  const { scrollToY } = useStepScroll();
  const [query, setQuery] = useState("");
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
    requestAnimationFrame(() => scrollToY(y - 12));
  }, [isUnitsPending, params.unitId, results.length, scrollToY]);

  return (
    <View className="gap-3">
      <SearchInput placeholder="Search unit..." value={query} onChangeText={setQuery} className="px-0" />

      {!params.projectId ? (
        <StepEmptyState
          title="Project required"
          description="Select a project first to load units."
        />
      ) : null}

      {isUnitsPending ? <UnitStepSkeleton /> : null}
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
    </View>
  );
}
