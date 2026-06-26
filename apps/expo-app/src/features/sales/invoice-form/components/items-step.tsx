import { FloatingBottomSheet } from "@/components/floating-bottom-sheet";
import { BottomSheetKeyboardAwareScrollView } from "@/components/ui/bottom-sheet-keyboard-aware-scroll-view";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { IconKeys } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  PanResponder,
  Pressable,
  View,
} from "react-native";
import type { TextInput as NativeTextInput } from "react-native";
import { getSalesDocumentLabels } from "../lib/sales-document-labels";
import { createDefaultLineItems } from "../mock-data";
import { useInvoiceFormStore } from "../store/use-invoice-form-store";
import { getWorkflowProceedFloatingOffset } from "./floating-invoice-action-layout";
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
  getInvoiceItemDeleteLineUids,
  getInvoiceItemEditableLineUid,
  getInvoiceItemEditTitleLabel,
  getInvoiceItemSheetIndexLabel,
  getInvoiceItemSheetSummary,
  getNextInvoiceItemActiveIndex,
  type InvoiceItemSheetMode,
} from "./items-step-sheet";
import { WorkflowMouldingLineItemEditor } from "./workflow-moulding-line-item-editor";
import { WorkflowServiceLineItemEditor } from "./workflow-service-line-item-editor";
import { WorkflowShelfLineItemEditor } from "./workflow-shelf-line-item-editor";
import {
  type WorkflowFloatingActionEntry,
  type WorkflowLineItemEditorEntry,
  WorkflowStepSelector,
  type WorkflowStickyHeaderEntry,
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
  const [workflowProceedAction, setWorkflowProceedAction] =
    useState<WorkflowFloatingActionEntry | null>(null);
  const [openShelfPicker, setOpenShelfPicker] = useState<(() => void) | null>(
    null,
  );
  const [addServiceRow, setAddServiceRow] = useState<(() => void) | null>(null);
  const [itemsSheetOpen, setItemsSheetOpen] = useState(false);
  const [itemsSheetMode, setItemsSheetMode] =
    useState<InvoiceItemSheetMode>("list");
  const [pendingItemIndex, setPendingItemIndex] = useState<number | null>(null);
  const [draftItemTitle, setDraftItemTitle] = useState("");
  const editTitleInputRef = useRef<NativeTextInput>(null);
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
  const pendingSection =
    pendingItemIndex == null ? null : itemSections[pendingItemIndex] || null;
  const pendingItemTitle =
    pendingSection && pendingItemIndex != null
      ? getInvoiceItemDisplayTitle(pendingSection, pendingItemIndex)
      : "";
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
    setWorkflowProceedAction(null);
    setOpenShelfPicker(null);
  }, [activeIndex]);

  useEffect(() => {
    if (!showShelfLineItemEditor) {
      setOpenShelfPicker(null);
    }
  }, [showShelfLineItemEditor]);

  useEffect(() => {
    if (!showServiceLineItemEditor) {
      setAddServiceRow(null);
    }
  }, [showServiceLineItemEditor]);

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
      setAddServiceRow(handler ? () => handler : null);
    },
    [],
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
      label: "+ Add service",
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
          <View className="w-full">
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
                  onInlineProceedActionChange={setWorkflowProceedAction}
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
                      hideAddButton
                      onAddServiceChange={handleAddServiceChange}
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
                      onOpenPickerChange={handleShelfPickerChange}
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
      <Pressable
        onPress={onPress}
        className="min-h-11 min-w-0 flex-1 flex-row items-center gap-3 active:opacity-70"
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
      </Pressable>
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
    <Pressable
      onPress={onPress}
      className="min-h-[64px] flex-row items-center gap-3 border-b border-border/40 px-3 py-3 active:opacity-70"
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
    </Pressable>
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
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      className="h-11 w-11 items-center justify-center rounded-full border border-border bg-background active:bg-muted"
    >
      <Icon
        name={icon}
        className={`size-sm ${danger ? "text-red-600" : "text-foreground"}`}
      />
    </Pressable>
  );
}

function getInvoiceItemDisplayTitle(
  section: InvoiceItemSection,
  index: number,
) {
  const title = String(section.title || "").trim();
  return title || `Item ${index + 1}`;
}
