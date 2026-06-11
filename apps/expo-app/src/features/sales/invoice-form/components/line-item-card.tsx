import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { _trpc } from "@/components/static-trpc";
import {
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
  clearShelfRowProduct,
  computeHptSharedDoorSurcharge,
  createShelfProductDraft,
  createShelfSectionDraft,
  getRouteConfigForLine,
  getWorkflowLineDisplayTotal,
  getWorkflowSteps,
  hasWorkflowStepSelection,
  isHousePackageToolStepTitle,
  isMouldingItem,
  isServiceItem,
  isShelfItem,
  patchShelfRowPrice,
  patchShelfRowQty,
  profileAdjustedDoorSalesPrice,
  removeWorkflowMouldingSelection,
  type DoorStoredRow,
  type MouldingRow,
  type ServiceRow,
  type ShelfProductOption,
  type ShelfRowDraft,
  type ShelfSectionDraft,
  workflowStepSelectionLabel,
} from "@gnd/sales/sales-form-core";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput as RNTextInput,
  View,
  type TextInputProps,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { USE_MOCK_INVOICE_FORM } from "../api/config";
import { formatMoney, parseCurrencyInput } from "../lib/format";
import { invoiceSelectableItems } from "../mock-data";
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
        classes.includes("min-h-16") || multiline ? styles.inputMultiline : null,
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
  const sku = String(item.meta?.sku || item.description || "ITEM");
  const workflowSteps = getWorkflowSteps(item);
  const configuredSteps = workflowSteps.filter(hasWorkflowStepSelection);
  const displayTotal = getWorkflowLineDisplayTotal(
    item,
    customerProfileCoefficient || 1,
  );
  const isWorkflowLine = workflowSteps.length > 0;
  const serviceItem = isServiceItem(item);
  const mouldingItem = isMouldingItem(item);
  const shelfItem = isShelfItem(item);
  const serviceRows = serviceItem ? buildWorkflowServiceRowsContext(item).rows : [];
  const mouldingContext = mouldingItem ? buildWorkflowMouldingRowsContext(item) : null;
  const shelfSections = shelfItem
    ? buildWorkflowShelfSectionsContext(item, customerProfileCoefficient).sections
    : [];
  const [shelfProductSearch, setShelfProductSearch] = useState("");
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
  const shouldLoadShelfProducts =
    !USE_MOCK_INVOICE_FORM && shelfSections.length > 0;
  const shelfProductsQuery = useQuery(
    shouldLoadShelfProducts
      ? _trpc.newSalesForm.searchShelfProducts.queryOptions(
          {
            query: shelfProductSearch.trim(),
            selectedIds: selectedShelfProductIds,
            limit: shelfProductSearch.trim() ? 20 : 5,
          },
          {
            enabled: true,
            refetchOnWindowFocus: false,
          },
        )
      : {
          queryKey: ["invoice-form", "shelf-products", "disabled", item.uid],
          queryFn: async () => [],
          enabled: false,
        },
  );
  const shelfProducts = useMemo(
    () =>
      USE_MOCK_INVOICE_FORM
        ? invoiceSelectableItems
            .filter((entry) => entry.source === "shelf")
            .filter((entry) => matchesShelfProductSearch(entry, shelfProductSearch))
            .map((entry) => mapMockShelfProduct(entry, customerProfileCoefficient))
        : ((shelfProductsQuery.data || []) as unknown[]).map((row) =>
            mapShelfProduct(row, customerProfileCoefficient),
          ),
    [customerProfileCoefficient, shelfProductSearch, shelfProductsQuery.data],
  );
  const doorRows = getDoorRows(item);
  const doorRouteConfig = getDoorRouteConfig(item, workflowSteps);
  const hasWorkflowRowEditor = Boolean(
    serviceItem ||
      mouldingContext?.rows.length ||
      shelfItem ||
      doorRows.length,
  );

  const patchWorkflowLine = (patch: Partial<NewSalesFormLineItem>) => {
    if (!disabled) onWorkflowPatch?.(patch);
  };

  useEffect(() => {
    if (disabled || !shelfItem || !onWorkflowPatch) return;
    const patch =
      buildInitialWorkflowShelfPatch(item, customerProfileCoefficient) ||
      buildWorkflowShelfSyncPatch(item, customerProfileCoefficient);
    if (!patch) return;
    onWorkflowPatch(patch.linePatch as Partial<NewSalesFormLineItem>);
  }, [customerProfileCoefficient, disabled, item, onWorkflowPatch, shelfItem]);

  useEffect(() => {
    if (disabled || !doorRows.length || !onWorkflowPatch) return;
    const patch = buildWorkflowDoorSyncPatch({
      line: item,
      availableComponents: [],
      profileCoefficient: customerProfileCoefficient,
    });
    if (!patch) return;
    onWorkflowPatch(patch.linePatch as Partial<NewSalesFormLineItem>);
  }, [
    customerProfileCoefficient,
    disabled,
    doorRows.length,
    item,
    onWorkflowPatch,
  ]);

  useEffect(() => {
    if (disabled || !serviceItem || !serviceRows.length || !onWorkflowPatch) {
      return;
    }
    const patch = buildWorkflowServiceRowsPatch({
      line: item,
      rows: serviceRows,
    }) as Partial<NewSalesFormLineItem>;
    if (!linePatchChanged(item, patch)) return;
    onWorkflowPatch(patch);
  }, [disabled, item, onWorkflowPatch, serviceItem, serviceRows]);

  useEffect(() => {
    if (
      disabled ||
      !mouldingContext?.rows.length ||
      !onWorkflowPatch
    ) {
      return;
    }
    const patch = buildWorkflowMouldingRowsPatch({
      line: item,
      rows: mouldingContext.rows,
      sharedComponentPrice: mouldingContext.sharedComponentPrice,
    }) as Partial<NewSalesFormLineItem>;
    if (!linePatchChanged(item, patch)) return;
    onWorkflowPatch(patch);
  }, [disabled, item, mouldingContext, onWorkflowPatch]);

  const updateServiceRow = (index: number, patch: Partial<ServiceRow>) => {
    const rows = serviceRows.map((row, rowIndex) =>
      rowIndex === index ? { ...row, ...patch } : row,
    );
    patchWorkflowLine(
      buildWorkflowServiceRowsPatch({
        line: item,
        rows,
      }) as Partial<NewSalesFormLineItem>,
    );
  };

  const addServiceRow = () => {
    patchWorkflowLine(
      buildWorkflowServiceRowsPatch({
        line: item,
        rows: [...serviceRows, createServiceRow(serviceRows.length + 1)],
      }) as Partial<NewSalesFormLineItem>,
    );
  };

  const removeServiceRow = (index: number) => {
    patchWorkflowLine(
      buildWorkflowServiceRowsPatch({
        line: item,
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
        line: item,
        rows,
        sharedComponentPrice: mouldingContext.sharedComponentPrice,
      }) as Partial<NewSalesFormLineItem>,
    );
  };

  const removeMouldingRow = (row: MouldingRow) => {
    if (!mouldingContext || !row.uid) return;
    patchWorkflowLine(
      removeWorkflowMouldingSelection({
        line: item,
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
          (_section, currentSectionIndex) => currentSectionIndex !== sectionIndex,
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
            categories: [],
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
        line: item,
        rows,
        sharedDoorSurcharge: computeHptSharedDoorSurcharge(item),
        noHandle: Boolean(doorRouteConfig?.noHandle),
        hasSwing: doorRouteConfig?.hasSwing !== false,
        profileCoefficient: customerProfileCoefficient,
      }).linePatch as Partial<NewSalesFormLineItem>,
    );
  };

  const removeDoorRow = (index: number) => {
    patchWorkflowLine(
      buildWorkflowDoorRowsPatch({
        line: item,
        rows: doorRows.filter((_row, rowIndex) => rowIndex !== index),
        sharedDoorSurcharge: computeHptSharedDoorSurcharge(item),
        noHandle: Boolean(doorRouteConfig?.noHandle),
        hasSwing: doorRouteConfig?.hasSwing !== false,
        profileCoefficient: customerProfileCoefficient,
      }).linePatch as Partial<NewSalesFormLineItem>,
    );
  };

  return (
    <View className="rounded-2xl border border-border bg-card p-3">
      <View className="flex-row items-start gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
          <Icon name="ReceiptText" className="text-primary" size={19} />
        </View>
        <View className="min-w-0 flex-1">
          {isWorkflowLine ? (
            <Text numberOfLines={1} className="text-sm font-bold text-foreground">
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
              {configuredSteps.length}/{workflowSteps.length} workflow steps configured
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={onRemove}
          disabled={disabled}
          className="h-10 w-10 items-center justify-center rounded-full active:bg-muted disabled:opacity-40"
        >
          <Icon
            name={disabled ? "LoaderCircle" : "Trash"}
            className="text-red-600"
            size={17}
          />
        </Pressable>
      </View>
      {configuredSteps.length > 0 ? (
        <View className="mt-3 gap-1.5">
          {configuredSteps.slice(0, 3).map((step, index) => (
            <View key={`${step.uid || step.stepId || index}`} className="flex-row gap-2">
              <Text className="w-24 text-[11px] font-bold text-muted-foreground">
                {step.step?.title || step.title || `Step ${index + 1}`}
              </Text>
              <Text numberOfLines={1} className="flex-1 text-[11px] text-foreground">
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
            <Text className="text-xs font-bold text-primary">Configure workflow</Text>
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
          {mouldingContext?.rows.length ? (
            <MouldingRowsEditor
              rows={mouldingContext.rows}
              disabled={disabled}
              onChange={updateMouldingRow}
              onRemove={removeMouldingRow}
            />
          ) : null}
          {shelfItem ? (
            <ShelfRowsEditor
              sections={shelfSections}
              products={shelfProducts}
              productSearch={shelfProductSearch}
              isLoadingProducts={shelfProductsQuery.isPending}
              disabled={disabled}
              onProductSearchChange={setShelfProductSearch}
              onSelectProduct={selectShelfProduct}
              onChange={updateShelfRow}
              onAddSection={addShelfSection}
              onAddRow={addShelfRow}
              onRemoveRow={removeShelfRow}
              onRemoveSection={removeShelfSection}
            />
          ) : null}
          {doorRows.length ? (
            <DoorRowsEditor
              rows={doorRows}
              noHandle={Boolean(doorRouteConfig?.noHandle)}
              hasSwing={doorRouteConfig?.hasSwing !== false}
              disabled={disabled}
              onChange={updateDoorRow}
              onRemove={removeDoorRow}
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
              name={item.taxxable ? "CheckCircle2" : "Circle"}
              className={item.taxxable ? "text-primary" : "text-muted-foreground"}
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
            <Text className="text-sm font-bold text-foreground">{item.qty}</Text>
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
                  onChangeText={(value) => onUnitPriceChange(parseCurrencyInput(value))}
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
                  onChangeText={(value) => onLineTotalChange(parseCurrencyInput(value))}
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

function getDoorRows(item: NewSalesFormLineItem) {
  const housePackageTool = item.housePackageTool as
    | { doors?: DoorStoredRow[] | null }
    | null
    | undefined;
  return Array.isArray(housePackageTool?.doors) ? housePackageTool.doors : [];
}

function getDoorRouteConfig(
  item: NewSalesFormLineItem,
  steps: ReturnType<typeof getWorkflowSteps>,
) {
  const hptStep = steps.find((step) =>
    isHousePackageToolStepTitle(step.step?.title || step.title),
  );
  if (!hptStep) return null;
  const selectedComponents = Array.isArray(hptStep.meta?.selectedComponents)
    ? hptStep.meta.selectedComponents
    : [];
  const storedRouteConfig = readStoredDoorRouteConfig(item);
  const stepRouteConfig = getRouteConfigForLine({
    routeData: null,
    line: item,
    step: hptStep,
    component: selectedComponents[0] || null,
  });
  return {
    ...storedRouteConfig,
    ...stepRouteConfig,
  };
}

function readStoredDoorRouteConfig(item: NewSalesFormLineItem) {
  const meta = item.meta || {};
  const config = meta.workflowDoorRouteConfig;
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return {};
  }
  const routeConfig = config as {
    noHandle?: unknown;
    hasSwing?: unknown;
  };
  return {
    ...(typeof routeConfig.noHandle === "boolean"
      ? { noHandle: routeConfig.noHandle }
      : {}),
    ...(typeof routeConfig.hasSwing === "boolean"
      ? { hasSwing: routeConfig.hasSwing }
      : {}),
  };
}

function ServiceRowsEditor({
  rows,
  disabled,
  onChange,
  onAdd,
  onRemove,
}: {
  rows: ServiceRow[];
  disabled?: boolean;
  onChange: (index: number, patch: Partial<ServiceRow>) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <View className="border-t border-border pt-3">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="text-[11px] font-bold uppercase text-muted-foreground">
          Service rows
        </Text>
        <Pressable
          onPress={onAdd}
          disabled={disabled}
          className="h-8 flex-row items-center gap-1 rounded-full border border-primary bg-primary/5 px-3 disabled:opacity-40"
        >
          <Icon name="Plus" className="text-primary" size={13} />
          <Text className="text-[11px] font-bold text-primary">Add</Text>
        </Pressable>
      </View>
      <View className="mt-2 gap-3">
        {rows.map((row, index) => (
          <View
            key={`${row.uid || index}`}
            className="gap-2 rounded-xl border border-border bg-background p-2"
          >
            <View className="flex-row items-center gap-2">
              <Text className="text-[11px] font-bold text-muted-foreground">
                {index + 1}.
              </Text>
              <View className="flex-1" />
              <Pressable
                onPress={() => onChange(index, { taxxable: !row.taxxable })}
                disabled={disabled}
                className={`h-8 justify-center rounded-full border px-2 disabled:opacity-40 ${
                  row.taxxable
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card"
                }`}
              >
                <Text
                  className={`text-[10px] font-bold ${
                    row.taxxable ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  Tax
                </Text>
              </Pressable>
              <Pressable
                onPress={() => onChange(index, { produceable: !row.produceable })}
                disabled={disabled}
                className={`h-8 justify-center rounded-full border px-2 disabled:opacity-40 ${
                  row.produceable
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card"
                }`}
              >
                <Text
                  className={`text-[10px] font-bold ${
                    row.produceable ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  Prod
                </Text>
              </Pressable>
              <Pressable
                onPress={() => onRemove(index)}
                disabled={disabled}
                className="h-8 w-8 items-center justify-center rounded-full active:bg-muted disabled:opacity-40"
              >
                <Icon name="Trash" className="text-red-600" size={14} />
              </Pressable>
            </View>
            <TextInput
              value={String(row.service || "")}
              onChangeText={(service) => onChange(index, { service })}
              editable={!disabled}
              placeholder="Service"
              placeholderTextColor="#8A8A8A"
              className="h-10 rounded-xl border border-border bg-background px-3 text-xs text-foreground"
            />
            <View className="flex-row gap-2">
              <NumberField
                label="Qty"
                value={row.qty}
                disabled={disabled}
                onChange={(qty) => onChange(index, { qty })}
              />
              <NumberField
                label="Unit"
                value={row.unitPrice}
                disabled={disabled}
                onChange={(unitPrice) => onChange(index, { unitPrice })}
              />
              <View className="w-24 justify-end">
                <Text className="text-right text-xs font-bold text-foreground">
                  {formatMoney(row.lineTotal || 0)}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function MouldingRowsEditor({
  rows,
  disabled,
  onChange,
  onRemove,
}: {
  rows: MouldingRow[];
  disabled?: boolean;
  onChange: (index: number, patch: Partial<MouldingRow>) => void;
  onRemove: (row: MouldingRow) => void;
}) {
  return (
    <View className="border-t border-border pt-3">
      <Text className="text-[11px] font-bold uppercase text-muted-foreground">
        Moulding rows
      </Text>
      <View className="mt-2 gap-3">
        {rows.map((row, index) => (
          <View key={`${row.uid || index}`} className="gap-2">
            <View className="flex-row gap-2">
              <TextInput
                value={String(row.description || row.title || "")}
                onChangeText={(description) => onChange(index, { description })}
                editable={!disabled}
                placeholder="Moulding"
                placeholderTextColor="#8A8A8A"
                className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-xs text-foreground"
              />
              <Pressable
                onPress={() => onRemove(row)}
                disabled={disabled}
                className="h-10 w-10 items-center justify-center rounded-xl border border-border bg-background active:bg-muted disabled:opacity-40"
              >
                <Icon name="Trash" className="text-red-600" size={14} />
              </Pressable>
            </View>
            <View className="flex-row gap-2">
              <NumberField
                label="Qty"
                value={row.qty}
                disabled={disabled}
                onChange={(qty) => onChange(index, { qty })}
              />
              <NumberField
                label="Add-on"
                value={row.addon}
                disabled={disabled}
                onChange={(addon) => onChange(index, { addon })}
              />
              <NumberField
                label="Custom"
                value={row.customPrice ?? ""}
                disabled={disabled}
                onChange={(customPrice) => onChange(index, { customPrice })}
              />
            </View>
            <Text className="text-right text-xs font-bold text-foreground">
              {formatMoney(row.lineTotal || 0)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ShelfRowsEditor({
  sections,
  products,
  productSearch,
  isLoadingProducts,
  disabled,
  onProductSearchChange,
  onSelectProduct,
  onChange,
  onAddSection,
  onAddRow,
  onRemoveRow,
  onRemoveSection,
}: {
  sections: ShelfSectionDraft[];
  products: ShelfProductOption[];
  productSearch: string;
  isLoadingProducts?: boolean;
  disabled?: boolean;
  onProductSearchChange: (query: string) => void;
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
  return (
    <View className="border-t border-border pt-3">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="text-[11px] font-bold uppercase text-muted-foreground">
          Shelf rows
        </Text>
        <Pressable
          onPress={onAddSection}
          disabled={disabled}
          className="h-8 flex-row items-center gap-1 rounded-full border border-primary bg-primary/5 px-3 disabled:opacity-40"
        >
          <Icon name="Plus" className="text-primary" size={13} />
          <Text className="text-[11px] font-bold text-primary">Section</Text>
        </Pressable>
      </View>
      <View className="mt-2 gap-3">
        {sections.map((section, sectionIndex) => (
          <View
            key={`${section.uid || sectionIndex}`}
            className="gap-3 rounded-xl border border-border bg-background p-2"
          >
            <View className="flex-row items-center gap-2">
              <Text className="flex-1 text-[11px] font-bold text-muted-foreground">
                Section {sectionIndex + 1}
              </Text>
              <Pressable
                onPress={() => onAddRow(sectionIndex)}
                disabled={disabled}
                className="h-8 flex-row items-center gap-1 rounded-full border border-primary bg-primary/5 px-2 disabled:opacity-40"
              >
                <Icon name="Plus" className="text-primary" size={12} />
                <Text className="text-[10px] font-bold text-primary">Row</Text>
              </Pressable>
              <Pressable
                onPress={() => onRemoveSection(sectionIndex)}
                disabled={disabled}
                className="h-8 w-8 items-center justify-center rounded-full active:bg-muted disabled:opacity-40"
              >
                <Icon name="Trash" className="text-red-600" size={14} />
              </Pressable>
            </View>
            {section.rows.map((row, rowIndex) => (
              <View
                key={`${section.uid}:${row.uid || rowIndex}`}
                className="gap-2"
              >
                <View className="gap-2 rounded-xl border border-border bg-background p-2">
                  <View className="h-10 flex-row items-center rounded-lg border border-border bg-card px-2">
                    <Icon
                      name="Search"
                      className="text-muted-foreground"
                      size={14}
                    />
                    <TextInput
                      value={productSearch}
                      onChangeText={onProductSearchChange}
                      editable={!disabled}
                      placeholder="Search shelf products"
                      placeholderTextColor="#8A8A8A"
                      className="ml-2 flex-1 text-xs text-foreground"
                    />
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 6 }}
                  >
                    <ShelfProductChip
                      title="Custom"
                      subtitle="Manual row"
                      selected={!row.productId}
                      disabled={disabled}
                      onPress={() => onSelectProduct(sectionIndex, rowIndex, null)}
                    />
                    {products.map((product) => (
                      <ShelfProductChip
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
                    ))}
                    {isLoadingProducts ? (
                      <Text className="self-center text-xs text-muted-foreground">
                        Loading products...
                      </Text>
                    ) : null}
                  </ScrollView>
                </View>
                <TextInput
                  value={String(row.description || "")}
                  onChangeText={(description) =>
                    onChange(sectionIndex, rowIndex, { description })
                  }
                  editable={!disabled}
                  placeholder="Shelf item"
                  placeholderTextColor="#8A8A8A"
                  className="h-10 rounded-xl border border-border bg-background px-3 text-xs text-foreground"
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
                  <Pressable
                    onPress={() => onRemoveRow(sectionIndex, rowIndex)}
                    disabled={disabled}
                    className="h-10 w-10 items-center justify-center rounded-xl border border-border bg-background active:bg-muted disabled:opacity-40"
                  >
                    <Icon name="Trash" className="text-red-600" size={14} />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function DoorRowsEditor({
  rows,
  noHandle,
  hasSwing,
  disabled,
  onChange,
  onRemove,
}: {
  rows: DoorStoredRow[];
  noHandle?: boolean;
  hasSwing?: boolean;
  disabled?: boolean;
  onChange: (index: number, patch: Partial<DoorStoredRow>) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <View className="border-t border-border pt-3">
      <Text className="text-[11px] font-bold uppercase text-muted-foreground">
        Door rows
      </Text>
      <View className="mt-2 gap-3">
        {rows.map((row, index) => {
          const lhQty = Number(row.lhQty || 0);
          const rhQty = Number(row.rhQty || 0);
          return (
            <View
              key={`${row.stepProductId || "door"}:${row.dimension || index}`}
              className="gap-2"
            >
              <View className="flex-row gap-2">
                <View className="min-w-0 flex-1 gap-1">
                  <Text className="text-[10px] font-bold uppercase text-muted-foreground">
                    Size
                  </Text>
                  <TextInput
                    value={String(row.dimension || "")}
                    onChangeText={(dimension) => onChange(index, { dimension })}
                    editable={!disabled}
                    placeholder="2-8 x 6-8"
                    placeholderTextColor="#8A8A8A"
                    className="h-10 rounded-xl border border-border bg-background px-2 text-xs font-bold text-foreground"
                  />
                </View>
                {hasSwing === false ? null : (
                  <View className="w-20 gap-1">
                    <Text className="text-[10px] font-bold uppercase text-muted-foreground">
                      Swing
                    </Text>
                    <TextInput
                      value={String(row.swing || "")}
                      onChangeText={(swing) => onChange(index, { swing })}
                      editable={!disabled}
                      placeholder="LH"
                      placeholderTextColor="#8A8A8A"
                      className="h-10 rounded-xl border border-border bg-background px-2 text-xs font-bold text-foreground"
                    />
                  </View>
                )}
              </View>
              <View className="flex-row gap-2">
                {noHandle ? null : (
                  <>
                    <NumberField
                      label="LH"
                      value={row.lhQty}
                      disabled={disabled}
                      onChange={(nextLhQty) =>
                        onChange(index, {
                          lhQty: nextLhQty,
                          totalQty: nextLhQty + rhQty,
                        })
                      }
                    />
                    <NumberField
                      label="RH"
                      value={row.rhQty}
                      disabled={disabled}
                      onChange={(nextRhQty) =>
                        onChange(index, {
                          rhQty: nextRhQty,
                          totalQty: lhQty + nextRhQty,
                        })
                      }
                    />
                  </>
                )}
                <NumberField
                  label="Total"
                  value={row.totalQty}
                  disabled={disabled}
                  onChange={(totalQty) => onChange(index, { totalQty })}
                />
              </View>
              <View className="flex-row gap-2">
                <NumberField
                  label="Add-on"
                  value={row.addon ?? ""}
                  disabled={disabled}
                  onChange={(addon) => onChange(index, { addon })}
                />
                <NumberField
                  label="Custom"
                  value={row.customPrice ?? ""}
                  disabled={disabled}
                  onChange={(customPrice) => onChange(index, { customPrice })}
                />
                <View className="w-24 justify-end">
                  <Text className="text-right text-xs font-bold text-foreground">
                    {formatMoney(row.lineTotal || 0)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => onRemove(index)}
                  disabled={disabled}
                  className="h-10 w-10 items-center justify-center rounded-xl border border-border bg-background active:bg-muted disabled:opacity-40"
                >
                  <Icon name="Trash" className="text-red-600" size={14} />
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function ShelfProductChip({
  title,
  subtitle,
  selected,
  disabled,
  onPress,
}: {
  title: string;
  subtitle?: string | null;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`min-h-12 min-w-32 justify-center rounded-xl border px-3 py-2 disabled:opacity-40 ${
        selected ? "border-primary bg-primary/10" : "border-border bg-card"
      }`}
    >
      <Text
        numberOfLines={1}
        className={`max-w-40 text-[11px] font-bold ${
          selected ? "text-primary" : "text-foreground"
        }`}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text numberOfLines={1} className="mt-0.5 text-[10px] text-muted-foreground">
          {subtitle}
        </Text>
      ) : null}
    </Pressable>
  );
}

function mapShelfProduct(
  row: unknown,
  profileCoefficient?: number | null,
): ShelfProductOption {
  const product = (row || {}) as Record<string, unknown>;
  const categoryPath = Array.isArray(product.categoryPath)
    ? product.categoryPath
    : [];
  const baseUnitPrice =
    product.unitPrice == null ? null : Number(product.unitPrice || 0);
  const displayUnitPrice = profileAdjustedDoorSalesPrice(
    product.salesPrice == null ? baseUnitPrice : Number(product.salesPrice || 0),
    baseUnitPrice,
    profileCoefficient,
  );
  return {
    ...product,
    id: product.id == null ? null : Number(product.id || 0),
    title: String(product.title || "Shelf product"),
    unitPrice: baseUnitPrice,
    salesPrice: displayUnitPrice,
    categoryId:
      product.categoryId == null ? null : Number(product.categoryId || 0),
    parentCategoryId:
      product.parentCategoryId == null
        ? null
        : Number(product.parentCategoryId || 0),
    categoryPath: categoryPath.map((entry) =>
      typeof entry === "object" && entry
        ? {
            ...entry,
            id: Number((entry as { id?: unknown }).id || 0),
          }
        : { id: Number(entry || 0) },
    ),
  };
}

function matchesShelfProductSearch(
  item: { title?: string; sku?: string; category?: string },
  search: string,
) {
  const normalized = search.trim().toLowerCase();
  if (!normalized) return true;
  return [item.title, item.sku, item.category]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

function mapMockShelfProduct(
  item: {
    productId?: number | null;
    title?: string;
    unitPrice?: number | null;
    basePrice?: number | null;
    salesPrice?: number | null;
    categoryId?: number | null;
    parentCategoryId?: number | null;
    categoryIds?: number[];
  },
  profileCoefficient?: number | null,
): ShelfProductOption {
  const baseUnitPrice = Number(
    item.basePrice ?? item.unitPrice ?? item.salesPrice ?? 0,
  );
  const displayUnitPrice = profileAdjustedDoorSalesPrice(
    item.salesPrice == null ? baseUnitPrice : Number(item.salesPrice || 0),
    baseUnitPrice,
    profileCoefficient,
  );
  return {
    id: item.productId == null ? null : Number(item.productId || 0),
    title: String(item.title || "Shelf product"),
    unitPrice: baseUnitPrice,
    salesPrice: displayUnitPrice,
    categoryId:
      item.categoryId == null ? null : Number(item.categoryId || 0),
    parentCategoryId:
      item.parentCategoryId == null ? null : Number(item.parentCategoryId || 0),
    categoryPath: (item.categoryIds || []).map((id) => ({ id })),
  };
}

function createServiceRow(nextIndex: number): ServiceRow {
  return {
    uid: `service-${nextIndex}-${Date.now().toString(36)}`,
    service: "",
    taxxable: false,
    produceable: false,
    qty: 1,
    unitPrice: 0,
  };
}

function linePatchChanged(
  line: NewSalesFormLineItem,
  patch: Partial<NewSalesFormLineItem>,
) {
  return Object.entries(patch).some(([key, value]) => {
    const current = (line as Record<string, unknown>)[key];
    return JSON.stringify(current ?? null) !== JSON.stringify(value ?? null);
  });
}

function NumberField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value?: number | string | null;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <View className="min-w-0 flex-1 gap-1">
      <Text className="text-[10px] font-bold uppercase text-muted-foreground">
        {label}
      </Text>
      <TextInput
        value={String(value ?? 0)}
        keyboardType="decimal-pad"
        onChangeText={(nextValue) => onChange(parseCurrencyInput(nextValue))}
        editable={!disabled}
        className="h-10 rounded-xl border border-border bg-background px-2 text-xs font-bold text-foreground"
      />
    </View>
  );
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
