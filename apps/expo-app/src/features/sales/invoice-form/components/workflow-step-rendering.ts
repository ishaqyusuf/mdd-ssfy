export const WORKFLOW_COMPONENT_SEARCH_THRESHOLD = 15;
export const WORKFLOW_COMPONENT_VISIBLE_LIMIT =
  WORKFLOW_COMPONENT_SEARCH_THRESHOLD;

function normalizeWorkflowComponentSearchValue(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export function shouldShowWorkflowComponentSearch(componentsCount: number) {
  return componentsCount > WORKFLOW_COMPONENT_SEARCH_THRESHOLD;
}

export function filterWorkflowComponentsBySearch<T>(
  components: T[],
  query: string,
  getSearchValues: (component: T) => unknown[],
) {
  const normalizedQuery = normalizeWorkflowComponentSearchValue(query);
  if (!normalizedQuery) return components;

  return components.filter((component) =>
    getSearchValues(component).some((value) =>
      normalizeWorkflowComponentSearchValue(value).includes(normalizedQuery),
    ),
  );
}

export function limitWorkflowComponents<T>(
  components: T[],
  max = WORKFLOW_COMPONENT_VISIBLE_LIMIT,
) {
  return components.slice(0, Math.max(0, max));
}

export function isWorkflowMouldingStepTitle(title?: string | null) {
  const normalizedTitle = String(title ?? "")
    .trim()
    .toLowerCase();
  return (
    normalizedTitle === "moulding" ||
    normalizedTitle === "mouldings" ||
    normalizedTitle === "molding" ||
    normalizedTitle === "moldings"
  );
}

export function shouldTreatWorkflowStepAsMouldingSelection(input: {
  activeRootStep: boolean;
  activeStepTitle?: string | null;
  mouldingItem: boolean;
}) {
  const normalizedTitle = String(input.activeStepTitle ?? "")
    .trim()
    .toLowerCase();
  if (input.activeRootStep) return false;
  if (normalizedTitle.includes("line item")) return false;
  return isWorkflowMouldingStepTitle(normalizedTitle) || input.mouldingItem;
}

export function shouldUseWorkflowGroupedRowEditorStep(input: {
  activeRootStep: boolean;
  activeStepFamily?: string | null;
  activeMouldingStep: boolean;
}) {
  if (input.activeRootStep) return false;
  return (
    input.activeStepFamily === "service-line-item" ||
    input.activeStepFamily === "shelf" ||
    (input.activeStepFamily === "moulding-line-item" &&
      !input.activeMouldingStep)
  );
}

export function getWorkflowProceedFallbackSelectedCount(input: {
  visibleSelectedCount: number;
  stepSelectedComponentCount?: number | null;
  doorStep: boolean;
  doorRowCount: number;
  mouldingStep: boolean;
  mouldingSelectionCount?: number | null;
  mouldingRowCount: number;
  pendingMultiSelectCount?: number | null;
}) {
  return Math.max(
    input.visibleSelectedCount,
    Number(input.stepSelectedComponentCount || 0),
    input.doorStep ? input.doorRowCount : 0,
    input.mouldingStep ? Number(input.mouldingSelectionCount || 0) : 0,
    input.mouldingStep ? input.mouldingRowCount : 0,
    Number(input.pendingMultiSelectCount || 0),
  );
}
