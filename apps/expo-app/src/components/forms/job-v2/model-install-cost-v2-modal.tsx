import { _qc, _trpc } from "@/components/static-trpc";
import { SearchInput } from "@/components/search-input";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Toast } from "@/components/ui/toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { NeoCard } from "./ui/neo-card";

type InstallTaskItem = {
  id: number | null;
  builderTaskId: number;
  installCostModelId: number;
  qty: number | null;
  status: "active" | "inactive";
  builderTaskInstallCostId: number | null;
  installCostModel?: {
    title?: string | null;
    unit?: string | null;
    unitCost?: number | null;
  } | null;
};

interface ModelInstallCostV2StepProps {
  modelId: number | null | undefined;
  initialBuilderTaskId?: number | null;
  requestBuilderTaskId?: number | null;
  jobId?: number | null;
  contractorId?: number | null;
  onNotifyContractor?: () => void | Promise<void>;
  isNotifyingContractor?: boolean;
}

function StepSkeleton() {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerClassName="gap-3 pb-8"
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
    >
      <NeoCard className="bg-card">
        <Skeleton className="h-5 w-1/2 rounded-md" />
        <Skeleton className="mt-2 h-3 w-2/3 rounded-md" />
      </NeoCard>
      <Skeleton className="h-10 w-full rounded-full" />
      <View className="flex-row gap-2">
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
      </View>
      {Array.from({ length: 5 }).map((_, index) => (
        <NeoCard key={index} className="bg-card">
          <Skeleton className="h-4 w-1/2 rounded-md" />
          <Skeleton className="mt-2 h-3 w-1/3 rounded-md" />
          <Skeleton className="mt-3 h-11 w-full rounded-xl" />
        </NeoCard>
      ))}
    </ScrollView>
  );
}

function EmptyInstallList() {
  return (
    <NeoCard className="items-center border-dashed border-border bg-card py-12">
      <View className="mb-4 h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon name="ListX" className="text-muted-foreground" size={22} />
      </View>
      <Text className="text-base font-bold text-foreground">No install items</Text>
      <Text className="mt-1 px-5 text-center text-xs text-muted-foreground">
        Add install cost items for this builder task in web admin if the list is empty.
      </Text>
    </NeoCard>
  );
}

export function ModelInstallCostV2Step({
  modelId,
  initialBuilderTaskId,
  requestBuilderTaskId,
  jobId,
  contractorId,
  onNotifyContractor,
  isNotifyingContractor,
}: ModelInstallCostV2StepProps) {
  const [selectedBuilderTaskId, setSelectedBuilderTaskId] = useState<number | null>(
    initialBuilderTaskId || null,
  );
  const [addSearchQuery, setAddSearchQuery] = useState("");
  const [drafts, setDrafts] = useState<
    Record<
      number,
      {
        qty: string;
        status: "active" | "inactive";
      }
    >
  >({});
  const autosaveTimersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const taskTabsScrollRef = useRef<ScrollView>(null);
  const horizontalScrollXRef = useRef(0);

  const { data: builderTaskData, isPending: isBuilderTaskPending } = useQuery(
    _trpc.community.getModelBuilderTasks.queryOptions(
      {
        modelId: modelId || -1,
      },
      {
        enabled: !!modelId,
      },
    ),
  );

  useEffect(() => {
    if (!builderTaskData?.builderTasks?.length) return;
    if (
      initialBuilderTaskId &&
      builderTaskData.builderTasks.some((item) => item.id === initialBuilderTaskId)
    ) {
      setSelectedBuilderTaskId(initialBuilderTaskId);
      return;
    }
    setSelectedBuilderTaskId(builderTaskData.builderTasks[0]?.id || null);
  }, [builderTaskData?.builderTasks, initialBuilderTaskId]);

  const { data: installData, isPending: isInstallTasksPending } = useQuery(
    _trpc.community.getModelInstallTasksByBuilderTask.queryOptions(
      {
        builderTaskId: selectedBuilderTaskId || -1,
        modelId: modelId || -1,
      },
      {
        enabled: !!selectedBuilderTaskId && !!modelId,
      },
    ),
  );
  const { data: suggestions, isPending: isSuggestionsPending } = useQuery(
    _trpc.community.getInstallCostRatesSuggestions.queryOptions(
      {
        builderTaskId: selectedBuilderTaskId || -1,
        modelId: modelId || -1,
      },
      {
        enabled: !!selectedBuilderTaskId && !!modelId,
      },
    ),
  );

  const installTasks = useMemo(
    () => (installData?.tasks || []) as InstallTaskItem[],
    [installData?.tasks],
  );

  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        installTasks.map((item) => [
          item.installCostModelId,
          {
            qty: item.qty === null || item.qty === undefined ? "" : String(item.qty),
            status: item.status || "inactive",
          },
        ]),
      ),
    );
  }, [installTasks]);

  const { mutate: updateTask, isPending: isUpdatingTask } = useMutation(
    _trpc.community.updateCommunityModelInstallTask.mutationOptions({
      onSuccess() {
        _qc.invalidateQueries({
          queryKey: _trpc.community.getModelInstallTasksByBuilderTask.queryKey(),
        });
        _qc.invalidateQueries({
          queryKey: _trpc.community.getJobForm.queryKey(),
        });
      },
      meta: {
        toastTitle: {
          error: "Failed to update install item",
          loading: "Updating...",
          success: "Install item updated",
          show: false,
        },
      },
    }),
  );

  const installTaskMap = useMemo(
    () =>
      Object.fromEntries(
        installTasks.map((task) => [task.installCostModelId, task]),
      ) as Record<number, InstallTaskItem>,
    [installTasks],
  );

  const saveTaskDraft = useCallback(
    (task: InstallTaskItem, draft: { qty: string; status: "active" | "inactive" }) => {
      if (!modelId || !selectedBuilderTaskId) return;
      const parsedQty = draft.qty.trim() ? Number(draft.qty) : null;
      if (draft.qty.trim() && Number.isNaN(parsedQty)) return;

      const existingQty =
        task.qty === null || task.qty === undefined ? null : Number(task.qty);
      const existingStatus = task.status || "inactive";
      if (parsedQty === existingQty && draft.status === existingStatus) return;

      updateTask({
        id: task.id,
        qty: parsedQty,
        builderTaskInstallCostId: task.builderTaskInstallCostId,
        builderTaskId: selectedBuilderTaskId,
        installCostModelId: task.installCostModelId,
        communityModelId: modelId,
        status: draft.status,
      });
    },
    [modelId, selectedBuilderTaskId, updateTask],
  );

  const queueAutosave = useCallback(
    (
      installCostModelId: number,
      draft: { qty: string; status: "active" | "inactive" },
    ) => {
      const task = installTaskMap[installCostModelId];
      if (!task) return;

      const currentTimer = autosaveTimersRef.current[installCostModelId];
      if (currentTimer) clearTimeout(currentTimer);

      autosaveTimersRef.current[installCostModelId] = setTimeout(() => {
        saveTaskDraft(task, draft);
      }, 700);
    },
    [installTaskMap, saveTaskDraft],
  );

  const handleAddInstallItem = useCallback(
    (installCostModelId: number) => {
      if (!modelId || !selectedBuilderTaskId) return;
      if (installTaskMap[installCostModelId]) {
        Toast.show("This install item already exists on this task.", {
          type: "warning",
        });
        return;
      }

      updateTask({
        id: null,
        qty: 0,
        builderTaskInstallCostId: null,
        builderTaskId: selectedBuilderTaskId,
        installCostModelId,
        communityModelId: modelId,
        status: "active",
      });
      setAddSearchQuery("");
    },
    [installTaskMap, modelId, selectedBuilderTaskId, updateTask],
  );

  const filteredSuggestions = useMemo(() => {
    const q = addSearchQuery.trim().toLowerCase();
    const list = (suggestions || []).filter((item) => !installTaskMap[item.id]);
    if (!q) return list;
    return list.filter((item) => String(item.title || "").toLowerCase().includes(q));
  }, [addSearchQuery, installTaskMap, suggestions]);

  const canNotifyContractor = useMemo(
    () =>
      !!requestBuilderTaskId &&
      !!jobId &&
      !!contractorId &&
      selectedBuilderTaskId === requestBuilderTaskId,
    [contractorId, jobId, requestBuilderTaskId, selectedBuilderTaskId],
  );

  useEffect(() => {
    const timers = autosaveTimersRef.current;
    return () => {
      Object.values(timers).forEach((timer) => {
        clearTimeout(timer);
      });
    };
  }, []);

  if (isBuilderTaskPending) return <StepSkeleton />;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 120 : 24}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerClassName="gap-3 pb-36"
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        automaticallyAdjustKeyboardInsets
      >
        <NeoCard className="bg-card">
          <Text className="text-sm font-bold text-foreground">
            {builderTaskData?.modelName || "Model"}{" "}
            {builderTaskData?.builderName ? `- ${builderTaskData.builderName}` : ""}
          </Text>
          <Text className="mt-1 text-xs text-muted-foreground">
            Configure quantities and status for builder task install items.
          </Text>
        </NeoCard>

        <View className="rounded-2xl border border-border bg-card px-3 py-2">
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => {
                const nextX = Math.max(0, horizontalScrollXRef.current - 180);
                taskTabsScrollRef.current?.scrollTo({ x: nextX, animated: true });
              }}
              className="h-9 w-9 items-center justify-center rounded-full border border-border bg-background active:opacity-80"
            >
              <Icon name="ChevronLeft" className="text-foreground" size={16} />
            </Pressable>

            <ScrollView
              ref={taskTabsScrollRef}
              horizontal
              className="flex-1"
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
              nestedScrollEnabled
              directionalLockEnabled
              onScroll={(event) => {
                horizontalScrollXRef.current = event.nativeEvent.contentOffset.x;
              }}
              scrollEventThrottle={16}
            >
              {(builderTaskData?.builderTasks || []).map((task) => {
                const selected = selectedBuilderTaskId === task.id;
                return (
                  <Pressable
                    key={task.id}
                    onPress={() => setSelectedBuilderTaskId(task.id)}
                    className={`rounded-full border px-4 py-2 ${selected ? "border-primary bg-primary/10" : "border-border bg-background"}`}
                  >
                    <Text className={selected ? "text-primary" : "text-foreground"}>
                      {task.taskName}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable
              onPress={() => {
                const nextX = horizontalScrollXRef.current + 180;
                taskTabsScrollRef.current?.scrollTo({ x: nextX, animated: true });
              }}
              className="h-9 w-9 items-center justify-center rounded-full border border-border bg-background active:opacity-80"
            >
              <Icon name="ChevronRight" className="text-foreground" size={16} />
            </Pressable>
          </View>
        </View>

        {canNotifyContractor ? (
          <NeoCard className="border-primary/30 bg-primary/5">
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-1">
                <Text className="text-sm font-bold text-foreground">
                  Job task request ready
                </Text>
                <Text className="mt-1 text-xs text-muted-foreground">
                  Notify contractor now that the requested task configuration is ready.
                </Text>
              </View>
              <Pressable
                onPress={() => onNotifyContractor?.()}
                disabled={isNotifyingContractor}
                className={`rounded-xl px-4 py-2 ${isNotifyingContractor ? "bg-muted" : "bg-primary"}`}
              >
                <Text
                  className={
                    isNotifyingContractor
                      ? "text-xs font-semibold text-muted-foreground"
                      : "text-xs font-semibold text-primary-foreground"
                  }
                >
                  {isNotifyingContractor ? "Notifying..." : "Notify Contractor"}
                </Text>
              </Pressable>
            </View>
          </NeoCard>
        ) : null}

        <NeoCard className="border-dashed border-border bg-card">
        <Text className="mb-2 text-xs font-bold uppercase tracking-[1px] text-muted-foreground">
          Add Install Task Item
        </Text>
        <SearchInput
          size="sm"
          className="px-0 py-0"
          placeholder="Search global costs..."
          value={addSearchQuery}
          onChangeText={setAddSearchQuery}
        />
        <View className="mt-2 gap-2">
          {isSuggestionsPending ? (
            <Skeleton className="h-10 w-full rounded-xl" />
          ) : !filteredSuggestions.length ? (
            <View className="rounded-xl border border-border bg-background px-3 py-2">
              <Text className="text-xs text-muted-foreground">
                No matching install costs available.
              </Text>
            </View>
          ) : (
            filteredSuggestions.slice(0, 6).map((item) => (
              <Pressable
                key={item.id}
                onPress={() => handleAddInstallItem(item.id)}
                className="flex-row items-center justify-between rounded-xl border border-border bg-background px-3 py-2 active:opacity-80"
              >
                <View className="flex-1 pr-3">
                  <Text className="text-sm font-semibold text-foreground">{item.title}</Text>
                  <Text className="text-xs text-muted-foreground">
                    ${Number(item.unitCost || 0).toFixed(2)}
                    {item.unit ? ` / ${item.unit}` : ""}
                  </Text>
                </View>
                <Icon name="PlusCircle" className="text-primary" size={16} />
              </Pressable>
            ))
          )}
        </View>
        </NeoCard>

        {isInstallTasksPending ? <StepSkeleton /> : null}

        {!isInstallTasksPending && !installTasks.length ? <EmptyInstallList /> : null}

        {!isInstallTasksPending &&
          installTasks.map((task) => {
          const draft = drafts[task.installCostModelId] || {
            qty: "",
            status: task.status || "inactive",
          };
          return (
            <NeoCard key={task.installCostModelId} className="bg-card">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-sm font-bold text-foreground">
                    {task.installCostModel?.title || "Install Item"}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    ${Number(task.installCostModel?.unitCost || 0).toFixed(2)}
                    {task.installCostModel?.unit ? ` / ${task.installCostModel.unit}` : ""}
                  </Text>
                </View>
                <Pressable
                  className={`rounded-full border px-3 py-1 ${draft.status === "active" ? "border-primary bg-primary/15" : "border-border bg-background"}`}
                  onPress={() => {
                    const nextDraft = {
                      ...draft,
                      status:
                        draft.status === "active"
                          ? "inactive"
                          : "active",
                    } as const;
                    setDrafts((prev) => ({
                      ...prev,
                      [task.installCostModelId]: nextDraft,
                    }));
                    queueAutosave(task.installCostModelId, nextDraft);
                  }}
                >
                  <Text
                    className={
                      draft.status === "active"
                        ? "text-xs font-semibold text-primary"
                        : "text-xs font-semibold text-muted-foreground"
                    }
                  >
                    {draft.status}
                  </Text>
                </Pressable>
              </View>

              <View className="mt-3 flex-row items-center gap-2">
                <TextInput
                  keyboardType="decimal-pad"
                  value={draft.qty}
                  onChangeText={(text) => {
                    const nextDraft = {
                      ...draft,
                      qty: text.replace(/[^0-9.]/g, ""),
                    };
                    setDrafts((prev) => ({
                      ...prev,
                      [task.installCostModelId]: nextDraft,
                    }));
                    queueAutosave(task.installCostModelId, nextDraft);
                  }}
                  className="h-11 flex-1 rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                  placeholder="Max qty"
                  placeholderTextColor="hsl(var(--muted-foreground))"
                />
                <View className="h-11 min-w-16 items-center justify-center px-2">
                  <Text className="text-[11px] text-muted-foreground">
                    {isUpdatingTask ? "Saving..." : "Auto"}
                  </Text>
                </View>
              </View>
            </NeoCard>
          );
        })}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
