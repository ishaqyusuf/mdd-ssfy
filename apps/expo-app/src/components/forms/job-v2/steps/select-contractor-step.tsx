import { SearchInput } from "@/components/search-input";
import { useJobFormV2Context } from "@/hooks/use-job-form-v2";
import { useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { NeoCard } from "../ui/neo-card";

export function SelectContractorStep() {
  const { users, params, selectUser } = useJobFormV2Context();
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((item) => String(item?.name || "").toLowerCase().includes(q));
  }, [query, users]);

  return (
    <View className="gap-3">
      <SearchInput placeholder="Search contractor..." value={query} onChangeText={setQuery} className="px-0" />
      {results.map((user) => {
        const selected = params.userId === user.id;
        return (
          <TouchableOpacity
            key={user.id}
            className="active:opacity-85"
            onPress={() => selectUser(user.id)}
          >
            <NeoCard className={selected ? "border-primary bg-primary/10" : "bg-card"}>
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-full bg-primary">
                  <Text className="text-base font-bold uppercase text-primary-foreground">
                    {String(user.name || "?").slice(0, 1)}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-foreground">{user.name}</Text>
                  <Text className="text-xs text-muted-foreground">{String(user.role || "Contractor")}</Text>
                </View>
                <Text className="text-xs uppercase text-muted-foreground">Choose</Text>
              </View>
            </NeoCard>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
