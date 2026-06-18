import { _trpc } from "@/components/static-trpc";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Modal, useModal } from "@/components/ui/modal";
import { Text } from "@/components/ui/text";
import {
  profileAdjustedSalesPrice,
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
  customComponentPriceChanged,
  customOptionToWorkflowComponent,
  isCustomComponent,
  stepSupportsCustomComponents,
  type CustomComponentOption,
} from "./custom-component-options";

export { stepSupportsCustomComponents } from "./custom-component-options";

type SheetMode = "search" | "details";

const CUSTOM_COMPONENT_IMAGE_ID = "ff8zkn817rjqv6ml2qdr";

export function orderSelectedCustomFirst(
  components: WorkflowComponentRecord[],
  step?: WorkflowStepRecord | null,
) {
  const selectedUids = new Set(readSelectedUids(step));
  return [...components].sort((a, b) => {
    const aSelectedCustom =
      isCustomComponent(a) && selectedUids.has(String(a.uid || ""));
    const bSelectedCustom =
      isCustomComponent(b) && selectedUids.has(String(b.uid || ""));
    if (aSelectedCustom === bSelectedCustom) return 0;
    return aSelectedCustom ? -1 : 1;
  });
}

export function CustomComponentSheet({
  step,
  components,
  profileCoefficient,
  footerOffset,
  onSaved,
}: {
  step?: WorkflowStepRecord | null;
  components: WorkflowComponentRecord[];
  profileCoefficient?: number | null;
  footerOffset: number;
  onSaved: (component: WorkflowComponentRecord) => void;
}) {
  const modal = useModal();
  const [mode, setMode] = useState<SheetMode>("search");
  const [title, setTitle] = useState("");
  const [cost, setCost] = useState("");
  const [selectedOption, setSelectedOption] =
    useState<CustomComponentOption | null>(null);
  const stepId = Number(step?.stepId || step?.step?.id || 0);
  const options = useMemo(() => buildCustomOptions(components), [components]);
  const query = title.trim().toLowerCase();
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
  const canProceedFromSearch = title.trim().length > 0;
  const canSave = stepId > 0 && title.trim().length > 0 && !saveMutation.isPending;

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
  }

  function continueToDetails(option?: CustomComponentOption | null) {
    if (option) {
      setSelectedOption(option);
      setTitle(option.title);
      setCost(option.price == null ? "" : String(option.price));
    }
    if (!String(option?.title || title).trim()) return;
    setMode("details");
    requestAnimationFrame(() => modal.ref.current?.snapToIndex(0));
  }

  function saveCustomComponent() {
    const price = parseCost(cost);
    if (
      selectedOption &&
      selectedOption.title.trim() === title.trim() &&
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
      title: title.trim(),
      price,
      pricingId: selectedOption?.pricingId,
      dependenciesUid: selectedOption?.dependenciesUid,
      meta: { custom: true },
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
        snapPoints={["42%", "100%"]}
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
                <Pressable
                  onPress={() => continueToDetails(item)}
                  className="mb-2 flex-row items-center justify-between rounded-2xl border border-border bg-card p-4 active:opacity-80"
                >
                  <View className="min-w-0 flex-1">
                    <Text numberOfLines={1} className="font-bold text-foreground">
                      {item.title}
                    </Text>
                    <Text className="mt-1 text-xs text-muted-foreground">
                      {item.price == null ? "No cost set" : `$${item.price.toFixed(2)}`}
                    </Text>
                  </View>
                  <Icon name="ChevronRight" className="text-muted-foreground" size={18} />
                </Pressable>
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
                onChangeText={setTitle}
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
  const data = readObject(value);
  const component = data ? readObject(data.component) : null;
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
    title: String(component.title || component.name || component.uid || "Component"),
    salesPrice,
    basePrice,
    custom: true,
    _metaData: {
      ...(readObject(component._metaData) || {}),
      custom: true,
    },
  };
}

function readSelectedUids(step?: WorkflowStepRecord | null) {
  const meta = readObject(step?.meta);
  const values = Array.isArray(meta?.selectedProdUids)
    ? meta.selectedProdUids
    : [];
  return values.map((value) => String(value || "")).filter(Boolean);
}

function readObject(value: unknown): Record<string, any> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : null;
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
