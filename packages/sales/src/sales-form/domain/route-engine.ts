import {
  customNextStepTitle,
  findStepByTitle,
  normalizeSalesFormTitle,
  stepMatches,
} from "./step-engine";

const DEFAULT_AUTO_ADVANCE_TITLES = new Set([
  "height",
  "width",
  "hand",
  "door",
  "house package tool",
]);

type SelectedComponent = {
  uid: string;
  title?: string | null;
  redirectUid?: string | null;
  id?: number | null;
  img?: string | null;
};

function clearRedirectDisabledMeta(step: any) {
  const meta = step?.meta || {};
  return {
    ...step,
    meta: {
      ...meta,
      redirectDisabled: false,
      redirectTargetUid: null,
    },
  };
}

function markRedirectDisabled(step: any, redirectTargetUid: string) {
  return {
    ...step,
    meta: {
      ...(step?.meta || {}),
      redirectDisabled: true,
      redirectTargetUid,
    },
  };
}

export function seedRouteStep(step: any, selectedComponent?: SelectedComponent) {
  return {
    id: null,
    stepId: step.id,
    componentId: selectedComponent?.id || null,
    prodUid: selectedComponent?.uid || "",
    value: selectedComponent?.title || "",
    meta: {
      ...((step?.meta && typeof step.meta === "object" && !Array.isArray(step.meta))
        ? step.meta
        : {}),
      ...(selectedComponent?.img
        ? {
            img: selectedComponent.img,
          }
        : {}),
    },
    step: {
      id: step.id,
      uid: step.uid,
      title: step.title || "",
    },
  };
}

export function buildConfiguredRouteSteps(
  routeData: any,
  rootStep: any,
  selectedComponent: SelectedComponent,
) {
  const initial = [seedRouteStep(rootStep, selectedComponent)];
  const route = routeData?.composedRouter?.[selectedComponent?.uid];
  const sequenceUids: string[] = Array.isArray(route?.routeSequence)
    ? route.routeSequence
        .map((entry: any) => String(entry?.uid || ""))
        .filter(Boolean)
    : [];
  if (!sequenceUids.length) return initial;

  const deduped = Array.from(new Set(sequenceUids));
  const routeSteps = deduped
    .map((uid) => routeData?.stepsByUid?.[uid])
    .filter(Boolean)
    .map((step) => seedRouteStep(step));
  return [...initial, ...routeSteps];
}

export function mergeConfiguredSeriesWithExisting(
  existingSteps: any[],
  configuredSteps: any[],
) {
  return configuredSteps.map((seriesStep, index) => {
    if (index === 0) return seriesStep;
    const routeUid = seriesStep?.step?.uid;
    const routeId = seriesStep?.stepId;
    const existing = existingSteps.find(
      (step) =>
        (routeUid && step?.step?.uid === routeUid) ||
        (routeId != null && step?.stepId === routeId),
    );
    if (!existing) return seriesStep;
    return {
      ...seriesStep,
      ...existing,
      meta: {
        ...(seriesStep?.meta || {}),
        ...(existing?.meta || {}),
      },
      stepId: seriesStep.stepId ?? existing.stepId ?? null,
      step: {
        ...(existing.step || {}),
        ...(seriesStep.step || {}),
      },
    };
  });
}

export function resolveNextStep({
  routeData,
  line,
  steps,
  currentStepIndex,
  selectedComponent,
  allowPriorFallback = true,
  allowCustomFallback = true,
}: {
  routeData: any;
  line: any;
  steps: any[];
  currentStepIndex: number;
  selectedComponent: SelectedComponent;
  allowPriorFallback?: boolean;
  allowCustomFallback?: boolean;
}) {
  if (!routeData || !steps[currentStepIndex]) return null;

  const currentStep = steps[currentStepIndex];
  const rootComponentUid = steps[0]?.prodUid;
  const rootRoute = rootComponentUid
    ? routeData.composedRouter?.[rootComponentUid]
    : null;

  const currentStepUid =
    currentStep.step?.uid || routeData.stepsById?.[currentStep.stepId || -1];

  let nextStep: any = selectedComponent.redirectUid
    ? routeData.stepsByUid?.[selectedComponent.redirectUid]
    : null;

  if (!nextStep && currentStepUid && rootRoute) {
    const nextUid = rootRoute.route?.[currentStepUid];
    if (nextUid) nextStep = routeData.stepsByUid?.[nextUid];
  }

  if (!nextStep && allowPriorFallback && rootRoute?.route) {
    for (let i = currentStepIndex; i >= 0; i--) {
      const priorStep = steps[i];
      const priorUid =
        priorStep?.step?.uid || routeData.stepsById?.[priorStep?.stepId || -1];
      if (!priorUid) continue;
      const fallbackUid = rootRoute.route?.[priorUid];
      if (!fallbackUid) continue;
      if (fallbackUid === currentStepUid) continue;
      const fallbackStep = routeData.stepsByUid?.[fallbackUid];
      if (fallbackStep) {
        nextStep = fallbackStep;
        break;
      }
    }
  }

  if (!nextStep && allowCustomFallback) {
    const customTitle = customNextStepTitle(
      (line.meta as any)?.doorType || null,
      currentStep.step?.title,
      selectedComponent.title || currentStep.value,
    );
    nextStep = findStepByTitle(routeData, customTitle);
  }

  return nextStep || null;
}

export function applyRouteRecursion({
  routeData,
  line,
  steps,
  startIndex,
  selectedComponent,
  autoAdvanceTitles = DEFAULT_AUTO_ADVANCE_TITLES,
  maxIterations = 12,
}: {
  routeData: any;
  line: any;
  steps: any[];
  startIndex: number;
  selectedComponent: SelectedComponent;
  autoAdvanceTitles?: Set<string>;
  maxIterations?: number;
}) {
  const nextSteps = [...steps];
  let currentIndex = startIndex;
  let currentComponent = selectedComponent;
  let onRedirectPath = false;
  const visited = new Set<string>();

  for (let i = 0; i < maxIterations; i++) {
    const redirectedThisHop = Boolean(currentComponent?.redirectUid);
    const nextStep = resolveNextStep({
      routeData,
      line,
      steps: nextSteps,
      currentStepIndex: currentIndex,
      selectedComponent: currentComponent,
      allowPriorFallback: !onRedirectPath,
      allowCustomFallback: !onRedirectPath,
    });

    if (!nextStep) break;
    if (visited.has(nextStep.uid)) break;
    visited.add(nextStep.uid);

    const existingIndex = nextSteps.findIndex((step) =>
      stepMatches(routeData, step, nextStep),
    );
    if (existingIndex >= 0) {
      currentIndex = existingIndex;
      break;
    }

    const routeStep = routeData?.stepsByUid?.[nextStep.uid];
    const candidates = (routeStep?.components || []).filter(
      (component: any) => !!component.uid,
    );
    const hiddenAuto = autoAdvanceTitles.has(
      normalizeSalesFormTitle(nextStep.title),
    );

    if (!candidates.length) {
      const virtualSteps = [...nextSteps, seedRouteStep(nextStep)];
      const virtualNext = resolveNextStep({
        routeData,
        line,
        steps: virtualSteps,
        currentStepIndex: virtualSteps.length - 1,
        selectedComponent: {
          uid: "",
          title: nextStep.title,
        },
      });
      if (!virtualNext) break;
      if (visited.has(virtualNext.uid)) break;
      nextSteps.push(seedRouteStep(nextStep));
      currentIndex = nextSteps.length - 1;
      currentComponent = {
        uid: "",
        title: nextStep.title,
      };
      continue;
    }

    if (candidates.length === 1 || hiddenAuto) {
      const auto = candidates[0];
      nextSteps.push(seedRouteStep(nextStep, auto));
      currentIndex = nextSteps.length - 1;
      currentComponent = auto;
      onRedirectPath = onRedirectPath || redirectedThisHop;
      continue;
    }

    nextSteps.push(seedRouteStep(nextStep));
    currentIndex = nextSteps.length - 1;
    onRedirectPath = onRedirectPath || redirectedThisHop;
    break;
  }

  return {
    steps: nextSteps,
    activeIndex: currentIndex,
  };
}

export function rebuildStepsFromSelection({
  routeData,
  line,
  steps,
  startIndex,
  selectedComponent,
  autoAdvanceTitles = DEFAULT_AUTO_ADVANCE_TITLES,
  maxIterations = 12,
}: {
  routeData: any;
  line: any;
  steps: any[];
  startIndex: number;
  selectedComponent: SelectedComponent;
  autoAdvanceTitles?: Set<string>;
  maxIterations?: number;
}) {
  const sanitizedSteps = steps.map(clearRedirectDisabledMeta);
  const prefix = sanitizedSteps.slice(0, startIndex + 1);
  const rebuilt = applyRouteRecursion({
    routeData,
    line,
    steps: prefix,
    startIndex,
    selectedComponent,
    autoAdvanceTitles,
    maxIterations,
  });

  const merged = rebuilt.steps.map((step, index) => {
    if (index <= startIndex) return step;
    const existing = sanitizedSteps.find((candidate) =>
      stepMatches(routeData, candidate, step?.step),
    );
    if (!existing) return step;
    return {
      ...step,
      ...existing,
      meta: {
        ...(step?.meta || {}),
        ...(existing?.meta || {}),
      },
      stepId: step.stepId ?? existing.stepId ?? null,
      step: {
        ...(existing.step || {}),
        ...(step.step || {}),
      },
    };
  });

  if (selectedComponent?.redirectUid) {
    const redirectStep = routeData?.stepsByUid?.[selectedComponent.redirectUid];
    const targetIndex = sanitizedSteps.findIndex((candidate) =>
      stepMatches(routeData, candidate, redirectStep),
    );
    if (targetIndex > startIndex) {
      const redirectedSteps = sanitizedSteps.map((step, index) => {
        if (index > startIndex && index < targetIndex) {
          return markRedirectDisabled(step, selectedComponent.redirectUid || "");
        }
        return clearRedirectDisabledMeta(step);
      });
      return {
        steps: redirectedSteps,
        activeIndex: targetIndex,
      };
    }
  }

  const activeIndex =
    merged[rebuilt.activeIndex] != null
      ? rebuilt.activeIndex
      : Math.max(0, merged.length - 1);

  return {
    steps: merged,
    activeIndex,
  };
}
