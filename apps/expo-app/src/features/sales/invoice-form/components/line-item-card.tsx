import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { _trpc } from "@/components/static-trpc";
import {
  buildStepComponentOverrideMap,
  buildShelfProductRowPatch,
  buildInitialWorkflowShelfPatch,
  buildWorkflowDoorRowsPatch,
  buildWorkflowDoorSyncPatch,
  buildWorkflowMouldingRowsContext,
  buildWorkflowMouldingRowsPatch,
  buildWorkflowServiceRowsContext,
  buildWorkflowServiceRowsPatch,
  buildWorkflowShelfSectionsContext,
  buildWorkflowShelfSectionsPatch,
  buildWorkflowShelfSyncPatch,
  calcWorkflowDoorRow,
  clearUnpricedDoorRowQty,
  clearShelfRowProduct,
  computeHptSharedDoorSurcharge,
  createShelfProductDraft,
  createShelfSectionDraft,
  deriveDoorSizeRows,
  getDoorSupplierMeta,
  getShelfLeafCategoryIds,
  getWorkflowLineDisplayTotal,
  getWorkflowSteps,
  hasWorkflowStepSelection,
  isDoorStepTitle,
  isHousePackageToolStepTitle,
  isMouldingItem,
  isServiceItem,
  isShelfItem,
  removeWorkflowHptDoorOption,
  removeWorkflowMouldingSelection,
  resolveWorkflowVisibleComponents,
  rowsForDoorComponent,
  swapWorkflowDoorComponent,
  updateWorkflowDoorSupplier,
  type DoorStoredRow,
  type MouldingRow,
  type ServiceRow,
  type ShelfCategoryRecord,
  type ShelfProductOption,
  type ShelfRowDraft,
  type ShelfSectionDraft,
  type WorkflowComponentRecord,
  type WorkflowLineItemRecord,
  workflowStepSelectionLabel,
} from "@gnd/sales/sales-form-core";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput as RNTextInput,
  View,
  type TextInputProps,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { formatMoney, parseCurrencyInput } from "../lib/format";
import { useInvoiceFormModalStore } from "../store/use-invoice-form-modal-store";
import { HousePackageToolEditor } from "../steps/house-package-tool/house-package-tool-editor";
import {
  getDoorRouteConfig,
  getDoorRows,
  getSelectedDoorComponents,
  linePatchChanged,
  mapShelfProduct,
  mapWorkflowComponent,
} from "../steps/line-workflow-helpers";
import { MouldingRowsEditor } from "../steps/moulding/moulding-rows-editor";
import {
  createServiceRow,
  ServiceRowsEditor,
} from "../steps/service/service-rows-editor";
import { ShelfRowsEditor } from "../steps/shelf-items/shelf-rows-editor";
import type { NewSalesFormLineItem } from "../types";

function TextInput({
  className,
  style,
  multiline,
  placeholderTextColor,
  ...props
}: TextInputProps & { className?: string }) {
  const classes = className || "";
  return (
    <RNTextInput
      {...props}
      multiline={multiline}
      placeholderTextColor={placeholderTextColor || "#8A8A8A"}
      style={[
        styles.cardInput,
        classes.includes("h-9") ? styles.inputH9 : null,
        classes.includes("h-10") ? styles.inputH10 : null,
        classes.includes("min-h-16") || multiline
          ? styles.inputMultiline
          : null,
        classes.includes("flex-1") ? styles.flex1 : null,
        classes.includes("ml-2") ? styles.ml2 : null,
        classes.includes("text-right") ? styles.textRight : null,
        classes.includes("font-bold") ? styles.bold : null,
        style,
      ]}
    />
  );
}

export function LineItemCard({
  item,
  onTitleChange,
  onQtyChange,
  onUnitPriceChange,
  onLineTotalChange,
  onDescriptionChange,
  onTaxableChange,
  onRemove,
  onConfigure,
  onWorkflowPatch,
  customerProfileCoefficient,
  disabled,
}: {
  item: NewSalesFormLineItem;
  onTitleChange: (title: string) => void;
  onQtyChange: (qty: number) => void;
  onUnitPriceChange: (unitPrice: number) => void;
  onLineTotalChange: (lineTotal: number) => void;
  onDescriptionChange: (description: string) => void;
  onTaxableChange: (taxxable: boolean) => void;
  onRemove: () => void;
  onConfigure?: () => void;
  onWorkflowPatch?: (patch: Partial<NewSalesFormLineItem>) => void;
  customerProfileCoefficient?: number | null;
  disabled?: boolean;
}) {
  const router = useRouter();
  const setDoorSizePicker = useInvoiceFormModalStore(
    (state) => state.actions.setDoorSizePicker,
  );
  const clearDoorSizePicker = useInvoiceFormModalStore(
    (state) => state.actions.clearDoorSizePicker,
  );
  const sku = String(item.meta?.sku || item.description || "ITEM");
  const workflowLine = item as unknown as WorkflowLineItemRecord;
  const workflowSteps = getWorkflowSteps(workflowLine);
  const configuredSteps = workflowSteps.filter(hasWorkflowStepSelection);
  const displayTotal = getWorkflowLineDisplayTotal(
    workflowLine,
    customerProfileCoefficient || 1,
  );
  const isWorkflowLine = workflowSteps.length > 0;
  const serviceItem = isServiceItem(workflowLine);
  const mouldingItem = isMouldingItem(workflowLine);
  const shelfItem = isShelfItem(workflowLine);
  const serviceRows = serviceItem
    ? buildWorkflowServiceRowsContext(workflowLine).rows
    : [];
  const mouldingContext = mouldingItem
    ? buildWorkflowMouldingRowsContext(workflowLine)
    : null;
  const hasHousePackageToolStep = workflowSteps.some((step) =>
    isHousePackageToolStepTitle(step.step?.title || step.title),
  );
  const shelfSections = shelfItem
    ? buildWorkflowShelfSectionsContext(
        workflowLine,
        customerProfileCoefficient,
      ).sections
    : [];
  const [shelfProductSearch, setShelfProductSearch] = useState("");
  const shelfCategoriesQuery = useQuery(
    _trpc.newSalesForm.getShelfCategories.queryOptions(
      {},
      {
        enabled: shelfItem,
        refetchOnWindowFocus: false,
      },
    ),
  );
  const shelfCategories = useMemo(
    () => (shelfCategoriesQuery.data || []) as ShelfCategoryRecord[],
    [shelfCategoriesQuery.data],
  );
  const shelfCategoryIds = useMemo(
    () =>
      Array.from(
        new Set(
          shelfSections
            .flatMap((section) => {
              const ids = Array.isArray(section.categoryIds)
                ? section.categoryIds
                : [];
              const lastId = ids.length ? ids[ids.length - 1] : null;
              return lastId
                ? getShelfLeafCategoryIds(shelfCategories, lastId)
                : ids;
            })
            .map((id) => Number(id || 0))
            .filter((id) => id > 0),
        ),
      ),
    [shelfCategories, shelfSections],
  );
  const selectedShelfProductIds = useMemo(
    () =>
      Array.from(
        new Set(
          shelfSections
            .flatMap((section) => section.rows || [])
            .map((row) => Number(row.productId || 0))
            .filter((id) => id > 0),
        ),
      ),
    [shelfSections],
  );
  const shelfProductQueryText = shelfProductSearch.trim();
  const shouldLoadShelfProducts =
    shelfSections.length > 0 && shelfCategoryIds.length > 0;
  const shelfProductsQuery = useQuery(
    _trpc.newSalesForm.getShelfProducts.queryOptions(
      {
        categoryIds: shelfCategoryIds,
      },
      {
        enabled: shouldLoadShelfProducts,
        refetchOnWindowFocus: false,
      },
    ),
  );
  const searchedShelfProductsQuery = useQuery(
    _trpc.newSalesForm.searchShelfProducts.queryOptions(
      {
        query: shelfProductQueryText,
        selectedIds: selectedShelfProductIds,
        limit: 20,
      },
      {
        enabled: shelfItem && shelfProductQueryText.length > 0,
        refetchOnWindowFocus: false,
      },
    ),
  );
  const selectedShelfProductsQuery = useQuery(
    _trpc.newSalesForm.getShelfProductDetails.queryOptions(
      {
        ids: selectedShelfProductIds,
      },
      {
        enabled: shelfItem && selectedShelfProductIds.length > 0,
        refetchOnWindowFocus: false,
      },
    ),
  );
  const shelfProducts = useMemo(() => {
    const productMap = new Map<number, ShelfProductOption>();
    for (const row of [
      ...((shelfProductsQuery.data || []) as unknown[]),
      ...((searchedShelfProductsQuery.data || []) as unknown[]),
      ...((selectedShelfProductsQuery.data || []) as unknown[]),
    ]) {
      const product = mapShelfProduct(row, customerProfileCoefficient);
      const id = Number(product.id || 0);
      if (id > 0) productMap.set(id, product);
    }
    return Array.from(productMap.values());
  }, [
    customerProfileCoefficient,
    searchedShelfProductsQuery.data,
    selectedShelfProductsQuery.data,
    shelfProductsQuery.data,
  ]);
  const doorRows = getDoorRows(workflowLine);
  const doorRouteConfig = getDoorRouteConfig(workflowLine, workflowSteps);
  const selectedDoorComponents = getSelectedDoorComponents(workflowSteps);
  const doorStepIndex = workflowSteps.findIndex((step) =>
    isDoorStepTitle(step.step?.title || step.title),
  );
  const doorStep = doorStepIndex >= 0 ? workflowSteps[doorStepIndex] : null;
  const doorStepId = Number(doorStep?.stepId || doorStep?.step?.id || 0);
  const doorStepTitle = String(doorStep?.step?.title || doorStep?.title || "");
  const workflowRouteQuery = useQuery(
    _trpc.newSalesForm.getStepRouting.queryOptions(
      {},
      {
        enabled: Boolean(doorStep),
        refetchOnWindowFocus: false,
      },
    ),
  );
  const workflowRouteData = workflowRouteQuery.data || null;
  const doorSupplierMeta = getDoorSupplierMeta(doorStep);
  const doorSuppliersQuery = useQuery(
    _trpc.sales.getSuppliers.queryOptions(
      {},
      {
        enabled: Boolean(doorStep),
        refetchOnWindowFocus: false,
      },
    ),
  );
  const doorSuppliers = useMemo(
    () => readDoorSuppliers(doorSuppliersQuery.data),
    [doorSuppliersQuery.data],
  );
  const doorComponentsQuery = useQuery(
    _trpc.sales.getStepComponents.queryOptions(
      {
        stepId: doorStepId || undefined,
        stepTitle: doorStepId ? undefined : doorStepTitle || "Door",
      },
      {
        enabled: Boolean(doorStep),
        refetchOnWindowFocus: false,
      },
    ),
  );
  const visibleDoorComponents = useMemo(
    () =>
      resolveWorkflowVisibleComponents({
        components: Array.isArray(doorComponentsQuery.data)
          ? doorComponentsQuery.data.map(mapWorkflowComponent)
          : [],
        steps: workflowSteps,
        activeStep: doorStep,
        overrides: buildStepComponentOverrideMap(doorStep),
        includeCustomComponents: false,
        profileCoefficient: customerProfileCoefficient || 1,
      }),
    [
      customerProfileCoefficient,
      doorComponentsQuery.data,
      doorStep,
      workflowSteps,
    ],
  );
  const hasWorkflowRowEditor = Boolean(
    serviceItem ||
    mouldingItem ||
    shelfItem ||
    hasHousePackageToolStep ||
    doorRows.length,
  );

  const patchWorkflowLine = (patch: Partial<NewSalesFormLineItem>) => {
    if (!disabled) onWorkflowPatch?.(patch);
  };

  useEffect(() => {
    if (disabled || !shelfItem || !onWorkflowPatch) return;
    const patch =
      buildInitialWorkflowShelfPatch(
        workflowLine,
        customerProfileCoefficient,
      ) ||
      buildWorkflowShelfSyncPatch(workflowLine, customerProfileCoefficient);
    if (!patch) return;
    onWorkflowPatch(patch.linePatch as Partial<NewSalesFormLineItem>);
  }, [
    customerProfileCoefficient,
    disabled,
    workflowLine,
    onWorkflowPatch,
    shelfItem,
  ]);

  useEffect(() => {
    if (disabled || !doorRows.length || !onWorkflowPatch) return;
    const patch = buildWorkflowDoorSyncPatch({
      line: workflowLine,
      availableComponents: [],
      profileCoefficient: customerProfileCoefficient,
    });
    if (!patch) return;
    onWorkflowPatch(patch.linePatch as Partial<NewSalesFormLineItem>);
  }, [
    customerProfileCoefficient,
    disabled,
    doorRows.length,
    workflowLine,
    onWorkflowPatch,
  ]);

  useEffect(() => {
    if (disabled || !serviceItem || !serviceRows.length || !onWorkflowPatch) {
      return;
    }
    const patch = buildWorkflowServiceRowsPatch({
      line: workflowLine,
      rows: serviceRows,
    }) as Partial<NewSalesFormLineItem>;
    if (!linePatchChanged(item, patch)) return;
    onWorkflowPatch(patch);
  }, [disabled, item, workflowLine, onWorkflowPatch, serviceItem, serviceRows]);

  useEffect(() => {
    if (disabled || !mouldingContext?.rows.length || !onWorkflowPatch) {
      return;
    }
    const patch = buildWorkflowMouldingRowsPatch({
      line: workflowLine,
      rows: mouldingContext.rows,
      sharedComponentPrice: mouldingContext.sharedComponentPrice,
    }) as Partial<NewSalesFormLineItem>;
    if (!linePatchChanged(item, patch)) return;
    onWorkflowPatch(patch);
  }, [disabled, item, workflowLine, mouldingContext, onWorkflowPatch]);

  const updateServiceRow = (index: number, patch: Partial<ServiceRow>) => {
    const rows = serviceRows.map((row, rowIndex) =>
      rowIndex === index ? { ...row, ...patch } : row,
    );
    patchWorkflowLine(
      buildWorkflowServiceRowsPatch({
        line: workflowLine,
        rows,
      }) as Partial<NewSalesFormLineItem>,
    );
  };

  const addServiceRow = () => {
    patchWorkflowLine(
      buildWorkflowServiceRowsPatch({
        line: workflowLine,
        rows: [...serviceRows, createServiceRow(serviceRows.length + 1)],
      }) as Partial<NewSalesFormLineItem>,
    );
  };

  const removeServiceRow = (index: number) => {
    patchWorkflowLine(
      buildWorkflowServiceRowsPatch({
        line: workflowLine,
        rows: serviceRows.filter((_row, rowIndex) => rowIndex !== index),
      }) as Partial<NewSalesFormLineItem>,
    );
  };

  const updateMouldingRow = (index: number, patch: Partial<MouldingRow>) => {
    if (!mouldingContext) return;
    const rows = mouldingContext.rows.map((row, rowIndex) =>
      rowIndex === index ? { ...row, ...patch } : row,
    );
    patchWorkflowLine(
      buildWorkflowMouldingRowsPatch({
        line: workflowLine,
        rows,
        sharedComponentPrice: mouldingContext.sharedComponentPrice,
      }) as Partial<NewSalesFormLineItem>,
    );
  };

  const removeMouldingRow = (row: MouldingRow) => {
    if (!mouldingContext || !row.uid) return;
    patchWorkflowLine(
      removeWorkflowMouldingSelection({
        line: workflowLine,
        mouldingUid: String(row.uid),
        rows: mouldingContext.rows,
        selectedMouldings: mouldingContext.selectedMouldings,
        sharedComponentPrice: mouldingContext.sharedComponentPrice,
      }) as Partial<NewSalesFormLineItem>,
    );
  };

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
        profileCoefficient: customerProfileCoefficient,
      }).linePatch as Partial<NewSalesFormLineItem>,
    );
  };

  const patchShelfSection = (
    sectionIndex: number,
    patch:
      | Partial<ShelfSectionDraft>
      | ((section: ShelfSectionDraft) => Partial<ShelfSectionDraft>),
  ) => {
    const sections = shelfSections.map((section, currentSectionIndex) => {
      if (currentSectionIndex !== sectionIndex) return section;
      const nextPatch = typeof patch === "function" ? patch(section) : patch;
      return {
        ...section,
        ...nextPatch,
      };
    });
    patchWorkflowLine(
      buildWorkflowShelfSectionsPatch({
        sections,
        profileCoefficient: customerProfileCoefficient,
      }).linePatch as Partial<NewSalesFormLineItem>,
    );
  };

  const clearShelfRowForCategoryChange = (
    row: ShelfRowDraft,
    categoryIds: number[],
  ): ShelfRowDraft => {
    const nextCategoryId = categoryIds.length
      ? categoryIds[categoryIds.length - 1]
      : null;
    return {
      ...row,
      categoryId: nextCategoryId,
      productId: null,
      description: "",
      basePrice: 0,
      salesPrice: 0,
      customPrice: null,
      unitPrice: 0,
      totalPrice: 0,
      meta: {
        ...(row.meta || {}),
        categoryIds,
        shelfParentCategoryId: categoryIds[0] ?? null,
        basePrice: 0,
        salesPrice: 0,
        customPrice: null,
        unitPrice: 0,
      },
    };
  };

  const changeShelfSectionCategories = (
    sectionIndex: number,
    categoryIds: number[],
  ) => {
    const nextCategoryIds = Array.from(
      new Set(
        categoryIds
          .map((id) => Number(id || 0))
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    );
    patchShelfSection(sectionIndex, (section) => ({
      categoryIds: nextCategoryIds,
      parentCategoryId: nextCategoryIds[0] ?? null,
      categoryId: nextCategoryIds.length
        ? nextCategoryIds[nextCategoryIds.length - 1]
        : null,
      rows: (section.rows || []).map((row) =>
        clearShelfRowForCategoryChange(row, nextCategoryIds),
      ),
    }));
  };

  const addShelfSection = () => {
    patchWorkflowLine(
      buildWorkflowShelfSectionsPatch({
        sections: [...shelfSections, createShelfSectionDraft()],
        profileCoefficient: customerProfileCoefficient,
      }).linePatch as Partial<NewSalesFormLineItem>,
    );
  };

  const addShelfRow = (sectionIndex: number) => {
    const sections = shelfSections.map((section, currentSectionIndex) =>
      currentSectionIndex === sectionIndex
        ? { ...section, rows: [...section.rows, createShelfProductDraft()] }
        : section,
    );
    patchWorkflowLine(
      buildWorkflowShelfSectionsPatch({
        sections,
        profileCoefficient: customerProfileCoefficient,
      }).linePatch as Partial<NewSalesFormLineItem>,
    );
  };

  const removeShelfRow = (sectionIndex: number, rowIndex: number) => {
    const sections = shelfSections.map((section, currentSectionIndex) =>
      currentSectionIndex === sectionIndex
        ? {
            ...section,
            rows: section.rows.filter(
              (_row, currentRowIndex) => currentRowIndex !== rowIndex,
            ),
          }
        : section,
    );
    patchWorkflowLine(
      buildWorkflowShelfSectionsPatch({
        sections,
        profileCoefficient: customerProfileCoefficient,
      }).linePatch as Partial<NewSalesFormLineItem>,
    );
  };

  const removeShelfSection = (sectionIndex: number) => {
    patchWorkflowLine(
      buildWorkflowShelfSectionsPatch({
        sections: shelfSections.filter(
          (_section, currentSectionIndex) =>
            currentSectionIndex !== sectionIndex,
        ),
        profileCoefficient: customerProfileCoefficient,
      }).linePatch as Partial<NewSalesFormLineItem>,
    );
  };

  const selectShelfProduct = (
    sectionIndex: number,
    rowIndex: number,
    product: ShelfProductOption | null,
  ) => {
    const row = shelfSections[sectionIndex]?.rows?.[rowIndex];
    if (!row) return;
    updateShelfRow(
      sectionIndex,
      rowIndex,
      product
        ? buildShelfProductRowPatch({
            row,
            product,
            categories: shelfCategories,
            profileCoefficient: customerProfileCoefficient || 1,
          })
        : clearShelfRowProduct(row),
    );
  };

  const updateDoorRow = (index: number, patch: Partial<DoorStoredRow>) => {
    const rows = doorRows.map((row, rowIndex) =>
      rowIndex === index ? { ...row, ...patch } : row,
    );
    patchWorkflowLine(
      buildWorkflowDoorRowsPatch({
        line: workflowLine,
        rows,
        sharedDoorSurcharge: computeHptSharedDoorSurcharge(workflowLine),
        noHandle: Boolean(doorRouteConfig?.noHandle),
        hasSwing: doorRouteConfig?.hasSwing !== false,
        profileCoefficient: customerProfileCoefficient,
      }).linePatch as Partial<NewSalesFormLineItem>,
    );
  };

  const removeDoorRow = (index: number) => {
    patchWorkflowLine(
      buildWorkflowDoorRowsPatch({
        line: workflowLine,
        rows: doorRows.filter((_row, rowIndex) => rowIndex !== index),
        sharedDoorSurcharge: computeHptSharedDoorSurcharge(workflowLine),
        noHandle: Boolean(doorRouteConfig?.noHandle),
        hasSwing: doorRouteConfig?.hasSwing !== false,
        profileCoefficient: customerProfileCoefficient,
      }).linePatch as Partial<NewSalesFormLineItem>,
    );
  };

  const addDoorRow = (row: DoorStoredRow) => {
    patchWorkflowLine(
      buildWorkflowDoorRowsPatch({
        line: workflowLine,
        rows: [...doorRows, row],
        sharedDoorSurcharge: computeHptSharedDoorSurcharge(workflowLine),
        noHandle: Boolean(doorRouteConfig?.noHandle),
        hasSwing: doorRouteConfig?.hasSwing !== false,
        profileCoefficient: customerProfileCoefficient,
      }).linePatch as Partial<NewSalesFormLineItem>,
    );
  };

  const removeDoorOption = (component: WorkflowComponentRecord) => {
    if (doorStepIndex < 0) return;
    const result = removeWorkflowHptDoorOption({
      routeData: workflowRouteData,
      line: workflowLine,
      stepIndex: doorStepIndex,
      component,
    });
    if (!result) return;
    patchWorkflowLine(result.linePatch as Partial<NewSalesFormLineItem>);
  };

  const swapDoorOption = (
    sourceComponent: WorkflowComponentRecord,
    targetComponent: WorkflowComponentRecord,
  ) => {
    if (doorStepIndex < 0) return;
    const result = swapWorkflowDoorComponent({
      line: workflowLine,
      stepIndex: doorStepIndex,
      sourceComponent,
      targetComponent,
      profileCoefficient: customerProfileCoefficient,
    });
    if (!result) return;
    patchWorkflowLine(result.linePatch as Partial<NewSalesFormLineItem>);
  };

  const configureDoorSizes = (component: WorkflowComponentRecord) => {
    const componentId = Number(component.id || 0);
    if (!componentId) return;
    const routeFlags = {
      noHandle: Boolean(doorRouteConfig?.noHandle),
      hasSwing: doorRouteConfig?.hasSwing !== false,
    };
    const initialRows = deriveDoorSizeRows({
      line: workflowLine as any,
      existingRows: rowsForDoorComponent(workflowLine as any, componentId),
      component,
      routeData: workflowRouteData,
      supplierUid: doorSupplierMeta.supplierUid,
      profileCoefficient: customerProfileCoefficient || 1,
    }) as DoorStoredRow[];

    const applyPickerRows = () => {
      const picker = useInvoiceFormModalStore.getState().doorSizePicker;
      const selectedRows = (picker?.rows || []).filter(
        (row) => Number(row.totalQty || 0) > 0,
      );
      const otherRows = doorRows.filter(
        (row) => Number(row.stepProductId || 0) !== componentId,
      );
      const patch = buildWorkflowDoorRowsPatch({
        line: workflowLine,
        rows: [...otherRows, ...selectedRows],
        sharedDoorSurcharge: computeHptSharedDoorSurcharge(workflowLine),
        noHandle: routeFlags.noHandle,
        hasSwing: routeFlags.hasSwing,
        profileCoefficient: customerProfileCoefficient,
      });
      patchWorkflowLine({
        ...(patch.linePatch as Partial<NewSalesFormLineItem>),
        meta: {
          ...(workflowLine.meta || {}),
          workflowDoorRouteConfig: routeFlags,
        },
      });
      clearDoorSizePicker();
    };

    setDoorSizePicker({
      component,
      rows: initialRows.map((row) => clearUnpricedDoorRowQty(row)),
      supplierUid: doorSupplierMeta.supplierUid,
      supplierName: doorSupplierMeta.supplierName,
      suppliers: doorSuppliers,
      isLoadingSuppliers: doorSuppliersQuery.isFetching,
      noHandle: routeFlags.noHandle,
      disabled,
      onSupplierChange: (supplier) => {
        if (doorStepIndex < 0) return;
        const picker = useInvoiceFormModalStore.getState().doorSizePicker;
        const supplierPatch = updateWorkflowDoorSupplier({
          line: workflowLine,
          stepIndex: doorStepIndex,
          supplier,
          profileCoefficient: customerProfileCoefficient || 1,
        });
        if (supplierPatch) {
          patchWorkflowLine(
            supplierPatch as Partial<NewSalesFormLineItem>,
          );
        }
        const nextRows = deriveDoorSizeRows({
          line: workflowLine as any,
          existingRows: picker?.rows || initialRows,
          component,
          routeData: workflowRouteData,
          supplierUid: supplier?.uid || null,
          profileCoefficient: customerProfileCoefficient || 1,
        }) as DoorStoredRow[];
        if (!picker) return;
        setDoorSizePicker({
          ...picker,
          rows: nextRows.map((row) => clearUnpricedDoorRowQty(row)),
          supplierUid: supplier?.uid || null,
          supplierName: supplier?.name || null,
        });
      },
      onChangeRow: (rowIndex, rowPatch) => {
        const picker = useInvoiceFormModalStore.getState().doorSizePicker;
        if (!picker) return;
        const nextRows = picker.rows.map((row, index) =>
          index === rowIndex
            ? clearUnpricedDoorRowQty(
                calcWorkflowDoorRow({
                  ...row,
                  ...rowPatch,
                }) as DoorStoredRow,
              )
            : row,
        );
        setDoorSizePicker({
          ...picker,
          rows: nextRows,
        });
      },
      onOk: applyPickerRows,
      onNextStep: applyPickerRows,
      onClose: clearDoorSizePicker,
    });
    router.push("/(sales)/invoices/door-size" as any);
  };

  return (
    <View className="rounded-2xl border border-border bg-card p-3">
      <View className="flex-row items-start gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
          <Icon name="ReceiptText" className="text-primary" size={19} />
        </View>
        <View className="min-w-0 flex-1">
          {isWorkflowLine ? (
            <Text
              numberOfLines={1}
              className="text-sm font-bold text-foreground"
            >
              {item.title}
            </Text>
          ) : (
            <TextInput
              value={String(item.title || "")}
              onChangeText={onTitleChange}
              editable={!disabled}
              className="h-9 rounded-xl border border-border bg-background px-2 text-sm font-bold text-foreground"
            />
          )}
          <Text className="mt-0.5 text-xs text-muted-foreground">{sku}</Text>
          {isWorkflowLine ? (
            <Text className="mt-1 text-[11px] font-semibold text-primary">
              {configuredSteps.length}/{workflowSteps.length} workflow steps
              configured
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={onRemove}
          disabled={disabled}
          className="h-10 w-10 items-center justify-center rounded-full active:bg-muted disabled:opacity-40"
        >
          <Icon
            name={disabled ? "Loader2" : "Trash"}
            className="text-red-600"
            size={17}
          />
        </Pressable>
      </View>
      {configuredSteps.length > 0 ? (
        <View className="mt-3 gap-1.5">
          {configuredSteps.slice(0, 3).map((step, index) => (
            <View
              key={`${step.uid || step.stepId || index}`}
              className="flex-row gap-2"
            >
              <Text className="w-24 text-[11px] font-bold text-muted-foreground">
                {step.step?.title || step.title || `Step ${index + 1}`}
              </Text>
              <Text
                numberOfLines={1}
                className="flex-1 text-[11px] text-foreground"
              >
                {workflowStepSelectionLabel(step)}
              </Text>
            </View>
          ))}
          {configuredSteps.length > 3 ? (
            <Text className="text-[11px] font-semibold text-muted-foreground">
              +{configuredSteps.length - 3} more configured steps
            </Text>
          ) : null}
        </View>
      ) : null}
      {isWorkflowLine ? (
        <View className="mt-3 gap-3">
          <Pressable
            onPress={onConfigure}
            disabled={disabled}
            className="h-10 flex-row items-center justify-center gap-2 rounded-xl border border-primary bg-primary/5 active:opacity-80 disabled:opacity-40"
          >
            <Icon name="SlidersHorizontal" className="text-primary" size={15} />
            <Text className="text-xs font-bold text-primary">
              Configure workflow
            </Text>
          </Pressable>
          {serviceItem ? (
            <ServiceRowsEditor
              rows={serviceRows}
              disabled={disabled}
              onChange={updateServiceRow}
              onAdd={addServiceRow}
              onRemove={removeServiceRow}
            />
          ) : null}
          {mouldingItem ? (
            <MouldingRowsEditor
              rows={mouldingContext?.rows || []}
              disabled={disabled}
              onChange={updateMouldingRow}
              onRemove={removeMouldingRow}
            />
          ) : null}
          {shelfItem ? (
            <ShelfRowsEditor
              sections={shelfSections}
              categories={shelfCategories}
              products={shelfProducts}
              productSearch={shelfProductSearch}
              isLoadingCategories={shelfCategoriesQuery.isFetching}
              isLoadingProducts={
                shelfProductsQuery.isFetching ||
                searchedShelfProductsQuery.isFetching ||
                selectedShelfProductsQuery.isFetching
              }
              disabled={disabled}
              onProductSearchChange={setShelfProductSearch}
              onSectionCategoryChange={changeShelfSectionCategories}
              onSelectProduct={selectShelfProduct}
              onChange={updateShelfRow}
              onAddSection={addShelfSection}
              onAddRow={addShelfRow}
              onRemoveRow={removeShelfRow}
              onRemoveSection={removeShelfSection}
            />
          ) : null}
          {hasHousePackageToolStep || doorRows.length ? (
            <HousePackageToolEditor
              rows={doorRows}
              selectedDoors={selectedDoorComponents}
              noHandle={Boolean(doorRouteConfig?.noHandle)}
              hasSwing={doorRouteConfig?.hasSwing !== false}
              disabled={disabled}
              profileCoefficient={customerProfileCoefficient}
              onAddRow={addDoorRow}
              onChange={updateDoorRow}
              onRemove={removeDoorRow}
              onRemoveDoorOption={removeDoorOption}
              onConfigureDoorSizes={configureDoorSizes}
              swapCandidates={visibleDoorComponents}
              isLoadingSwapCandidates={doorComponentsQuery.isFetching}
              onSwapDoorOption={swapDoorOption}
            />
          ) : null}
        </View>
      ) : (
        <View className="mt-3 gap-3">
          <Pressable
            onPress={() => onTaxableChange(!item.taxxable)}
            disabled={disabled}
            className={`h-10 flex-row items-center justify-center gap-2 rounded-xl border ${
              item.taxxable
                ? "border-primary bg-primary/5"
                : "border-border bg-background"
            } disabled:opacity-40`}
          >
            <Icon
              name={item.taxxable ? "CheckCircle2" : "XCircle"}
              className={
                item.taxxable ? "text-primary" : "text-muted-foreground"
              }
              size={15}
            />
            <Text
              className={`text-xs font-bold ${
                item.taxxable ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {item.taxxable ? "Taxable line" : "Non-taxable line"}
            </Text>
          </Pressable>
          <View className="gap-1.5">
            <Text className="text-[11px] font-bold uppercase text-muted-foreground">
              Description
            </Text>
            <TextInput
              value={String(item.description || "")}
              onChangeText={onDescriptionChange}
              editable={!disabled}
              multiline
              className="min-h-16 rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground"
            />
          </View>
        </View>
      )}

      <View className="mt-3 flex-row items-center justify-between gap-3">
        {hasWorkflowRowEditor ? (
          <View className="rounded-full border border-border bg-background px-4 py-2">
            <Text className="text-[10px] font-bold uppercase text-muted-foreground">
              Qty
            </Text>
            <Text className="text-sm font-bold text-foreground">
              {item.qty}
            </Text>
          </View>
        ) : (
          <View className="flex-row items-center rounded-full border border-border bg-background p-1">
            <Pressable
              onPress={() => onQtyChange(Math.max(0, item.qty - 1))}
              disabled={disabled}
              className="h-9 w-9 items-center justify-center rounded-full active:bg-muted disabled:opacity-40"
            >
              <Icon name="Minus" className="text-foreground" size={16} />
            </Pressable>
            <Text className="w-10 text-center text-sm font-bold text-foreground">
              {item.qty}
            </Text>
            <Pressable
              onPress={() => onQtyChange(item.qty + 1)}
              disabled={disabled}
              className="h-9 w-9 items-center justify-center rounded-full active:bg-muted disabled:opacity-40"
            >
              <Icon name="Plus" className="text-foreground" size={16} />
            </Pressable>
          </View>
        )}
        <View className="items-end">
          {isWorkflowLine ? (
            <Text className="text-xs text-muted-foreground">
              {formatMoney(item.unitPrice)} each
            </Text>
          ) : (
            <View className="w-28 gap-2">
              <View>
                <Text className="mb-1 text-right text-[11px] font-bold text-muted-foreground">
                  Unit price
                </Text>
                <TextInput
                  value={String(item.unitPrice || 0)}
                  keyboardType="decimal-pad"
                  onChangeText={(value) =>
                    onUnitPriceChange(parseCurrencyInput(value))
                  }
                  editable={!disabled}
                  className="h-9 rounded-xl border border-border bg-background px-2 text-right text-xs font-bold text-foreground"
                />
              </View>
              <View>
                <Text className="mb-1 text-right text-[11px] font-bold text-muted-foreground">
                  Line total
                </Text>
                <TextInput
                  value={String(displayTotal || 0)}
                  keyboardType="decimal-pad"
                  onChangeText={(value) =>
                    onLineTotalChange(parseCurrencyInput(value))
                  }
                  editable={!disabled}
                  className="h-9 rounded-xl border border-border bg-background px-2 text-right text-xs font-bold text-foreground"
                />
              </View>
            </View>
          )}
          {isWorkflowLine ? (
            <Text className="text-base font-bold text-foreground">
              {formatMoney(displayTotal)}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function readDoorSuppliers(value: unknown) {
  if (!value || typeof value !== "object") return [];
  const rows = (value as { stepProducts?: unknown }).stepProducts;
  return Array.isArray(rows)
    ? rows.map((row) => {
        const supplier = (row || {}) as Record<string, unknown>;
        return {
          id: supplier.id == null ? null : Number(supplier.id || 0),
          uid: supplier.uid ? String(supplier.uid) : null,
          name: supplier.name ? String(supplier.name) : null,
        };
      })
    : [];
}

const styles = StyleSheet.create({
  cardInput: {
    minWidth: 0,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    color: "#111827",
    paddingHorizontal: 8,
    fontSize: 12,
  },
  inputH9: {
    height: 36,
  },
  inputH10: {
    height: 40,
  },
  inputMultiline: {
    minHeight: 64,
    paddingTop: 8,
    paddingBottom: 8,
    textAlignVertical: "top",
  },
  flex1: {
    flex: 1,
  },
  ml2: {
    marginLeft: 8,
  },
  textRight: {
    textAlign: "right",
  },
  bold: {
    fontWeight: "700",
  },
});
