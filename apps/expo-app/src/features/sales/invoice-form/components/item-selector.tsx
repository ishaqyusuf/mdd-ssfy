import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { useInvoiceFormSearch } from "../api/use-invoice-form-search";
import { useInvoiceFormProfiles } from "../api/use-invoice-form-profiles";
import { createLineItem } from "../mock-data";
import { formatMoney } from "../lib/format";
import { useInvoiceFormStore } from "../store/use-invoice-form-store";
import type { InvoiceSelectableItem } from "../types";

const categories = [
  "All",
  "Components",
  "Doors",
  "Moulding",
  "Labor",
  "Hardware",
  "Custom",
];

type DraftSelection = Record<string, { item: InvoiceSelectableItem; qty: number }>;

function SelectorRow({
  item,
  selectedQty,
  onAdd,
  onQtyChange,
}: {
  item: InvoiceSelectableItem;
  selectedQty: number;
  onAdd: () => void;
  onQtyChange: (qty: number) => void;
}) {
  const workflowRoot = item.source === "workflow";
  const selected = !workflowRoot && selectedQty > 0;

  return (
    <View
      className={`rounded-2xl border p-3 ${
        selected ? "border-primary bg-primary/5" : "border-border bg-card"
      }`}
    >
      <View className="flex-row items-center gap-3">
        <View
          className={`h-8 w-8 items-center justify-center rounded-full ${
            selected ? "bg-primary" : "border border-border bg-background"
          }`}
        >
          {selected ? (
            <Icon name="Check" className="text-primary-foreground" size={15} />
          ) : null}
        </View>
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-sm font-bold text-foreground">
            {item.title}
          </Text>
          <Text className="mt-0.5 text-xs text-muted-foreground">
            {item.sku} - {item.category}
          </Text>
          <Text
            className={`mt-1 text-xs font-semibold ${
              item.status === "Low stock" ? "text-amber-700" : "text-emerald-700"
            }`}
          >
            {item.status}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-sm font-bold text-foreground">
            {formatMoney(item.unitPrice)}
          </Text>
          {selected ? (
            <View className="mt-2 flex-row items-center rounded-full border border-border bg-background p-1">
              <Pressable
                onPress={() => onQtyChange(Math.max(0, selectedQty - 1))}
                className="h-8 w-8 items-center justify-center rounded-full active:bg-muted"
              >
                <Icon name="Minus" className="text-foreground" size={14} />
              </Pressable>
              <Text className="w-8 text-center text-sm font-bold">{selectedQty}</Text>
              <Pressable
                onPress={() => onQtyChange(selectedQty + 1)}
                className="h-8 w-8 items-center justify-center rounded-full active:bg-muted"
              >
                <Icon name="Plus" className="text-foreground" size={14} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={onAdd}
              className={`mt-2 h-10 flex-row items-center justify-center rounded-full bg-primary ${
                workflowRoot ? "gap-1 px-3" : "w-10"
              }`}
            >
              <Icon
                name="Plus"
                className="text-primary-foreground"
                size={16}
              />
              {workflowRoot ? (
                <Text className="text-xs font-bold text-primary-foreground">
                  Add
                </Text>
              ) : null}
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

export function ItemSelector() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [selection, setSelection] = useState<DraftSelection>({});
  const [includeCustomComponents, setIncludeCustomComponents] = useState(false);
  const lineItems = useInvoiceFormStore((state) => state.lineItems);
  const customerProfileId = useInvoiceFormStore(
    (state) => state.meta.customerProfileId,
  );
  const { getProfileCoefficient } = useInvoiceFormProfiles();
  const customerProfileCoefficient = getProfileCoefficient(customerProfileId);
  const selectedProductIds = useMemo(
    () =>
      Array.from(
        new Set(
          lineItems
            .flatMap((line) => (Array.isArray(line.shelfItems) ? line.shelfItems : []))
            .map(readShelfProductId)
            .filter((id) => Number.isFinite(id) && id > 0),
        ),
      ),
    [lineItems],
  );
  const {
    products,
    isLoadingProducts,
    workflowRouteData,
    rootWorkflowStatus,
    refetchRootWorkflow,
  } = useInvoiceFormSearch({
    scope: "items",
    itemQuery: query,
    category,
    selectedProductIds,
    includeCustomComponents,
    profileCoefficient: customerProfileCoefficient,
  });
  const actions = useInvoiceFormStore((state) => state.actions);

  const selectedRows = Object.values(selection).filter(
    (row) => row.qty > 0 && row.item.source !== "workflow",
  );
  const subtotal = selectedRows.reduce(
    (sum, row) => sum + row.qty * row.item.unitPrice,
    0,
  );

  const data = useMemo(() => products, [products]);

  const setQty = (item: InvoiceSelectableItem, qty: number) => {
    setSelection((current) => {
      if (qty <= 0) {
        const next = { ...current };
        delete next[item.uid];
        return next;
      }
      return { ...current, [item.uid]: { item, qty } };
    });
  };

  const addWorkflowRootToInvoice = (item: InvoiceSelectableItem) => {
    setSelection((current) => {
      const next = { ...current };
      delete next[item.uid];
      return next;
    });

    const line = createLineItem(
      item,
      1,
      workflowRouteData,
      customerProfileCoefficient,
    );
    actions.addOrUpdateLineItem(line);
    actions.closeWorkflowSelector();
    actions.closeSelector();
  };

  const addSelectedToInvoice = () => {
    selectedRows.forEach((row) => {
      const line = createLineItem(
        row.item,
        row.qty,
        workflowRouteData,
        customerProfileCoefficient,
      );
      actions.addOrUpdateLineItem(line);
    });
    setSelection({});
    actions.closeSelector();
  };

  return (
    <View className="absolute inset-0 z-50 bg-background">
      <View className="bg-background px-4 pb-3 pt-4">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={actions.closeSelector}
            className="h-11 w-11 items-center justify-center rounded-full active:bg-muted"
          >
            <Icon name="X" className="text-foreground" size={20} />
          </Pressable>
          <View className="flex-1">
            <Text className="text-xl font-bold text-foreground">Select items</Text>
            <Text className="text-xs text-muted-foreground">Add products or services</Text>
          </View>
          <View className="rounded-full bg-primary/10 px-3 py-1">
            <Text className="text-[11px] font-bold text-primary">
              {selectedRows.length} selected
            </Text>
          </View>
        </View>

        <View className="mt-4 h-12 flex-row items-center rounded-xl border border-border bg-card px-3">
          <Icon name="Search" className="text-muted-foreground" size={18} />
          <TextInput
            defaultValue={query}
            onChangeText={setQuery}
            placeholder="Search SKU, product, service"
            placeholderTextColor="#8A8A8A"
            className="ml-2 flex-1 text-foreground"
          />
          <Icon name="SlidersHorizontal" className="text-muted-foreground" size={18} />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3"
          contentContainerStyle={{ gap: 8 }}
        >
          {categories.map((item) => (
            <Pressable
              key={item}
              onPress={() => setCategory(item)}
              className={`h-9 justify-center rounded-full border px-3 ${
                category === item
                  ? "border-primary bg-primary"
                  : "border-border bg-card"
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  category === item ? "text-primary-foreground" : "text-foreground"
                }`}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <Pressable
          onPress={() => setIncludeCustomComponents((current) => !current)}
          className={`mt-3 h-10 flex-row items-center justify-center gap-2 rounded-xl border px-3 ${
            includeCustomComponents
              ? "border-primary bg-primary"
              : "border-border bg-card"
          }`}
        >
          <Icon
            name="Wrench"
            className={
              includeCustomComponents
                ? "text-primary-foreground"
                : "text-muted-foreground"
            }
            size={15}
          />
          <Text
            className={`text-xs font-bold ${
              includeCustomComponents
                ? "text-primary-foreground"
                : "text-foreground"
            }`}
          >
            Enable Custom: {includeCustomComponents ? "On" : "Off"}
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.uid}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        ListHeaderComponent={
          <View className="mb-2 gap-2">
            <Text className="text-xs font-bold uppercase text-muted-foreground">
              Suggested items
            </Text>
            {rootWorkflowStatus ? (
              <View
                className={`rounded-2xl border p-3 ${
                  rootWorkflowStatus.tone === "error"
                    ? "border-red-200 bg-red-50"
                    : "border-border bg-card"
                }`}
              >
                <Text
                  className={`text-sm font-bold ${
                    rootWorkflowStatus.tone === "error"
                      ? "text-red-700"
                      : "text-foreground"
                  }`}
                >
                  {rootWorkflowStatus.title}
                </Text>
                <Text className="mt-1 text-xs text-muted-foreground">
                  {rootWorkflowStatus.description}
                </Text>
                <Button
                  variant="outline"
                  className="mt-3 h-10 self-start rounded-xl px-4"
                  onPress={refetchRootWorkflow}
                >
                  <Text>Refresh</Text>
                </Button>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View className="items-center rounded-2xl border border-border bg-card p-6">
            {isLoadingProducts ? <ActivityIndicator /> : null}
            <Text className="mt-2 text-xs text-muted-foreground">
              {isLoadingProducts ? "Loading items..." : "No items found."}
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => <View className="h-2" />}
        renderItem={({ item }) => (
          <SelectorRow
            item={item}
            selectedQty={
              item.source === "workflow" ? 0 : selection[item.uid]?.qty || 0
            }
            onAdd={() =>
              item.source === "workflow"
                ? addWorkflowRootToInvoice(item)
                : setQty(item, 1)
            }
            onQtyChange={(qty) => setQty(item, qty)}
          />
        )}
      />

      <View className="absolute inset-x-0 bottom-0 border-t border-border bg-card px-4 pb-4 pt-3">
        <Text className="mb-2 text-xs font-semibold text-muted-foreground">
          {selectedRows.length} selected - {formatMoney(subtotal)} subtotal
        </Text>
        <View className="flex-row gap-2">
          <Button
            variant="outline"
            className="h-11 rounded-xl px-4"
            onPress={() => setSelection({})}
          >
            <Text>Clear</Text>
          </Button>
          <Button
            className="h-11 flex-1 rounded-xl"
            disabled={!selectedRows.length}
            onPress={addSelectedToInvoice}
          >
            <Text>Add to invoice</Text>
          </Button>
        </View>
      </View>
    </View>
  );
}

function readShelfProductId(row: unknown) {
  if (!row || typeof row !== "object") return 0;
  return Number((row as { productId?: unknown }).productId || 0);
}
