import { Icon } from "@/components/ui/icon";
import type { FilterItem } from "@/features/sales/types/sales.types";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useMemo, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  filters: FilterItem[];
  selected: Record<string, string | null | undefined>;
  onApply: (selected: Record<string, string | null | undefined>) => void;
};

export function OrdersFilterModal({
  open,
  onClose,
  filters,
  selected,
  onApply,
}: Props) {
  const [activeFilter, setActiveFilter] = useState<FilterItem | null>(null);
  const [draft, setDraft] = useState<Record<string, string | null | undefined>>(selected);

  const title = useMemo(() => {
    if (!activeFilter) return "Filters";
    return activeFilter.label;
  }, [activeFilter]);

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[80%] rounded-t-3xl border border-border bg-background px-4 pb-6 pt-3">
          <View className="mb-3 flex-row items-center justify-between">
            <Pressable
              onPress={() => {
                if (activeFilter) {
                  setActiveFilter(null);
                  return;
                }
                onClose();
              }}
              className="h-10 w-10 items-center justify-center rounded-full active:bg-muted"
            >
              <Icon
                name={activeFilter ? "ChevronLeft" : "X"}
                className="text-foreground"
                size={20}
              />
            </Pressable>
            <Text className="text-base font-semibold text-foreground">{title}</Text>
            <Pressable
              onPress={() => {
                setDraft({});
                setActiveFilter(null);
              }}
              className="rounded-full px-3 py-1 active:bg-muted"
            >
              <Text className="text-xs font-semibold text-muted-foreground">Clear</Text>
            </Pressable>
          </View>

          {!activeFilter ? (
            <ScrollView>
              <View className="gap-2 pb-4">
                {filters.map((filter) => {
                  const value = draft[filter.value];
                  const selectedLabel = filter.options?.find(
                    (opt) => opt.value === value,
                  )?.label;
                  return (
                    <Pressable
                      key={filter.value}
                      onPress={() => setActiveFilter(filter)}
                      className="rounded-xl border border-border bg-card px-4 py-3 active:opacity-80"
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1 pr-3">
                          <Text className="text-sm font-semibold text-foreground">
                            {filter.label}
                          </Text>
                          <Text className="mt-1 text-xs text-muted-foreground">
                            {selectedLabel || "Any"}
                          </Text>
                        </View>
                        <Icon
                          name="ChevronRight"
                          className="text-muted-foreground"
                          size={18}
                        />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          ) : (
            <ScrollView>
              <View className="gap-2 pb-4">
                {(activeFilter.options || []).map((option) => {
                  const isSelected = draft[activeFilter.value] === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => {
                        setDraft((prev) => ({
                          ...prev,
                          [activeFilter.value]: isSelected ? null : option.value,
                        }));
                      }}
                      className="rounded-xl border border-border bg-card px-4 py-3 active:opacity-80"
                    >
                      <View className="flex-row items-center justify-between">
                        <Text className="text-sm font-semibold text-foreground">
                          {option.label}
                        </Text>
                        {isSelected ? (
                          <Icon name="CircleCheck" className="text-primary" size={18} />
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
                {!activeFilter.options?.length ? (
                  <View className="rounded-xl border border-border bg-card px-4 py-3">
                    <Text className="text-sm text-muted-foreground">
                      No options available for this filter.
                    </Text>
                  </View>
                ) : null}
              </View>
            </ScrollView>
          )}

          <View className="mt-2 flex-row gap-2">
            <Pressable
              onPress={onClose}
              className="h-11 flex-1 items-center justify-center rounded-xl border border-border"
            >
              <Text className="text-sm font-semibold text-foreground">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                onApply(draft);
                onClose();
              }}
              className="h-11 flex-1 items-center justify-center rounded-xl bg-primary"
            >
              <Text className="text-sm font-semibold text-primary-foreground">Apply</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
