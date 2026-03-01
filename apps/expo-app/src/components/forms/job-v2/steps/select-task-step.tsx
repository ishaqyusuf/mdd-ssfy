import { SearchInput } from "@/components/search-input";
import { useJobFormV2Context } from "@/hooks/use-job-form-v2";
import { useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { NeoCard } from "../ui/neo-card";

export function SelectTaskStep() {
  const { params, taskOptions, selectTask, isTasksPending } = useJobFormV2Context();
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return taskOptions;
    return taskOptions.filter((item) => String(item?.taskName || "").toLowerCase().includes(q));
  }, [query, taskOptions]);

  return (
    <View className="gap-3">
      <SearchInput placeholder="Search task template..." value={query} onChangeText={setQuery} className="px-0" />

      <TouchableOpacity className="active:opacity-85" onPress={() => selectTask(-1)}>
        <NeoCard className={params.taskId === -1 ? "border-primary bg-primary/10" : "bg-card"}>
          <Text className="text-sm font-black text-foreground">Custom Task</Text>
          <Text className="text-xs text-muted-foreground">Create a one-off job with manual pricing.</Text>
        </NeoCard>
      </TouchableOpacity>

      {!params.projectId ? (
        <NeoCard className="border-dashed bg-muted/40">
          <Text className="text-sm text-muted-foreground">Pick a project first to load tasks.</Text>
        </NeoCard>
      ) : null}

      {isTasksPending ? (
        <NeoCard className="bg-muted/40">
          <Text className="text-sm text-muted-foreground">Loading task templates...</Text>
        </NeoCard>
      ) : null}

      {results.map((task) => {
        const selected = params.taskId === task.id;
        return (
          <TouchableOpacity
            key={task.id}
            className="active:opacity-85"
            onPress={() => selectTask(task.id)}
          >
            <NeoCard className={selected ? "border-primary bg-primary/10" : "bg-card"}>
              <Text className="text-base font-bold text-foreground">{task.taskName}</Text>
            </NeoCard>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
