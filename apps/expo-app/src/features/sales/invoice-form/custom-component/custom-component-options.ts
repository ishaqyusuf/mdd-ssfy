import {
  profileAdjustedSalesPrice,
  type WorkflowComponentRecord,
  type WorkflowStepRecord,
} from "@gnd/sales/sales-form-core";

export type CustomComponentOption = {
  id?: number;
  uid?: string | null;
  title: string;
  price: number | null;
  pricingId?: number;
  dependenciesUid?: string;
  component: WorkflowComponentRecord;
};

export function stepSupportsCustomComponents(
  step?: WorkflowStepRecord | null,
) {
  const stepMeta = readObject(step?.meta);
  const nestedStep = readObject(step?.step);
  const nestedMeta = readObject(nestedStep?.meta);
  return Boolean(
    step?.custom === true ||
      stepMeta?.custom ||
      nestedMeta?.custom ||
      nestedStep?.metaCustom,
  );
}

export function buildCustomOptions(components: WorkflowComponentRecord[]) {
  return components
    .filter((component) => isCustomComponent(component))
    .filter((component) => !readObject(component._metaData)?.deletedAt)
    .map((component): CustomComponentOption => {
      const title = String(component.title || "").trim();
      const pricing = getCustomPricing(component);
      return {
        id: component.id == null ? undefined : Number(component.id || 0),
        uid: component.uid || null,
        title: title || String(component.uid || "Custom component"),
        price: pricing.price,
        pricingId: pricing.pricingId,
        dependenciesUid: pricing.dependenciesUid,
        component,
      };
    })
    .filter((option) => option.title)
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function isCustomComponent(component: WorkflowComponentRecord) {
  return Boolean(component.custom || component._metaData?.custom);
}

export function customComponentPriceChanged(
  option: CustomComponentOption | null | undefined,
  nextPrice?: number | null,
) {
  if (!option) return false;
  const current = firstFiniteNumber(option.price);
  const next = firstFiniteNumber(nextPrice);
  if (current == null && next == null) return false;
  return Number(current ?? 0) !== Number(next ?? 0);
}

export function customOptionToWorkflowComponent(
  option: CustomComponentOption,
  costPrice?: number | null,
  profileCoefficient?: number | null,
): WorkflowComponentRecord {
  const component = option.component;
  const basePrice = firstFiniteNumber(
    costPrice,
    option.price,
    component.basePrice,
    component.salesPrice,
  );
  const salesPrice = profileAdjustedSalesPrice(
    component.salesPrice,
    basePrice,
    profileCoefficient,
  );
  return {
    ...component,
    id: component.id == null ? option.id ?? null : Number(component.id || 0),
    uid: String(component.uid || option.uid || component.id || option.id || ""),
    title: String(
      component.title || option.title || component.name || component.uid || "Component",
    ),
    salesPrice,
    basePrice,
    custom: true,
    _metaData: {
      ...(readObject(component._metaData) || {}),
      custom: true,
    },
  };
}

function getCustomPricing(component: WorkflowComponentRecord) {
  const pricing = readObject(component.pricing) || {};
  const entries = Object.entries(pricing);
  const uid = String(component.uid || "");
  const direct = uid ? readObject(pricing[uid]) : null;
  const fallback = entries[0];
  const selectedKey = direct ? uid : fallback?.[0];
  const selectedPricing = direct || readObject(fallback?.[1]);
  const price = firstFiniteNumber(
    selectedPricing?.price,
    component.basePrice,
    component.salesPrice,
  );
  return {
    price,
    pricingId: firstFiniteNumber(selectedPricing?.id) ?? undefined,
    dependenciesUid:
      selectedKey && selectedKey !== uid ? String(selectedKey) : undefined,
  };
}

function readObject(value: unknown): Record<string, any> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : null;
}

function firstFiniteNumber(...values: unknown[]) {
  for (const value of values) {
    if (value == null || value === "") continue;
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }
  return null;
}
