import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Modal, useModal } from "@/components/ui/modal";
import { Text } from "@/components/ui/text";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useEffect, useMemo, useState } from "react";
import { PanResponder, Pressable, View } from "react-native";
import { createDefaultLineItems } from "../mock-data";
import { useInvoiceFormStore } from "../store/use-invoice-form-store";
import type { NewSalesFormLineItem } from "../types";
import { WorkflowStepSelector } from "./workflow-step-selector";

export function ItemsStep() {
  const [activeIndex, setActiveIndex] = useState(0);
  const { ref: itemsSheetRef, present: presentItemsSheet, dismiss: dismissItemsSheet } =
    useModal();
  const lineItems = useInvoiceFormStore((state) => state.lineItems);
  const salesId = useInvoiceFormStore((state) => state.salesId);
  const slug = useInvoiceFormStore((state) => state.slug);
  const actions = useInvoiceFormStore((state) => state.actions);
  const itemSections = useMemo(() => buildInvoiceItemSections(lineItems), [lineItems]);
  const activeSection = itemSections[activeIndex] || null;
  const activeWorkflowLine =
    activeSection?.lines.find((line) => isWorkflowSectionLine(line)) || null;
  const defaultCreateWorkflowLine = useMemo(() => {
    if (salesId || slug) return null;
    if (lineItems.some((line) => isWorkflowSectionLine(line))) return null;
    return createDefaultLineItems()[0] || null;
  }, [lineItems, salesId, slug]);
  const visibleWorkflowLine = activeWorkflowLine || defaultCreateWorkflowLine;
  const hasMultipleItems = itemSections.length > 1;
  const canGoPrevious = hasMultipleItems && activeIndex > 0;
  const canGoNext = hasMultipleItems && activeIndex < itemSections.length - 1;

  useEffect(() => {
    if (!itemSections.length) {
      setActiveIndex(0);
      return;
    }
    setActiveIndex((current) => Math.min(current, itemSections.length - 1));
  }, [itemSections.length]);

  useEffect(() => {
    const firstWorkflowIndex = itemSections.findIndex((section) => section.hasWorkflow);
    if (firstWorkflowIndex < 0) return;
    if (itemSections[activeIndex]?.hasWorkflow) return;
    setActiveIndex(firstWorkflowIndex);
  }, [activeIndex, itemSections]);

  useEffect(() => {
    if (salesId || slug) return;
    if (lineItems.some((line) => isWorkflowSectionLine(line))) return;
    const defaultWorkflowItem = createDefaultLineItems()[0];
    if (!defaultWorkflowItem) return;
    actions.addOrUpdateLineItem(defaultWorkflowItem);
  }, [actions, lineItems, salesId, slug]);

  const goPrevious = () => {
    if (!canGoPrevious) return;
    setActiveIndex((current) => Math.max(0, current - 1));
  };

  const goNext = () => {
    if (!canGoNext) return;
    setActiveIndex((current) =>
      Math.min(itemSections.length - 1, current + 1),
    );
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) =>
          hasMultipleItems &&
          Math.abs(gesture.dx) > 60 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderRelease: (_event, gesture) => {
          if (gesture.dx > 90 && canGoNext) {
            goNext();
            return;
          }
          if (gesture.dx < -90 && canGoPrevious) {
            goPrevious();
          }
        },
      }),
    [canGoNext, canGoPrevious, hasMultipleItems],
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
    <View className="relative gap-4 pb-20">
      {activeSection || visibleWorkflowLine ? (
        <View
          className="relative min-h-[640px]"
          {...panResponder.panHandlers}
        >
          {hasMultipleItems ? (
            <Pressable
              onPress={goPrevious}
              disabled={!canGoPrevious}
              className="absolute -left-3 top-1/2 z-20 h-20 w-12 -translate-y-10 items-center justify-center disabled:opacity-20"
            >
              <Icon name="ChevronLeft" className="text-foreground" size={30} />
            </Pressable>
          ) : null}
          <View className="w-full">
            {visibleWorkflowLine ? (
              <WorkflowStepSelector
                line={visibleWorkflowLine}
                onClose={() => undefined}
                presentation="inline"
              />
            ) : null}
          </View>
          {hasMultipleItems ? (
            <Pressable
              onPress={goNext}
              disabled={!canGoNext}
              className="absolute -right-3 top-1/2 z-20 h-20 w-12 -translate-y-10 items-center justify-center disabled:opacity-20"
            >
              <Icon name="ChevronRight" className="text-foreground" size={30} />
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View className="items-center rounded-2xl border border-dashed border-border bg-card p-8">
          <Icon name="ReceiptText" className="text-muted-foreground" size={28} />
          <Text className="mt-3 text-sm font-bold text-foreground">
            No invoice items yet
          </Text>
          <Text className="mt-1 text-center text-xs text-muted-foreground">
            Add an item to start the invoice.
          </Text>
          <Button className="mt-4 h-11 rounded-xl px-4" onPress={actions.openSelector}>
            <Icon name="Plus" className="text-primary-foreground" size={16} />
            <Text>Add item</Text>
          </Button>
        </View>
      )}

      <Pressable
        onPress={() => presentItemsSheet()}
        className="absolute bottom-3 right-3 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg active:opacity-90"
      >
        <Icon name="List" className="text-primary-foreground" size={24} />
      </Pressable>

      <Modal
        ref={itemsSheetRef}
        title="Invoice items"
        snapPoints={["65%", "90%"]}
      >
        <BottomSheetScrollView contentContainerStyle={{ padding: 16, paddingBottom: 96 }}>
          <View className="gap-2">
            {itemSections.map((section, index) => {
              const selected = index === activeIndex;
              return (
                <Pressable
                  key={`invoice-item-section-sheet-${section.key}`}
                  onPress={() => selectSheetItem(index)}
                  className={`flex-row items-center gap-3 rounded-2xl border p-3 ${
                    selected
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card"
                  }`}
                >
                  <View className="h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                    <Icon
                      name="ReceiptText"
                      className={selected ? "text-primary" : "text-foreground"}
                      size={18}
                    />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text numberOfLines={1} className="text-sm font-bold text-foreground">
                      {section.title || `Section ${index + 1}`}
                    </Text>
                    <Text numberOfLines={1} className="mt-0.5 text-xs text-muted-foreground">
                      Invoice item {index + 1}
                    </Text>
                  </View>
                  {selected ? (
                    <Icon name="Check" className="text-primary" size={18} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </BottomSheetScrollView>
        <View className="absolute bottom-0 left-0 right-0 border-t border-border bg-background p-4">
          <Button className="h-11 rounded-xl" onPress={addInvoiceItemFromSheet}>
            <Icon name="Plus" className="text-primary-foreground" size={16} />
            <Text>Add invoice item</Text>
          </Button>
        </View>
      </Modal>
    </View>
  );
}

type InvoiceItemSection = {
  key: string;
  title: string;
  lines: NewSalesFormLineItem[];
  qty: number;
  total: number;
  hasWorkflow: boolean;
};

function buildInvoiceItemSections(
  lineItems: NewSalesFormLineItem[],
): InvoiceItemSection[] {
  const sections = new Map<string, InvoiceItemSection>();

  for (const line of lineItems) {
    const key = getInvoiceItemSectionKey(line);
    const existing = sections.get(key);
    if (existing) {
      existing.lines.push(line);
      existing.qty += Number(line.qty || 0);
      existing.total += Number(line.lineTotal || 0);
      continue;
    }
    sections.set(key, {
      key,
      title: getInvoiceItemSectionTitle(line),
      lines: [line],
      qty: Number(line.qty || 0),
      total: Number(line.lineTotal || 0),
      hasWorkflow: isWorkflowSectionLine(line),
    });
  }

  return Array.from(sections.values())
    .map((section) => ({
      ...section,
      hasWorkflow:
        section.hasWorkflow || section.lines.some((line) => isWorkflowSectionLine(line)),
      total: Number(section.total.toFixed(2)),
    }))
    .sort((a, b) => Number(b.hasWorkflow) - Number(a.hasWorkflow));
}

function getInvoiceItemSectionKey(line: NewSalesFormLineItem) {
  if (isWorkflowSectionLine(line)) return `workflow:${line.uid}`;
  const sourceUid = String(line.meta?.sourceUid || "").trim();
  return sourceUid ? `source:${sourceUid}` : `line:${line.uid}`;
}

function getInvoiceItemSectionTitle(line: NewSalesFormLineItem) {
  const category = String(line.meta?.category || "").trim();
  if (category && !isWorkflowSectionLine(line)) return category;
  return String(line.title || line.description || "Invoice item");
}

function isWorkflowSectionLine(line: NewSalesFormLineItem) {
  return (
    Boolean(line.meta?.workflowComponentUid) ||
    (Array.isArray(line.formSteps) && line.formSteps.length > 0)
  );
}
