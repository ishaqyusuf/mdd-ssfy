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
  getWorkflowLineDisplayTotal,
  getWorkflowSteps,
  hasWorkflowStepSelection,
  isHousePackageToolStepTitle,
  isMouldingItem,
  isServiceItem,
  isShelfItem,
  removeWorkflowMouldingSelection,
  type DoorStoredRow,
  type MouldingRow,
  type ServiceRow,
  type ShelfProductOption,
  type ShelfRowDraft,
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
import { formatMoney, parseCurrencyInput } from "../lib/format";
import { HousePackageToolEditor } from "../steps/house-package-tool/house-package-tool-editor";
import {
  getDoorRouteConfig,
  getDoorRows,
  getSelectedDoorComponents,
  linePatchChanged,
  mapShelfProduct,
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
    ? buildWorkflowShelfSectionsContext(workflowLine, customerProfileCoefficient).sections
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
  const shouldLoadShelfProducts = shelfSections.length > 0;
  const shelfProductsQuery = useQuery(
    _trpc.newSalesForm.searchShelfProducts.queryOptions(
      {
        query: shelfProductSearch.trim(),
        selectedIds: selectedShelfProductIds,
        limit: shelfProductSearch.trim() ? 20 : 5,
      },
      {
        enabled: shouldLoadShelfProducts,
        refetchOnWindowFocus: false,
      },
    ),
  );
  const shelfProducts = useMemo(
    () =>
      ((shelfProductsQuery.data || []) as unknown[]).map((row) =>
        mapShelfProduct(row, customerProfileCoefficient),
      ),
    [customerProfileCoefficient, shelfProductsQuery.data],
  );
  const doorRows = getDoorRows(workflowLine);
  const doorRouteConfig = getDoorRouteConfig(workflowLine, workflowSteps);
  const selectedDoorComponents = getSelectedDoorComponents(workflowSteps);
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
      buildInitialWorkflowShelfPatch(workflowLine, customerProfileCoefficient) ||
      buildWorkflowShelfSyncPatch(workflowLine, customerProfileCoefficient);
    if (!patch) return;
    onWorkflowPatch(patch.linePatch as Partial<NewSalesFormLineItem>);
  }, [customerProfileCoefficient, disabled, workflowLine, onWorkflowPatch, shelfItem]);

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
    if (
      disabled ||
      !mouldingContext?.rows.length ||
      !onWorkflowPatch
    ) {
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
            name={disabled ? "Loader2" : "Trash"}
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
