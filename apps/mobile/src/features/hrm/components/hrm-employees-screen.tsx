import { SafeArea } from "@/components/safe-area";
import { Icon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { useHrmEmployees } from "@/features/hrm/api/use-hrm-employees";
import { useRouter } from "expo-router";
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from "react-native";

export function HrmEmployeesScreen() {
  const router = useRouter();
  const { data, isPending, refetch, isRefetching, error } = useHrmEmployees();

  const employees = ((data as any)?.data || []) as Array<{
    id: number;
    uid?: string;
    name?: string | null;
    email?: string | null;
    role?: string | null;
  }>;

  return (
    <SafeArea>
      <View className="flex-1 bg-background pt-4">
        <View className="mb-3 flex-row items-center gap-3 px-4">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full active:bg-muted"
          >
            <Icon name="ArrowLeft" className="text-foreground" size={20} />
          </Pressable>
          <View className="flex-1">
            <Text className="text-2xl font-bold text-foreground">Employees</Text>
            <Text className="text-sm text-muted-foreground">Employee dashboard list</Text>
          </View>
        </View>

        {isPending ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator />
          </View>
        ) : error ? (
          <View className="m-4 rounded-2xl border border-destructive/30 bg-card p-4">
            <Text className="text-sm font-semibold text-foreground">
              Could not load employees
            </Text>
            <Text className="mt-1 text-xs text-muted-foreground">
              Pull to refresh or try again shortly.
            </Text>
          </View>
        ) : (
          <FlatList
            data={employees}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />
            }
            ListEmptyComponent={
              <View className="mt-8 items-center rounded-xl border border-dashed border-border p-8">
                <Text className="text-base font-semibold text-foreground">
                  No employees found
                </Text>
                <Text className="mt-2 text-center text-sm text-muted-foreground">
                  Employees will appear here once created.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View className="mb-2 rounded-2xl border border-border bg-card p-4">
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-foreground">
                      {item.name || "Unnamed employee"}
                    </Text>
                    <Text className="mt-0.5 text-xs text-muted-foreground">
                      {item.email || "No email"}
                    </Text>
                  </View>
                  <View className="rounded-full bg-muted px-2 py-1">
                    <Text className="text-[11px] font-medium text-muted-foreground">
                      {item.role || "Unassigned"}
                    </Text>
                  </View>
                </View>
                <Text className="mt-2 text-[11px] text-muted-foreground">
                  {item.uid || `Employee #${item.id}`}
                </Text>
              </View>
            )}
          />
        )}
      </View>
    </SafeArea>
  );
}
