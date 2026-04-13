import { normalizeSalesFormTitle } from "./step-engine";

function snapshotSelectedComponent(component: any) {
  return {
    id: component?.id ?? null,
    uid: component?.uid || "",
    title: component?.title || "",
    img: component?.img || null,
    inventoryId: component?.inventoryId ?? null,
    inventoryVariantId: component?.inventoryVariantId ?? null,
    salesPrice:
      component?.salesPrice == null ? null : Number(component.salesPrice || 0),
    basePrice:
      component?.basePrice == null ? null : Number(component.basePrice || 0),
    pricing: component?.pricing || null,
    supplierVariants: Array.isArray(component?.supplierVariants)
      ? component.supplierVariants
      : [],
    redirectUid: component?.redirectUid || null,
    sectionOverride: component?.sectionOverride || null,
  };
}

export function findLineStepByTitle(line: any, title: string) {
  const normalized = normalizeSalesFormTitle(title);
  return (line?.formSteps || []).find(
    (step: any) => normalizeSalesFormTitle(step?.step?.title) === normalized,
  );
}

export function getItemType(line: any) {
  const step = (line?.formSteps || []).find(
    (s: any) => normalizeSalesFormTitle(s?.step?.title) === "item type",
  );
  return normalizeSalesFormTitle(step?.value);
}

export function isMouldingItem(line: any) {
  const type = getItemType(line);
  return (
    type === "moulding" ||
    type === "mouldings" ||
    type === "molding" ||
    type === "moldings"
  );
}

export function isServiceItem(line: any) {
  const type = getItemType(line);
  return type === "services" || type === "service";
}

export function isShelfItem(line: any) {
  return getItemType(line) === "shelf items";
}

export function getSelectedDoorComponentsForLine(line: any) {
  const doorStep = findLineStepByTitle(line, "Door");
  const selected = Array.isArray(doorStep?.meta?.selectedComponents)
    ? doorStep.meta.selectedComponents
        .map((component: any) => snapshotSelectedComponent(component))
        .filter((component: any) => !!component.uid)
    : [];
  if (selected.length) return selected;
  const prodUid = String(doorStep?.prodUid || "").trim();
  if (!prodUid) return [];
  return [
    {
      id: doorStep?.componentId ?? null,
      uid: prodUid,
      title: doorStep?.value || "Door",
      img: doorStep?.meta?.img || null,
      inventoryId: doorStep?.meta?.inventoryId ?? null,
      inventoryVariantId: doorStep?.meta?.inventoryVariantId ?? null,
      salesPrice: doorStep?.price == null ? null : Number(doorStep.price || 0),
      basePrice:
        doorStep?.basePrice == null ? null : Number(doorStep.basePrice || 0),
      pricing: null,
      supplierVariants: [],
      redirectUid: doorStep?.meta?.redirectUid || null,
      sectionOverride: doorStep?.meta?.sectionOverride || null,
    },
  ];
}

export function getSelectedMouldingComponentsForLine(line: any) {
  const mouldingStep = findLineStepByTitle(line, "Moulding");
  const selected = Array.isArray(mouldingStep?.meta?.selectedComponents)
    ? mouldingStep.meta.selectedComponents
        .map((component: any) => snapshotSelectedComponent(component))
        .filter((component: any) => !!component.uid)
    : [];
  if (selected.length) return selected;
  const prodUid = String(mouldingStep?.prodUid || "").trim();
  if (!prodUid) return [];
  return [
    {
      id: mouldingStep?.componentId ?? null,
      uid: prodUid,
      title: mouldingStep?.value || "Moulding",
      img: mouldingStep?.meta?.img || null,
      inventoryId: mouldingStep?.meta?.inventoryId ?? null,
      inventoryVariantId: mouldingStep?.meta?.inventoryVariantId ?? null,
      salesPrice:
        mouldingStep?.price == null ? null : Number(mouldingStep.price || 0),
      basePrice:
        mouldingStep?.basePrice == null ? null : Number(mouldingStep.basePrice || 0),
      pricing: null,
      supplierVariants: [],
      redirectUid: mouldingStep?.meta?.redirectUid || null,
      sectionOverride: mouldingStep?.meta?.sectionOverride || null,
    },
  ];
}
