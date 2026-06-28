import { SafeArea } from "@/components/safe-area";
import { _trpc } from "@/components/static-trpc";
import { Icon } from "@/components/ui/icon";
import { Modal as BottomSheetModal, useModal } from "@/components/ui/modal";
import { Pressable as HapticPressable } from "@/components/ui/pressable";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { SalesClickListRow } from "@/features/sales/components/sales-click-list-row";
import {
  type ShelfCategoryRecord,
  type ShelfProductOption,
  type ShelfRowDraft,
  type ShelfSectionDraft,
  getShelfRowDisplayUnitPrice,
  patchShelfRowPrice,
  patchShelfRowQty,
} from "@gnd/sales/sales-form-core";
import { BottomSheetView } from "@gorhom/bottom-sheet";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Modal as NativeModal,
  Pressable,
  type TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { formatMoney, parseCurrencyInput } from "../../lib/format";
import {
  IconButton,
  StepSectionHeader,
  StepTextInput,
} from "../shared/mobile-editor-primitives";
import {
  formatShelfProductCategoryPath,
  formatShelfRowCategoryPath,
} from "./shelf-product-options";

type SelectedShelfRow = {
  sectionIndex: number;
  rowIndex: number;
  row: ShelfRowDraft;
};

type EditingShelfProduct = {
  id: number;
  title: string;
  price: string;
};

const SHELF_PRODUCT_SKELETON_KEYS = [
  "shelf-product-skeleton-0",
  "shelf-product-skeleton-1",
  "shelf-product-skeleton-2",
  "shelf-product-skeleton-3",
  "shelf-product-skeleton-4",
  "shelf-product-skeleton-5",
  "shelf-product-skeleton-6",
  "shelf-product-skeleton-7",
];

export function ShelfRowsEditor({
  sections,
  categories,
  products,
  productSearch,
  isLoadingProducts,
  disabled,
  onProductSearchChange,
  onSelectProduct,
  onProductUpdated,
  onProductDeleted,
  onOpenPickerChange,
  onChange,
  onRemoveRow,
}: {
  sections: ShelfSectionDraft[];
  categories: ShelfCategoryRecord[];
  products: ShelfProductOption[];
  productSearch: string;
  isLoadingProducts?: boolean;
  disabled?: boolean;
  onProductSearchChange: (query: string) => void;
  onSelectProduct: (product: ShelfProductOption) => void;
  onProductUpdated: (product: ShelfProductOption) => void;
  onProductDeleted: (productId: number) => void;
  onOpenPickerChange?: (presenter: (() => void) | null) => void;
  onChange: (
    sectionIndex: number,
    rowIndex: number,
    patch: Partial<ShelfRowDraft>,
  ) => void;
  onRemoveRow: (sectionIndex: number, rowIndex: number) => void;
}) {
  const { height: windowHeight } = useWindowDimensions();
  const queryClient = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingProduct, setEditingProduct] =
    useState<EditingShelfProduct | null>(null);
  const [selectedOptionsProduct, setSelectedOptionsProduct] =
    useState<ShelfProductOption | null>(null);
  const {
    ref: productOptionsSheetRef,
    present: presentProductOptionsSheet,
    dismiss: dismissProductOptionsSheet,
  } = useModal();
  const [pendingDeleteProductId, setPendingDeleteProductId] = useState<
    number | null
  >(null);
  const selectedRows = useMemo(
    () =>
      sections.flatMap((section, sectionIndex) =>
        (section.rows || [])
          .map((row, rowIndex) => ({ sectionIndex, rowIndex, row }))
          .filter((entry) => entry.row.description || entry.row.productId),
      ),
    [sections],
  );
  const emptyStateMinHeight = Math.max(340, Math.round(windowHeight * 0.52));

  const invalidateShelfProducts = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: _trpc.newSalesForm.searchShelfProducts.queryKey(),
      }),
      queryClient.invalidateQueries({
        queryKey: _trpc.newSalesForm.getShelfProductDetails.queryKey(),
      }),
    ]);
  };

  const updateProductMutation = useMutation(
    _trpc.newSalesForm.updateShelfProduct.mutationOptions({
      async onSuccess(data) {
        onProductUpdated(data as ShelfProductOption);
        setEditingProduct(null);
        onProductSearchChange("");
        await invalidateShelfProducts();
      },
    }),
  );
  const deleteProductMutation = useMutation(
    _trpc.newSalesForm.deleteShelfProduct.mutationOptions({
      async onSuccess(_data, variables) {
        onProductDeleted(Number(variables.id || 0));
        await invalidateShelfProducts();
      },
    }),
  );

  const openPicker = useCallback(() => {
    onProductSearchChange("");
    setEditingProduct(null);
    setPickerOpen(true);
  }, [onProductSearchChange]);

  const closePicker = () => {
    setPickerOpen(false);
    setEditingProduct(null);
    dismissProductOptionsSheet();
    setSelectedOptionsProduct(null);
    setPendingDeleteProductId(null);
  };

  const selectProduct = (product: ShelfProductOption) => {
    onSelectProduct(product);
    closePicker();
  };

  const startEdit = (product: ShelfProductOption) => {
    const id = Number(product.id || 0);
    if (!id) return;
    setPendingDeleteProductId(null);
    setEditingProduct({
      id,
      title: String(product.title || ""),
      price: String(product.unitPrice ?? product.salesPrice ?? ""),
    });
  };

  const openProductOptions = (product: ShelfProductOption) => {
    setSelectedOptionsProduct(product);
    presentProductOptionsSheet();
  };

  const editSelectedOptionsProduct = () => {
    if (!selectedOptionsProduct) return;
    const product = selectedOptionsProduct;
    dismissProductOptionsSheet();
    setSelectedOptionsProduct(null);
    startEdit(product);
  };

  const requestDeleteSelectedOptionsProduct = () => {
    if (!selectedOptionsProduct) return;
    setPendingDeleteProductId(Number(selectedOptionsProduct.id || 0));
    dismissProductOptionsSheet();
    setSelectedOptionsProduct(null);
  };

  const closeProductOptions = () => {
    dismissProductOptionsSheet();
    setSelectedOptionsProduct(null);
  };

  const saveProductEdit = () => {
    if (!editingProduct?.id || !editingProduct.title.trim()) return;
    updateProductMutation.mutate({
      id: editingProduct.id,
      title: editingProduct.title.trim(),
      unitPrice: parseCurrencyInput(editingProduct.price),
    });
  };

  useEffect(() => {
    if (disabled) {
      onOpenPickerChange?.(null);
      return;
    }
    onOpenPickerChange?.(openPicker);
    return () => onOpenPickerChange?.(null);
  }, [disabled, onOpenPickerChange, openPicker]);

  return (
    <View className="border-t border-border pt-3">
      <StepSectionHeader title="Shelf items" />
      <View className="mt-2">
        {selectedRows.length ? (
          selectedRows.map((entry) => (
            <ShelfSelectedRow
              key={`${entry.sectionIndex}:${entry.row.uid || entry.rowIndex}`}
              entry={entry}
              categories={categories}
              disabled={disabled}
              onChange={onChange}
              onRemoveRow={onRemoveRow}
            />
          ))
        ) : (
          <View className="border-y border-border">
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                minHeight: emptyStateMinHeight,
                paddingHorizontal: 24,
                paddingVertical: 32,
              }}
            >
              <Text className="text-center text-sm font-bold text-foreground">
                No shelf items selected
              </Text>
              <Text className="text-center text-xs text-muted-foreground">
                Add a shelf item to attach products to this line.
              </Text>
            </View>
          </View>
        )}
      </View>

      <NativeModal
        visible={pickerOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closePicker}
      >
        <SafeArea>
          <View className="flex-1 bg-background">
            <View className="flex-row items-center gap-3 border-b border-border px-4 py-3">
              <Pressable
                onPress={closePicker}
                className="h-10 w-10 items-center justify-center rounded-full active:bg-muted"
              >
                <Icon name="X" className="text-foreground" size={18} />
              </Pressable>
              <View className="min-w-0 flex-1">
                <Text className="text-base font-bold text-foreground">
                  Shelf item
                </Text>
                <Text className="text-xs text-muted-foreground">
                  Search or choose a recent item
                </Text>
              </View>
            </View>

            {editingProduct ? (
              <ShelfProductEditForm
                editingProduct={editingProduct}
                disabled={updateProductMutation.isPending}
                onChange={setEditingProduct}
                onCancel={() => setEditingProduct(null)}
                onSave={saveProductEdit}
              />
            ) : (
              <ShelfProductSearchList
                visible={pickerOpen}
                products={products}
                categories={categories}
                query={productSearch}
                isLoading={isLoadingProducts}
                disabled={disabled || deleteProductMutation.isPending}
                pendingDeleteProductId={pendingDeleteProductId}
                onQueryChange={onProductSearchChange}
                onSelect={selectProduct}
                onOpenOptions={openProductOptions}
                onCancelDelete={() => setPendingDeleteProductId(null)}
                onDelete={(product) => {
                  const id = Number(product.id || 0);
                  if (!id) return;
                  deleteProductMutation.mutate({ id });
                  setPendingDeleteProductId(null);
                }}
              />
            )}
          </View>
        </SafeArea>
        <BottomSheetModal
          ref={productOptionsSheetRef}
          hideHeader
          enableDynamicSizing
        >
          <BottomSheetView className="px-5 pb-7 pt-3">
            <SalesClickListRow
              title="Edit shelf item"
              subtitle={
                selectedOptionsProduct?.title || "Update name and price"
              }
              icon="Pencil"
              onPress={editSelectedOptionsProduct}
            />
            <SalesClickListRow
              title="Delete shelf item"
              subtitle="Hide item and remove matching selected rows"
              icon="Trash"
              onPress={requestDeleteSelectedOptionsProduct}
            />
            <SalesClickListRow
              title="Cancel"
              subtitle="Close options"
              icon="X"
              onPress={closeProductOptions}
            />
          </BottomSheetView>
        </BottomSheetModal>
      </NativeModal>
    </View>
  );
}

function ShelfSelectedRow({
  entry,
  categories,
  disabled,
  onChange,
  onRemoveRow,
}: {
  entry: SelectedShelfRow;
  categories: ShelfCategoryRecord[];
  disabled?: boolean;
  onChange: (
    sectionIndex: number,
    rowIndex: number,
    patch: Partial<ShelfRowDraft>,
  ) => void;
  onRemoveRow: (sectionIndex: number, rowIndex: number) => void;
}) {
  const row = entry.row;
  const unitPrice = getShelfRowDisplayUnitPrice(row);
  const qty = Math.max(0, Number(row.qty || 0));
  const changeQty = (nextQty: number) => {
    onChange(
      entry.sectionIndex,
      entry.rowIndex,
      patchShelfRowQty(row, Math.max(0, nextQty)),
    );
  };
  return (
    <View className="border-b border-border py-3">
      <View className="flex-row items-center gap-3">
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-sm font-bold text-foreground">
            {row.description || "Shelf item"}
          </Text>
        </View>
        <View className="h-9 flex-row items-center rounded-full border border-border bg-background">
          <Pressable
            onPress={() => changeQty(qty - 1)}
            disabled={disabled || qty <= 0}
            className="h-9 w-9 items-center justify-center rounded-full active:bg-muted disabled:opacity-40"
          >
            <Icon name="Minus" className="text-foreground" size={14} />
          </Pressable>
          <StepTextInput
            value={String(row.qty ?? 0)}
            keyboardType="number-pad"
            onChangeText={(value) => changeQty(parseCurrencyInput(value))}
            editable={!disabled}
            textAlign="center"
            fontWeight="bold"
            style={{
              width: 42,
              minHeight: 34,
              borderWidth: 0,
              backgroundColor: "transparent",
              paddingHorizontal: 0,
            }}
          />
          <Pressable
            onPress={() => changeQty(qty + 1)}
            disabled={disabled}
            className="h-9 w-9 items-center justify-center rounded-full active:bg-muted disabled:opacity-40"
          >
            <Icon name="Plus" className="text-foreground" size={14} />
          </Pressable>
        </View>
        <IconButton
          icon="Trash"
          tone="danger"
          disabled={disabled}
          onPress={() => onRemoveRow(entry.sectionIndex, entry.rowIndex)}
        />
      </View>
      <View className="mt-2 flex-row items-end gap-3">
        <Text
          numberOfLines={1}
          className="min-w-0 flex-1 text-xs text-muted-foreground"
        >
          {formatShelfRowCategoryPath(row, categories)}
        </Text>
        <StepTextInput
          value={String(unitPrice ?? 0)}
          keyboardType="decimal-pad"
          onChangeText={(value) =>
            onChange(
              entry.sectionIndex,
              entry.rowIndex,
              patchShelfRowPrice(row, parseCurrencyInput(value)),
            )
          }
          editable={!disabled}
          textAlign="right"
          fontWeight="bold"
          style={{
            width: 82,
            minHeight: 34,
            borderWidth: 0,
            backgroundColor: "transparent",
            paddingHorizontal: 0,
          }}
        />
        <Text className="w-24 text-right text-lg font-extrabold text-foreground">
          {formatMoney(row.totalPrice || 0)}
        </Text>
      </View>
    </View>
  );
}

function ShelfProductSearchList({
  visible,
  products,
  categories,
  query,
  isLoading,
  disabled,
  pendingDeleteProductId,
  onQueryChange,
  onSelect,
  onOpenOptions,
  onCancelDelete,
  onDelete,
}: {
  visible: boolean;
  products: ShelfProductOption[];
  categories: ShelfCategoryRecord[];
  query: string;
  isLoading?: boolean;
  disabled?: boolean;
  pendingDeleteProductId?: number | null;
  onQueryChange: (query: string) => void;
  onSelect: (product: ShelfProductOption) => void;
  onOpenOptions: (product: ShelfProductOption) => void;
  onCancelDelete: () => void;
  onDelete: (product: ShelfProductOption) => void;
}) {
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 250);
    return () => clearTimeout(timer);
  }, [visible]);

  return (
    <View className="flex-1">
      <FlatList
        data={isLoading ? [] : products}
        keyExtractor={(item) => String(item.id || item.title)}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 96 }}
        ListEmptyComponent={
          isLoading ? (
            <ShelfProductListSkeleton />
          ) : (
            <View className="items-center border-b border-border py-8">
              <Text className="text-center text-sm font-bold text-foreground">
                No shelf items found.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View className="border-b border-border py-3">
            <View className="flex-row items-center gap-3">
              <HapticPressable
                haptic
                onPress={() => onSelect(item)}
                disabled={disabled}
                className="min-w-0 flex-1 active:opacity-90 disabled:opacity-40"
              >
                <Text
                  numberOfLines={1}
                  className="text-sm font-bold text-foreground"
                >
                  {item.title || "Shelf item"}
                </Text>
                <View className="mt-1 flex-row items-center gap-2">
                  <Text
                    numberOfLines={1}
                    className="min-w-0 flex-1 text-xs text-muted-foreground"
                  >
                    {formatShelfProductCategoryPath(item, categories)}
                  </Text>
                  <Text className="text-xs font-bold text-foreground">
                    {formatMoney(numberOrZero(item.salesPrice, item.unitPrice))}
                  </Text>
                </View>
              </HapticPressable>
              <HapticPressable
                haptic
                onPress={() => onOpenOptions(item)}
                disabled={disabled}
                className="h-10 w-10 items-center justify-center rounded-full active:bg-muted active:opacity-90 disabled:opacity-40"
              >
                <Icon
                  name="ChevronRight"
                  className="text-muted-foreground"
                  size={18}
                />
              </HapticPressable>
            </View>
            {pendingDeleteProductId === Number(item.id || 0) ? (
              <View className="mt-3 gap-2 border-t border-red-200 bg-red-50 p-3">
                <Text className="text-xs font-bold text-red-700">
                  Delete shelf item?
                </Text>
                <Text className="text-[11px] text-red-700">
                  This hides "{item.title || "Shelf item"}" and removes matching
                  selected rows.
                </Text>
                <View className="flex-row justify-end gap-2">
                  <Pressable
                    onPress={onCancelDelete}
                    disabled={disabled}
                    className="h-9 items-center justify-center rounded-lg border border-border bg-background px-4 disabled:opacity-40"
                  >
                    <Text className="text-[11px] font-bold text-foreground">
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onDelete(item)}
                    disabled={disabled}
                    className="h-9 items-center justify-center rounded-lg bg-red-600 px-4 disabled:opacity-40"
                  >
                    <Text className="text-[11px] font-bold text-white">
                      {disabled ? "Deleting..." : "Delete"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        )}
      />
      <KeyboardStickyView
        offset={{ closed: 0, opened: 0 }}
        pointerEvents="box-none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 20,
          paddingHorizontal: 16,
          paddingBottom: 20,
          paddingTop: 8,
        }}
      >
        <View
          style={{
            height: 48,
            flexDirection: "row",
            alignItems: "center",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#D9DEE8",
            backgroundColor: "#FFFFFF",
            paddingHorizontal: 12,
          }}
        >
          <Icon name="Search" className="text-muted-foreground" size={15} />
          <StepTextInput
            ref={searchInputRef}
            autoFocus={visible}
            showSoftInputOnFocus
            value={query}
            onChangeText={onQueryChange}
            editable={!disabled}
            placeholder="Search shelf items"
            style={{
              minHeight: 38,
              flex: 1,
              borderWidth: 0,
              backgroundColor: "transparent",
              paddingHorizontal: 8,
            }}
          />
        </View>
      </KeyboardStickyView>
    </View>
  );
}

function ShelfProductListSkeleton() {
  return (
    <View>
      {SHELF_PRODUCT_SKELETON_KEYS.map((key) => (
        <View
          key={key}
          className="flex-row items-center gap-3 border-b border-border py-3"
        >
          <View className="min-w-0 flex-1">
            <Skeleton className="h-4 w-2/3 rounded-md" />
            <View className="mt-2 flex-row items-center gap-2">
              <Skeleton className="h-3 flex-1 rounded-md" />
              <Skeleton className="h-3 w-14 rounded-md" />
            </View>
          </View>
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-10 w-10 rounded-xl" />
        </View>
      ))}
    </View>
  );
}

function numberOrZero(...values: unknown[]) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function ShelfProductEditForm({
  editingProduct,
  disabled,
  onChange,
  onCancel,
  onSave,
}: {
  editingProduct: EditingShelfProduct;
  disabled?: boolean;
  onChange: (product: EditingShelfProduct) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <View className="flex-1 px-4 py-4">
      <View className="gap-3 rounded-2xl border border-border bg-card p-3">
        <StepTextInput
          value={editingProduct.title}
          onChangeText={(title) => onChange({ ...editingProduct, title })}
          editable={!disabled}
          placeholder="Shelf item name"
          fontWeight="bold"
        />
        <StepTextInput
          value={editingProduct.price}
          keyboardType="decimal-pad"
          onChangeText={(price) => onChange({ ...editingProduct, price })}
          editable={!disabled}
          placeholder="Price"
          fontWeight="bold"
        />
        <View className="flex-row gap-2">
          <Pressable
            onPress={onCancel}
            disabled={disabled}
            className="h-11 flex-1 items-center justify-center rounded-xl border border-border bg-background disabled:opacity-40"
          >
            <Text className="text-sm font-bold text-foreground">Cancel</Text>
          </Pressable>
          <Pressable
            onPress={onSave}
            disabled={disabled || !editingProduct.title.trim()}
            className="h-11 flex-1 items-center justify-center rounded-xl bg-primary disabled:opacity-40"
          >
            <Text className="text-sm font-bold text-primary-foreground">
              Save
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
