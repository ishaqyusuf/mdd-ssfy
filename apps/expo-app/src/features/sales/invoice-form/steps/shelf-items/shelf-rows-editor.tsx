import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import {
  getShelfChildCategories,
  type ShelfCategoryRecord,
  type ShelfProductOption,
  type ShelfRowDraft,
  type ShelfSectionDraft,
  patchShelfRowPrice,
  patchShelfRowQty,
} from "@gnd/sales/sales-form-core";
import { useMemo } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { formatMoney } from "../../lib/format";
import {
  IconButton,
  NumberField,
  RowShell,
  SelectChip,
  StepSectionHeader,
  StepTextInput,
} from "../shared/mobile-editor-primitives";
import {
  buildShelfProductBuckets,
  getVisibleShelfProducts,
} from "./shelf-product-options";

export function ShelfRowsEditor({
  sections,
  categories,
  products,
  productSearch,
  isLoadingCategories,
  isLoadingProducts,
  disabled,
  onProductSearchChange,
  onSectionCategoryChange,
  onSelectProduct,
  onChange,
  onAddSection,
  onAddRow,
  onRemoveRow,
  onRemoveSection,
}: {
  sections: ShelfSectionDraft[];
  categories: ShelfCategoryRecord[];
  products: ShelfProductOption[];
  productSearch: string;
  isLoadingCategories?: boolean;
  isLoadingProducts?: boolean;
  disabled?: boolean;
  onProductSearchChange: (query: string) => void;
  onSectionCategoryChange: (
    sectionIndex: number,
    categoryIds: number[],
  ) => void;
  onSelectProduct: (
    sectionIndex: number,
    rowIndex: number,
    product: ShelfProductOption | null,
  ) => void;
  onChange: (
    sectionIndex: number,
    rowIndex: number,
    patch: Partial<ShelfRowDraft>,
  ) => void;
  onAddSection: () => void;
  onAddRow: (sectionIndex: number) => void;
  onRemoveRow: (sectionIndex: number, rowIndex: number) => void;
  onRemoveSection: (sectionIndex: number) => void;
}) {
  const productBuckets = useMemo(() => {
    return buildShelfProductBuckets(products);
  }, [products]);
  const categoryById = useMemo(
    () =>
      new Map(
        categories
          .map((category) => [Number(category.id || 0), category] as const)
          .filter(([id]) => id > 0),
      ),
    [categories],
  );
  const categoryTitle = (id: number) =>
    String(categoryById.get(Number(id || 0))?.name || `Category ${id}`);

  return (
    <View className="border-t border-border pt-3">
      <StepSectionHeader
        title="Shelf items"
        actionLabel="Section"
        disabled={disabled}
        onAction={onAddSection}
      />
      <View className="mt-2 gap-3">
        {sections.map((section, sectionIndex) => (
          <ShelfSectionEditor
            key={`${section.uid || sectionIndex}`}
            section={section}
            sectionIndex={sectionIndex}
            categories={categories}
            categoryTitle={categoryTitle}
            productBuckets={productBuckets}
            productSearch={productSearch}
            isLoadingCategories={isLoadingCategories}
            isLoadingProducts={isLoadingProducts}
            disabled={disabled}
            onProductSearchChange={onProductSearchChange}
            onSectionCategoryChange={onSectionCategoryChange}
            onSelectProduct={onSelectProduct}
            onChange={onChange}
            onAddRow={onAddRow}
            onRemoveRow={onRemoveRow}
            onRemoveSection={onRemoveSection}
          />
        ))}
      </View>
    </View>
  );
}

function ShelfSectionEditor({
  section,
  sectionIndex,
  categories,
  categoryTitle,
  productBuckets,
  productSearch,
  isLoadingCategories,
  isLoadingProducts,
  disabled,
  onProductSearchChange,
  onSectionCategoryChange,
  onSelectProduct,
  onChange,
  onAddRow,
  onRemoveRow,
  onRemoveSection,
}: {
  section: ShelfSectionDraft;
  sectionIndex: number;
  categories: ShelfCategoryRecord[];
  categoryTitle: (id: number) => string;
  productBuckets: Map<number, ShelfProductOption[]>;
  productSearch: string;
  isLoadingCategories?: boolean;
  isLoadingProducts?: boolean;
  disabled?: boolean;
  onProductSearchChange: (query: string) => void;
  onSectionCategoryChange: (
    sectionIndex: number,
    categoryIds: number[],
  ) => void;
  onSelectProduct: (
    sectionIndex: number,
    rowIndex: number,
    product: ShelfProductOption | null,
  ) => void;
  onChange: (
    sectionIndex: number,
    rowIndex: number,
    patch: Partial<ShelfRowDraft>,
  ) => void;
  onAddRow: (sectionIndex: number) => void;
  onRemoveRow: (sectionIndex: number, rowIndex: number) => void;
  onRemoveSection: (sectionIndex: number) => void;
}) {
  const categoryIds = Array.isArray(section.categoryIds)
    ? section.categoryIds.map((id) => Number(id || 0)).filter((id) => id > 0)
    : [];
  const lastCategoryId = categoryIds.length
    ? categoryIds[categoryIds.length - 1]
    : null;
  const categoryOptions = getShelfChildCategories(categories, lastCategoryId);
  const { visibleProducts, hasMoreProducts } = getVisibleShelfProducts({
    categories,
    productBuckets,
    categoryIds,
    query: productSearch,
  });
  const hasProductSearch = productSearch.trim().length > 0;
  const canShowProductOptions = categoryIds.length > 0 || hasProductSearch;

  return (
    <RowShell>
      <View className="flex-row items-center gap-2">
        <View className="min-w-0 flex-1">
          <Text className="text-[11px] font-bold text-foreground">
            Section {sectionIndex + 1}
          </Text>
          <Text className="text-[10px] text-muted-foreground">
            {section.rows.length} row
            {section.rows.length === 1 ? "" : "s"}
            {" - "}
            {formatMoney(section.subTotal || 0)}
          </Text>
        </View>
        <Pressable
          onPress={() => onAddRow(sectionIndex)}
          disabled={disabled}
          className="h-8 flex-row items-center gap-1 rounded-full border border-primary bg-primary/5 px-3 disabled:opacity-40"
        >
          <Icon name="Plus" className="text-primary" size={12} />
          <Text className="text-[10px] font-bold text-primary">Row</Text>
        </Pressable>
        <IconButton
          icon="Trash"
          tone="danger"
          disabled={disabled}
          onPress={() => onRemoveSection(sectionIndex)}
        />
      </View>

      <View className="gap-2 border-t border-border pt-3">
        <Text className="text-[10px] font-bold uppercase text-muted-foreground">
          Category
        </Text>
        {categoryIds.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, paddingRight: 16 }}
          >
            {categoryIds.map((id, index) => (
              <SelectChip
                key={`shelf-cat-selected-${section.uid}-${id}-${index}`}
                title={categoryTitle(id)}
                subtitle={
                  index === categoryIds.length - 1 ? "Selected" : "Path"
                }
                selected
                disabled={disabled}
                onPress={() =>
                  onSectionCategoryChange(
                    sectionIndex,
                    categoryIds.slice(0, index + 1),
                  )
                }
              />
            ))}
            <SelectChip
              title="Clear"
              subtitle="Reset"
              selected={false}
              disabled={disabled}
              onPress={() => onSectionCategoryChange(sectionIndex, [])}
            />
          </ScrollView>
        ) : null}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingRight: 16 }}
        >
          {categoryOptions.map((category) => {
            const categoryId = Number(category.id || 0);
            return (
              <SelectChip
                key={`shelf-cat-option-${section.uid}-${categoryId}`}
                title={String(category.name || "Category")}
                subtitle={String(category.type || "Category")}
                selected={false}
                disabled={disabled}
                onPress={() =>
                  onSectionCategoryChange(sectionIndex, [
                    ...categoryIds,
                    categoryId,
                  ])
                }
              />
            );
          })}
          {isLoadingCategories ? (
            <Text className="self-center text-xs text-muted-foreground">
              Loading categories...
            </Text>
          ) : null}
          {!isLoadingCategories && !categoryOptions.length ? (
            <Text className="self-center text-xs text-muted-foreground">
              {categoryIds.length
                ? "Category path complete"
                : "No categories available"}
            </Text>
          ) : null}
        </ScrollView>
      </View>

      {section.rows.map((row, rowIndex) => (
        <View
          key={`${section.uid}:${row.uid || rowIndex}`}
          className="gap-2 border-t border-border pt-3"
        >
          <View className="gap-2 rounded-xl border border-border bg-card p-2">
            <View className="h-10 flex-row items-center rounded-lg border border-border bg-background px-2">
              <Icon name="Search" className="text-muted-foreground" size={14} />
              <StepTextInput
                value={productSearch}
                onChangeText={onProductSearchChange}
                editable={!disabled}
                placeholder="Search shelf products"
                style={{
                  minHeight: 32,
                  flex: 1,
                  borderWidth: 0,
                  backgroundColor: "transparent",
                  paddingHorizontal: 8,
                }}
              />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6 }}
            >
              <SelectChip
                title="Custom"
                subtitle="Manual row"
                selected={!row.productId}
                disabled={disabled}
                onPress={() => onSelectProduct(sectionIndex, rowIndex, null)}
              />
              {canShowProductOptions ? (
                visibleProducts.map((product) => (
                  <SelectChip
                    key={`shelf-product-${section.uid}-${row.uid || rowIndex}-${product.id}`}
                    title={String(product.title || "Shelf product")}
                    subtitle={formatMoney(
                      Number(product.salesPrice ?? product.unitPrice ?? 0),
                    )}
                    selected={
                      Number(row.productId || 0) === Number(product.id || 0)
                    }
                    disabled={disabled}
                    onPress={() =>
                      onSelectProduct(sectionIndex, rowIndex, product)
                    }
                  />
                ))
              ) : (
                <Text className="self-center text-xs text-muted-foreground">
                  Select a category or search to show products.
                </Text>
              )}
              {isLoadingProducts && canShowProductOptions ? (
                <Text className="self-center text-xs text-muted-foreground">
                  Loading products...
                </Text>
              ) : null}
              {canShowProductOptions &&
              !isLoadingProducts &&
              !visibleProducts.length ? (
                <Text className="self-center text-xs text-muted-foreground">
                  No products found.
                </Text>
              ) : null}
              {hasMoreProducts ? (
                <Text className="self-center text-xs text-muted-foreground">
                  Refine search for more
                </Text>
              ) : null}
            </ScrollView>
          </View>

          <StepTextInput
            value={String(row.description || "")}
            onChangeText={(description) =>
              onChange(sectionIndex, rowIndex, { description })
            }
            editable={!disabled}
            placeholder="Shelf item"
            fontWeight="bold"
          />
          <View className="flex-row gap-2">
            <NumberField
              label="Qty"
              value={row.qty}
              disabled={disabled}
              onChange={(qty) =>
                onChange(sectionIndex, rowIndex, patchShelfRowQty(row, qty))
              }
            />
            <NumberField
              label="Unit"
              value={row.unitPrice}
              disabled={disabled}
              onChange={(unitPrice) =>
                onChange(
                  sectionIndex,
                  rowIndex,
                  patchShelfRowPrice(row, unitPrice),
                )
              }
            />
            <View className="w-24 justify-end">
              <Text className="text-right text-xs font-bold text-foreground">
                {formatMoney(row.totalPrice || 0)}
              </Text>
            </View>
            <View className="justify-end">
              <IconButton
                icon="Trash"
                tone="danger"
                disabled={disabled}
                onPress={() => onRemoveRow(sectionIndex, rowIndex)}
              />
            </View>
          </View>
        </View>
      ))}
    </RowShell>
  );
}
