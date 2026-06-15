import { SafeArea } from "@/components/safe-area";
import { Button } from "@/components/ui/button";
import { Icon, type IconKeys } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import {
  buildStepComponentOverrideMap,
  buildWorkflowMouldingRowsContext,
  buildWorkflowDoorSizeVariantPatch,
  buildWorkflowLinePricingPatch,
  calcWorkflowDoorRow,
  clearUnpricedDoorRowQty,
  componentLabel,
  computeHptSharedDoorSurcharge,
  deriveDoorSizeRows,
  firstPendingStepIndex,
  getItemWorkflowStepFamily,
  getRouteConfigForLine,
  getDoorSupplierMeta,
  getSelectedProdUids,
  getWorkflowSteps,
  isDoorStepTitle,
  isHousePackageToolStepTitle,
  isMouldingItem,
  isMultiSelectStepTitle,
  isRedirectDisabledStep,
  isWorkflowComponentSelected,
  moneyIfPositive,
  proceedWorkflowMultiSelectStep,
  resolveWorkflowStepComponentStatus,
  resolveWorkflowVisibleComponents,
  resolveInteractiveStepIndex,
  rowsForDoorComponent,
  saveWorkflowMouldingSelectionWithQty,
  saveWorkflowSelectedComponent,
  selectAllWorkflowComponents,
  updateWorkflowDoorSupplier,
  type DoorStoredRow,
  type WorkflowComponentRecord,
  type WorkflowStepRecord,
} from "@gnd/sales/sales-form-core";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput as RNTextInput,
  View,
  type ScrollViewProps,
  type TextInputProps,
} from "react-native";
import { useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useInvoiceFormProfiles } from "../api/use-invoice-form-profiles";
import { useInvoiceWorkflowStepComponents } from "../api/use-invoice-workflow-step-components";
import { parseCurrencyInput } from "../lib/format";
import { useInvoiceFormModalStore } from "../store/use-invoice-form-modal-store";
import { useInvoiceFormStore } from "../store/use-invoice-form-store";
import type { NewSalesFormLineItem } from "../types";

type WorkflowSelectorNoticeState = {
  icon: IconKeys;
  title: string;
  description: string;
};

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
        styles.input,
        classes.includes("h-8") ? styles.inputH8 : null,
        classes.includes("h-10") ? styles.inputH10 : null,
        classes.includes("bg-muted") ? styles.inputMuted : null,
        classes.includes("ml-2") ? styles.ml2 : null,
        classes.includes("flex-1") ? styles.flex1 : null,
        classes.includes("text-right") ? styles.textRight : null,
        classes.includes("text-center") ? styles.textCenter : null,
        classes.includes("text-xs") ? styles.textXs : null,
        classes.includes("text-base") ? styles.textBase : null,
        classes.includes("font-bold") ? styles.bold : null,
        multiline ? styles.multiline : null,
        style,
      ]}
    />
  );
}

export function WorkflowStepSelector({
  line,
  onClose,
  presentation = "overlay",
}: {
  line: NewSalesFormLineItem;
  onClose: () => void;
  presentation?: "overlay" | "inline";
}) {
  const inline = presentation === "inline";
  const currentLine =
    useInvoiceFormStore((state) =>
      state.lineItems.find((item) => item.uid === line.uid),
    ) || line;
  const steps = useMemo(() => getWorkflowSteps(currentLine), [currentLine]);
  const [activeStepIndex, setActiveStepIndex] = useState(() =>
    initialStepIndex(steps, presentation),
  );
  const activeLineUidRef = useRef(currentLine.uid);
  const [doorSizeComponent, setDoorSizeComponent] =
    useState<WorkflowComponentRecord | null>(null);
  const [doorSizeRows, setDoorSizeRows] = useState<DoorStoredRow[]>([]);
  const [mouldingQtyComponent, setMouldingQtyComponent] =
    useState<WorkflowComponentRecord | null>(null);
  const [mouldingQty, setMouldingQty] = useState("1");
  const activeStep = steps[activeStepIndex] || steps[0] || null;
  const {
    components,
    workflowRouteData,
    isLoadingComponents,
    doorSuppliers,
    isLoadingDoorSuppliers,
    stepComponentsQuery,
    refetchStepComponents,
  } = useInvoiceWorkflowStepComponents(activeStep);
  const customerProfileId = useInvoiceFormStore(
    (state) => state.meta.customerProfileId,
  );
  const { getProfileCoefficient } = useInvoiceFormProfiles();
  const actions = useInvoiceFormStore((state) => state.actions);
  const router = useRouter();
  const setDoorSizePicker = useInvoiceFormModalStore(
    (state) => state.actions.setDoorSizePicker,
  );
  const clearDoorSizePicker = useInvoiceFormModalStore(
    (state) => state.actions.clearDoorSizePicker,
  );
  const activeStepTitle = activeStep?.step?.title || activeStep?.title || "";
  const activeStepUid = String(activeStep?.step?.uid || activeStep?.uid || "");
  const rootStepUid = String(workflowRouteData?.rootStepUid || "");
  const activeRootStep =
    activeStepTitle.trim().toLowerCase() === "item type" ||
    (Boolean(rootStepUid) && activeStepUid === rootStepUid);
  const activeStepFamily = activeStep
    ? getItemWorkflowStepFamily(currentLine, activeStep)
    : "component-grid";
  const activeMouldingStep =
    isMouldingItem(currentLine) &&
    activeStepTitle.trim().toLowerCase() === "moulding";
  const activeHousePackageToolStep =
    isHousePackageToolStepTitle(activeStepTitle);
  const activeRedirectDisabledStep = activeStep
    ? isRedirectDisabledStep(activeStep)
    : false;
  const activeGroupedRowEditorStep =
    activeStepFamily === "service-line-item" ||
    activeStepFamily === "shelf" ||
    (activeStepFamily === "moulding-line-item" && !activeMouldingStep);
  const showComponentPicker =
    Boolean(activeStep) &&
    !activeHousePackageToolStep &&
    !activeRedirectDisabledStep &&
    !activeGroupedRowEditorStep;
  const multiSelectStep = isMultiSelectStepTitle(activeStepTitle);
  const doorStep = isDoorStepTitle(activeStepTitle);
  const pickerMultiSelectStep = showComponentPicker && multiSelectStep;
  const bulkSelectableStep =
    pickerMultiSelectStep && !doorStep && !activeMouldingStep;
  const selectedCount = useMemo(
    () => getSelectedProdUids(activeStep).length,
    [activeStep],
  );
  const activeStepComponentOverrides = useMemo(
    () => buildStepComponentOverrideMap(activeStep),
    [activeStep],
  );
  const visibleComponents = useMemo(
    () =>
      resolveWorkflowVisibleComponents({
        components: activeRootStep
          ? components.filter((component) =>
              Object.prototype.hasOwnProperty.call(
                workflowRouteData?.composedRouter || {},
                String(component.uid || ""),
              ),
            )
          : components,
        steps,
        activeStep,
        overrides: activeStepComponentOverrides,
        includeCustomComponents: false,
        profileCoefficient: getProfileCoefficient(customerProfileId) || 1,
      }),
    [
      activeStep,
      activeStepComponentOverrides,
      activeRootStep,
      components,
      customerProfileId,
      getProfileCoefficient,
      steps,
      workflowRouteData?.composedRouter,
    ],
  );
  const selectorNotice = useMemo(
    () =>
      resolveWorkflowSelectorNotice({
        activeStep,
        activeStepFamily,
        activeStepTitle,
        activeHousePackageToolStep,
        activeRedirectDisabledStep,
        activeGroupedRowEditorStep,
      }),
    [
      activeGroupedRowEditorStep,
      activeHousePackageToolStep,
      activeRedirectDisabledStep,
      activeStep,
      activeStepFamily,
      activeStepTitle,
    ],
  );
  const doorSizeRouteConfig = useMemo(
    () =>
      doorSizeComponent
        ? getRouteConfigForLine({
            routeData: workflowRouteData,
            line: currentLine,
            step: activeStep,
            component: doorSizeComponent,
          })
        : null,
    [activeStep, currentLine, doorSizeComponent, workflowRouteData],
  );
  const doorSizeSupplier = useMemo(
    () => getDoorSupplierMeta(activeStep),
    [activeStep],
  );
  const componentStatus = useMemo(
    () =>
      resolveWorkflowStepComponentStatus({
        stepQuery: stepComponentsQuery,
        stepTitle: activeStepTitle,
        componentsCount: visibleComponents.length,
      }),
    [activeStepTitle, stepComponentsQuery, visibleComponents.length],
  );

  useEffect(() => {
    if (activeLineUidRef.current === currentLine.uid) return;
    activeLineUidRef.current = currentLine.uid;
    setActiveStepIndex(initialStepIndex(steps, presentation));
  }, [currentLine.uid, presentation, steps]);

  useEffect(() => {
    if (!steps.length) return;
    setActiveStepIndex((current) =>
      presentation === "inline"
        ? Math.min(current, Math.max(0, steps.length - 1))
        : resolveInteractiveStepIndex(
            steps,
            current >= steps.length ? Math.max(0, steps.length - 1) : current,
          ),
    );
  }, [presentation, steps]);

  useEffect(() => {
    if (!doorSizeComponent) return;
    const existingRows = rowsForDoorComponent(
      currentLine,
      doorSizeComponent.id ?? null,
    ) as DoorStoredRow[];
    const nextRows = deriveDoorSizeRows({
      line: currentLine,
      existingRows,
      component: doorSizeComponent,
      routeData: workflowRouteData,
      supplierUid: doorSizeSupplier.supplierUid,
      profileCoefficient: getProfileCoefficient(customerProfileId) || 1,
    }) as DoorStoredRow[];
    setDoorSizeRows(nextRows.map((row) => clearUnpricedDoorRowQty(row)));
  }, [
    currentLine,
    customerProfileId,
    doorSizeComponent,
    doorSizeSupplier.supplierUid,
    getProfileCoefficient,
    workflowRouteData,
  ]);

  const handleSelect = (component: WorkflowComponentRecord) => {
    if (doorStep) {
      setDoorSizeComponent(component);
      router.push("/(sales)/invoices/door-size" as any);
      return;
    }
    if (activeMouldingStep) {
      openMouldingQtyPicker(component);
      return;
    }
    if (!workflowRouteData || !activeStep) return;
    const result = saveWorkflowSelectedComponent({
      routeData: workflowRouteData,
      line: currentLine,
      steps,
      currentStepIndex: activeStepIndex,
      component,
      visibleComponents,
      activeStepTitle,
    });
    if (!result) return;
    actions.patchLineItem(line.uid, {
      ...(result.linePatch as Partial<NewSalesFormLineItem>),
      ...buildWorkflowLinePricingPatch(currentLine, result.linePatch.formSteps),
    });
    setActiveStepIndex(result.activeStepIndex);
  };

  const handleDoorSizeRowChange = (
    rowIndex: number,
    patch: Partial<DoorStoredRow>,
  ) => {
    setDoorSizeRows((rows) =>
      rows.map((row, index) =>
        index === rowIndex
          ? clearUnpricedDoorRowQty(
              calcWorkflowDoorRow({ ...row, ...patch }) as DoorStoredRow,
            )
          : row,
      ),
    );
  };

  const handleApplyDoorSizes = (options?: { advance?: boolean }) => {
    if (!workflowRouteData || !doorSizeComponent) return;
    const selectedRows = doorSizeRows.filter(
      (row) => Number(row.totalQty || 0) > 0,
    );
    const doorRouteFlags = {
      noHandle: Boolean(doorSizeRouteConfig?.noHandle),
      hasSwing: doorSizeRouteConfig?.hasSwing !== false,
    };
    const doorPatch = buildWorkflowDoorSizeVariantPatch({
      line: currentLine,
      componentId: Number(doorSizeComponent.id || 0),
      rows: selectedRows,
      sharedDoorSurcharge: computeHptSharedDoorSurcharge(currentLine),
      noHandle: doorRouteFlags.noHandle,
      hasSwing: doorRouteFlags.hasSwing,
      profileCoefficient: getProfileCoefficient(customerProfileId) || 1,
    });
    const firstResolvedRow = doorPatch.rows.find(
      (row) => Number(row.totalQty || 0) > 0,
    );
    const resolvedDoorComponent = firstResolvedRow
      ? {
          ...doorSizeComponent,
          salesPrice: Number(
            firstResolvedRow.unitPrice || doorSizeComponent.salesPrice || 0,
          ),
          basePrice: Number(
            firstResolvedRow.meta?.baseUnitPrice ||
              doorSizeComponent.basePrice ||
              0,
          ),
        }
      : doorSizeComponent;
    const selectionResult = saveWorkflowSelectedComponent({
      routeData: workflowRouteData,
      line: {
        ...currentLine,
        ...(doorPatch.linePatch as Partial<NewSalesFormLineItem>),
      },
      steps,
      currentStepIndex: activeStepIndex,
      component: resolvedDoorComponent,
      visibleComponents,
      activeStepTitle,
      selectedOverride: selectedRows.length > 0,
    });
    const lineWithDoorPatch = {
      ...currentLine,
      ...(doorPatch.linePatch as Partial<NewSalesFormLineItem>),
    };
    actions.patchLineItem(line.uid, {
      ...(doorPatch.linePatch as Partial<NewSalesFormLineItem>),
      ...(selectionResult?.linePatch as Partial<NewSalesFormLineItem>),
      meta: {
        ...(currentLine.meta || {}),
        ...(((doorPatch.linePatch as Partial<NewSalesFormLineItem>).meta ||
          {}) as Record<string, unknown>),
        ...(((
          selectionResult?.linePatch as
            | Partial<NewSalesFormLineItem>
            | undefined
        )?.meta || {}) as Record<string, unknown>),
        workflowDoorRouteConfig: doorRouteFlags,
      },
      ...buildWorkflowLinePricingPatch(
        lineWithDoorPatch,
        selectionResult?.linePatch.formSteps || steps,
      ),
    });
    if (options?.advance && selectionResult) {
      setActiveStepIndex(selectionResult.activeStepIndex);
    }
    setDoorSizeComponent(null);
    clearDoorSizePicker();
  };

  const handleDoorSupplierChange = (
    supplier: { uid?: string | null; name?: string | null } | null,
  ) => {
    if (!doorStep) return;
    const patch = updateWorkflowDoorSupplier({
      line: currentLine,
      stepIndex: activeStepIndex,
      supplier,
      profileCoefficient: getProfileCoefficient(customerProfileId) || 1,
    });
    if (!patch) return;
    actions.patchLineItem(line.uid, patch as Partial<NewSalesFormLineItem>);
  };

  useEffect(() => {
    if (!doorSizeComponent) {
      clearDoorSizePicker();
      return;
    }
    setDoorSizePicker({
      component: doorSizeComponent,
      rows: doorSizeRows,
      supplierName: doorSizeSupplier.supplierName,
      supplierUid: doorSizeSupplier.supplierUid,
      suppliers: doorSuppliers,
      isLoadingSuppliers: isLoadingDoorSuppliers,
      noHandle: Boolean(doorSizeRouteConfig?.noHandle),
      disabled: !workflowRouteData,
      onSupplierChange: handleDoorSupplierChange,
      onChangeRow: handleDoorSizeRowChange,
      onOk: () => handleApplyDoorSizes({ advance: false }),
      onNextStep: () => handleApplyDoorSizes({ advance: true }),
      onClose: () => {
        setDoorSizeComponent(null);
        clearDoorSizePicker();
      },
    });
  }, [
    clearDoorSizePicker,
    doorSizeComponent,
    doorSizeRows,
    doorSizeSupplier.supplierName,
    doorSizeSupplier.supplierUid,
    doorSuppliers,
    isLoadingDoorSuppliers,
    setDoorSizePicker,
    workflowRouteData,
    doorSizeRouteConfig?.noHandle,
  ]);

  const openMouldingQtyPicker = (component: WorkflowComponentRecord) => {
    const mouldingContext = buildWorkflowMouldingRowsContext(currentLine);
    const existingRow = mouldingContext.rows.find(
      (row) => String(row.uid || "") === String(component.uid || ""),
    );
    const existingQty = Number(existingRow?.qty || 0);
    const componentQty = Number(component.qty || 0);
    setMouldingQty(
      Number.isFinite(existingQty) && existingQty > 0
        ? String(existingQty)
        : Number.isFinite(componentQty) && componentQty > 0
          ? String(componentQty)
          : "1",
    );
    setMouldingQtyComponent(component);
  };

  const handleApplyMouldingQty = (options?: { advance?: boolean }) => {
    if (!activeStep || !mouldingQtyComponent) return;
    const result = saveWorkflowMouldingSelectionWithQty({
      line: currentLine,
      steps,
      stepIndex: activeStepIndex,
      component: mouldingQtyComponent,
      visibleComponents,
      qty: mouldingQty,
      activeStepTitle,
    });
    if (!result) return;
    let patch = result as Partial<NewSalesFormLineItem>;
    let nextStepIndex: number | null = null;
    if (options?.advance && workflowRouteData) {
      const lineWithMouldingPatch = {
        ...currentLine,
        ...(patch as Partial<NewSalesFormLineItem>),
      };
      const proceedResult = proceedWorkflowMultiSelectStep({
        routeData: workflowRouteData,
        line: lineWithMouldingPatch,
        stepIndex: activeStepIndex,
        visibleComponents,
      });
      if (proceedResult) {
        patch = {
          ...patch,
          ...(proceedResult.linePatch as Partial<NewSalesFormLineItem>),
          ...buildWorkflowLinePricingPatch(
            lineWithMouldingPatch,
            proceedResult.linePatch.formSteps,
          ),
        };
        nextStepIndex = proceedResult.activeStepIndex;
      }
    }
    actions.patchLineItem(line.uid, patch);
    if (nextStepIndex != null) setActiveStepIndex(nextStepIndex);
    setMouldingQtyComponent(null);
  };

  const handleSelectAll = () => {
    if (!bulkSelectableStep) return;
    if (!visibleComponents.length) return;
    const linePatch = selectAllWorkflowComponents({
      line: currentLine,
      stepIndex: activeStepIndex,
      components: visibleComponents,
    });
    if (!linePatch) return;
    actions.patchLineItem(line.uid, {
      ...(linePatch as Partial<NewSalesFormLineItem>),
      ...buildWorkflowLinePricingPatch(currentLine, linePatch.formSteps),
    });
  };

  const handleProceed = () => {
    if (!workflowRouteData) return;
    const result = proceedWorkflowMultiSelectStep({
      routeData: workflowRouteData,
      line: currentLine,
      stepIndex: activeStepIndex,
      visibleComponents,
    });
    if (!result) return;
    actions.patchLineItem(line.uid, {
      ...(result.linePatch as Partial<NewSalesFormLineItem>),
      ...buildWorkflowLinePricingPatch(currentLine, result.linePatch.formSteps),
    });
    setActiveStepIndex(result.activeStepIndex);
  };

  const componentPickerHeader = (
    <View className="mb-3 gap-2">
      <Text className="text-xs font-bold uppercase text-muted-foreground">
        {activeStepTitle || "Components"}
      </Text>
      {selectorNotice ? <WorkflowSelectorNotice {...selectorNotice} /> : null}
    </View>
  );

  const componentPickerEmpty = showComponentPicker ? (
    isLoadingComponents ? (
      <ComponentListSkeleton />
    ) : (
      <View className="items-center rounded-2xl border border-border bg-card p-6">
        <Text className="mt-2 text-center text-sm font-bold text-foreground">
          {componentStatus?.title ||
            (visibleComponents.length
              ? "No matching components found."
              : "No components found.")}
        </Text>
        <Text className="mt-1 text-center text-xs text-muted-foreground">
          {componentStatus?.description || "Refresh or choose another step."}
        </Text>
        {componentStatus ? (
          <Button
            variant="outline"
            className="mt-4 h-10 rounded-xl px-4"
            onPress={() => void refetchStepComponents()}
          >
            <Text>Refresh</Text>
          </Button>
        ) : null}
      </View>
    )
  ) : null;

  const renderComponentCard = (item: WorkflowComponentRecord) => {
    const selected = isWorkflowComponentSelected(activeStep, item);
    const imageUri = resolveComponentImageUri(item.img);
    return (
      <Pressable
        key={String(item.uid || item.id || item.title)}
        onPress={() => handleSelect(item)}
        className={`flex-1 rounded-2xl border p-3 active:opacity-80 ${
          selected ? "border-primary bg-primary/5" : "border-border bg-card"
        }`}
      >
        <View className="gap-2">
          <View
            className={`absolute right-2 top-2 z-10 h-7 w-7 items-center justify-center rounded-full ${
              selected ? "bg-primary" : "border border-border bg-background"
            }`}
          >
            {selected ? (
              <Icon
                name="Check"
                className="text-primary-foreground"
                size={15}
              />
            ) : null}
          </View>
          <ComponentGridImage imageUri={imageUri} />
          <View className="min-w-0">
            <Text
              numberOfLines={2}
              className="text-sm font-bold text-foreground"
            >
              {componentLabel(item.title || item.uid || "Component")}
            </Text>
            <Text
              numberOfLines={1}
              className="mt-0.5 text-xs text-muted-foreground"
            >
              {item.uid || `Component ${item.id || ""}`}
            </Text>
          </View>
          <Text className="text-sm font-bold text-foreground">
            {moneyIfPositive(item.salesPrice) || "-"}
          </Text>
        </View>
      </Pressable>
    );
  };

  const componentPickerData =
    showComponentPicker && !isLoadingComponents ? visibleComponents : [];

  return (
    <View
      className={
        inline
          ? "relative bg-background"
          : "absolute inset-0 z-50 bg-background"
      }
    >
      <View className="bg-background px-4 pb-3 pt-4">
        {inline ? null : (
          <View className="flex-row items-center gap-3">
            <Pressable
              onPress={onClose}
              className="h-11 w-11 items-center justify-center rounded-full active:bg-muted"
            >
              <Icon name="X" className="text-foreground" size={20} />
            </Pressable>
            <View className="min-w-0 flex-1">
              <Text
                numberOfLines={1}
                className="text-xl font-bold text-foreground"
              >
                Configure item
              </Text>
              <Text numberOfLines={1} className="text-xs text-muted-foreground">
                {currentLine.title}
              </Text>
            </View>
          </View>
        )}

        <WorkflowStepPills
          steps={steps}
          activeStepIndex={activeStepIndex}
          onStepPress={(index) =>
            setActiveStepIndex(resolveInteractiveStepIndex(steps, index))
          }
        />
      </View>

      {inline ? (
        <View className="px-2 py-3">
          {componentPickerHeader}
          {componentPickerData.length ? (
            <View className="flex-row flex-wrap gap-2">
              {componentPickerData.map((item) => (
                <View
                  key={String(item.uid || item.id || item.title)}
                  className="w-[48%]"
                >
                  {renderComponentCard(item)}
                </View>
              ))}
            </View>
          ) : (
            componentPickerEmpty
          )}
        </View>
      ) : (
        <FlatList
          data={componentPickerData}
          numColumns={2}
          columnWrapperStyle={{ gap: 10 }}
          keyExtractor={(item) => String(item.uid || item.id || item.title)}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: pickerMultiSelectStep ? 148 : 96,
          }}
          ListHeaderComponent={componentPickerHeader}
          ListEmptyComponent={componentPickerEmpty}
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => renderComponentCard(item)}
        />
      )}

      {pickerMultiSelectStep || !inline ? (
        <View className="absolute inset-x-0 bottom-0 border-t border-border bg-card px-4 pb-4 pt-3">
          {pickerMultiSelectStep ? (
            <View className="mb-2 flex-row items-center justify-between gap-2">
              <Text className="flex-1 text-xs font-semibold text-muted-foreground">
                {selectedCount} selected
              </Text>
              {bulkSelectableStep ? (
                <Button
                  variant="outline"
                  className="h-10 rounded-xl px-3"
                  disabled={!visibleComponents.length}
                  onPress={handleSelectAll}
                >
                  <Text>Select all</Text>
                </Button>
              ) : null}
            </View>
          ) : null}
          <View className="flex-row gap-2">
            {pickerMultiSelectStep ? (
              <Button
                className="h-11 flex-1 rounded-xl"
                disabled={!selectedCount}
                onPress={handleProceed}
              >
                <Text>Next Step</Text>
              </Button>
            ) : null}
            {inline ? null : (
              <Button
                variant={pickerMultiSelectStep ? "outline" : "default"}
                className="h-11 flex-1 rounded-xl"
                onPress={onClose}
              >
                <Text>Done</Text>
              </Button>
            )}
          </View>
        </View>
      ) : null}
      {mouldingQtyComponent ? (
        <MouldingQtyOverlay
          component={mouldingQtyComponent}
          qty={mouldingQty}
          onQtyChange={setMouldingQty}
          onOk={() => handleApplyMouldingQty({ advance: false })}
          onNextStep={() => handleApplyMouldingQty({ advance: true })}
          onClose={() => setMouldingQtyComponent(null)}
        />
      ) : null}
    </View>
  );
}

function WorkflowStepPills({
  steps,
  activeStepIndex,
  onStepPress,
}: {
  steps: WorkflowStepRecord[];
  activeStepIndex: number;
  onStepPress: (index: number) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const pillOffsetsRef = useRef<Record<number, number>>({});

  useEffect(() => {
    const x = pillOffsetsRef.current[activeStepIndex];
    if (x == null) return;
    scrollRef.current?.scrollTo({
      x: Math.max(0, x - 16),
      animated: true,
    });
  }, [activeStepIndex, steps.length]);

  if (!steps.length) return null;

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      className="mt-3"
      contentContainerStyle={{ gap: 8, paddingRight: 16 }}
    >
      {steps.map((step, index) => {
        const selected = activeStepIndex === index;
        const disabled = isRedirectDisabledStep(step);
        const stepLabel = step.value
          ? componentLabel(step.value)
          : step.step?.title || step.title || `Step ${index + 1}`;
        const pillLabel = step.value
          ? middleTruncateText(stepLabel, STEP_PILL_COMPONENT_LABEL_MAX_LENGTH)
          : stepLabel;

        return (
          <Pressable
            key={`${step.uid || step.stepId || index}`}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => onStepPress(index)}
            onLayout={(event) => {
              pillOffsetsRef.current[index] = event.nativeEvent.layout.x;
              if (selected) {
                scrollRef.current?.scrollTo({
                  x: Math.max(0, event.nativeEvent.layout.x - 16),
                  animated: true,
                });
              }
            }}
            className={`h-9 max-w-[224px] justify-center rounded-full border px-3 ${
              selected
                ? "border-primary bg-primary/10"
                : disabled
                  ? "border-border bg-muted opacity-60"
                  : "border-border bg-card active:bg-muted"
            }`}
          >
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              className={`text-xs font-bold ${
                selected
                  ? "text-primary"
                  : disabled
                    ? "text-muted-foreground"
                    : "text-muted-foreground"
              }`}
            >
              {pillLabel}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const STEP_PILL_COMPONENT_LABEL_MAX_LENGTH = 24;

function middleTruncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  const visible = Math.max(4, maxLength - 1);
  const start = Math.ceil(visible / 2);
  const end = Math.floor(visible / 2);
  return `${value.slice(0, start)}...${value.slice(value.length - end)}`;
}

function firstEditableStepIndex(steps: WorkflowStepRecord[]) {
  return resolveInteractiveStepIndex(steps, firstPendingStepIndex(steps));
}

function initialStepIndex(
  steps: WorkflowStepRecord[],
  presentation: "overlay" | "inline",
) {
  if (presentation === "inline") return 0;
  return firstEditableStepIndex(steps);
}

function resolveWorkflowSelectorNotice({
  activeStep,
  activeStepFamily,
  activeStepTitle,
  activeHousePackageToolStep,
  activeRedirectDisabledStep,
  activeGroupedRowEditorStep,
}: {
  activeStep: WorkflowStepRecord | null;
  activeStepFamily: string;
  activeStepTitle: string;
  activeHousePackageToolStep: boolean;
  activeRedirectDisabledStep: boolean;
  activeGroupedRowEditorStep: boolean;
}): WorkflowSelectorNoticeState | null {
  if (!activeStep) {
    return {
      icon: "AlertCircle",
      title: "Step unavailable",
      description: "This workflow step is missing and cannot load components.",
    };
  }

  if (activeRedirectDisabledStep) {
    return {
      icon: "Route",
      title: activeStepTitle || "Skipped step",
      description: "This step is skipped by redirect and remains for context.",
    };
  }

  if (activeHousePackageToolStep) {
    return {
      icon: "DoorOpen",
      title: activeStepTitle || "House package tool",
      description:
        "Door quantities and sizes are edited on the invoice line item.",
    };
  }

  if (activeGroupedRowEditorStep) {
    const titleByFamily: Record<string, string> = {
      "moulding-line-item": "Moulding line items",
      "service-line-item": "Service line items",
      shelf: "Shelf line items",
    };
    return {
      icon: "List",
      title: titleByFamily[activeStepFamily] || activeStepTitle || "Line items",
      description: "Grouped rows are edited directly on the invoice line item.",
    };
  }

  return null;
}

function WorkflowSelectorNotice({
  icon,
  title,
  description,
}: {
  icon: IconKeys;
  title: string;
  description: string;
}) {
  return (
    <View className="rounded-2xl border border-dashed border-border bg-card p-4">
      <View className="flex-row items-start gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Icon name={icon} className="text-primary" size={18} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-bold text-foreground">{title}</Text>
          <Text className="mt-1 text-xs text-muted-foreground">
            {description}
          </Text>
        </View>
      </View>
    </View>
  );
}

function ComponentGridImage({ imageUri }: { imageUri: string | null }) {
  const [isImageLoading, setIsImageLoading] = useState(Boolean(imageUri));
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
    setIsImageLoading(Boolean(imageUri));
  }, [imageUri]);

  return (
    <View className="aspect-square w-full overflow-hidden rounded-xl border border-border bg-muted">
      {imageUri && !imageFailed ? (
        <Image
          source={{ uri: imageUri }}
          resizeMode="contain"
          className="h-full w-full"
          onLoadStart={() => setIsImageLoading(true)}
          onLoadEnd={() => setIsImageLoading(false)}
          onError={() => {
            setImageFailed(true);
            setIsImageLoading(false);
          }}
        />
      ) : (
        <ComponentGridImageFallback />
      )}
      {imageUri && isImageLoading ? (
        <Skeleton className="absolute inset-0 h-full w-full rounded-xl" />
      ) : null}
    </View>
  );
}

function ComponentGridImageFallback() {
  return (
    <View className="h-full w-full items-center justify-center">
      <Icon name="FileText" className="text-muted-foreground" size={16} />
    </View>
  );
}

function ComponentListSkeleton() {
  return (
    <View className="flex-row flex-wrap gap-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <View key={`component-skeleton-${index}`} className="w-[48%] p-1">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <Skeleton className="mt-3 h-4 w-4/5 rounded-md" />
          <Skeleton className="mt-2 h-3 w-1/2 rounded-md" />
        </View>
      ))}
    </View>
  );
}

function feetInchToInches(value: string) {
  const [feetPart, inchPart = "0"] = value.split("-");
  const feet = Number(feetPart || 0);
  const inches = Number(inchPart || 0);
  if (!Number.isFinite(feet) || !Number.isFinite(inches)) return "";
  return `${feet * 12 + inches}"`;
}

function formatDoorSizeTitle(size?: string | null) {
  const [width, height] = String(size || "").split(" x ");
  const widthIn = width ? feetInchToInches(width.trim()) : "";
  const heightIn = height ? feetInchToInches(height.trim()) : "";
  if (!widthIn || !heightIn) return String(size || "--");
  return `${widthIn} x ${heightIn}`;
}

function isDoorRowPriceMissing(row?: DoorStoredRow | null) {
  return Boolean(row?.meta?.priceMissing);
}

const DOOR_SIZE_KEYBOARD_BOTTOM_OFFSET = 88;

function renderDoorSizeKeyboardAwareScrollView(props: ScrollViewProps) {
  return (
    <KeyboardAwareScrollView
      {...props}
      bottomOffset={DOOR_SIZE_KEYBOARD_BOTTOM_OFFSET}
      disableScrollOnKeyboardHide
    />
  );
}

export function DoorSizePickerScreen({
  component,
  rows,
  supplierUid,
  supplierName,
  suppliers,
  isLoadingSuppliers,
  noHandle,
  disabled,
  onSupplierChange,
  onChangeRow,
  onOk,
  onNextStep,
  onClose,
}: {
  component: WorkflowComponentRecord;
  rows: DoorStoredRow[];
  supplierUid?: string | null;
  supplierName?: string | null;
  suppliers?: Array<{
    id?: number | null;
    uid?: string | null;
    name?: string | null;
  }>;
  isLoadingSuppliers?: boolean;
  noHandle?: boolean;
  disabled?: boolean;
  onSupplierChange?: (
    supplier: { uid?: string | null; name?: string | null } | null,
  ) => void;
  onChangeRow: (index: number, patch: Partial<DoorStoredRow>) => void;
  onOk: () => void;
  onNextStep: () => void;
  onClose: () => void;
}) {
  const totalQty = rows.reduce(
    (sum, row) => sum + Number(row.totalQty || 0),
    0,
  );
  const totalPrice = rows.reduce(
    (sum, row) => sum + Number(row.lineTotal || 0),
    0,
  );
  const imageUri = resolveComponentImageUri(component.img);
  const title = componentLabel(component.title || component.uid || "Door");

  return (
    <SafeArea>
      <View className="flex-1 bg-background">
        <View className="relative h-14 flex-row items-center justify-between px-3 pt-1">
          <Pressable
            onPress={onClose}
            className="h-11 w-11 items-center justify-center active:opacity-60"
          >
            <Icon name="X" className="text-foreground" size={22} />
          </Pressable>
          <View className="pointer-events-none absolute inset-x-14 items-center pt-1">
            <Text className="text-base font-semibold text-foreground">
              Door sizes
            </Text>
          </View>
          <View className="h-11 w-11" />
        </View>
        <View className="px-4 pb-3">
          <View className="flex-row items-center gap-3 py-3">
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                className="h-16 w-16 rounded-lg bg-muted"
                resizeMode="cover"
              />
            ) : (
              <View className="h-16 w-16 items-center justify-center rounded-lg bg-muted">
                <Icon
                  name="DoorOpen"
                  className="text-muted-foreground"
                  size={24}
                />
              </View>
            )}
            <View className="min-w-0 flex-1">
              <Text
                numberOfLines={2}
                className="text-lg font-semibold text-foreground"
              >
                {title}
              </Text>
              <Text className="mt-1 text-xs text-muted-foreground">
                {totalQty} doors - {moneyIfPositive(totalPrice) || "$0.00"}
              </Text>
              <Text
                numberOfLines={1}
                className="mt-0.5 text-[11px] text-muted-foreground"
              >
                Supplier: {supplierName || "GND MILLWORK"}
              </Text>
            </View>
          </View>
          {isLoadingSuppliers || suppliers?.length ? (
            <View className="py-2">
              <Text className="text-[10px] font-semibold uppercase text-muted-foreground">
                Supplier
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mt-2"
                contentContainerStyle={{ gap: 6, paddingRight: 16 }}
              >
                <SupplierChip
                  title="GND MILLWORK"
                  selected={!supplierUid}
                  disabled={disabled}
                  onPress={() => onSupplierChange?.(null)}
                />
                {(suppliers || []).map((supplier) => (
                  <SupplierChip
                    key={`door-supplier-${supplier.uid || supplier.id}`}
                    title={String(supplier.name || "Supplier")}
                    selected={
                      String(supplier.uid || "") === String(supplierUid || "")
                    }
                    disabled={disabled}
                    onPress={() =>
                      onSupplierChange?.({
                        uid: supplier.uid || null,
                        name: supplier.name || null,
                      })
                    }
                  />
                ))}
                {isLoadingSuppliers ? (
                  <Text className="self-center text-xs text-muted-foreground">
                    Loading suppliers...
                  </Text>
                ) : null}
              </ScrollView>
            </View>
          ) : null}
          <View className="mt-3 flex-row items-center border-b border-border/60 pb-2">
            <Text className="min-w-0 flex-1 text-[10px] font-semibold uppercase text-muted-foreground">
              Size
            </Text>
            {noHandle ? (
              <Text className="ml-3 w-16 text-center text-[10px] font-semibold uppercase text-muted-foreground">
                Qty
              </Text>
            ) : (
              <>
                <Text className="ml-3 w-14 text-center text-[10px] font-semibold uppercase text-muted-foreground">
                  LH
                </Text>
                <Text className="ml-2 w-14 text-center text-[10px] font-semibold uppercase text-muted-foreground">
                  RH
                </Text>
              </>
            )}
            <Text className="ml-4 w-24 text-right text-[10px] font-semibold uppercase text-muted-foreground">
              Total
            </Text>
          </View>
        </View>
        <FlatList
          className="flex-1"
          data={rows}
          keyExtractor={(row, index) =>
            `${row.stepProductId || component.id || "door"}:${row.dimension || index}`
          }
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          renderScrollComponent={renderDoorSizeKeyboardAwareScrollView}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 96 }}
          ListEmptyComponent={
            <View className="py-12">
              <Text className="text-center text-sm font-bold text-foreground">
                No configured door sizes
              </Text>
              <Text className="mt-1 text-center text-xs text-muted-foreground">
                This door option has no priced sizes for the current route.
              </Text>
            </View>
          }
          renderItem={({ item: row, index }) => {
            const lhQty = Number(row.lhQty || 0);
            const rhQty = Number(row.rhQty || 0);
            const priceMissing = isDoorRowPriceMissing(row);
            return (
              <View className="min-h-12 flex-row items-center border-b border-border/40 py-2">
                <View className="min-w-0 flex-1 pr-3">
                  <Text
                    numberOfLines={1}
                    className="text-sm font-semibold text-foreground"
                  >
                    {formatDoorSizeTitle(row.dimension)}
                  </Text>
                  <Text
                    numberOfLines={1}
                    className="mt-0.5 text-[11px] font-semibold text-muted-foreground"
                  >
                    {priceMissing
                      ? "--"
                      : moneyIfPositive(row.unitPrice) || "$0.00"}
                  </Text>
                </View>
                {noHandle ? (
                  <View className="ml-3 w-16">
                    {priceMissing ? null : (
                      <DoorSizeNumberField
                        value={row.totalQty}
                        disabled={disabled}
                        onChange={(totalQty) =>
                          onChangeRow(index, {
                            totalQty,
                            lhQty: 0,
                            rhQty: 0,
                          })
                        }
                      />
                    )}
                  </View>
                ) : (
                  <>
                    <View className="ml-3 w-14">
                      {priceMissing ? null : (
                        <DoorSizeNumberField
                          value={row.lhQty}
                          disabled={disabled}
                          onChange={(nextLhQty) =>
                            onChangeRow(index, {
                              lhQty: nextLhQty,
                              totalQty: nextLhQty + rhQty,
                            })
                          }
                        />
                      )}
                    </View>
                    <View className="ml-2 w-14">
                      {priceMissing ? null : (
                        <DoorSizeNumberField
                          value={row.rhQty}
                          disabled={disabled}
                          onChange={(nextRhQty) =>
                            onChangeRow(index, {
                              rhQty: nextRhQty,
                              totalQty: lhQty + nextRhQty,
                            })
                          }
                        />
                      )}
                    </View>
                  </>
                )}
                <Text className="ml-4 w-24 text-right text-base font-extrabold text-foreground">
                  {moneyIfPositive(row.lineTotal) || "$0.00"}
                </Text>
              </View>
            );
          }}
        />
        <View className="bg-background px-4 pb-4 pt-3">
          <View className="flex-row gap-2">
            <Button
              className="h-11 flex-1 rounded-lg"
              disabled={disabled}
              onPress={onNextStep}
            >
              <Text>Next step</Text>
            </Button>
            <Button
              variant="ghost"
              className="h-11 flex-1"
              disabled={disabled}
              onPress={onOk}
            >
              <Text>OK</Text>
            </Button>
          </View>
        </View>
      </View>
    </SafeArea>
  );
}

function DoorSizeNumberField({
  value,
  disabled,
  onChange,
}: {
  value?: number | string | null;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  const displayValue = Number(value || 0) > 0 ? String(Number(value || 0)) : "";
  return (
    <TextInput
      value={displayValue}
      placeholder="0"
      keyboardType="decimal-pad"
      editable={!disabled}
      onChangeText={(nextValue) => onChange(parseCurrencyInput(nextValue))}
      className="h-10 flex-1 rounded-lg bg-muted/60 px-1 text-center text-xs font-bold text-foreground"
    />
  );
}

function MouldingQtyOverlay({
  component,
  qty,
  onQtyChange,
  onOk,
  onNextStep,
  onClose,
}: {
  component: WorkflowComponentRecord;
  qty: string;
  onQtyChange: (value: string) => void;
  onOk: () => void;
  onNextStep: () => void;
  onClose: () => void;
}) {
  return (
    <KeyboardAvoidingView
      className="absolute inset-0 z-50 justify-end bg-black/40"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <Pressable className="flex-1" onPress={onClose} />
      <View className="rounded-t-3xl border border-border bg-background">
        <View className="border-b border-border px-4 py-3">
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Icon name="Hash" className="text-primary" size={18} />
            </View>
            <View className="min-w-0 flex-1">
              <Text
                numberOfLines={1}
                className="text-base font-bold text-foreground"
              >
                {componentLabel(component.title || component.uid || "Moulding")}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {moneyIfPositive(component.salesPrice) || "$0.00"}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-full active:bg-muted"
            >
              <Icon name="X" className="text-muted-foreground" size={16} />
            </Pressable>
          </View>
        </View>
        <View className="gap-2 px-4 py-4">
          <Text className="text-[10px] font-bold uppercase text-muted-foreground">
            Quantity
          </Text>
          <TextInput
            value={qty}
            keyboardType="number-pad"
            onChangeText={onQtyChange}
            className="h-12 rounded-xl border border-border bg-card px-3 text-base font-bold text-foreground"
          />
        </View>
        <View className="border-t border-border px-4 pb-4 pt-3">
          <View className="flex-row gap-2">
            <Button className="h-11 flex-1 rounded-xl" onPress={onNextStep}>
              <Text>Next step</Text>
            </Button>
            <Button
              variant="ghost"
              className="h-11 flex-1 rounded-xl"
              onPress={onOk}
            >
              <Text>OK</Text>
            </Button>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function SupplierChip({
  title,
  selected,
  disabled,
  onPress,
}: {
  title: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`h-9 justify-center rounded-full px-3 disabled:opacity-40 ${
        selected ? "bg-primary" : "bg-muted"
      }`}
    >
      <Text
        numberOfLines={1}
        className={`max-w-40 text-[11px] font-bold ${
          selected ? "text-primary-foreground" : "text-foreground"
        }`}
      >
        {title}
      </Text>
    </Pressable>
  );
}

function resolveComponentImageUri(src?: string | null) {
  const value = String(src || "").trim();
  if (!value) return null;
  if (/^(https?:|data:|blob:)/i.test(value)) return value;

  const base =
    process.env.EXPO_PUBLIC_CLOUDINARY_BASE_URL ||
    process.env.NEXT_PUBLIC_CLOUDINARY_BASE_URL;
  if (!base) return null;

  const normalizedBase = String(base).replace(/\/+$/, "");
  const normalizedPath = value.replace(/^\/+/, "");
  const pathWithBucket = normalizedPath.startsWith("dyke/")
    ? normalizedPath
    : `dyke/${normalizedPath}`;

  return `${normalizedBase}/${pathWithBucket}`;
}

const styles = StyleSheet.create({
  input: {
    color: "#111827",
    fontSize: 14,
    paddingHorizontal: 8,
    paddingVertical: 0,
  },
  inputH8: {
    height: 32,
  },
  inputH10: {
    height: 40,
  },
  inputMuted: {
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
  },
  textXs: {
    fontSize: 12,
  },
  textBase: {
    fontSize: 16,
  },
  ml2: {
    marginLeft: 8,
  },
  flex1: {
    flex: 1,
  },
  textRight: {
    textAlign: "right",
  },
  textCenter: {
    textAlign: "center",
  },
  bold: {
    fontWeight: "700",
  },
  multiline: {
    minHeight: 64,
    paddingTop: 8,
    textAlignVertical: "top",
  },
});
