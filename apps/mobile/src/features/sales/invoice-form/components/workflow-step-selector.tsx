import { SafeArea } from "@/components/safe-area";
import { Button } from "@/components/ui/button";
import { Icon, type IconKeys } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import {
  buildStepComponentOverrideMap,
  buildWorkflowMouldingRowsContext,
  buildWorkflowMouldingRowsPatch,
  buildWorkflowDoorSizeVariantPatch,
  buildWorkflowLinePricingPatch,
  calcWorkflowDoorRow,
  clearUnpricedDoorRowQty,
  computeHptSharedDoorSurcharge,
  deriveDoorSizeRows,
  getItemWorkflowStepFamily,
  getRouteConfigForLine,
  getDoorSupplierMeta,
  getSelectedProdUids,
  getWorkflowSteps,
  isDoorStepTitle,
  isHousePackageToolStepTitle,
  isMultiSelectStepTitle,
  isMouldingItem,
  isRedirectDisabledStep,
  isWorkflowComponentSelected,
  moneyIfPositive,
  proceedWorkflowMultiSelectStep,
  readSalesFormObjectMetadata,
  removeWorkflowMouldingSelection,
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
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  FlatList,
  Image,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput as RNTextInput,
  View,
  type ScrollViewProps,
  type TextInputProps,
} from "react-native";
import { useRouter } from "expo-router";
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
} from "react-native-keyboard-controller";
import { useInvoiceFormProfiles } from "../api/use-invoice-form-profiles";
import { useInvoiceWorkflowStepComponents } from "../api/use-invoice-workflow-step-components";
import {
  formatWorkflowComponentLabel,
  getWorkflowSelectableTitle,
} from "../api/workflow-selectable-copy";
import { parseCurrencyInput } from "../lib/format";
import { getSalesDocumentLabels } from "../lib/sales-document-labels";
import { useInvoiceFormModalStore } from "../store/use-invoice-form-modal-store";
import { useInvoiceFormStore } from "../store/use-invoice-form-store";
import type { NewSalesFormLineItem, NewSalesFormType } from "../types";
import {
  getDoorRows,
  getMobileDoorRouteFlags,
} from "../steps/line-workflow-helpers";
import { HousePackageToolWorkflowStep } from "../steps/house-package-tool/house-package-tool-workflow-step";
import {
  CustomComponentSheet,
  mergeSelectedCustomComponents,
  orderSelectedCustomFirst,
  stepSupportsCustomComponents,
} from "../custom-component/custom-component-sheet";
import { FloatingInvoiceAction } from "./floating-invoice-action";
import {
  getCustomComponentFloatingOffset,
  getWorkflowProceedFloatingOffset,
} from "./floating-invoice-action-layout";
import {
  getWorkflowProceedSelectedCount,
  isWorkflowBulkSelectableStep,
  shouldShowWorkflowProceedAction,
} from "./workflow-proceed-visibility";
import {
  getWorkflowInitialStepIndex,
  type WorkflowInitialStepPreference,
} from "./workflow-step-initial-step";
import {
  filterWorkflowComponentsBySearch,
  getWorkflowProceedFallbackSelectedCount,
  limitWorkflowComponents,
  shouldShowWorkflowComponentSearch,
  shouldTreatWorkflowStepAsMouldingSelection,
  shouldUseWorkflowGroupedRowEditorStep,
} from "./workflow-step-rendering";
import { getWorkflowStepPillLabels } from "./workflow-step-pill-labels";

type WorkflowSelectorNoticeState = {
  icon: IconKeys;
  title: string;
  description: string;
};

export type WorkflowStickyHeaderEntry = {
  key: string;
  node: ReactNode;
};

export type WorkflowFloatingActionEntry = {
  key: string;
  label: string;
  footerOffset: number;
  onPress: () => void;
};

export type WorkflowLineItemEditorEntry = {
  key: string;
  family: string;
  stepTitle: string;
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
  initialStepPreference,
  footerActionsHidden = false,
  onComponentScroll,
  formScrollY = 0,
  inlineContentTopY,
  onStickyHeaderChange,
  onInlineProceedActionChange,
  onLineItemEditorChange,
  onActiveStepOpened,
}: {
  line: NewSalesFormLineItem;
  onClose: () => void;
  presentation?: "overlay" | "inline";
  initialStepPreference?: WorkflowInitialStepPreference;
  footerActionsHidden?: boolean;
  onComponentScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  formScrollY?: number;
  inlineContentTopY?: number;
  onStickyHeaderChange?: (entry: WorkflowStickyHeaderEntry | null) => void;
  onInlineProceedActionChange?: (
    entry: WorkflowFloatingActionEntry | null,
  ) => void;
  onLineItemEditorChange?: (entry: WorkflowLineItemEditorEntry | null) => void;
  onActiveStepOpened?: () => void;
}) {
  const inline = presentation === "inline";
  const currentLine =
    useInvoiceFormStore((state) =>
      state.lineItems.find((item) => item.uid === line.uid),
    ) || line;
  const steps = useMemo(() => getWorkflowSteps(currentLine), [currentLine]);
  const [activeStepIndex, setActiveStepIndex] = useState(() =>
    getWorkflowInitialStepIndex({
      steps,
      presentation,
      preference: initialStepPreference,
    }),
  );
  const activeLineUidRef = useRef(currentLine.uid);
  const activeStepOpenedInitializedRef = useRef(false);
  const onActiveStepOpenedRef = useRef(onActiveStepOpened);
  onActiveStepOpenedRef.current = onActiveStepOpened;
  const [doorSizeComponent, setDoorSizeComponent] =
    useState<WorkflowComponentRecord | null>(null);
  const [doorSizeRows, setDoorSizeRows] = useState<DoorStoredRow[]>([]);
  const [componentSearchQuery, setComponentSearchQuery] = useState("");
  const [pendingMultiSelectUidsByStep, setPendingMultiSelectUidsByStep] =
    useState<Record<string, string[]>>({});
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
  const formType = useInvoiceFormStore((state) => state.type);
  const router = useRouter();
  const setDoorSizePicker = useInvoiceFormModalStore(
    (state) => state.actions.setDoorSizePicker,
  );
  const clearDoorSizePicker = useInvoiceFormModalStore(
    (state) => state.actions.clearDoorSizePicker,
  );
  const activeStepTitle = activeStep?.step?.title || activeStep?.title || "";
  const activeStepTitleKey = activeStepTitle.trim().toLowerCase();
  const activeStepUid = String(activeStep?.step?.uid || activeStep?.uid || "");
  const rootStepUid = String(workflowRouteData?.rootStepUid || "");
  const activeRootStep =
    activeStepTitleKey === "item type" ||
    (Boolean(rootStepUid) && activeStepUid === rootStepUid);
  const activeStepFamily = activeStep
    ? getItemWorkflowStepFamily(currentLine, activeStep)
    : "component-grid";
  const activeMouldingStep = shouldTreatWorkflowStepAsMouldingSelection({
    activeRootStep,
    activeStepTitle,
    mouldingItem: isMouldingItem(currentLine),
  });
  const activeMultiSelectStepKey = `${currentLine.uid || "line"}:${activeStepIndex}:${activeStepUid || activeStepTitleKey || "step"}`;
  const activeMouldingContext = useMemo(
    () =>
      activeMouldingStep ? buildWorkflowMouldingRowsContext(currentLine) : null,
    [activeMouldingStep, currentLine],
  );
  const activeHousePackageToolStep =
    isHousePackageToolStepTitle(activeStepTitle);
  const activeRedirectDisabledStep = activeStep
    ? isRedirectDisabledStep(activeStep)
    : false;
  const activeGroupedRowEditorStep = shouldUseWorkflowGroupedRowEditorStep({
    activeRootStep,
    activeStepFamily,
    activeMouldingStep,
  });
  const showComponentPicker =
    Boolean(activeStep) &&
    !activeHousePackageToolStep &&
    !activeRedirectDisabledStep &&
    !activeGroupedRowEditorStep;
  const multiSelectStep = isMultiSelectStepTitle(activeStepTitle);
  const doorStep = isDoorStepTitle(activeStepTitle);
  const pickerMultiSelectStep = showComponentPicker && multiSelectStep;
  const bulkSelectableStep = isWorkflowBulkSelectableStep({
    pickerMultiSelectStep,
    doorStep,
    mouldingStep: activeMouldingStep,
  });
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
  const visibleSelectedCount = useMemo(
    () =>
      visibleComponents.filter((component) =>
        isWorkflowComponentSelected(activeStep, component),
      ).length,
    [activeStep, visibleComponents],
  );
  const activeDoorRowCount = useMemo(
    () =>
      doorStep
        ? getDoorRows(currentLine).filter(
            (row) => Number(row.totalQty || row.lhQty || row.rhQty || 0) > 0,
          ).length
        : 0,
    [currentLine, doorStep],
  );
  const activeStepSelectedComponentCount = useMemo(() => {
    const meta = readSalesFormObjectMetadata(activeStep?.meta) || {};
    const nestedMeta =
      readSalesFormObjectMetadata(activeStep?.step?.meta) || {};
    const outerSelected = Array.isArray(meta.selectedComponents)
      ? meta.selectedComponents.length
      : 0;
    const nestedSelected = Array.isArray(nestedMeta.selectedComponents)
      ? nestedMeta.selectedComponents.length
      : 0;
    return Math.max(outerSelected, nestedSelected);
  }, [activeStep]);
  const stepSelectedUids = useMemo(
    () => getSelectedProdUids(activeStep),
    [activeStep],
  );
  const stepSelectedCount = stepSelectedUids.length;
  const pendingMultiSelectUids =
    pendingMultiSelectUidsByStep[activeMultiSelectStepKey] || [];
  const pendingMultiSelectCount = pendingMultiSelectUids.length;
  const selectedCount = useMemo(
    () =>
      getWorkflowProceedSelectedCount({
        stepSelectedCount,
        fallbackSelectedCount: getWorkflowProceedFallbackSelectedCount({
          visibleSelectedCount,
          stepSelectedComponentCount: activeStepSelectedComponentCount,
          doorStep,
          doorRowCount: activeDoorRowCount,
          mouldingStep: activeMouldingStep,
          mouldingSelectionCount:
            activeMouldingContext?.selectedMouldings.length || 0,
          mouldingRowCount: activeMouldingContext?.rows.length || 0,
          pendingMultiSelectCount,
        }),
      }),
    [
      activeDoorRowCount,
      activeMouldingContext?.rows.length,
      activeMouldingContext?.selectedMouldings.length,
      activeMouldingStep,
      activeStepSelectedComponentCount,
      doorStep,
      pendingMultiSelectCount,
      stepSelectedCount,
      visibleSelectedCount,
    ],
  );
  const proceedActionVisible = shouldShowWorkflowProceedAction({
    componentPickerStep: showComponentPicker,
    pickerMultiSelectStep,
    doorStep,
    mouldingStep: activeMouldingStep,
    selectedCount,
  });
  const customVisibleComponents = useMemo(
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
        includeCustomComponents: true,
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
  const showCustomComponentAction =
    showComponentPicker && stepSupportsCustomComponents(activeStep);
  const selectorNotice = useMemo(
    () =>
      inline &&
      activeGroupedRowEditorStep &&
      (activeStepFamily === "moulding-line-item" ||
        activeStepFamily === "service-line-item" ||
        activeStepFamily === "shelf")
        ? null
        : resolveWorkflowSelectorNotice({
            activeStep,
            activeStepFamily,
            activeStepTitle,
            activeHousePackageToolStep,
            activeRedirectDisabledStep,
            activeGroupedRowEditorStep,
            type: formType,
          }),
    [
      activeGroupedRowEditorStep,
      activeHousePackageToolStep,
      activeRedirectDisabledStep,
      activeStep,
      activeStepFamily,
      activeStepTitle,
      formType,
      inline,
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
    activeStepOpenedInitializedRef.current = false;
    setActiveStepIndex(
      getWorkflowInitialStepIndex({
        steps,
        presentation,
        preference: initialStepPreference,
      }),
    );
  }, [currentLine.uid, initialStepPreference, presentation, steps]);

  useEffect(() => {
    setComponentSearchQuery("");
  }, [activeStepUid]);

  useEffect(() => {
    if (!inline) return;
    if (!activeStepOpenedInitializedRef.current) {
      activeStepOpenedInitializedRef.current = true;
      return;
    }
    onActiveStepOpenedRef.current?.();
  }, [activeStepIndex, inline]);

  useEffect(() => {
    if (!pendingMultiSelectCount) return;
    if (stepSelectedCount < pendingMultiSelectCount) return;
    setPendingMultiSelectUidsByStep((current) => {
      if (!current[activeMultiSelectStepKey]) return current;
      const next = { ...current };
      delete next[activeMultiSelectStepKey];
      return next;
    });
  }, [activeMultiSelectStepKey, pendingMultiSelectCount, stepSelectedCount]);

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
    if (!inline || !onLineItemEditorChange) return;
    if (!activeGroupedRowEditorStep) {
      onLineItemEditorChange(null);
      return;
    }
    onLineItemEditorChange({
      key: [
        currentLine.uid || line.uid,
        activeStepIndex,
        activeStepFamily,
        activeStepUid || activeStepTitleKey || "step",
      ].join(":"),
      family: activeStepFamily,
      stepTitle: activeStepTitle,
    });
  }, [
    activeGroupedRowEditorStep,
    activeStepFamily,
    activeStepIndex,
    activeStepTitle,
    activeStepTitleKey,
    activeStepUid,
    currentLine.uid,
    inline,
    line.uid,
    onLineItemEditorChange,
  ]);

  useEffect(() => {
    if (!inline || !onLineItemEditorChange) return;
    return () => onLineItemEditorChange(null);
  }, [inline, onLineItemEditorChange]);

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

  const applyComponentSelection = (
    component: WorkflowComponentRecord,
    selectionComponents = visibleComponents,
    options?: { selectedOverride?: boolean },
  ) => {
    if (!workflowRouteData || !activeStep) return;
    const result = saveWorkflowSelectedComponent({
      routeData: workflowRouteData,
      line: currentLine,
      steps,
      currentStepIndex: activeStepIndex,
      component,
      visibleComponents: selectionComponents,
      activeStepTitle,
      selectedOverride: options?.selectedOverride,
    });
    if (!result) return;
    actions.patchLineItem(line.uid, {
      ...(result.linePatch as Partial<NewSalesFormLineItem>),
      ...buildWorkflowLinePricingPatch(currentLine, result.linePatch.formSteps),
    });
    setActiveStepIndex(result.activeStepIndex);
  };

  const rememberPendingMultiSelectSelection = (
    component: WorkflowComponentRecord,
    selected: boolean,
  ) => {
    const uid = String(component.uid || "").trim();
    if (!uid) return;
    setPendingMultiSelectUidsByStep((current) => {
      const existing = current[activeMultiSelectStepKey] || [];
      const nextUids = selected
        ? existing.includes(uid)
          ? existing
          : [...existing, uid]
        : existing.filter((entry) => entry !== uid);
      if (!nextUids.length) {
        if (!existing.length) return current;
        const next = { ...current };
        delete next[activeMultiSelectStepKey];
        return next;
      }
      if (
        existing.length === nextUids.length &&
        existing.every((entry, index) => entry === nextUids[index])
      ) {
        return current;
      }
      return {
        ...current,
        [activeMultiSelectStepKey]: nextUids,
      };
    });
  };

  const handleToggleMouldingSelection = (
    component: WorkflowComponentRecord,
  ) => {
    if (!activeStep) return;
    const mouldingContext =
      activeMouldingContext || buildWorkflowMouldingRowsContext(currentLine);
    const componentUid = String(component.uid || "");
    const existingRow = mouldingContext.rows.find(
      (row) => String(row.uid || "") === componentUid,
    );

    if (existingRow) {
      const patch = removeWorkflowMouldingSelection({
        line: currentLine,
        mouldingUid: componentUid,
        rows: mouldingContext.rows,
        selectedMouldings: mouldingContext.selectedMouldings,
        sharedComponentPrice: mouldingContext.sharedComponentPrice,
      });
      if (!patch) return;
      actions.patchLineItem(line.uid, patch as Partial<NewSalesFormLineItem>);
      return;
    }

    const componentQty = Number(component.qty || 0);
    const result = saveWorkflowMouldingSelectionWithQty({
      line: currentLine,
      steps,
      stepIndex: activeStepIndex,
      component,
      visibleComponents,
      qty: Number.isFinite(componentQty) && componentQty > 0 ? componentQty : 1,
      activeStepTitle,
    });
    if (!result) return;
    actions.patchLineItem(line.uid, result as Partial<NewSalesFormLineItem>);
  };

  const handleMouldingQtyChange = (
    component: WorkflowComponentRecord,
    qty: number,
  ) => {
    const mouldingContext =
      activeMouldingContext || buildWorkflowMouldingRowsContext(currentLine);
    const componentUid = String(component.uid || "");
    const existingRow = mouldingContext.rows.find(
      (row) => String(row.uid || "") === componentUid,
    );
    if (!existingRow) return;
    const nextQty = Math.max(1, Number(qty || 0) || 1);
    const patch = buildWorkflowMouldingRowsPatch({
      line: currentLine,
      rows: mouldingContext.rows.map((row) =>
        String(row.uid || "") === componentUid ? { ...row, qty: nextQty } : row,
      ),
      sharedComponentPrice: mouldingContext.sharedComponentPrice,
    });
    actions.patchLineItem(line.uid, patch as Partial<NewSalesFormLineItem>);
  };

  const handleSelect = (component: WorkflowComponentRecord) => {
    if (doorStep) {
      rememberPendingMultiSelectSelection(component, true);
      applyComponentSelection(component, visibleComponents, {
        selectedOverride: true,
      });
      setDoorSizeComponent(component);
      router.push("/(sales)/invoices/door-size" as any);
      return;
    }
    if (activeMouldingStep) {
      const mouldingContext =
        activeMouldingContext || buildWorkflowMouldingRowsContext(currentLine);
      const componentUid = String(component.uid || "");
      const existingRow = mouldingContext.rows.find(
        (row) => String(row.uid || "") === componentUid,
      );
      rememberPendingMultiSelectSelection(
        component,
        !existingRow || mouldingContext.rows.length <= 1,
      );
      handleToggleMouldingSelection(component);
      return;
    }
    applyComponentSelection(component);
  };

  const handleCustomComponentSaved = (component: WorkflowComponentRecord) => {
    void refetchStepComponents();
    applyComponentSelection(
      component,
      [
        component,
        ...customVisibleComponents.filter(
          (item) => String(item.uid || "") !== String(component.uid || ""),
        ),
      ],
      { selectedOverride: true },
    );
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
    const doorRouteFlags = getMobileDoorRouteFlags(doorSizeRouteConfig);
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
    const firstResolvedRowMeta =
      readSalesFormObjectMetadata(firstResolvedRow?.meta) || {};
    const resolvedDoorComponent = firstResolvedRow
      ? {
          ...doorSizeComponent,
          salesPrice: Number(
            firstResolvedRow.unitPrice || doorSizeComponent.salesPrice || 0,
          ),
          basePrice: Number(
            firstResolvedRowMeta.baseUnitPrice ||
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
    const selectionLinePatch = selectionResult?.linePatch as
      | Partial<NewSalesFormLineItem>
      | undefined;
    let workflowLinePatch = selectionLinePatch;
    let nextActiveStepIndex = selectionResult?.activeStepIndex;
    if (options?.advance && selectionResult) {
      const proceedResult = proceedWorkflowMultiSelectStep({
        routeData: workflowRouteData,
        line: {
          ...lineWithDoorPatch,
          ...(selectionLinePatch || {}),
        },
        stepIndex: activeStepIndex,
        visibleComponents,
      });
      if (proceedResult) {
        workflowLinePatch = {
          ...(selectionLinePatch || {}),
          ...(proceedResult.linePatch as Partial<NewSalesFormLineItem>),
        };
        nextActiveStepIndex = proceedResult.activeStepIndex;
      }
    }
    const doorPatchMeta =
      readSalesFormObjectMetadata(
        (doorPatch.linePatch as Partial<NewSalesFormLineItem>).meta,
      ) || {};
    const workflowPatchMeta =
      readSalesFormObjectMetadata(
        (workflowLinePatch as Partial<NewSalesFormLineItem> | undefined)?.meta,
      ) || {};
    actions.patchLineItem(line.uid, {
      ...(doorPatch.linePatch as Partial<NewSalesFormLineItem>),
      ...(workflowLinePatch || {}),
      meta: {
        ...(readSalesFormObjectMetadata(currentLine.meta) || {}),
        ...doorPatchMeta,
        ...workflowPatchMeta,
        workflowDoorRouteConfig: doorRouteFlags,
      },
      ...buildWorkflowLinePricingPatch(
        lineWithDoorPatch,
        workflowLinePatch?.formSteps || selectionLinePatch?.formSteps || steps,
      ),
    });
    if (options?.advance && nextActiveStepIndex != null) {
      setActiveStepIndex(nextActiveStepIndex);
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
    const doorRouteFlags = getMobileDoorRouteFlags(doorSizeRouteConfig);
    setDoorSizePicker({
      component: doorSizeComponent,
      rows: doorSizeRows,
      supplierName: doorSizeSupplier.supplierName,
      supplierUid: doorSizeSupplier.supplierUid,
      suppliers: doorSuppliers,
      isLoadingSuppliers: isLoadingDoorSuppliers,
      noHandle: doorRouteFlags.noHandle,
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
    doorSizeRouteConfig?.hasSwing,
  ]);

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

  const handleProceed = useCallback(() => {
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
  }, [
    actions,
    activeStepIndex,
    currentLine,
    line.uid,
    visibleComponents,
    workflowRouteData,
  ]);
  const handleProceedRef = useRef(handleProceed);
  handleProceedRef.current = handleProceed;
  const handleInlineProceedPress = useCallback(() => {
    handleProceedRef.current();
  }, []);

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
    const mouldingRow = activeMouldingStep
      ? activeMouldingContext?.rows.find(
          (row) => String(row.uid || "") === String(item.uid || ""),
        )
      : null;
    const mouldingQty = Math.max(1, Number(mouldingRow?.qty || 1));
    const priceLabel = moneyIfPositive(item.salesPrice);
    return (
      <View
        key={String(item.uid || item.id || item.title)}
        className={`flex-1 overflow-hidden rounded-2xl border active:opacity-80 ${
          selected ? "border-primary bg-white" : "border-border bg-white"
        }`}
      >
        <View>
          <View className="relative">
            <Pressable onPress={() => handleSelect(item)}>
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
            </Pressable>
            {activeMouldingStep && selected ? (
              <View className="absolute inset-x-2 bottom-2 z-20 h-10 flex-row items-center justify-between rounded-xl border border-border bg-background/95 px-2 shadow-sm">
                <Pressable
                  onPress={() => handleMouldingQtyChange(item, mouldingQty - 1)}
                  className="h-7 w-7 items-center justify-center rounded-full bg-muted"
                >
                  <Icon name="Minus" className="text-foreground" size={14} />
                </Pressable>
                <TextInput
                  value={String(mouldingQty)}
                  keyboardType="number-pad"
                  onChangeText={(value) =>
                    handleMouldingQtyChange(item, parseCurrencyInput(value))
                  }
                  className="h-8 flex-1 bg-transparent px-2 text-center text-sm font-bold text-foreground"
                />
                <Pressable
                  onPress={() => handleMouldingQtyChange(item, mouldingQty + 1)}
                  className="h-7 w-7 items-center justify-center rounded-full bg-muted"
                >
                  <Icon name="Plus" className="text-foreground" size={14} />
                </Pressable>
              </View>
            ) : null}
          </View>
          <View className="gap-1 px-3 pb-3 pt-2">
            <Pressable onPress={() => handleSelect(item)} className="min-w-0">
              <Text
                numberOfLines={2}
                className="text-sm font-bold text-foreground"
              >
                {formatWorkflowComponentLabel(getWorkflowSelectableTitle(item))}
              </Text>
            </Pressable>
            {priceLabel ? (
              <Pressable onPress={() => handleSelect(item)}>
                <Text className="text-sm font-bold text-foreground">
                  {priceLabel}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  const componentPickerBaseData = useMemo(
    () =>
      showComponentPicker && !isLoadingComponents
        ? orderSelectedCustomFirst(
            mergeSelectedCustomComponents(visibleComponents, activeStep),
            activeStep,
          )
        : [],
    [activeStep, isLoadingComponents, showComponentPicker, visibleComponents],
  );
  const showComponentSearch = shouldShowWorkflowComponentSearch(
    componentPickerBaseData.length,
  );
  const componentPickerData = useMemo(() => {
    const nextComponents = showComponentSearch
      ? filterWorkflowComponentsBySearch(
          componentPickerBaseData,
          componentSearchQuery,
          getWorkflowComponentSearchValues,
        )
      : componentPickerBaseData;
    return activeMouldingStep
      ? limitWorkflowComponents(nextComponents)
      : nextComponents;
  }, [
    activeMouldingStep,
    componentPickerBaseData,
    componentSearchQuery,
    showComponentSearch,
  ]);
  const inlineMouldingSelectedCount =
    inline && activeMouldingStep
      ? componentPickerBaseData.filter((component) =>
          isWorkflowComponentSelected(activeStep, component),
        ).length
      : 0;
  const effectiveProceedActionVisible =
    proceedActionVisible ||
    (inline &&
      showComponentPicker &&
      activeMouldingStep &&
      inlineMouldingSelectedCount > 0);
  const navigateToDoorStep = () => {
    const doorIndex = steps.findIndex((step) =>
      isDoorStepTitle(step.step?.title || step.title),
    );
    if (doorIndex < 0) return;
    setActiveStepIndex(resolveInteractiveStepIndex(steps, doorIndex));
  };
  const housePackageToolContent = activeHousePackageToolStep ? (
    <View className="px-4 py-3">
      <HousePackageToolWorkflowStep
        line={currentLine}
        profileCoefficient={getProfileCoefficient(customerProfileId) || 1}
        onPatch={(patch) => {
          actions.patchLineItem(line.uid, patch);
        }}
        onAddDoor={navigateToDoorStep}
      />
    </View>
  ) : null;
  const workflowStepControls = useMemo(
    () => (
      <View className="border-b border-border bg-background px-4 pb-3 pt-4">
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
        {showComponentSearch ? (
          <View className="mt-3 h-11 flex-row items-center rounded-xl border border-border bg-card px-3">
            <Icon name="Search" className="text-muted-foreground" size={18} />
            <TextInput
              value={componentSearchQuery}
              onChangeText={setComponentSearchQuery}
              placeholder="Search components"
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              className="h-10 flex-1 text-base text-foreground"
            />
            {componentSearchQuery ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear component search"
                onPress={() => setComponentSearchQuery("")}
                className="h-8 w-8 items-center justify-center rounded-full active:bg-muted"
              >
                <Icon name="X" className="text-muted-foreground" size={16} />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    ),
    [
      activeStepIndex,
      componentSearchQuery,
      currentLine.title,
      inline,
      onClose,
      showComponentSearch,
      steps,
    ],
  );
  const workflowStepControlsRef = useRef<ReactNode | null>(null);
  workflowStepControlsRef.current = workflowStepControls;
  const stickyHeaderVisible =
    inline &&
    inlineContentTopY != null &&
    formScrollY >= Math.max(0, inlineContentTopY);
  const stickyHeaderKey = [
    activeStepIndex,
    activeStepUid,
    componentSearchQuery,
    showComponentSearch ? "search" : "no-search",
    steps.length,
  ].join(":");

  useEffect(() => {
    if (!onStickyHeaderChange || !inline) return;
    onStickyHeaderChange(
      stickyHeaderVisible && workflowStepControlsRef.current
        ? {
            key: stickyHeaderKey,
            node: workflowStepControlsRef.current,
          }
        : null,
    );
    return () => onStickyHeaderChange(null);
  }, [inline, onStickyHeaderChange, stickyHeaderVisible, stickyHeaderKey]);

  const selectedUidSignature = stepSelectedUids.join("|");
  const pendingSelectedUidSignature = pendingMultiSelectUids.join("|");
  const visibleComponentSignature = visibleComponents
    .map((component) => String(component.uid || component.id || ""))
    .join("|");
  const mouldingRowSignature =
    activeMouldingContext?.rows
      .map((row) => `${row.uid || ""}:${row.qty || ""}`)
      .join("|") || "";
  const workflowProceedActionKey = [
    "multi-proceed",
    currentLine.uid,
    activeStepIndex,
    activeStepUid,
    activeStep?.prodUid || "",
    activeStep?.value || "",
    selectedCount,
    selectedUidSignature,
    pendingSelectedUidSignature,
    mouldingRowSignature,
    activeDoorRowCount,
    visibleComponents.length,
    visibleComponentSignature,
    workflowRouteData ? "route" : "no-route",
    inline ? "inline" : "overlay",
    footerActionsHidden ? "footer-hidden" : "footer-visible",
  ].join(":");
  const workflowProceedOffset = getWorkflowProceedFloatingOffset({
    inline,
    footerActionsHidden,
  });
  const workflowProceedActionNode = (
    <FloatingInvoiceAction
      align="center"
      footerOffset={workflowProceedOffset}
      pointerEvents="box-none"
      refreshKey={workflowProceedActionKey}
    >
      <Button
        className="h-12 w-55 rounded-full px-8 shadow-lg"
        onPress={handleProceed}
        style={{ width: 220 }}
      >
        <Text>Proceed</Text>
      </Button>
    </FloatingInvoiceAction>
  );

  useEffect(() => {
    if (!inline || !onInlineProceedActionChange) return;
    if (!effectiveProceedActionVisible) {
      onInlineProceedActionChange(null);
      return;
    }
    onInlineProceedActionChange({
      key: workflowProceedActionKey,
      label: "Proceed",
      footerOffset: workflowProceedOffset,
      onPress: handleInlineProceedPress,
    });
  }, [
    effectiveProceedActionVisible,
    inline,
    onInlineProceedActionChange,
    handleInlineProceedPress,
    workflowProceedActionKey,
    workflowProceedOffset,
  ]);

  useEffect(() => {
    if (!inline || !onInlineProceedActionChange) return;
    return () => onInlineProceedActionChange(null);
  }, [inline, onInlineProceedActionChange]);

  return (
    <View
      className={
        inline
          ? "relative bg-background"
          : "absolute inset-0 z-50 bg-background"
      }
    >
      <View className="z-10">{workflowStepControls}</View>

      {activeHousePackageToolStep ? (
        housePackageToolContent
      ) : activeGroupedRowEditorStep ? null : inline ? (
        <View className="relative">
          <View
            style={{
              padding: 16,
              paddingBottom: effectiveProceedActionVisible
                ? footerActionsHidden
                  ? 72
                  : 112
                : 28,
            }}
          >
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
        </View>
      ) : (
        <FlatList
          data={componentPickerData}
          numColumns={2}
          onScroll={onComponentScroll}
          scrollEventThrottle={onComponentScroll ? 16 : undefined}
          columnWrapperStyle={{ gap: 10 }}
          keyExtractor={(item) => String(item.uid || item.id || item.title)}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: effectiveProceedActionVisible ? 184 : 96,
          }}
          ListHeaderComponent={componentPickerHeader}
          ListEmptyComponent={componentPickerEmpty}
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => renderComponentCard(item)}
        />
      )}

      {!inline ? (
        <FloatingInvoiceAction
          align="stretch"
          footerOffset={0}
          className="border-t border-border bg-card pb-4 pt-3"
          refreshKey={`overlay-multi-${currentLine.uid}-${activeStepIndex}-${selectedCount}-${visibleComponents.length}-${bulkSelectableStep}`}
        >
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
        </FloatingInvoiceAction>
      ) : null}
      {!inline && effectiveProceedActionVisible
        ? workflowProceedActionNode
        : null}
      {showCustomComponentAction ? (
        <CustomComponentSheet
          step={activeStep}
          components={components}
          profileCoefficient={getProfileCoefficient(customerProfileId) || 1}
          footerOffset={getCustomComponentFloatingOffset({
            inline,
            proceedVisible: effectiveProceedActionVisible,
            footerActionsHidden,
          })}
          onSaved={handleCustomComponentSaved}
          onOptionsChanged={() => {
            void refetchStepComponents();
          }}
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
        const { stepLabel, pillLabel } = getWorkflowStepPillLabels(step, index);

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
            } will-change-pressable`}
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

function resolveWorkflowSelectorNotice({
  activeStep,
  activeStepFamily,
  activeStepTitle,
  activeHousePackageToolStep,
  activeRedirectDisabledStep,
  activeGroupedRowEditorStep,
  type,
}: {
  activeStep: WorkflowStepRecord | null;
  activeStepFamily: string;
  activeStepTitle: string;
  activeHousePackageToolStep: boolean;
  activeRedirectDisabledStep: boolean;
  activeGroupedRowEditorStep: boolean;
  type: NewSalesFormType;
}): WorkflowSelectorNoticeState | null {
  const labels = getSalesDocumentLabels(type);

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
      description: `Door quantities and sizes are edited on the ${labels.lineItemLabel}.`,
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
      description: `Grouped rows are edited directly on the ${labels.lineItemLabel}.`,
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

const ComponentGridImage = memo(function ComponentGridImage({
  imageUri,
}: {
  imageUri: string | null;
}) {
  const [isImageLoading, setIsImageLoading] = useState(Boolean(imageUri));
  const [imageFailed, setImageFailed] = useState(false);
  const imageSource = useMemo(
    () => (imageUri ? { uri: imageUri } : null),
    [imageUri],
  );

  useEffect(() => {
    setImageFailed(false);
    setIsImageLoading(Boolean(imageUri));
  }, [imageUri]);

  return (
    <View className="aspect-square w-full overflow-hidden bg-muted">
      {imageSource && !imageFailed ? (
        <Image
          source={imageSource}
          resizeMode="contain"
          className="h-full w-full"
          fadeDuration={0}
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
});

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
  const meta = readSalesFormObjectMetadata(row?.meta) || {};
  return Boolean(meta.priceMissing);
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
  primaryActionLabel = "Next step",
  showSecondaryAction = true,
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
  suppliers?: {
    id?: number | null;
    uid?: string | null;
    name?: string | null;
  }[];
  isLoadingSuppliers?: boolean;
  noHandle?: boolean;
  disabled?: boolean;
  primaryActionLabel?: string;
  showSecondaryAction?: boolean;
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
  const title = formatWorkflowComponentLabel(
    getWorkflowSelectableTitle(component),
  );
  const primaryActionIcon: IconKeys = primaryActionLabel
    .toLowerCase()
    .includes("next")
    ? "ArrowRight"
    : "Check";
  const canAdvanceDoorSize = !disabled && totalQty > 0;

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
                <Text className="ml-3 w-16 text-center text-[10px] font-semibold uppercase text-muted-foreground">
                  LH
                </Text>
                <Text className="ml-2 w-16 text-center text-[10px] font-semibold uppercase text-muted-foreground">
                  RH
                </Text>
              </>
            )}
            <Text className="ml-2 w-20 text-right text-[10px] font-semibold uppercase text-muted-foreground">
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
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 112 }}
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
                    <View className="ml-3 w-16">
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
                    <View className="ml-2 w-16">
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
                <Text className="ml-2 w-20 text-right text-base font-extrabold text-foreground">
                  {moneyIfPositive(row.lineTotal) || "$0.00"}
                </Text>
              </View>
            );
          }}
        />
        <KeyboardStickyView
          // offset={{ closed: 0, opened: 0 }}
          // className=""
          className=""
        >
          <View className="flex-row items-center bg-background gap-4 px-4 py-4 border-t border-muted">
            {showSecondaryAction ? (
              <Button
                variant="secondary"
                className="h-11 flex-1 px-3"
                disabled={disabled}
                onPress={onOk}
              >
                <Icon name="Check" className="text-foreground" size={16} />
                <Text>OK</Text>
              </Button>
            ) : null}
            <Button
              className="h-11 flex-1 rounded-lg px-3"
              disabled={!canAdvanceDoorSize}
              onPress={onNextStep}
            >
              <Text>{primaryActionLabel}</Text>
              <Icon
                name={primaryActionIcon}
                className="text-primary-foreground"
                size={16}
              />
            </Button>
          </View>
        </KeyboardStickyView>
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
      keyboardType="number-pad"
      editable={!disabled}
      onChangeText={(nextValue) => onChange(parseCurrencyInput(nextValue))}
      className="h-10 flex-1 rounded-lg bg-muted/60 px-1 text-center text-xs font-bold text-foreground"
    />
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

function getWorkflowComponentSearchValues(component: WorkflowComponentRecord) {
  const record = component as WorkflowComponentRecord & Record<string, unknown>;
  const title = getWorkflowSelectableTitle(component);

  return [
    title,
    formatWorkflowComponentLabel(title),
    record.title,
    record.value,
    record.name,
    record.description,
    record.category,
    record.sku,
    record.uid,
    record.id,
  ];
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
