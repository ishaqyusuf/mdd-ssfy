import { FloatingBottomSheet } from "@/components/floating-bottom-sheet";
import { BottomSheetKeyboardAwareScrollView } from "@/components/ui/bottom-sheet-keyboard-aware-scroll-view";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { IconKeys } from "@/components/ui/icon";
import { Pressable as HapticPressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import {
  type WorkflowLineItemRecord,
  buildWorkflowServiceRowsContext,
  isServiceItem,
} from "@gnd/sales/sales-form-core";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  PanResponder,
  Pressable,
  View,
  useWindowDimensions,
} from "react-native";
import type { TextInput as NativeTextInput } from "react-native";
import { getSalesDocumentLabels } from "../lib/sales-document-labels";
import { createDefaultLineItems } from "../mock-data";
import { ServiceRowsSummary } from "../steps/service/service-rows-editor";
import { useInvoiceFormStore } from "../store/use-invoice-form-store";
import { getWorkflowProceedFloatingOffset } from "./floating-invoice-action-layout";
import {
  type InvoiceItemSwipeDirection,
  getInvoiceItemSwipeDirection,
  getInvoiceItemSwipeVisualOffset,
  shouldStartInvoiceItemSwipe,
} from "./items-step-navigation";
import {
  type InvoiceItemSection,
  buildInvoiceItemSections,
  isWorkflowSectionLine,
} from "./items-step-sections";
import {
  type InvoiceItemSheetMode,
  getInvoiceItemDeleteLineUids,
  getInvoiceItemEditTitleLabel,
  getInvoiceItemEditableLineUid,
  getInvoiceItemSheetIndexLabel,
  getInvoiceItemSheetSummary,
  getNextInvoiceItemActiveIndex,
} from "./items-step-sheet";
import { WorkflowMouldingLineItemEditor } from "./workflow-moulding-line-item-editor";
import { WorkflowServiceLineItemEditor } from "./workflow-service-line-item-editor";
import { WorkflowShelfLineItemEditor } from "./workflow-shelf-line-item-editor";
import type { WorkflowInitialStepPreference as InlineWorkflowInitialStepPreference } from "./workflow-step-initial-step";
import {
  type WorkflowFloatingActionEntry,
  type WorkflowLineItemEditorEntry,
  WorkflowStepSelector,
  type WorkflowStickyHeaderEntry,
} from "./workflow-step-selector";

const ITEMS_STEP_BOTTOM_PADDING = 176;
const INVOICE_ITEM_SWIPE_EXIT_DURATION_MS = 150;
const INVOICE_ITEM_SWIPE_ENTRY_TENSION = 115;
const INVOICE_ITEM_SWIPE_ENTRY_FRICTION = 10;
const INVOICE_ITEM_SWIPE_BACK_TENSION = 130;
const INVOICE_ITEM_SWIPE_BACK_FRICTION = 12;

type ItemsStepScrollOptions = {
  animated?: boolean;
};

export type InvoiceItemNavigationEntry = {
	canGoPrevious: boolean;
	canGoNext: boolean;
	onPrevious: () => void;
	onNext: () => void;
};

export function ItemsStep({
	onItemsSheetPresenterChange,
	footerActionsHidden = false,
	initialWorkflowStepPreference,
	onComponentScroll,
	formScrollY = 0,
	onStickyWorkflowHeaderChange,
	onInlineWorkflowProceedActionChange,
	onActiveItemTitleChange,
	onItemNavigationChange,
	onRequestScrollTo,
}: {
	onItemsSheetPresenterChange?: (presenter: (() => void) | null) => void;
	footerActionsHidden?: boolean;
	initialWorkflowStepPreference?: InlineWorkflowInitialStepPreference;
  onComponentScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  formScrollY?: number;
  onStickyWorkflowHeaderChange?: (
    entry: WorkflowStickyHeaderEntry | null,
  ) => void;
	onInlineWorkflowProceedActionChange?: (
		entry: WorkflowFloatingActionEntry | null,
	) => void;
	onActiveItemTitleChange?: (title: string | null) => void;
	onItemNavigationChange?: (entry: InvoiceItemNavigationEntry | null) => void;
	onRequestScrollTo?: (y: number, options?: ItemsStepScrollOptions) => void;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isItemSwitching, setIsItemSwitching] = useState(false);
  const [itemsContentY, setItemsContentY] = useState(0);
  const [workflowLocalY, setWorkflowLocalY] = useState(0);
  const [lineItemEditorEntry, setLineItemEditorEntry] =
    useState<WorkflowLineItemEditorEntry | null>(null);
  const [workflowStickyHeaderEntry, setWorkflowStickyHeaderEntry] =
    useState<WorkflowStickyHeaderEntry | null>(null);
  const [workflowProceedAction, setWorkflowProceedAction] =
    useState<WorkflowFloatingActionEntry | null>(null);
  const [openShelfPicker, setOpenShelfPicker] = useState<(() => void) | null>(
    null,
  );
  const [addServiceRow, setAddServiceRow] = useState<(() => void) | null>(null);
  const [serviceEditorLocalY, setServiceEditorLocalY] = useState<number | null>(
    null,
  );
  const [itemsSheetOpen, setItemsSheetOpen] = useState(false);
  const [itemsSheetMode, setItemsSheetMode] =
    useState<InvoiceItemSheetMode>("list");
  const [pendingItemIndex, setPendingItemIndex] = useState<number | null>(null);
  const [draftItemTitle, setDraftItemTitle] = useState("");
  const editTitleInputRef = useRef<NativeTextInput>(null);
  const itemSwipeX = useRef(new Animated.Value(0)).current;
  const isItemSwitchingRef = useRef(false);
  const lastAutoOpenedShelfPickerKeyRef = useRef<string | null>(null);
  const lastServiceEditorScrollKeyRef = useRef<string | null>(null);
  const lineItems = useInvoiceFormStore((state) => state.lineItems);
  const type = useInvoiceFormStore((state) => state.type);
  const labels = getSalesDocumentLabels(type);
  const actions = useInvoiceFormStore((state) => state.actions);
  const patchLineItem = actions.patchLineItem;
  const itemSections = useMemo(
    () => buildInvoiceItemSections(lineItems, labels.itemFallbackTitle),
    [labels.itemFallbackTitle, lineItems],
  );
  const activeSection = itemSections[activeIndex] || null;
  const activeItemTitle = activeSection
    ? getInvoiceItemDisplayTitle(activeSection, activeIndex)
    : labels.noun;
  const activeWorkflowLine =
    activeSection?.lines.find((line) => isWorkflowSectionLine(line)) || null;
  const pendingSection =
    pendingItemIndex == null ? null : itemSections[pendingItemIndex] || null;
  const pendingItemTitle =
    pendingSection && pendingItemIndex != null
      ? getInvoiceItemDisplayTitle(pendingSection, pendingItemIndex)
      : "";
  const hasMultipleItems = itemSections.length > 1;
  const canGoPrevious = hasMultipleItems && activeIndex > 0;
  const canGoNext = hasMultipleItems && activeIndex < itemSections.length - 1;
  const itemSwipeExitOffset = Math.max(windowWidth, 360);
  const itemSwipeVisualMaxOffset = Math.min(
    180,
    Math.max(120, itemSwipeExitOffset * 0.36),
  );
  const itemSwipeAnimatedStyle = useMemo(
    () => ({
      opacity: itemSwipeX.interpolate({
        inputRange: [-itemSwipeVisualMaxOffset, 0, itemSwipeVisualMaxOffset],
        outputRange: [0.88, 1, 0.88],
        extrapolate: "clamp",
      }),
      transform: [
        { translateX: itemSwipeX },
        {
          scale: itemSwipeX.interpolate({
            inputRange: [
              -itemSwipeVisualMaxOffset,
              0,
              itemSwipeVisualMaxOffset,
            ],
            outputRange: [0.985, 1, 0.985],
            extrapolate: "clamp",
          }),
        },
        {
          rotateZ: itemSwipeX.interpolate({
            inputRange: [
              -itemSwipeVisualMaxOffset,
              0,
              itemSwipeVisualMaxOffset,
            ],
            outputRange: ["-1.4deg", "0deg", "1.4deg"],
            extrapolate: "clamp",
          }),
        },
      ],
    }),
    [itemSwipeVisualMaxOffset, itemSwipeX],
  );
  const workflowContentTopY = itemsContentY + workflowLocalY;
  const showMouldingLineItemEditor = Boolean(
    activeWorkflowLine && lineItemEditorEntry?.family === "moulding-line-item",
  );
  const showServiceLineItemEditor = Boolean(
    activeWorkflowLine && lineItemEditorEntry?.family === "service-line-item",
  );
  const showShelfLineItemEditor = Boolean(
    activeWorkflowLine && lineItemEditorEntry?.family === "shelf",
  );
  const serviceSummaryRows = useMemo(() => {
    if (!showServiceLineItemEditor || !activeWorkflowLine) return [];
    const workflowLine = activeWorkflowLine as unknown as WorkflowLineItemRecord;
    if (!isServiceItem(workflowLine)) return [];
    return buildWorkflowServiceRowsContext(workflowLine).rows;
  }, [activeWorkflowLine, showServiceLineItemEditor]);
  const serviceSummarySignature = serviceSummaryRows
    .map(
      (row) =>
        `${row.uid || ""}:${row.qty || ""}:${row.unitPrice || ""}:${
          row.lineTotal || ""
        }`,
    )
    .join("|");
  const serviceSummaryStickyVisible = Boolean(
    showServiceLineItemEditor &&
      serviceSummaryRows.length &&
      serviceEditorLocalY != null &&
      formScrollY >=
        Math.max(0, itemsContentY + workflowLocalY + serviceEditorLocalY),
  );
  const serviceEditorScrollKey =
    showServiceLineItemEditor && lineItemEditorEntry
      ? `${activeWorkflowLine?.uid || "line"}:${lineItemEditorEntry.key}`
      : "";
  const shelfEditorOpenKey =
    showShelfLineItemEditor && lineItemEditorEntry
      ? `${activeWorkflowLine?.uid || "line"}:${lineItemEditorEntry.key}`
      : "";
  const itemsSheetTitle =
    itemsSheetMode === "edit"
      ? pendingItemIndex == null
        ? "Edit Item Title"
        : getInvoiceItemEditTitleLabel(pendingItemIndex)
      : itemsSheetMode === "delete"
        ? "Delete item?"
        : undefined;

  const presentItemsSheet = useCallback(() => {
    setItemsSheetMode("list");
    setItemsSheetOpen(true);
  }, []);

  const dismissItemsSheet = useCallback(() => {
    setItemsSheetOpen(false);
    setItemsSheetMode("list");
    setPendingItemIndex(null);
    setDraftItemTitle("");
  }, []);

  const returnToItemsList = useCallback(() => {
    setItemsSheetMode("list");
    setPendingItemIndex(null);
    setDraftItemTitle("");
  }, []);

  const handleItemsSheetClose = useCallback(() => {
    if (itemsSheetMode === "list") {
      dismissItemsSheet();
      return;
    }
    returnToItemsList();
  }, [dismissItemsSheet, itemsSheetMode, returnToItemsList]);

  useEffect(() => {
    onItemsSheetPresenterChange?.(presentItemsSheet);
    return () => onItemsSheetPresenterChange?.(null);
  }, [onItemsSheetPresenterChange, presentItemsSheet]);

  useEffect(() => {
    onActiveItemTitleChange?.(activeItemTitle);
  }, [activeItemTitle, onActiveItemTitleChange]);

  useEffect(
    () => () => {
      onActiveItemTitleChange?.(null);
    },
    [onActiveItemTitleChange],
  );

  useEffect(() => {
    if (!itemSections.length) {
      setActiveIndex(0);
      return;
    }
    setActiveIndex((current) => Math.min(current, itemSections.length - 1));
  }, [itemSections.length]);

  useEffect(() => {
    const firstWorkflowIndex = itemSections.findIndex(
      (section) => section.hasWorkflow,
    );
    if (firstWorkflowIndex < 0) return;
    if (itemSections[activeIndex]?.hasWorkflow) return;
    setActiveIndex(firstWorkflowIndex);
  }, [activeIndex, itemSections]);

  useEffect(() => {
    if (activeIndex < 0) return;
    setLineItemEditorEntry(null);
    setWorkflowStickyHeaderEntry(null);
    setWorkflowProceedAction(null);
    setOpenShelfPicker(null);
    setServiceEditorLocalY(null);
  }, [activeIndex]);

  useEffect(() => {
    if (!showShelfLineItemEditor) {
      setOpenShelfPicker(null);
      lastAutoOpenedShelfPickerKeyRef.current = null;
    }
  }, [showShelfLineItemEditor]);

  useEffect(() => {
    if (!showShelfLineItemEditor || !openShelfPicker || !shelfEditorOpenKey) {
      return;
    }
    if (lastAutoOpenedShelfPickerKeyRef.current === shelfEditorOpenKey) return;
    lastAutoOpenedShelfPickerKeyRef.current = shelfEditorOpenKey;
    const timer = setTimeout(() => {
      openShelfPicker();
    }, 120);
    return () => clearTimeout(timer);
  }, [openShelfPicker, shelfEditorOpenKey, showShelfLineItemEditor]);

  useEffect(() => {
    if (!showServiceLineItemEditor) {
      setAddServiceRow(null);
      setServiceEditorLocalY(null);
      lastServiceEditorScrollKeyRef.current = null;
    }
  }, [showServiceLineItemEditor]);

  useEffect(() => {
    if (
      !showServiceLineItemEditor ||
      !serviceEditorScrollKey ||
      serviceEditorLocalY == null ||
      !onRequestScrollTo
    ) {
      return;
    }
    if (lastServiceEditorScrollKeyRef.current === serviceEditorScrollKey) return;
    lastServiceEditorScrollKeyRef.current = serviceEditorScrollKey;
    onRequestScrollTo(
      Math.max(0, itemsContentY + workflowLocalY + serviceEditorLocalY - 24),
    );
  }, [
    itemsContentY,
    onRequestScrollTo,
    serviceEditorLocalY,
    serviceEditorScrollKey,
    showServiceLineItemEditor,
    workflowLocalY,
  ]);

  const handleWorkflowStepOpened = useCallback(() => {
    if (!onRequestScrollTo) return;
    requestAnimationFrame(() => {
      onRequestScrollTo(Math.max(0, workflowContentTopY - 12), {
        animated: true,
      });
    });
  }, [onRequestScrollTo, workflowContentTopY]);

  const combinedStickyHeader = useMemo<WorkflowStickyHeaderEntry | null>(() => {
    if (!workflowStickyHeaderEntry && !serviceSummaryStickyVisible) return null;

    return {
      key: [
        "items-sticky",
        workflowStickyHeaderEntry?.key || "no-workflow",
        serviceSummaryStickyVisible ? serviceSummarySignature || "service" : "no-service",
      ].join(":"),
      node: (
        <View className="bg-background shadow-sm">
          {workflowStickyHeaderEntry?.node}
          {serviceSummaryStickyVisible ? (
            <View className="px-4">
              <ServiceRowsSummary rows={serviceSummaryRows} variant="sticky" />
            </View>
          ) : null}
        </View>
      ),
    };
  }, [
    serviceSummaryRows,
    serviceSummarySignature,
    serviceSummaryStickyVisible,
    workflowStickyHeaderEntry,
  ]);

  useEffect(() => {
    onStickyWorkflowHeaderChange?.(combinedStickyHeader);
    return () => onStickyWorkflowHeaderChange?.(null);
  }, [combinedStickyHeader, onStickyWorkflowHeaderChange]);

  useEffect(() => {
    if (!itemsSheetOpen || itemsSheetMode !== "edit") return;

    const focusTimer = setTimeout(() => {
      editTitleInputRef.current?.focus();
    }, 250);

    return () => clearTimeout(focusTimer);
  }, [itemsSheetMode, itemsSheetOpen]);

  const handleShelfPickerChange = useCallback(
    (presenter: (() => void) | null) => {
      setOpenShelfPicker(presenter ? () => presenter : null);
    },
    [],
  );

  const handleAddServiceChange = useCallback(
    (handler: (() => void) | null) => {
      setAddServiceRow((current) => {
        if (current === handler) return current;
        return handler;
      });
    },
    [],
  );

  const patchActiveWorkflowLine = useCallback(
    (patch: Partial<NewSalesFormLineItem>) => {
      if (!activeWorkflowLine?.uid) return;
      patchLineItem(activeWorkflowLine.uid, patch);
    },
    [activeWorkflowLine?.uid, patchLineItem],
  );

  const shelfAddAction = useMemo<WorkflowFloatingActionEntry | null>(() => {
    if (!showShelfLineItemEditor || !openShelfPicker) return null;
    return {
      key: `shelf-add:${lineItemEditorEntry?.key || activeWorkflowLine?.uid || "line"}`,
      label: "+ Add shelf",
      footerOffset: getWorkflowProceedFloatingOffset({
        inline: true,
        footerActionsHidden,
      }),
      onPress: openShelfPicker,
    };
  }, [
    activeWorkflowLine?.uid,
    footerActionsHidden,
    lineItemEditorEntry?.key,
    openShelfPicker,
    showShelfLineItemEditor,
  ]);

  const serviceAddAction = useMemo<WorkflowFloatingActionEntry | null>(() => {
    if (!showServiceLineItemEditor || !addServiceRow) return null;
    return {
      key: `service-add:${lineItemEditorEntry?.key || activeWorkflowLine?.uid || "line"}`,
      label: "+ Add service line",
      footerOffset: getWorkflowProceedFloatingOffset({
        inline: true,
        footerActionsHidden,
      }),
      onPress: addServiceRow,
    };
  }, [
    activeWorkflowLine?.uid,
    addServiceRow,
    footerActionsHidden,
    lineItemEditorEntry?.key,
    showServiceLineItemEditor,
  ]);

  const inlineFloatingAction =
    serviceAddAction || shelfAddAction || workflowProceedAction;

  useEffect(() => {
    onInlineWorkflowProceedActionChange?.(inlineFloatingAction);
  }, [inlineFloatingAction, onInlineWorkflowProceedActionChange]);

  useEffect(
    () => () => {
      onInlineWorkflowProceedActionChange?.(null);
    },
    [onInlineWorkflowProceedActionChange],
  );

  const springInvoiceItemBack = useCallback(() => {
    Animated.spring(itemSwipeX, {
      toValue: 0,
      tension: INVOICE_ITEM_SWIPE_BACK_TENSION,
      friction: INVOICE_ITEM_SWIPE_BACK_FRICTION,
      useNativeDriver: true,
    }).start();
  }, [itemSwipeX]);

  const animateInvoiceItemSwitch = useCallback(
    (direction: Exclude<InvoiceItemSwipeDirection, null>) => {
      if (isItemSwitchingRef.current) return;

      const targetIndex =
        direction === "next" ? activeIndex + 1 : activeIndex - 1;
      if (targetIndex < 0 || targetIndex >= itemSections.length) {
        springInvoiceItemBack();
        return;
      }

      const exitOffset =
        direction === "next" ? -itemSwipeExitOffset : itemSwipeExitOffset;
      isItemSwitchingRef.current = true;
      setIsItemSwitching(true);
      itemSwipeX.stopAnimation();

      Animated.timing(itemSwipeX, {
        toValue: exitOffset,
        duration: INVOICE_ITEM_SWIPE_EXIT_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) {
          itemSwipeX.setValue(0);
          isItemSwitchingRef.current = false;
          setIsItemSwitching(false);
          return;
        }

        setActiveIndex(targetIndex);
        itemSwipeX.setValue(-exitOffset);
        requestAnimationFrame(() => {
          Animated.spring(itemSwipeX, {
            toValue: 0,
            tension: INVOICE_ITEM_SWIPE_ENTRY_TENSION,
            friction: INVOICE_ITEM_SWIPE_ENTRY_FRICTION,
            useNativeDriver: true,
          }).start(() => {
            isItemSwitchingRef.current = false;
            setIsItemSwitching(false);
          });
        });
      });
    },
    [
      activeIndex,
      itemSections.length,
      itemSwipeExitOffset,
      itemSwipeX,
      springInvoiceItemBack,
    ],
  );

  const goPrevious = useCallback(() => {
    if (!canGoPrevious || isItemSwitchingRef.current) return;
    animateInvoiceItemSwitch("previous");
  }, [animateInvoiceItemSwitch, canGoPrevious]);

  const goNext = useCallback(() => {
    if (!canGoNext || isItemSwitchingRef.current) return;
    animateInvoiceItemSwitch("next");
  }, [animateInvoiceItemSwitch, canGoNext]);

	useEffect(() => {
		if (!hasMultipleItems) {
			onItemNavigationChange?.(null);
			return;
		}
		onItemNavigationChange?.({
			canGoPrevious: canGoPrevious && !isItemSwitching,
			canGoNext: canGoNext && !isItemSwitching,
			onPrevious: goPrevious,
			onNext: goNext,
		});
		return () => onItemNavigationChange?.(null);
	}, [
		canGoNext,
		canGoPrevious,
		goNext,
		goPrevious,
		hasMultipleItems,
    isItemSwitching,
		onItemNavigationChange,
	]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) =>
          !isItemSwitchingRef.current &&
          shouldStartInvoiceItemSwipe({
            dx: gesture.dx,
            dy: gesture.dy,
            itemCount: itemSections.length,
          }),
        onMoveShouldSetPanResponderCapture: (_event, gesture) =>
          !isItemSwitchingRef.current &&
          shouldStartInvoiceItemSwipe({
            dx: gesture.dx,
            dy: gesture.dy,
            itemCount: itemSections.length,
          }),
        onPanResponderGrant: () => {
          itemSwipeX.stopAnimation();
        },
        onPanResponderMove: (_event, gesture) => {
          if (isItemSwitchingRef.current) return;
          itemSwipeX.setValue(
            getInvoiceItemSwipeVisualOffset({
              dx: gesture.dx,
              itemCount: itemSections.length,
              activeIndex,
              maxOffset: itemSwipeVisualMaxOffset,
            }),
          );
        },
        onPanResponderRelease: (_event, gesture) => {
          if (isItemSwitchingRef.current) return;
          const direction = getInvoiceItemSwipeDirection({
            dx: gesture.dx,
            dy: gesture.dy,
            itemCount: itemSections.length,
            activeIndex,
          });
          if (direction) {
            animateInvoiceItemSwitch(direction);
            return;
          }
          springInvoiceItemBack();
        },
        onPanResponderTerminate: springInvoiceItemBack,
      }),
    [
      activeIndex,
      animateInvoiceItemSwitch,
      itemSections.length,
      itemSwipeVisualMaxOffset,
      itemSwipeX,
      springInvoiceItemBack,
    ],
  );

  const addInvoiceItemFromSheet = () => {
    const defaultWorkflowItem = createDefaultLineItems()[0];
    if (defaultWorkflowItem) {
      actions.addOrUpdateLineItem(defaultWorkflowItem);
      setActiveIndex(itemSections.length);
    }
    dismissItemsSheet();
  };

  const selectSheetItem = (index: number) => {
    setActiveIndex(index);
    dismissItemsSheet();
  };

  const openEditItemSheet = (index: number) => {
    const section = itemSections[index];
    if (!section) return;
    setPendingItemIndex(index);
    setDraftItemTitle(getInvoiceItemDisplayTitle(section, index));
    setItemsSheetMode("edit");
  };

  const openDeleteItemSheet = (index: number) => {
    if (!itemSections[index]) return;
    setPendingItemIndex(index);
    setItemsSheetMode("delete");
  };

  const proceedItemTitleEdit = () => {
    const lineUid = getInvoiceItemEditableLineUid(pendingSection);
    if (lineUid) {
      actions.setLineDescription(lineUid, draftItemTitle.trim());
    }
    returnToItemsList();
  };

  const confirmDeleteItem = () => {
    const lineUids = getInvoiceItemDeleteLineUids(pendingSection);
    const nextActiveIndex = getNextInvoiceItemActiveIndex({
      currentIndex: activeIndex,
      removedIndex: pendingItemIndex ?? activeIndex,
      itemCount: itemSections.length,
    });
    for (const lineUid of lineUids) {
      actions.removeLineItem(lineUid);
    }
    setActiveIndex(nextActiveIndex);
    if (itemSections.length <= 1) {
      dismissItemsSheet();
      return;
    }
    returnToItemsList();
  };

  return (
    <View
      onLayout={(event) => setItemsContentY(event.nativeEvent.layout.y)}
      style={{
        position: "relative",
        gap: 16,
        paddingBottom: ITEMS_STEP_BOTTOM_PADDING,
      }}
    >
      {activeSection ? (
        <View
          style={{ minHeight: 640, position: "relative" }}
          {...panResponder.panHandlers}
        >
          <Animated.View style={[{ width: "100%" }, itemSwipeAnimatedStyle]}>
            {activeWorkflowLine ? (
              <View
                onLayout={(event) =>
                  setWorkflowLocalY(event.nativeEvent.layout.y)
                }
              >
                <WorkflowStepSelector
                  line={activeWorkflowLine}
                  onClose={() => undefined}
                  presentation="inline"
                  initialStepPreference={initialWorkflowStepPreference}
                  footerActionsHidden={footerActionsHidden}
                  onComponentScroll={onComponentScroll}
                  formScrollY={formScrollY}
                  inlineContentTopY={workflowContentTopY}
                  onStickyHeaderChange={setWorkflowStickyHeaderEntry}
                  onInlineProceedActionChange={setWorkflowProceedAction}
                  onLineItemEditorChange={setLineItemEditorEntry}
                  onActiveStepOpened={handleWorkflowStepOpened}
                />
                {showMouldingLineItemEditor ? (
                  <View key={lineItemEditorEntry?.key} className="px-4 pb-6">
                    <WorkflowMouldingLineItemEditor
                      line={activeWorkflowLine}
                      syncOnMount={false}
                      onWorkflowPatch={patchActiveWorkflowLine}
                    />
                  </View>
                ) : null}
                {showServiceLineItemEditor ? (
                  <View
                    key={lineItemEditorEntry?.key}
                    className="px-4 pb-6"
                    onLayout={(event) =>
                      setServiceEditorLocalY(event.nativeEvent.layout.y)
                    }
                  >
                    <WorkflowServiceLineItemEditor
                      line={activeWorkflowLine}
                      syncOnMount={false}
                      hideAddButton
                      onAddServiceChange={handleAddServiceChange}
                      onWorkflowPatch={patchActiveWorkflowLine}
                    />
                  </View>
                ) : null}
                {showShelfLineItemEditor ? (
                  <View key={lineItemEditorEntry?.key} className="px-4 pb-6">
                    <WorkflowShelfLineItemEditor
                      line={activeWorkflowLine}
                      syncOnMount={false}
                      forceShelfItem
                      onOpenPickerChange={handleShelfPickerChange}
                      onWorkflowPatch={patchActiveWorkflowLine}
                    />
                  </View>
                ) : null}
						</View>
					) : null}
				</Animated.View>
			</View>
		) : (
        <View className="items-center rounded-2xl border border-dashed border-border bg-card p-8">
          <Icon
            name="ReceiptText"
            className="text-muted-foreground"
            size={28}
          />
          <Text className="mt-3 text-sm font-bold text-foreground">
            No {labels.lowerNoun} items yet
          </Text>
          <Text className="mt-1 text-center text-xs text-muted-foreground">
            Add an item to start the {labels.lowerNoun}.
          </Text>
          <Button
            className="mt-4 h-11 rounded-xl px-4"
            onPress={actions.openSelector}
          >
            <Icon name="Plus" className="text-primary-foreground" size={16} />
            <Text>Add item</Text>
          </Button>
        </View>
      )}

      <FloatingBottomSheet
        visible={itemsSheetOpen}
        onClose={handleItemsSheetClose}
        accessibilityLabel={`${labels.noun} items`}
        title={itemsSheetTitle}
      >
        {itemsSheetMode === "list" ? (
          <View className="px-5 pb-5">
            {itemSections.map((section, index) => {
              const selected = index === activeIndex;
              return (
                <InvoiceItemSheetRow
                  key={`invoice-item-section-sheet-${section.key}`}
                  title={getInvoiceItemDisplayTitle(section, index)}
                  subtitle={`${getInvoiceItemSheetIndexLabel(index)} • ${getInvoiceItemSheetSummary(section)}`}
                  selected={selected}
                  onPress={() => selectSheetItem(index)}
                  onEdit={() => openEditItemSheet(index)}
                  onDelete={() => openDeleteItemSheet(index)}
                />
              );
            })}
            <InvoiceItemSheetCommandRow
              title="New item"
              subtitle={`Add another ${labels.lowerNoun} item`}
              icon="Plus"
              onPress={addInvoiceItemFromSheet}
            />
            <InvoiceItemSheetCommandRow
              title="Cancel"
              subtitle="Close item list"
              icon="X"
              onPress={dismissItemsSheet}
            />
          </View>
        ) : null}
        {itemsSheetMode === "edit" ? (
          <BottomSheetKeyboardAwareScrollView
            bottomOffset={132}
            disableScrollOnKeyboardHide
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              minHeight: 176,
              justifyContent: "flex-end",
              paddingHorizontal: 20,
              paddingBottom: 20,
              paddingTop: 8,
            }}
          >
            <View className="gap-3">
              <BottomSheetTextInput
                ref={editTitleInputRef}
                value={draftItemTitle}
                placeholder={pendingItemTitle || "Item title"}
                placeholderTextColor="#8A8A8A"
                onChangeText={setDraftItemTitle}
                returnKeyType="done"
                onSubmitEditing={proceedItemTitleEdit}
                className="min-h-12 rounded-xl border border-border bg-background px-3 text-base font-semibold text-foreground"
              />
              <View className="flex-row gap-2">
                <Button
                  variant="outline"
                  className="h-11 flex-1 rounded-xl"
                  onPress={returnToItemsList}
                >
                  <Text>Cancel</Text>
                </Button>
                <Button
                  className="h-11 flex-1 rounded-xl"
                  onPress={proceedItemTitleEdit}
                >
                  <Text>Proceed</Text>
                </Button>
              </View>
            </View>
          </BottomSheetKeyboardAwareScrollView>
        ) : null}
        {itemsSheetMode === "delete" ? (
          <View className="gap-4 px-5 pb-5">
            <View>
              <Text className="text-base font-semibold text-foreground">
                Delete {pendingItemTitle || "this item"}?
              </Text>
              <Text className="mt-1 text-sm text-muted-foreground">
                This removes the item and all lines grouped under it.
              </Text>
            </View>
            <View className="flex-row gap-2">
              <Button
                variant="outline"
                className="h-11 flex-1 rounded-xl"
                onPress={returnToItemsList}
              >
                <Text>Cancel</Text>
              </Button>
              <Button
                className="h-11 flex-1 rounded-xl bg-red-600"
                onPress={confirmDeleteItem}
              >
                <Text>Delete</Text>
              </Button>
            </View>
          </View>
        ) : null}
      </FloatingBottomSheet>
    </View>
  );
}

function InvoiceItemSheetRow({
  title,
  subtitle,
  selected,
  onPress,
  onEdit,
  onDelete,
}: {
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View className="min-h-[64px] flex-row items-center gap-2 border-b border-border/40 px-3 py-3">
      <HapticPressable
        haptic
        onPress={onPress}
        className="min-h-11 min-w-0 flex-1 flex-row items-center gap-3 active:opacity-90"
      >
        <View
          className={`h-10 w-10 items-center justify-center rounded-full ${
            selected ? "bg-primary/10" : "bg-muted"
          }`}
        >
          <Icon
            name={selected ? "Check" : "Route"}
            className={`size-md ${
              selected ? "text-primary" : "text-muted-foreground"
            }`}
          />
        </View>
        <View className="min-w-0 flex-1">
          <Text
            numberOfLines={1}
            className="text-[15px] font-semibold text-foreground"
          >
            {title}
          </Text>
          <Text
            numberOfLines={1}
            className="mt-0.5 text-xs text-muted-foreground"
          >
            {subtitle}
          </Text>
        </View>
      </HapticPressable>
      <View className="flex-row items-center gap-2">
        <InvoiceItemSheetActionButton
          icon="Pencil"
          label="Edit item"
          onPress={onEdit}
        />
        <InvoiceItemSheetActionButton
          icon="Trash"
          label="Delete item"
          danger
          onPress={onDelete}
        />
      </View>
    </View>
  );
}

function InvoiceItemSheetCommandRow({
  title,
  subtitle,
  icon,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: IconKeys;
  onPress: () => void;
}) {
  return (
    <HapticPressable
      haptic
      onPress={onPress}
      className="min-h-[64px] flex-row items-center gap-3 border-b border-border/40 px-3 py-3 active:opacity-90"
    >
      <View className="h-10 w-10 items-center justify-center rounded-full bg-muted">
        <Icon name={icon} className="size-md text-muted-foreground" />
      </View>
      <View className="min-w-0 flex-1">
        <Text
          numberOfLines={1}
          className="text-[15px] font-semibold text-foreground"
        >
          {title}
        </Text>
        <Text
          numberOfLines={1}
          className="mt-0.5 text-xs text-muted-foreground"
        >
          {subtitle}
        </Text>
      </View>
    </HapticPressable>
  );
}

function InvoiceItemSheetActionButton({
  icon,
  label,
  danger = false,
  onPress,
}: {
  icon: "Pencil" | "Trash";
  label: string;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <HapticPressable
      accessibilityLabel={label}
      haptic
      onPress={onPress}
      className="h-11 w-11 items-center justify-center rounded-full border border-border bg-background active:bg-muted active:opacity-90"
    >
      <Icon
        name={icon}
        className={`size-sm ${danger ? "text-red-600" : "text-foreground"}`}
      />
    </HapticPressable>
  );
}

function getInvoiceItemDisplayTitle(
  section: InvoiceItemSection,
  index: number,
) {
  const title = String(section.title || "").trim();
  return title || `Item ${index + 1}`;
}
