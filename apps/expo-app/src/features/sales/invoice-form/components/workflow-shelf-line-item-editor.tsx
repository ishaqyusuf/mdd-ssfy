import { _trpc } from "@/components/static-trpc";
import {
  buildInitialWorkflowShelfPatch,
  buildShelfProductRowPatch,
  buildWorkflowShelfSectionsContext,
  buildWorkflowShelfSectionsPatch,
  buildWorkflowShelfSyncPatch,
  createShelfProductDraft,
  createShelfSectionDraft,
  isShelfItem,
  readSalesFormObjectMetadata,
  type ShelfCategoryRecord,
  type ShelfProductOption,
  type ShelfRowDraft,
  type WorkflowLineItemRecord,
} from "@gnd/sales/sales-form-core";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useInvoiceFormProfiles } from "../api/use-invoice-form-profiles";
import { useInvoiceFormStore } from "../store/use-invoice-form-store";
import {
  linePatchChanged,
  mapShelfProduct,
} from "../steps/line-workflow-helpers";
import { buildShelfProductSearchInput } from "../steps/shelf-items/shelf-product-options";
import { ShelfRowsEditor } from "../steps/shelf-items/shelf-rows-editor";
import type { NewSalesFormLineItem } from "../types";

export function WorkflowShelfLineItemEditor({
  line,
  disabled,
  profileCoefficient,
  onWorkflowPatch,
  onOpenPickerChange,
  syncOnMount = true,
  forceShelfItem = false,
}: {
  line: NewSalesFormLineItem;
  disabled?: boolean;
  profileCoefficient?: number | null;
  onWorkflowPatch?: (patch: Partial<NewSalesFormLineItem>) => void;
  onOpenPickerChange?: (presenter: (() => void) | null) => void;
  syncOnMount?: boolean;
  forceShelfItem?: boolean;
}) {
  const workflowLine = line as unknown as WorkflowLineItemRecord;
  const shelfItem = isShelfItem(workflowLine);
  const shouldEnableShelfEditor = shelfItem || forceShelfItem;
  const customerProfileId = useInvoiceFormStore(
    (state) => state.meta.customerProfileId,
  );
  const { getProfileCoefficient } = useInvoiceFormProfiles();
  const effectiveProfileCoefficient =
    profileCoefficient ?? getProfileCoefficient(customerProfileId) ?? 1;
  const shelfSections = shelfItem
    ? buildWorkflowShelfSectionsContext(
        workflowLine,
        effectiveProfileCoefficient,
      ).sections
    : [];
  const [shelfProductSearch, setShelfProductSearch] = useState("");
  const shelfCategoriesQuery = useQuery(
    _trpc.newSalesForm.getShelfCategories.queryOptions(
      {},
      {
        enabled: shouldEnableShelfEditor,
        refetchOnWindowFocus: false,
      },
    ),
  );
  const shelfCategories = useMemo(
    () => (shelfCategoriesQuery.data || []) as ShelfCategoryRecord[],
    [shelfCategoriesQuery.data],
  );
  const shelfProductQueryText = shelfProductSearch.trim();
  const searchedShelfProductsQuery = useQuery(
    _trpc.newSalesForm.searchShelfProducts.queryOptions(
      buildShelfProductSearchInput(shelfProductQueryText),
      {
        enabled: shouldEnableShelfEditor,
        refetchOnWindowFocus: false,
      },
    ),
  );
  const shelfProducts = useMemo(() => {
    const productMap = new Map<number, ShelfProductOption>();
    for (const row of (searchedShelfProductsQuery.data || []) as unknown[]) {
      const product = mapShelfProduct(row, effectiveProfileCoefficient);
      const id = Number(product.id || 0);
      if (id > 0) productMap.set(id, product);
    }
    return Array.from(productMap.values());
  }, [effectiveProfileCoefficient, searchedShelfProductsQuery.data]);

  const patchWorkflowLine = (patch: Partial<NewSalesFormLineItem>) => {
    if (!disabled) onWorkflowPatch?.(patch);
  };

  useEffect(() => {
    if (!syncOnMount || disabled || !shelfItem || !onWorkflowPatch) return;
    const patch =
      buildInitialWorkflowShelfPatch(
        workflowLine,
        effectiveProfileCoefficient,
      ) ||
      buildWorkflowShelfSyncPatch(workflowLine, effectiveProfileCoefficient);
    const linePatch = patch?.linePatch as
      | Partial<NewSalesFormLineItem>
      | undefined;
    if (!linePatch || !linePatchChanged(line, linePatch)) return;
    onWorkflowPatch(linePatch);
  }, [
    disabled,
    effectiveProfileCoefficient,
    line,
    onWorkflowPatch,
    shelfItem,
    syncOnMount,
    workflowLine,
  ]);

  if (!shouldEnableShelfEditor) return null;

  const updateShelfRow = (
    sectionIndex: number,
    rowIndex: number,
    patch: Partial<ShelfRowDraft>,
  ) => {
    const sections = shelfSections.map((section, currentSectionIndex) =>
      currentSectionIndex === sectionIndex
        ? {
            ...section,
            rows: section.rows.map((row, currentRowIndex) =>
              currentRowIndex === rowIndex ? { ...row, ...patch } : row,
            ),
          }
        : section,
    );
    patchWorkflowLine(
      buildWorkflowShelfSectionsPatch({
        sections,
        profileCoefficient: effectiveProfileCoefficient,
      }).linePatch as Partial<NewSalesFormLineItem>,
    );
  };

  const removeShelfRow = (sectionIndex: number, rowIndex: number) => {
    const sections = shelfSections
      .map((section, currentSectionIndex) =>
        currentSectionIndex === sectionIndex
          ? {
              ...section,
              rows: section.rows.filter(
                (_row, currentRowIndex) => currentRowIndex !== rowIndex,
              ),
            }
          : section,
      )
      .filter((section) => section.rows.length > 0);
    patchWorkflowLine(
      buildWorkflowShelfSectionsPatch({
        sections,
        profileCoefficient: effectiveProfileCoefficient,
      }).linePatch as Partial<NewSalesFormLineItem>,
    );
  };

  const addShelfProduct = (product: ShelfProductOption) => {
    const rowPatch = buildShelfProductRowPatch({
      row: createShelfProductDraft(),
      product,
      categories: shelfCategories,
      profileCoefficient: effectiveProfileCoefficient,
    });
    const rowPatchMeta = readSalesFormObjectMetadata(rowPatch.meta) || {};
    const sections = shelfSections.length
      ? shelfSections.map((section, index) =>
          index === 0
            ? {
                ...section,
                rows: [
                  ...(section.rows || []).filter(
                    (row) => row.description || row.productId,
                  ),
                  rowPatch,
                ],
              }
            : section,
        )
      : [
          {
            ...createShelfSectionDraft(),
            categoryIds: Array.isArray(rowPatchMeta.categoryIds)
              ? (rowPatchMeta.categoryIds as number[])
              : [],
            parentCategoryId: rowPatchMeta.shelfParentCategoryId ?? null,
            categoryId: rowPatch.categoryId ?? null,
            rows: [rowPatch],
          },
        ];
    patchWorkflowLine(
      buildWorkflowShelfSectionsPatch({
        sections,
        profileCoefficient: effectiveProfileCoefficient,
      }).linePatch as Partial<NewSalesFormLineItem>,
    );
  };

  const updateShelfProductRows = (product: ShelfProductOption) => {
    const productId = Number(product.id || 0);
    if (!productId) return;
    const sections = shelfSections.map((section) => ({
      ...section,
      rows: section.rows.map((row) =>
        Number(row.productId || 0) === productId
          ? buildShelfProductRowPatch({
              row,
              product,
              categories: shelfCategories,
              profileCoefficient: effectiveProfileCoefficient,
            })
          : row,
      ),
    }));
    patchWorkflowLine(
      buildWorkflowShelfSectionsPatch({
        sections,
        profileCoefficient: effectiveProfileCoefficient,
      }).linePatch as Partial<NewSalesFormLineItem>,
    );
  };

  const deleteShelfProductRows = (productId: number) => {
    const sections = shelfSections
      .map((section) => ({
        ...section,
        rows: section.rows.filter(
          (row) => Number(row.productId || 0) !== Number(productId || 0),
        ),
      }))
      .filter((section) => section.rows.length > 0);
    patchWorkflowLine(
      buildWorkflowShelfSectionsPatch({
        sections,
        profileCoefficient: effectiveProfileCoefficient,
      }).linePatch as Partial<NewSalesFormLineItem>,
    );
  };

  return (
    <ShelfRowsEditor
      sections={shelfSections}
      categories={shelfCategories}
      products={shelfProducts}
      productSearch={shelfProductSearch}
      isLoadingProducts={searchedShelfProductsQuery.isFetching}
      disabled={disabled}
      onProductSearchChange={setShelfProductSearch}
      onSelectProduct={addShelfProduct}
      onProductUpdated={updateShelfProductRows}
      onProductDeleted={deleteShelfProductRows}
      onOpenPickerChange={onOpenPickerChange}
      onChange={updateShelfRow}
      onRemoveRow={removeShelfRow}
    />
  );
}
