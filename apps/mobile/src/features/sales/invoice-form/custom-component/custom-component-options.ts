import {
  profileAdjustedSalesPrice,
  readSalesFormObjectMetadata,
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
      const title = normalizeCustomComponentTitleInput(
        String(component.title || component.name || ""),
      );
      const pricing = getCustomPricing(component);
      return {
        id: component.id == null ? undefined : Number(component.id || 0),
        uid: component.uid || null,
        title: title || "CUSTOM COMPONENT",
        price: pricing.price,
        pricingId: pricing.pricingId,
        dependenciesUid: pricing.dependenciesUid,
        component,
      };
    })
    .filter((option) => option.title)
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function findCustomOptionByTitle(
  options: CustomComponentOption[],
  title?: string | null,
) {
  const normalizedTitle = normalizeTitle(title);
  if (!normalizedTitle) return null;
  return (
    options.find((option) => normalizeTitle(option.title) === normalizedTitle) ||
    null
  );
}

export function normalizeCustomComponentTitleInput(value?: string | null) {
  return String(value || "").trim().toUpperCase();
}

export function mergeSelectedCustomComponents(
  components: WorkflowComponentRecord[],
  step?: WorkflowStepRecord | null,
) {
  const selectedComponents = readSelectedComponents(step);
  if (!selectedComponents.length) return components;

  const existingUids = new Set(
    components.map((component) => String(component.uid || "")).filter(Boolean),
  );
  const selectedCustoms = selectedComponents
    .filter((component) => isCustomComponent(component))
    .filter((component) => !readObject(component._metaData)?.deletedAt)
    .filter((component) => {
      const uid = String(component.uid || "");
      if (!uid || existingUids.has(uid)) return false;
      existingUids.add(uid);
      return true;
    });

  return selectedCustoms.length
    ? [...selectedCustoms, ...components]
    : components;
}

export function orderSelectedCustomFirst(
  components: WorkflowComponentRecord[],
  step?: WorkflowStepRecord | null,
) {
  const selectedUids = new Set(readSelectedUids(step));
  return [...components].sort((a, b) => {
    const aSelectedCustom =
      isCustomComponent(a) && selectedUids.has(String(a.uid || ""));
    const bSelectedCustom =
      isCustomComponent(b) && selectedUids.has(String(b.uid || ""));
    if (aSelectedCustom === bSelectedCustom) return 0;
    return aSelectedCustom ? -1 : 1;
  });
}

export function isCustomComponent(component: WorkflowComponentRecord) {
  const metadata = readObject(component._metaData);
  return Boolean(component.custom || metadata?.custom);
}

export function customComponentPriceChanged(
  option: CustomComponentOption | null | undefined,
  nextPrice?: number | null,
) {
  if (!option) return false;
  if (nextPrice == null && option.price == null) return false;
  if (nextPrice == null || option.price == null) return true;
  return Number(nextPrice) !== Number(option.price);
}

export function canProceedCustomComponentDetails(input: {
  stepId?: number | null;
  title?: string | null;
  selectedOption?: CustomComponentOption | null;
  nextPrice?: number | null;
  saving?: boolean;
}) {
  if (input.saving) return false;
  const title = normalizeCustomComponentTitleInput(input.title);
  if (!title) return false;
  const selectedOption = input.selectedOption || null;
  const unchangedExistingOption =
    selectedOption &&
    selectedOption.title.trim() === title &&
    !customComponentPriceChanged(selectedOption, input.nextPrice);
  if (unchangedExistingOption) return true;
  return Number(input.stepId || 0) > 0;
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
    title: normalizeCustomComponentTitleInput(
      String(component.title || option.title || component.name || "Component"),
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

function normalizeTitle(value?: string | null) {
  return normalizeCustomComponentTitleInput(value);
}

function readSelectedUids(step?: WorkflowStepRecord | null) {
  return Array.from(
    new Set(
      readStepMetadata(step)
        .flatMap((meta) =>
          Array.isArray(meta.selectedProdUids) ? meta.selectedProdUids : [],
        )
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  );
}

function readSelectedComponents(step?: WorkflowStepRecord | null) {
  const byUid = new Map<string, WorkflowComponentRecord>();
  for (const component of readStepMetadata(step).flatMap((meta) =>
    Array.isArray(meta.selectedComponents) ? meta.selectedComponents : [],
  )) {
    const record = readObject(component);
    const uid = String(record?.uid || "").trim();
    if (!uid || byUid.has(uid)) continue;
    byUid.set(uid, record as WorkflowComponentRecord);
  }
  return Array.from(byUid.values());
}

function readStepMetadata(step?: WorkflowStepRecord | null) {
  return [readObject(step?.meta), readObject(readObject(step?.step)?.meta)]
    .filter(Boolean) as Record<string, any>[];
}

const readObject = readSalesFormObjectMetadata;

function firstFiniteNumber(...values: unknown[]) {
  for (const value of values) {
    if (value == null || value === "") continue;
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }
  return null;
}
