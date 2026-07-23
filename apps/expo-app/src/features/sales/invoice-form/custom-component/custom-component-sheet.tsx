import { _trpc } from "@/components/static-trpc";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Modal, useModal } from "@/components/ui/modal";
import { Text } from "@/components/ui/text";
import {
  profileAdjustedSalesPrice,
  readSalesFormObjectMetadata,
  type WorkflowComponentRecord,
  type WorkflowStepRecord,
} from "@gnd/sales/sales-form-core";
import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  TextInput as RNTextInput,
  View,
  type TextInputProps,
} from "react-native";
import { FloatingInvoiceAction } from "../components/floating-invoice-action";
import {
  buildCustomOptions,
  canProceedCustomComponentDetails,
  customComponentPriceChanged,
  customOptionToWorkflowComponent,
  findCustomOptionByTitle,
  mergeSelectedCustomComponents,
  normalizeCustomComponentTitleInput,
  orderSelectedCustomFirst,
  stepSupportsCustomComponents,
  type CustomComponentOption,
} from "./custom-component-options";

export {
  mergeSelectedCustomComponents,
  orderSelectedCustomFirst,
  stepSupportsCustomComponents,
} from "./custom-component-options";

type SheetMode = "search" | "details";

const CUSTOM_COMPONENT_IMAGE_ID = "ff8zkn817rjqv6ml2qdr";
const CUSTOM_COMPONENT_SNAP_POINTS = ["42%", "100%"];

export function CustomComponentSheet({
  step,
  components,
  profileCoefficient,
  footerOffset,
  onSaved,
  onOptionsChanged,
}: {
  step?: WorkflowStepRecord | null;
  components: WorkflowComponentRecord[];
  profileCoefficient?: number | null;
  footerOffset: number;
  onSaved: (component: WorkflowComponentRecord) => void;
  onOptionsChanged?: () => void;
}) {
  const modal = useModal();
  const [mode, setMode] = useState<SheetMode>("search");
  const [title, setTitle] = useState("");
  const [cost, setCost] = useState("");
  const [selectedOption, setSelectedOption] =
    useState<CustomComponentOption | null>(null);
  const [pendingArchiveKey, setPendingArchiveKey] = useState<string | null>(null);
  const [archivedOptionKeys, setArchivedOptionKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const stepId = Number(step?.stepId || step?.step?.id || 0);
  const options = useMemo(
    () =>
      buildCustomOptions(components).filter(
        (option) => !archivedOptionKeys.has(customOptionKey(option)),
      ),
    [archivedOptionKeys, components],
  );
  const normalizedTitle = normalizeCustomComponentTitleInput(title);
  const query = normalizedTitle.toLowerCase();
  const results = useMemo(
    () =>
      query
        ? options.filter((option) =>
            option.title.toLowerCase().includes(query),
          )
        : options,
    [options, query],
  );
  const saveMutation = useMutation(
    _trpc.inventories.upsertDykeCustomStepComponent.mutationOptions({
      onSuccess(data, variables) {
        const component = mapSavedComponent(
          data,
          variables.price ?? selectedOption?.price ?? null,
          profileCoefficient,
        );
        if (component) onSaved(component);
        modal.dismiss();
        reset();
      },
    }),
  );
  const archiveMutation = useMutation(
    _trpc.inventories.archiveDykeCustomStepComponent.mutationOptions({
      onSuccess(_data, variables) {
        setArchivedOptionKeys((current) => {
          const next = new Set(current);
          next.add(
            customOptionKey({ id: variables.id, uid: variables.uid } as any),
          );
          return next;
        });
        if (
          selectedOption &&
          (Number(selectedOption.id || 0) === Number(variables.id || 0) ||
            String(selectedOption.uid || "") === String(variables.uid || ""))
        ) {
          setSelectedOption(null);
          setTitle("");
          setCost("");
        }
        setPendingArchiveKey(null);
        onOptionsChanged?.();
      },
    }),
  );
  const canProceedFromSearch = normalizedTitle.length > 0;
  const parsedCost = parseCost(cost);
  const canSave = canProceedCustomComponentDetails({
    stepId,
    title,
    selectedOption,
    nextPrice: parsedCost,
    saving: saveMutation.isPending,
  });

  function openSearchSheet() {
    reset();
    setMode("search");
    modal.present();
    requestAnimationFrame(() => modal.ref.current?.snapToIndex(1));
  }

  function reset() {
    setMode("search");
    setTitle("");
    setCost("");
    setSelectedOption(null);
    setPendingArchiveKey(null);
  }

  function continueToDetails(option?: CustomComponentOption | null) {
    const matchedOption = option || findCustomOptionByTitle(options, title);
    if (matchedOption) {
      setSelectedOption(matchedOption);
      setTitle(matchedOption.title);
      setCost(matchedOption.price == null ? "" : String(matchedOption.price));
    } else {
      setTitle(normalizedTitle);
    }
    if (!String(matchedOption?.title || normalizedTitle).trim()) return;
    setMode("details");
    requestAnimationFrame(() => modal.ref.current?.snapToIndex(0));
  }

  function saveCustomComponent() {
    if (!canSave) return;

    const titleForSave = normalizeCustomComponentTitleInput(title);
    const price = parsedCost;
    if (
      selectedOption &&
      selectedOption.title.trim() === titleForSave &&
      !customComponentPriceChanged(selectedOption, price)
    ) {
      onSaved(
        customOptionToWorkflowComponent(
          selectedOption,
          price,
          profileCoefficient,
        ),
      );
      modal.dismiss();
      reset();
      return;
    }
    saveMutation.mutate({
      id: selectedOption?.id,
      uid: selectedOption?.uid || undefined,
      img: CUSTOM_COMPONENT_IMAGE_ID,
      stepId,
      title: titleForSave,
      price,
      pricingId: selectedOption?.pricingId,
      dependenciesUid: selectedOption?.dependenciesUid,
      meta: { custom: true },
    });
  }

  function archiveCustomOption(option: CustomComponentOption) {
    if (archiveMutation.isPending) return;
    if (!option.id && !option.uid) return;
    archiveMutation.mutate({
      id: option.id,
      uid: option.uid || undefined,
    });
  }

  return (
    <>
      <FloatingInvoiceAction
        align="center"
        footerOffset={footerOffset}
        refreshKey={`custom-action-${stepId}-${footerOffset}`}
      >
        <Button
          variant="destructive"
          className="h-12 rounded-full px-6"
          onPress={openSearchSheet}
        >
          <Icon name="Plus" className="text-white" size={18} />
          <Text>Custom</Text>
        </Button>
      </FloatingInvoiceAction>

      <Modal
        ref={modal.ref}
        title={mode === "search" ? undefined : "Title & Cost"}
        snapPoints={CUSTOM_COMPONENT_SNAP_POINTS}
        onDismiss={reset}
      >
        {mode === "search" ? (
          <View className="flex-1 px-4 pb-5">
            <View className="gap-2">
              <Text className="text-xs font-bold uppercase text-muted-foreground">
                Custom Component Title
              </Text>
              <View className="h-12 flex-row items-center rounded-xl border border-border bg-card px-3">
                <Icon name="Search" className="text-muted-foreground" size={18} />
                <TextInput
                  value={title}
                  onChangeText={(value) => {
                    setTitle(value);
                    setSelectedOption(null);
                  }}
                  placeholder="Search or create custom component"
                  placeholderTextColor="#8A8A8A"
                  className="ml-2 flex-1 text-foreground"
                />
              </View>
            </View>
            <FlatList
              data={results}
              keyExtractor={(item) => String(item.uid || item.id || item.title)}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingTop: 14, paddingBottom: 86 }}
              ListEmptyComponent={
                <View className="rounded-2xl border border-border bg-card p-5">
                  <Text className="text-sm font-bold text-foreground">
                    No custom component found
                  </Text>
                  <Text className="mt-1 text-xs text-muted-foreground">
                    Proceed to create this title.
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <CustomOptionRow
                  item={item}
                  pendingArchiveKey={pendingArchiveKey}
                  disabled={archiveMutation.isPending}
                  onSelect={() => continueToDetails(item)}
                  onRequestArchive={() =>
                    setPendingArchiveKey(customOptionKey(item))
                  }
                  onCancelArchive={() => setPendingArchiveKey(null)}
                  onConfirmArchive={() => archiveCustomOption(item)}
                />
              )}
            />
            <View className="absolute inset-x-0 bottom-0 border-t border-border bg-card px-4 pb-5 pt-3">
              <Button
                className="h-12 w-full rounded-xl"
                disabled={!canProceedFromSearch}
                onPress={() => continueToDetails(null)}
              >
                <Text>Proceed</Text>
              </Button>
            </View>
          </View>
        ) : (
          <View className="gap-4 px-4 pb-5">
            <View className="gap-2">
              <Text className="text-xs font-bold uppercase text-muted-foreground">
                Title
              </Text>
              <TextInput
                value={title}
                onChangeText={(value) => {
                  setTitle(value);
                  if (
                    selectedOption &&
                    selectedOption.title !== normalizeCustomComponentTitleInput(value)
                  ) {
                    setSelectedOption(null);
                  }
                }}
                placeholder="Custom component title"
                placeholderTextColor="#8A8A8A"
                className="h-12 rounded-xl border border-border bg-card px-3 text-foreground"
              />
            </View>
            <View className="gap-2">
              <Text className="text-xs font-bold uppercase text-muted-foreground">
                Cost
              </Text>
              <TextInput
                value={cost}
                onChangeText={setCost}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#8A8A8A"
                className="h-12 rounded-xl border border-border bg-card px-3 text-right text-foreground"
              />
            </View>
            <View className="flex-row gap-2">
              <Button
                variant="outline"
                className="h-11 flex-1 rounded-xl"
                onPress={() => {
                  modal.dismiss();
                  reset();
                }}
              >
                <Text>Cancel</Text>
              </Button>
              <Button
                className="h-11 flex-1 rounded-xl"
                disabled={!canSave}
                onPress={saveCustomComponent}
              >
                <Text>{saveMutation.isPending ? "Saving..." : "Proceed"}</Text>
              </Button>
            </View>
          </View>
        )}
      </Modal>
    </>
  );
}

function mapSavedComponent(
  value: unknown,
  costPrice?: number | null,
  profileCoefficient?: number | null,
): WorkflowComponentRecord | null {
  const data = readSalesFormObjectMetadata(value);
  const component = data ? readSalesFormObjectMetadata(data.component) : null;
  if (!component) return null;
  const basePrice = firstFiniteNumber(
    costPrice,
    component.basePrice,
    component.salesPrice,
  );
  const salesPrice = profileAdjustedSalesPrice(
    component.salesPrice,
    basePrice,
    profileCoefficient,
  );
  return {
    ...component,
    id: component.id == null ? null : Number(component.id || 0),
    uid: String(component.uid || component.id || ""),
    title: normalizeCustomComponentTitleInput(
      component.title || component.name || "Component",
    ),
    salesPrice,
    basePrice,
    custom: true,
    _metaData: {
      ...(readSalesFormObjectMetadata(component._metaData) || {}),
      custom: true,
    },
  };
}

function CustomOptionRow({
  item,
  pendingArchiveKey,
  disabled,
  onSelect,
  onRequestArchive,
  onCancelArchive,
  onConfirmArchive,
}: {
  item: CustomComponentOption;
  pendingArchiveKey: string | null;
  disabled?: boolean;
  onSelect: () => void;
  onRequestArchive: () => void;
  onCancelArchive: () => void;
  onConfirmArchive: () => void;
}) {
  const archivePending = pendingArchiveKey === customOptionKey(item);
  const canArchive = Boolean(item.id || item.uid);

  return (
    <View className="mb-2 rounded-2xl border border-border bg-card p-4">
      <View className="flex-row items-center justify-between gap-3">
        <Pressable
          onPress={onSelect}
          disabled={disabled}
          className="min-w-0 flex-1 active:opacity-80 disabled:opacity-50"
        >
          <Text numberOfLines={1} className="font-bold text-foreground">
            {item.title}
          </Text>
          <Text className="mt-1 text-xs text-muted-foreground">
            {item.price == null ? "No cost set" : `$${item.price.toFixed(2)}`}
          </Text>
        </Pressable>
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={onRequestArchive}
            disabled={disabled || !canArchive}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${item.title}`}
            className="h-11 w-11 items-center justify-center rounded-full border border-border bg-background disabled:opacity-40"
          >
            <Icon name="Trash" className="text-red-600" size={16} />
          </Pressable>
          <Pressable
            onPress={onSelect}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${item.title}`}
            className="h-11 w-11 items-center justify-center rounded-full border border-border bg-background disabled:opacity-40"
          >
            <Icon name="ChevronRight" className="text-muted-foreground" size={18} />
          </Pressable>
        </View>
      </View>
      {archivePending ? (
        <View className="mt-3 gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
          <Text className="text-xs font-bold text-red-700">
            Delete custom component?
          </Text>
          <Text className="text-[11px] text-red-700">
            This hides "{item.title}" from future custom component results.
          </Text>
          <View className="flex-row justify-end gap-2">
            <Pressable
              onPress={onCancelArchive}
              disabled={disabled}
              className="min-h-11 items-center justify-center rounded-lg border border-border bg-background px-4 disabled:opacity-40"
            >
              <Text className="text-[11px] font-bold text-foreground">
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={onConfirmArchive}
              disabled={disabled || !canArchive}
              className="min-h-11 items-center justify-center rounded-lg bg-red-600 px-4 disabled:opacity-40"
            >
              <Text className="text-[11px] font-bold text-white">
                {disabled ? "Deleting..." : "Delete"}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function customOptionKey(option: Pick<CustomComponentOption, "id" | "uid">) {
  const uid = String(option.uid || "").trim();
  if (uid) return `uid:${uid}`;
  return `id:${option.id ?? "none"}`;
}

function firstFiniteNumber(...values: unknown[]) {
  for (const value of values) {
    if (value == null || value === "") continue;
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }
  return null;
}

function parseCost(value: string) {
  const normalized = value.replace(/[^0-9.]/g, "");
  if (!normalized) return null;
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
}

function TextInput(props: TextInputProps & { className?: string }) {
  return <RNTextInput {...props} />;
}
