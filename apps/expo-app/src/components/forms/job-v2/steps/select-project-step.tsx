import { SearchInput } from "@/components/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { useJobFormV2Context } from "@/hooks/use-job-form-v2";
import { useEffect, useMemo, useRef, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { NeoCard } from "../ui/neo-card";
import { useStepScroll } from "../ui/step-scroll-context";
import { StepEmptyState } from "../ui/step-states";

function ProjectStepSkeleton() {
  return (
    <View className="gap-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <NeoCard key={index} className="bg-card">
          <View className="gap-2">
            <Skeleton className="h-3 w-16 rounded-md" />
            <Skeleton className="h-5 w-3/4 rounded-md" />
            <Skeleton className="h-3 w-1/2 rounded-md" />
          </View>
        </NeoCard>
      ))}
    </View>
  );
}

export function SelectProjectStep() {
  const { projectList, params, selectProject, isProjectsPending } = useJobFormV2Context();
  const { scrollToY } = useStepScroll();
  const [query, setQuery] = useState("");
  const positionsRef = useRef<Record<number, number>>({});
  const hasScrolledRef = useRef(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projectList;
    return projectList.filter((item) => {
      const title = String(item?.title || "").toLowerCase();
      const builder = String(item?.builder?.name || "").toLowerCase();
      return title.includes(q) || builder.includes(q);
    });
  }, [projectList, query]);

  useEffect(() => {
    hasScrolledRef.current = false;
  }, [params.projectId]);

  useEffect(() => {
    if (hasScrolledRef.current) return;
    const selectedId = params.projectId;
    if (!selectedId || isProjectsPending) return;
    const y = positionsRef.current[selectedId];
    if (y === undefined) return;
    hasScrolledRef.current = true;
    requestAnimationFrame(() => scrollToY(y - 12));
  }, [isProjectsPending, params.projectId, results.length, scrollToY]);

  return (
    <View className="gap-3">
      <SearchInput placeholder="Search project..." value={query} onChangeText={setQuery} className="px-0" />
      {isProjectsPending ? <ProjectStepSkeleton /> : null}
      {!isProjectsPending && !results.length ? (
        <StepEmptyState
          title="No projects found"
          description="Create a project first or refine your search."
        />
      ) : null}
      {results.map((project) => {
        const selected = params.projectId === project.id;
        return (
          <TouchableOpacity
            key={project.id}
            className="active:opacity-85"
            onPress={() =>
              selectProject({
                id: project.id,
                title: project.title || "",
                addon: project.addon || 0,
              })
            }
            onLayout={(event) => {
              positionsRef.current[project.id] = event.nativeEvent.layout.y;
            }}
          >
            <NeoCard className={selected ? "border-primary bg-primary/10" : "bg-card"}>
              <Text className="text-[11px] uppercase tracking-[1px] text-muted-foreground">Project</Text>
              <Text className="text-base font-black text-foreground">{project.title}</Text>
              <Text className="text-xs text-muted-foreground">{project.builder?.name || "No builder"}</Text>
            </NeoCard>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
