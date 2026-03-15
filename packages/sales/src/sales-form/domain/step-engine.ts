export function normalizeSalesFormTitle(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function buildSelectedProdUidsByStepUid(steps: any[]) {
  const selected: Record<string, string[]> = {};
  (steps || []).forEach((step) => {
    const stepUid = step?.step?.uid;
    if (!stepUid) return;
    const candidates = new Set<string>();
    if (step?.prodUid) candidates.add(String(step.prodUid));
    if (Array.isArray(step?.meta?.selectedProdUids)) {
      step.meta.selectedProdUids.forEach((uid: any) => {
        if (uid) candidates.add(String(uid));
      });
    }
    if (candidates.size) selected[stepUid] = Array.from(candidates);
  });
  return selected;
}

export function buildSelectedByStepUid(steps: any[]) {
  const selectedAll = buildSelectedProdUidsByStepUid(steps);
  const selected: Record<string, string> = {};
  Object.entries(selectedAll).forEach(([stepUid, uids]) => {
    const first = uids[0];
    if (first) selected[stepUid] = first;
  });
  return selected;
}

export function getRedirectableRoutes(routeData: any) {
  const configuredSteps = Array.isArray(routeData?.steps) ? routeData.steps : null;
  const orderedSteps = configuredSteps
    ? configuredSteps
    : Object.keys(routeData?.stepsById || {})
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id))
        .sort((a, b) => a - b)
        .map((id) => {
          const uid = routeData?.stepsById?.[id];
          return uid ? routeData?.stepsByUid?.[uid] : null;
        });

  const routes = orderedSteps
    .filter(Boolean)
    .map((step: any) => ({
      uid: String(step?.uid || ""),
      title: String(step?.title || "").trim(),
    }))
    .filter((step: any) => step.uid && step.title);

  return Array.from(
    new Map(routes.map((step: any) => [step.uid, step])).values(),
  );
}

export function isComponentVisibleByRules(
  component: any,
  selectedByStepUid: Record<string, string>,
  selectedProdUidsByStepUid?: Record<string, string[]>,
) {
  const variations = Array.isArray(component?.variations)
    ? component.variations
    : [];
  if (!variations.length) return true;
  for (const variation of variations) {
    const rules = Array.isArray(variation?.rules) ? variation.rules : [];
    if (!rules.length) continue;
    const matches = rules.every((rule: any) => {
      const stepUid = String(rule?.stepUid || "");
      const operator = String(rule?.operator || "is");
      const candidates = Array.isArray(rule?.componentsUid)
        ? rule.componentsUid.map((uid: any) => String(uid))
        : rule?.componentsUid
          ? [String(rule.componentsUid)]
          : [];
      const selected = stepUid ? selectedByStepUid[stepUid] : null;
      const selectedAll =
        stepUid && Array.isArray(selectedProdUidsByStepUid?.[stepUid])
          ? selectedProdUidsByStepUid?.[stepUid] || []
          : selected
            ? [selected]
            : [];
      if (!candidates.length) return true;
      if (!selectedAll.length) return operator !== "is";
      if (operator === "isNot")
        return selectedAll.every((selectedUid) =>
          candidates.every((uid: string) => uid !== selectedUid),
        );
      return selectedAll.some((selectedUid) =>
        candidates.some((uid: string) => uid === selectedUid),
      );
    });
    if (matches) return true;
  }
  return false;
}

export function resolveComponentPriceByDeps(
  component: any,
  selectedByStepUid: Record<string, string>,
  options?: {
    priceStepDeps?: string[] | null;
    selectedProdUidsByStepUid?: Record<string, string[]>;
  },
) {
  const directSales = Number(component?.salesPrice);
  const directBase = Number(component?.basePrice);
  if (Number.isFinite(directSales) || Number.isFinite(directBase)) {
    return {
      salesPrice: Number.isFinite(directSales) ? directSales : null,
      basePrice: Number.isFinite(directBase) ? directBase : null,
    };
  }
  const pricing =
    component?.pricing || component?.pricings || component?.priceData || null;
  if (!pricing || typeof pricing !== "object") {
    return {
      salesPrice: null,
      basePrice: null,
    };
  }
  const deps = Array.isArray(options?.priceStepDeps)
    ? options?.priceStepDeps
    : Array.isArray(component?.priceStepDeps)
    ? component.priceStepDeps
    : Array.isArray(component?.meta?.priceStepDeps)
      ? component.meta.priceStepDeps
      : [];
  const depValueGroups = deps
    .map((stepUid: string) => {
      const selectedAll = Array.isArray(options?.selectedProdUidsByStepUid?.[stepUid])
        ? (options?.selectedProdUidsByStepUid?.[stepUid] || []).map((uid) => String(uid))
        : [];
      if (selectedAll.length) return Array.from(new Set(selectedAll.filter(Boolean)));
      const single = selectedByStepUid[stepUid];
      return single ? [single] : [];
    })
    .filter((group) => group.length);

  const cartesian = (groups: string[][], max = 24) => {
    if (!groups.length) return [] as string[][];
    let acc: string[][] = [[]];
    for (const group of groups) {
      const next: string[][] = [];
      for (const prefix of acc) {
        for (const value of group) {
          next.push([...prefix, value]);
          if (next.length >= max) return next;
        }
      }
      acc = next;
      if (acc.length >= max) return acc.slice(0, max);
    }
    return acc;
  };

  const depCombos = cartesian(depValueGroups).map((values) => values.filter(Boolean));
  const depValues = depCombos[0] || [];
  const depKey = depValues.join("-");
  const fallbackKey = String(component?.uid || "");
  const pricingObj = pricing as Record<string, any>;

  const permutations = (values: string[]) => {
    if (values.length <= 1) return [values];
    if (values.length > 4) return [values];
    const out: string[][] = [];
    const used = new Array(values.length).fill(false);
    const path: string[] = [];
    const walk = () => {
      if (path.length === values.length) {
        out.push([...path]);
        return;
      }
      for (let i = 0; i < values.length; i++) {
        if (used[i]) continue;
        used[i] = true;
        path.push(values[i]);
        walk();
        path.pop();
        used[i] = false;
      }
    };
    walk();
    return out;
  };

  const keyCandidates = Array.from(
    new Set([
      ...depCombos.flatMap((combo) => [
        combo.join("-"),
        ...permutations(combo).map((values) => values.join("-")),
      ]),
      depKey,
      ...permutations(depValues).map((values) => values.join("-")),
      fallbackKey,
    ].filter(Boolean)),
  );

  let raw: any = null;
  for (const key of keyCandidates) {
    if (pricingObj[key] != null) {
      raw = pricingObj[key];
      break;
    }
  }

  const scoringValues = Array.from(new Set(depCombos.flatMap((combo) => combo)));
  if (raw == null && scoringValues.length) {
    let best: { key: string; score: number } | null = null;
    for (const key of Object.keys(pricingObj)) {
      const score = scoringValues.reduce(
        (count, value) => (key.includes(value) ? count + 1 : count),
        0,
      );
      if (!score) continue;
      if (!best || score > best.score) {
        best = { key, score };
      }
    }
    if (best) raw = pricingObj[best.key];
  }

  const bucket = typeof raw === "number" ? { price: raw } : raw;
  const salesPrice = Number(
    bucket?.salesPrice ?? bucket?.price ?? bucket?.salesUnitCost,
  );
  const basePrice = Number(
    bucket?.basePrice ??
      bucket?.price ??
      bucket?.baseUnitCost ??
      bucket?.salesPrice ??
      bucket?.salesUnitCost,
  );
  if (!Number.isFinite(salesPrice) && !Number.isFinite(basePrice)) {
    return {
      salesPrice: null,
      basePrice: null,
    };
  }
  return {
    salesPrice: Number.isFinite(salesPrice) ? salesPrice : null,
    basePrice: Number.isFinite(basePrice) ? basePrice : null,
  };
}

export function customNextStepTitle(
  doorType: string | null | undefined,
  currentStepTitle: string | null | undefined,
  currentValue: string | null | undefined,
) {
  const dt = normalizeSalesFormTitle(doorType || currentValue);
  const step = normalizeSalesFormTitle(currentStepTitle);
  const val = normalizeSalesFormTitle(currentValue);

  const base: Record<string, string> = {
    "shelf items": "Shelf Items",
    "cutdown height": "House Package Tool",
    "jamb species": "Jamb Size",
    door: "Jamb Species",
    "jamb size": "Jamb Type",
  };

  if (dt === "moulding") {
    const moulding: Record<string, string> = {
      "item type": "Specie",
      specie: "Moulding",
      moulding: "Line Item",
    };
    return moulding[step] || null;
  }
  if (dt === "services") {
    return step === "item type" ? "Line Item" : null;
  }
  if (dt === "door slabs only") {
    const slab: Record<string, string> = {
      "item type": "Height",
      height: "Door Type",
      door: "House Package Tool",
    };
    return slab[step] || null;
  }
  if (dt === "bifold") {
    const bifold: Record<string, string> = {
      "item type": "Height",
      height: "Door Type",
      "door type": "Door",
      door: "House Package Tool",
    };
    return bifold[step] || null;
  }

  if (val && base[val]) return base[val];
  return base[step] || null;
}

export function findStepByTitle(routeData: any, title: string | null) {
  if (!title) return null;
  const normalized = normalizeSalesFormTitle(title);
  return (
    Object.values(routeData?.stepsByUid || {}).find(
      (step: any) => normalizeSalesFormTitle(step.title) === normalized,
    ) || null
  );
}

export function stepMatches(routeData: any, step: any, candidate: any) {
  if (!step || !candidate) return false;
  const stepUid = step.step?.uid || routeData?.stepsById?.[step.stepId || -1];
  return stepUid === candidate.uid || step.stepId === candidate.id;
}
