import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Modal, useModal } from "@/components/ui/modal";
import { Text } from "@/components/ui/text";
import { SalesClickListRow } from "@/features/sales/components/sales-click-list-row";
import { BottomSheetView } from "@gorhom/bottom-sheet";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  PanResponder,
  Pressable,
  TextInput,
  View,
} from "react-native";
import { getSalesDocumentLabels } from "../lib/sales-document-labels";
import { createDefaultLineItems } from "../mock-data";
import { useInvoiceFormStore } from "../store/use-invoice-form-store";
import { normalizeInvoiceItemDescription } from "./items-step-copy";
import {
  getInvoiceItemSwipeDirection,
  shouldStartInvoiceItemSwipe,
} from "./items-step-navigation";
import {
  type InvoiceItemSection,
  buildInvoiceItemSections,
  isWorkflowSectionLine,
} from "./items-step-sections";
import {
  getInvoiceItemSheetIndexLabel,
  getInvoiceItemSheetSummary,
} from "./items-step-sheet";
import { WorkflowMouldingLineItemEditor } from "./workflow-moulding-line-item-editor";
import { WorkflowServiceLineItemEditor } from "./workflow-service-line-item-editor";
import { WorkflowShelfLineItemEditor } from "./workflow-shelf-line-item-editor";
import {
  type WorkflowFloatingActionEntry,
  type WorkflowLineItemEditorEntry,
  type WorkflowStickyHeaderEntry,
  WorkflowStepSelector,
} from "./workflow-step-selector";

const ITEMS_STEP_BOTTOM_PADDING = 176;

export type InvoiceItemNavigationEntry = {
	canGoPrevious: boolean;
	canGoNext: boolean;
	onPrevious: () => void;
	onNext: () => void;
};

export function ItemsStep({
	onItemsSheetPresenterChange,
	footerActionsHidden = false,
	onComponentScroll,
	formScrollY = 0,
	onStickyWorkflowHeaderChange,
	onInlineWorkflowProceedActionChange,
	onActiveItemTitleChange,
	onItemNavigationChange,
}: {
	onItemsSheetPresenterChange?: (presenter: (() => void) | null) => void;
	footerActionsHidden?: boolean;
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
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [itemsContentY, setItemsContentY] = useState(0);
  const [workflowLocalY, setWorkflowLocalY] = useState(0);
  const [lineItemEditorEntry, setLineItemEditorEntry] =
    useState<WorkflowLineItemEditorEntry | null>(null);
  const {
    ref: itemsSheetRef,
    present: presentItemsSheet,
    dismiss: dismissItemsSheet,
  } = useModal();
  const lineItems = useInvoiceFormStore((state) => state.lineItems);
  const type = useInvoiceFormStore((state) => state.type);
  const labels = getSalesDocumentLabels(type);
  const actions = useInvoiceFormStore((state) => state.actions);
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
  const invoiceDescriptionLine =
    activeWorkflowLine || activeSection?.lines[0] || null;
  const invoiceDescriptionValue = normalizeInvoiceItemDescription(
    invoiceDescriptionLine?.description,
  );
  const hasMultipleItems = itemSections.length > 1;
  const canGoPrevious = hasMultipleItems && activeIndex > 0;
  const canGoNext = hasMultipleItems && activeIndex < itemSections.length - 1;
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
    setLineItemEditorEntry(null);
  }, [activeIndex]);

	const goPrevious = useCallback(() => {
		if (!canGoPrevious) return;
		setActiveIndex((current) => Math.max(0, current - 1));
	}, [canGoPrevious]);

	const goNext = useCallback(() => {
		if (!canGoNext) return;
		setActiveIndex((current) => Math.min(itemSections.length - 1, current + 1));
	}, [canGoNext, itemSections.length]);

	useEffect(() => {
		if (!hasMultipleItems) {
			onItemNavigationChange?.(null);
			return;
		}
		onItemNavigationChange?.({
			canGoPrevious,
			canGoNext,
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
		onItemNavigationChange,
	]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) =>
          shouldStartInvoiceItemSwipe({
            dx: gesture.dx,
            dy: gesture.dy,
            itemCount: itemSections.length,
          }),
        onMoveShouldSetPanResponderCapture: (_event, gesture) =>
          shouldStartInvoiceItemSwipe({
            dx: gesture.dx,
            dy: gesture.dy,
            itemCount: itemSections.length,
          }),
        onPanResponderRelease: (_event, gesture) => {
          const direction = getInvoiceItemSwipeDirection({
            dx: gesture.dx,
            dy: gesture.dy,
            itemCount: itemSections.length,
            activeIndex,
          });
          if (direction === "next") {
            setActiveIndex((current) =>
              Math.min(itemSections.length - 1, current + 1),
            );
            return;
          }
          if (direction === "previous") {
            setActiveIndex((current) => Math.max(0, current - 1));
          }
        },
      }),
    [activeIndex, itemSections.length],
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
          <View className="w-full">
            {invoiceDescriptionLine ? (
              <View className="px-4 pb-2 pt-1">
                <TextInput
                  value={invoiceDescriptionValue}
                  placeholder={`Item ${activeIndex + 1}`}
                  placeholderTextColor="#8A8A8A"
                  onChangeText={(description) => {
                    if (
                      !lineItems.some(
                        (line) => line.uid === invoiceDescriptionLine.uid,
                      )
                    ) {
                      actions.addOrUpdateLineItem({
                        ...invoiceDescriptionLine,
                        description,
                      });
                      return;
                    }
                    actions.setLineDescription(
                      invoiceDescriptionLine.uid,
                      description,
                    );
                  }}
                  className="min-h-11 border-b border-border px-0 text-base font-semibold text-foreground"
                />
              </View>
            ) : null}
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
                  footerActionsHidden={footerActionsHidden}
                  onComponentScroll={onComponentScroll}
                  formScrollY={formScrollY}
                  inlineContentTopY={workflowContentTopY}
                  onStickyHeaderChange={onStickyWorkflowHeaderChange}
                  onInlineProceedActionChange={
                    onInlineWorkflowProceedActionChange
                  }
                  onLineItemEditorChange={setLineItemEditorEntry}
                />
                {showMouldingLineItemEditor ? (
                  <View key={lineItemEditorEntry?.key} className="px-4 pb-6">
                    <WorkflowMouldingLineItemEditor
                      line={activeWorkflowLine}
                      syncOnMount={false}
                      onWorkflowPatch={(patch) =>
                        actions.patchLineItem(activeWorkflowLine.uid, patch)
                      }
                    />
                  </View>
                ) : null}
                {showServiceLineItemEditor ? (
                  <View key={lineItemEditorEntry?.key} className="px-4 pb-6">
                    <WorkflowServiceLineItemEditor
                      line={activeWorkflowLine}
                      syncOnMount={false}
                      onWorkflowPatch={(patch) =>
                        actions.patchLineItem(activeWorkflowLine.uid, patch)
                      }
                    />
                  </View>
                ) : null}
                {showShelfLineItemEditor ? (
                  <View key={lineItemEditorEntry?.key} className="px-4 pb-6">
                    <WorkflowShelfLineItemEditor
                      line={activeWorkflowLine}
                      syncOnMount={false}
                      forceShelfItem
                      onWorkflowPatch={(patch) =>
                        actions.patchLineItem(activeWorkflowLine.uid, patch)
                      }
                    />
                  </View>
                ) : null}
						</View>
					) : null}
				</View>
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

      <Modal ref={itemsSheetRef} hideHeader enableDynamicSizing>
        <BottomSheetView className="px-5 pb-7 pt-3">
          <View>
            {itemSections.map((section, index) => {
              const selected = index === activeIndex;
              return (
                <SalesClickListRow
                  key={`invoice-item-section-sheet-${section.key}`}
                  title={getInvoiceItemDisplayTitle(section, index)}
                  subtitle={`${getInvoiceItemSheetIndexLabel(index)} • ${getInvoiceItemSheetSummary(section)}`}
                  icon="Route"
                  selected={selected}
                  onPress={() => selectSheetItem(index)}
                />
              );
            })}
            <SalesClickListRow
              title="New item"
              subtitle={`Add another ${labels.lowerNoun} item`}
              icon="Plus"
              onPress={addInvoiceItemFromSheet}
            />
            <SalesClickListRow
              title="Cancel"
              subtitle="Close item list"
              icon="X"
              onPress={dismissItemsSheet}
            />
          </View>
        </BottomSheetView>
      </Modal>
    </View>
  );
}

function getInvoiceItemDisplayTitle(
  section: InvoiceItemSection,
  index: number,
) {
  const title = String(section.title || "").trim();
  return title || `Item ${index + 1}`;
}
