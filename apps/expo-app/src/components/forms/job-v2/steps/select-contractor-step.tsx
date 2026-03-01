import { SearchInput } from "@/components/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { useJobFormV2Context } from "@/hooks/use-job-form-v2";
import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { NeoCard } from "../ui/neo-card";
import { StepEmptyState } from "../ui/step-states";

function ContractorStepSkeleton() {
  return (
    <View className="flex-1 gap-3">
      <Skeleton className="h-14 w-full rounded-full" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerClassName="gap-3 pb-8"
        showsVerticalScrollIndicator={false}
      >
        {Array.from({ length: 8 }).map((_, index) => (
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
      </ScrollView>
    </View>
  );
}

export function SelectContractorStep() {
  const { users, params, selectUser, isUsersPending } = useJobFormV2Context();
  const [query, setQuery] = useState("");
  const listRef = useRef<ScrollView>(null);
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
    requestAnimationFrame(() =>
      listRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true }),
    );
  }, [isUsersPending, params.userId, results.length]);

  if (isUsersPending) return <ContractorStepSkeleton />;

  return (
    <View className="flex-1 gap-3">
      <SearchInput placeholder="Search contractor..." value={query} onChangeText={setQuery} className="px-0" />
      <ScrollView
        ref={listRef}
        style={{ flex: 1 }}
        contentContainerClassName="gap-3 pb-8"
        showsVerticalScrollIndicator={false}
      >
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
      </ScrollView>
    </View>
  );
}
