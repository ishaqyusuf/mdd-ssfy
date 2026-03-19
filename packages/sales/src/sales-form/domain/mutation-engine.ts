export function getSelectedProdUids(step: any) {
  const metaUids = Array.isArray(step?.meta?.selectedProdUids)
    ? step.meta.selectedProdUids
        .map((uid: unknown) => String(uid || "").trim())
        .filter(Boolean)
    : [];
  if (metaUids.length) return Array.from(new Set(metaUids));
  const prodUid = String(step?.prodUid || "").trim();
  return prodUid ? [prodUid] : [];
}

export function compactStepValue(selectedComponents: any[]) {
  if (!selectedComponents.length) return "";
  if (selectedComponents.length === 1) return selectedComponents[0]?.title || "";
  const first = selectedComponents[0]?.title || "";
  return first
    ? `${first} +${selectedComponents.length - 1}`
    : `${selectedComponents.length} selected`;
}

function snapshotSelectedComponent(component: any) {
  return {
    id: component?.id ?? null,
    uid: component?.uid || "",
    title: component?.title || "",
    img: component?.img || null,
    salesPrice: component?.salesPrice == null ? null : Number(component.salesPrice || 0),
    basePrice: component?.basePrice == null ? null : Number(component.basePrice || 0),
    pricing: component?.pricing || null,
    redirectUid: component?.redirectUid || null,
    sectionOverride: component?.sectionOverride || null,
  };
}

type MultiSelectMutationArgs = {
  steps: any[];
  currentStepIndex: number;
  component: any;
  visibleComponents: any[];
  selectedOverride?: boolean;
  activeStepTitle?: string | null;
};

export function applyMultiSelectStepMutation({
  steps,
  currentStepIndex,
  component,
  visibleComponents,
  selectedOverride,
  activeStepTitle,
}: MultiSelectMutationArgs) {
  const nextSteps = [...steps];
  const current = nextSteps[currentStepIndex];
  if (!current) {
    return {
      steps: nextSteps,
      selectedComponents: [] as any[],
      hasSelection: false,
    };
  }

  const selectedSet = new Set(getSelectedProdUids(current));
  const nextSelected =
    typeof selectedOverride === "boolean"
      ? selectedOverride
      : !selectedSet.has(component.uid);
  if (nextSelected) selectedSet.add(component.uid);
  else selectedSet.delete(component.uid);

  const selectedUids = Array.from(selectedSet);
  const selectedComponents = selectedUids
    .map((uid) =>
      visibleComponents.find((candidate: any) => candidate.uid === uid),
    )
    .filter(Boolean);
  const primary = selectedComponents[0] || null;
  const totalSales = selectedComponents.reduce(
    (sum, c: any) => sum + Number(c?.salesPrice || 0),
    0,
  );
  const totalBase = selectedComponents.reduce(
    (sum, c: any) => sum + Number(c?.basePrice || 0),
    0,
  );

  nextSteps[currentStepIndex] = {
    ...current,
    componentId: primary?.id || null,
    prodUid: primary?.uid || "",
    value: compactStepValue(selectedComponents),
    price: selectedComponents.length ? totalSales : 0,
    basePrice: selectedComponents.length ? totalBase : 0,
    meta: {
      ...(current.meta || {}),
      img: primary?.img || null,
      redirectUid: primary?.redirectUid || null,
      sectionOverride: primary?.sectionOverride || null,
      selectedProdUids: selectedUids,
      selectedComponents: selectedComponents.map((c: any) =>
        snapshotSelectedComponent(c),
      ),
    },
    step: {
      ...(current.step || {
        id: current.stepId || null,
        title: "",
      }),
      title: current.step?.title || activeStepTitle || "",
    },
  };

  return {
    steps: nextSteps,
    selectedComponents,
    hasSelection: selectedComponents.length > 0,
  };
}

type SingleSelectMutationArgs = {
  steps: any[];
  currentStepIndex: number;
  component: any;
  activeStepTitle?: string | null;
};

export function applySingleSelectStepMutation({
  steps,
  currentStepIndex,
  component,
  activeStepTitle,
}: SingleSelectMutationArgs) {
  const nextSteps = [...steps];
  const current = nextSteps[currentStepIndex];
  if (!current) return nextSteps;

  nextSteps[currentStepIndex] = {
    ...current,
    componentId: component.id,
    prodUid: component.uid,
    value: component.title,
    price:
      component.salesPrice == null ? current.price : Number(component.salesPrice || 0),
    basePrice:
      component.basePrice == null ? current.basePrice : Number(component.basePrice || 0),
    meta: {
      ...(current.meta || {}),
      img: component.img || null,
      redirectUid: component.redirectUid || null,
      sectionOverride: component.sectionOverride || null,
    },
    step: {
      ...(current.step || {
        id: current.stepId || null,
        title: "",
      }),
      title: current.step?.title || activeStepTitle || "",
    },
  };

  return nextSteps;
}
