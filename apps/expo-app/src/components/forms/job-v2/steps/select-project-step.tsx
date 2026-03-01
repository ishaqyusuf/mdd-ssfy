import { SearchInput } from "@/components/search-input";
import { useJobFormV2Context } from "@/hooks/use-job-form-v2";
import { useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { NeoCard } from "../ui/neo-card";

export function SelectProjectStep() {
  const { projectList, params, selectProject } = useJobFormV2Context();
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projectList;
    return projectList.filter((item) => {
      const title = String(item?.title || "").toLowerCase();
      const builder = String(item?.builder?.name || "").toLowerCase();
      return title.includes(q) || builder.includes(q);
    });
  }, [projectList, query]);

  return (
    <View className="gap-3">
      <SearchInput placeholder="Search project..." value={query} onChangeText={setQuery} className="px-0" />
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
