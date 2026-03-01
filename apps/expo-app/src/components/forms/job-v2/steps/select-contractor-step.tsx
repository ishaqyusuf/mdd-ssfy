import { SearchInput } from "@/components/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { useJobFormV2Context } from "@/hooks/use-job-form-v2";
import { useEffect, useMemo, useRef, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { NeoCard } from "../ui/neo-card";
import { useStepScroll } from "../ui/step-scroll-context";
import { StepEmptyState } from "../ui/step-states";

function ContractorStepSkeleton() {
  return (
    <View className="gap-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <NeoCard key={index} className="bg-card">
          <View className="flex-row items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-full" />
            <View className="flex-1 gap-2">
              <Skeleton className="h-4 w-1/2 rounded-md" />
              <Skeleton className="h-3 w-1/3 rounded-md" />
            </View>
            <Skeleton className="h-3 w-12 rounded-md" />
          </View>
        </NeoCard>
      ))}
    </View>
  );
}

export function SelectContractorStep() {
  const { users, params, selectUser, isUsersPending } = useJobFormV2Context();
  const { scrollToY } = useStepScroll();
  const [query, setQuery] = useState("");
  const positionsRef = useRef<Record<number, number>>({});
  const hasScrolledRef = useRef(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((item) => String(item?.name || "").toLowerCase().includes(q));
  }, [query, users]);

  useEffect(() => {
    hasScrolledRef.current = false;
  }, [params.userId]);

  useEffect(() => {
    if (hasScrolledRef.current) return;
    const selectedId = params.userId;
    if (!selectedId || isUsersPending) return;
    const y = positionsRef.current[selectedId];
    if (y === undefined) return;
    hasScrolledRef.current = true;
    requestAnimationFrame(() => scrollToY(y - 12));
  }, [isUsersPending, params.userId, results.length, scrollToY]);

  return (
    <View className="gap-3">
      <SearchInput placeholder="Search contractor..." value={query} onChangeText={setQuery} className="px-0" />
      {isUsersPending ? <ContractorStepSkeleton /> : null}
      {!isUsersPending && !results.length ? (
        <StepEmptyState
          title="No contractors found"
          description="Try a different keyword or confirm employee roles are configured."
        />
      ) : null}
      {results.map((user) => {
        const selected = params.userId === user.id;
        return (
          <TouchableOpacity
            key={user.id}
            className="active:opacity-85"
            onPress={() => selectUser(user.id)}
            onLayout={(event) => {
              positionsRef.current[user.id] = event.nativeEvent.layout.y;
            }}
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
