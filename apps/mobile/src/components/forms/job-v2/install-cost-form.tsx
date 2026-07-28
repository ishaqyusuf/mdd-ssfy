import { _qc, _trpc } from "@/components/static-trpc";
import { SearchInput } from "@/components/search-input";
import { Icon } from "@/components/ui/icon";
import { Modal, useModal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Toast } from "@/components/ui/toast";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
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

export interface InstallCostFormProps {
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
      <Text className="text-base font-bold text-foreground">
        No install items
      </Text>
      <Text className="mt-1 px-5 text-center text-xs text-muted-foreground">
        Add install cost items for this builder task in web admin if the list is
        empty.
      </Text>
    </NeoCard>
  );
}

export function InstallCostForm({
  modelId,
  initialBuilderTaskId,
  requestBuilderTaskId,
  jobId,
  contractorId,
  onNotifyContractor,
  isNotifyingContractor,
}: InstallCostFormProps) {
  const [selectedBuilderTaskId, setSelectedBuilderTaskId] = useState<
    number | null
  >(initialBuilderTaskId || null);
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
  const autosaveTimersRef = useRef<
    Record<number, ReturnType<typeof setTimeout>>
  >({});
  const taskTabsScrollRef = useRef<ScrollView>(null);
  const horizontalScrollXRef = useRef(0);
  const {
    ref: addInstallModalRef,
    present: presentAddInstallModal,
    dismiss: dismissAddInstallModal,
  } = useModal();
  const {
    ref: createInstallModalRef,
    present: presentCreateInstallModal,
    dismiss: dismissCreateInstallModal,
  } = useModal();
  const [createInstallTitle, setCreateInstallTitle] = useState("");
  const [createInstallCost, setCreateInstallCost] = useState("");

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
      builderTaskData.builderTasks.some(
        (item) => item.id === initialBuilderTaskId,
      )
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
    setDrafts((prev) =>
      Object.fromEntries(
        installTasks.map((item) => [
          item.installCostModelId,
          item.installCostModelId in prev
            ? prev[item.installCostModelId]!
            : {
                qty:
                  item.qty === null || item.qty === undefined
                    ? ""
                    : String(item.qty),
                status: item.status || "inactive",
              },
        ]),
      ),
    );
  }, [installTasks]);

  const { mutate: updateTask } = useMutation(
    _trpc.community.updateCommunityModelInstallTask.mutationOptions({
      onSuccess() {
        _qc.invalidateQueries({
          queryKey:
            _trpc.community.getModelInstallTasksByBuilderTask.queryKey(),
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
  const {
    mutateAsync: updateInstallCostRate,
    isPending: isCreatingInstallCostRate,
  } = useMutation(_trpc.community.updateInstallCostRate.mutationOptions());

  const installTaskMap = useMemo(
    () =>
      Object.fromEntries(
        installTasks.map((task) => [task.installCostModelId, task]),
      ) as Record<number, InstallTaskItem>,
    [installTasks],
  );

  const saveTaskDraft = useCallback(
    (
      task: InstallTaskItem,
      draft: { qty: string; status: "active" | "inactive" },
    ) => {
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

  const handleOpenAddModal = useCallback(() => {
    if (!selectedBuilderTaskId) {
      Toast.show("Select a builder task before adding install items.", {
        type: "warning",
      });
      return;
    }
    presentAddInstallModal();
  }, [presentAddInstallModal, selectedBuilderTaskId]);

  const handleCreateInstallRate = useCallback(async () => {
    const title = createInstallTitle.trim();
    const cost = Number(createInstallCost);
    if (!title) {
      Toast.show("Enter a title to create install item.", { type: "warning" });
      return;
    }
    if (!Number.isFinite(cost) || cost < 0) {
      Toast.show("Enter a valid cost amount.", { type: "warning" });
      return;
    }

    try {
      const created = await updateInstallCostRate({
        id: null,
        title,
        unitCost: cost,
        unit: null,
        status: "active",
      });
      if (!created?.id) {
        Toast.show("Unable to create install item right now.", {
          type: "error",
        });
        return;
      }

      handleAddInstallItem(created.id);
      dismissCreateInstallModal();
      dismissAddInstallModal();
      setCreateInstallTitle("");
      setCreateInstallCost("");
      setAddSearchQuery("");
      Toast.show("Install item created and added.", { type: "success" });
    } catch {
      Toast.show("Failed to create install item.", { type: "error" });
    }
  }, [
    createInstallCost,
    createInstallTitle,
    dismissAddInstallModal,
    dismissCreateInstallModal,
    handleAddInstallItem,
    updateInstallCostRate,
  ]);

  const filteredSuggestions = useMemo(() => {
    const q = addSearchQuery.trim().toLowerCase();
    const list = (suggestions || []).filter((item) => !installTaskMap[item.id]);
    if (!q) return list;
    return list.filter((item) =>
      String(item.title || "")
        .toLowerCase()
        .includes(q),
    );
  }, [addSearchQuery, installTaskMap, suggestions]);
  const trimmedSearchQuery = addSearchQuery.trim();
  const shouldShowCreateOption = trimmedSearchQuery.length > 0;

  const canNotifyContractor = useMemo(
    () =>
      !!requestBuilderTaskId &&
      !!jobId &&
      !!contractorId &&
      selectedBuilderTaskId === requestBuilderTaskId,
    [contractorId, jobId, requestBuilderTaskId, selectedBuilderTaskId],
  );
  const sumMaxQty = useMemo(
    () =>
      installTasks.reduce((total, task) => {
        const qty = Number(task.qty || 0);
        return Number.isFinite(qty) && qty > 0 ? total + qty : total;
      }, 0),
    [installTasks],
  );
  const possibleTotalCost = useMemo(
    () =>
      installTasks.reduce((total, task) => {
        if (task.status !== "active") return total;
        const qty = Number(task.qty || 0);
        const unitCost = Number(task.installCostModel?.unitCost || 0);
        if (!Number.isFinite(qty) || qty <= 0) return total;
        if (!Number.isFinite(unitCost) || unitCost <= 0) return total;
        return total + qty * unitCost;
      }, 0),
    [installTasks],
  );
  const showNotifyFooter = canNotifyContractor && sumMaxQty > 0;

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
        contentContainerClassName={
          showNotifyFooter ? "gap-3 pb-44" : "gap-3 pb-36"
        }
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        automaticallyAdjustKeyboardInsets
      >
        <View className="rounded-2xl border border-border bg-card px-3 py-2">
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => {
                const nextX = Math.max(0, horizontalScrollXRef.current - 180);
                taskTabsScrollRef.current?.scrollTo({
                  x: nextX,
                  animated: true,
                });
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
                horizontalScrollXRef.current =
                  event.nativeEvent.contentOffset.x;
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
                    <Text
                      className={selected ? "text-primary" : "text-foreground"}
                    >
                      {task.taskName}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable
              onPress={() => {
                const nextX = horizontalScrollXRef.current + 180;
                taskTabsScrollRef.current?.scrollTo({
                  x: nextX,
                  animated: true,
                });
              }}
              className="h-9 w-9 items-center justify-center rounded-full border border-border bg-background active:opacity-80"
            >
              <Icon name="ChevronRight" className="text-foreground" size={16} />
            </Pressable>
          </View>
        </View>

        {isInstallTasksPending ? <StepSkeleton /> : null}

        {!isInstallTasksPending && !installTasks.length ? (
          <EmptyInstallList />
        ) : null}

        {!isInstallTasksPending &&
          installTasks.map((task, index) => {
            const draft = drafts[task.installCostModelId] || {
              qty: "",
              status: task.status || "inactive",
            };
            const unitCost = Number(task.installCostModel?.unitCost || 0);
            const qty = Number(draft.qty || 0);
            const lineTotal = Number.isFinite(qty) ? qty * unitCost : 0;
            const setStatus = (status: "active" | "inactive") => {
              const nextDraft = { ...draft, status } as const;
              setDrafts((prev) => ({
                ...prev,
                [task.installCostModelId]: nextDraft,
              }));
              queueAutosave(task.installCostModelId, nextDraft);
            };

            return (
              <View
                key={task.installCostModelId}
                className={`px-3 py-4 ${index < installTasks.length - 1 ? "border-b border-border" : ""}`}
              >
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-foreground">
                      {task.installCostModel?.title || "Install Item"}
                    </Text>
                    <Text className="mt-0.5 text-xs text-muted-foreground">
                      ${unitCost.toFixed(2)}
                      {task.installCostModel?.unit
                        ? ` / ${task.installCostModel.unit}`
                        : ""}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() =>
                      setStatus(
                        draft.status === "active" ? "inactive" : "active",
                      )
                    }
                    className="h-6 w-6 items-center justify-center rounded-md border border-border"
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: draft.status === "active" }}
                  >
                    {draft.status === "active" ? (
                      <Icon name="Check" className="text-primary" size={14} />
                    ) : null}
                  </Pressable>
                </View>

                <View className="mt-3 flex-row items-center gap-2">
                  <View className="h-11 flex-1 flex-row items-center rounded-xl border border-border bg-card px-3">
                    <Text className="mr-2 text-xs font-semibold text-muted-foreground">
                      Qty
                    </Text>
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
                      className="flex-1 text-sm text-foreground"
                      placeholder="0"
                      placeholderTextColor="hsl(var(--muted-foreground))"
                    />
                  </View>
                  <View className="min-w-20 items-end">
                    <Text className="text-[10px] uppercase tracking-[1px] text-muted-foreground">
                      Total
                    </Text>
                    <Text className="text-sm font-semibold text-foreground">
                      ${lineTotal.toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
      </ScrollView>
      <Pressable
        onPress={handleOpenAddModal}
        className={`absolute right-4 h-14 w-14 items-center justify-center rounded-full bg-primary shadow ${showNotifyFooter ? "bottom-28" : "bottom-8"}`}
        accessibilityRole="button"
        accessibilityLabel="Add install task item"
      >
        <Icon name="Plus" className="text-primary-foreground" size={22} />
      </Pressable>

      <Modal
        ref={addInstallModalRef}
        title="Add Install Task Item"
        snapPoints={["82%"]}
      >
        <BottomSheetScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <SearchInput
            size="sm"
            className="px-0 py-0"
            placeholder="Search global costs..."
            value={addSearchQuery}
            onChangeText={setAddSearchQuery}
          />
          <View className="mt-3 gap-2">
            {shouldShowCreateOption ? (
              <Pressable
                onPress={() => {
                  setCreateInstallTitle(trimmedSearchQuery);
                  setCreateInstallCost("");
                  presentCreateInstallModal();
                }}
                className="flex-row items-center justify-between rounded-xl border border-dashed border-primary/60 bg-primary/5 px-3 py-3 active:opacity-80"
              >
                <View className="flex-1 pr-3">
                  <Text className="text-sm font-semibold text-primary">
                    Create &quot;{trimmedSearchQuery}&quot;
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    Add this as a new global install cost rate.
                  </Text>
                </View>
                <Icon name="PlusCircle" className="text-primary" size={18} />
              </Pressable>
            ) : null}

            {isSuggestionsPending ? (
              <Skeleton className="h-10 w-full rounded-xl" />
            ) : !filteredSuggestions.length ? (
              <View className="rounded-xl border border-border bg-background px-3 py-2">
                <Text className="text-xs text-muted-foreground">
                  No matching install costs available.
                </Text>
              </View>
            ) : (
              filteredSuggestions.slice(0, 20).map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    handleAddInstallItem(item.id);
                    dismissAddInstallModal();
                  }}
                  className="flex-row items-center justify-between rounded-xl border border-border bg-background px-3 py-2 active:opacity-80"
                >
                  <View className="flex-1 pr-3">
                    <Text className="text-sm font-semibold text-foreground">
                      {item.title}
                    </Text>
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
        </BottomSheetScrollView>
      </Modal>

      <Modal
        ref={createInstallModalRef}
        title="Create Install Item"
        snapPoints={["55%"]}
      >
        <BottomSheetScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="gap-3">
            <View>
              <Text className="mb-1 text-xs font-semibold uppercase tracking-[1px] text-muted-foreground">
                Title
              </Text>
              <TextInput
                value={createInstallTitle}
                onChangeText={setCreateInstallTitle}
                className="h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                placeholder="Install item title"
                placeholderTextColor="hsl(var(--muted-foreground))"
              />
            </View>

            <View>
              <Text className="mb-1 text-xs font-semibold uppercase tracking-[1px] text-muted-foreground">
                Cost
              </Text>
              <TextInput
                value={createInstallCost}
                onChangeText={(value) =>
                  setCreateInstallCost(value.replace(/[^0-9.]/g, ""))
                }
                keyboardType="decimal-pad"
                className="h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                placeholder="0.00"
                placeholderTextColor="hsl(var(--muted-foreground))"
              />
            </View>

            <Pressable
              onPress={handleCreateInstallRate}
              disabled={isCreatingInstallCostRate}
              className={`mt-2 h-11 items-center justify-center rounded-xl ${isCreatingInstallCostRate ? "bg-muted" : "bg-primary"}`}
            >
              <Text
                className={
                  isCreatingInstallCostRate
                    ? "text-sm font-semibold text-muted-foreground"
                    : "text-sm font-semibold text-primary-foreground"
                }
              >
                {isCreatingInstallCostRate ? "Saving..." : "Save"}
              </Text>
            </Pressable>
          </View>
        </BottomSheetScrollView>
      </Modal>

      {showNotifyFooter ? (
        <View className="absolute bottom-0 left-0 right-0 border-t border-border bg-background px-4 pb-6 pt-3">
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <Text className="text-[11px] uppercase tracking-[1px] text-muted-foreground">
                Possible Total Cost
              </Text>
              <Text className="mt-0.5 text-lg font-bold text-foreground">
                ${possibleTotalCost.toFixed(2)}
              </Text>
              <Text className="mt-1 text-xs text-muted-foreground">
                Job task request ready
              </Text>
            </View>
            <Pressable
              onPress={() => onNotifyContractor?.()}
              disabled={isNotifyingContractor}
              className={`min-h-11 justify-center rounded-xl px-4 ${isNotifyingContractor ? "bg-muted" : "bg-primary"}`}
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
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
