import { SearchInput } from "@/components/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { useJobFormV2Context } from "@/hooks/use-job-form-v2";
import { useEffect, useMemo, useRef, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { NeoCard } from "../ui/neo-card";
import { useStepScroll } from "../ui/step-scroll-context";
import { StepEmptyState } from "../ui/step-states";

function TaskStepSkeleton() {
  return (
    <View className="gap-2">
      <NeoCard className="bg-card">
        <Skeleton className="h-4 w-1/3 rounded-md" />
        <Skeleton className="mt-2 h-3 w-2/3 rounded-md" />
      </NeoCard>
      {Array.from({ length: 3 }).map((_, index) => (
        <NeoCard key={index} className="bg-card">
          <Skeleton className="h-5 w-2/3 rounded-md" />
        </NeoCard>
      ))}
    </View>
  );
}

export function SelectTaskStep() {
  const { params, taskOptions, selectTask, isTasksPending } = useJobFormV2Context();
  const { scrollToY } = useStepScroll();
  const [query, setQuery] = useState("");
  const positionsRef = useRef<Record<string, number>>({});
  const hasScrolledRef = useRef(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return taskOptions;
    return taskOptions.filter((item) => String(item?.taskName || "").toLowerCase().includes(q));
  }, [query, taskOptions]);

  useEffect(() => {
    hasScrolledRef.current = false;
  }, [params.taskId]);

  useEffect(() => {
    if (hasScrolledRef.current) return;
    const selectedId = params.taskId;
    if (selectedId === null || selectedId === undefined || isTasksPending) return;
    const y = positionsRef.current[String(selectedId)];
    if (y === undefined) return;
    hasScrolledRef.current = true;
    requestAnimationFrame(() => scrollToY(y - 12));
  }, [isTasksPending, params.taskId, results.length, scrollToY]);

  return (
    <View className="gap-3">
      <SearchInput placeholder="Search task template..." value={query} onChangeText={setQuery} className="px-0" />

      <TouchableOpacity
        className="active:opacity-85"
        onPress={() => selectTask(-1)}
        onLayout={(event) => {
          positionsRef.current[String(-1)] = event.nativeEvent.layout.y;
        }}
      >
        <NeoCard className={params.taskId === -1 ? "border-primary bg-primary/10" : "bg-card"}>
          <Text className="text-sm font-black text-foreground">Custom Task</Text>
          <Text className="text-xs text-muted-foreground">Create a one-off job with manual pricing.</Text>
        </NeoCard>
      </TouchableOpacity>

      {!params.projectId ? (
        <StepEmptyState
          title="Project required"
          description="Pick a project first to load task templates."
        />
      ) : null}

      {isTasksPending ? <TaskStepSkeleton /> : null}
      {!!params.projectId && !isTasksPending && !results.length ? (
        <StepEmptyState
          title="No task templates found"
          description="Use Custom Task or configure builder task templates."
        />
      ) : null}

      {results.map((task) => {
        const selected = params.taskId === task.id;
        return (
          <TouchableOpacity
            key={task.id}
            className="active:opacity-85"
            onPress={() => selectTask(task.id)}
            onLayout={(event) => {
              positionsRef.current[String(task.id)] = event.nativeEvent.layout.y;
            }}
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
