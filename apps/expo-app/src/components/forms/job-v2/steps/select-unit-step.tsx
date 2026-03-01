import { SearchInput } from "@/components/search-input";
import { useJobFormV2Context } from "@/hooks/use-job-form-v2";
import { useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { NeoCard } from "../ui/neo-card";

export function SelectUnitStep() {
  const { unitOptions, params, selectUnit, isUnitsPending } = useJobFormV2Context();
  const [query, setQuery] = useState("");

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

  return (
    <View className="gap-3">
      <SearchInput placeholder="Search unit..." value={query} onChangeText={setQuery} className="px-0" />

      {!params.projectId ? (
        <NeoCard className="border-dashed bg-muted/40">
          <Text className="text-sm text-muted-foreground">Select a project first.</Text>
        </NeoCard>
      ) : null}

      {isUnitsPending ? (
        <NeoCard className="bg-muted/40">
          <Text className="text-sm text-muted-foreground">Loading units...</Text>
        </NeoCard>
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
                modelName: unit.modelName,
                lot: unit.lot,
                block: unit.block,
                costing: unit.costing as any,
              })
            }
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
