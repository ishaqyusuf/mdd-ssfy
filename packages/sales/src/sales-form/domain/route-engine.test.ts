import { describe, expect, it } from "bun:test";
import {
  applyRouteRecursion,
  buildConfiguredRouteSteps,
  mergeConfiguredSeriesWithExisting,
  resolveNextStep,
} from "./route-engine";

const routeData = {
  composedRouter: {
    rootA: {
      routeSequence: [{ uid: "stepB" }, { uid: "stepC" }],
      route: {
        rootStep: "stepB",
        stepB: "stepC",
      },
    },
  },
  stepsByUid: {
    rootStep: {
      id: 1,
      uid: "rootStep",
      title: "Item Type",
      components: [{ uid: "rootA", id: 11, title: "Door" }],
    },
    stepB: {
      id: 2,
      uid: "stepB",
      title: "Height",
      components: [{ uid: "h-80", id: 21, title: "8-0" }],
    },
    stepC: {
      id: 3,
      uid: "stepC",
      title: "Line Item",
      components: [{ uid: "manual", id: 31, title: "Manual" }],
    },
  },
  stepsById: {
    1: "rootStep",
    2: "stepB",
    3: "stepC",
  },
};

describe("route-engine domain", () => {
  it("builds configured route sequence from root component", () => {
    const steps = buildConfiguredRouteSteps(routeData, routeData.stepsByUid.rootStep, {
      uid: "rootA",
      id: 11,
      title: "Door",
    });
    expect(steps).toHaveLength(3);
    expect(steps[0].step.uid).toBe("rootStep");
    expect(steps[1].step.uid).toBe("stepB");
    expect(steps[2].step.uid).toBe("stepC");
  });

  it("merges configured series with existing step selections", () => {
    const configured = buildConfiguredRouteSteps(
      routeData,
      routeData.stepsByUid.rootStep,
      { uid: "rootA", id: 11, title: "Door" },
    );
    const merged = mergeConfiguredSeriesWithExisting(
      configured,
      configured.map((step) => ({ ...step })),
    );
    expect(merged).toHaveLength(3);
  });

  it("auto-advances through single-candidate route steps", () => {
    const seeded = buildConfiguredRouteSteps(
      routeData,
      routeData.stepsByUid.rootStep,
      { uid: "rootA", id: 11, title: "Door" },
    );
    const routed = applyRouteRecursion({
      routeData,
      line: { meta: {} },
      steps: seeded,
      startIndex: 0,
      selectedComponent: { uid: "rootA", title: "Door" },
    });
    expect(routed.steps.length).toBeGreaterThanOrEqual(3);
  });

  it("falls back to prior route-mapped steps when current step mapping is missing", () => {
    const fallbackRouteData = {
      composedRouter: {
        rootA: {
          route: {
            rootStep: "stepC",
          },
        },
      },
      stepsByUid: {
        rootStep: {
          id: 1,
          uid: "rootStep",
          title: "Item Type",
          components: [{ uid: "rootA", id: 11, title: "Door" }],
        },
        stepB: {
          id: 2,
          uid: "stepB",
          title: "Height",
          components: [{ uid: "h-80", id: 21, title: "8-0" }],
        },
        stepC: {
          id: 3,
          uid: "stepC",
          title: "Width",
          components: [{ uid: "w-30", id: 31, title: "3-0" }],
        },
      },
      stepsById: {
        1: "rootStep",
        2: "stepB",
        3: "stepC",
      },
    };

    const steps = [
      {
        stepId: 1,
        prodUid: "rootA",
        value: "Door",
        step: { id: 1, uid: "rootStep", title: "Item Type" },
      },
      {
        stepId: 2,
        prodUid: "h-80",
        value: "8-0",
        step: { id: 2, uid: "stepB", title: "Height" },
      },
    ];

    const next = resolveNextStep({
      routeData: fallbackRouteData,
      line: { meta: {} },
      steps,
      currentStepIndex: 1,
      selectedComponent: { uid: "h-80", title: "8-0" },
    });

    expect(next?.uid).toBe("stepC");
  });

  it("auto-advances across hidden route steps with no components", () => {
    const hiddenRouteData = {
      composedRouter: {
        rootA: {
          route: {
            rootStep: "hiddenStep",
            hiddenStep: "stepC",
          },
        },
      },
      stepsByUid: {
        rootStep: {
          id: 1,
          uid: "rootStep",
          title: "Item Type",
          components: [{ uid: "rootA", id: 11, title: "Door" }],
        },
        hiddenStep: {
          id: 2,
          uid: "hiddenStep",
          title: "Hidden Step",
          components: [],
        },
        stepC: {
          id: 3,
          uid: "stepC",
          title: "Final Step",
          components: [{ uid: "final", id: 31, title: "Final Option" }],
        },
      },
      stepsById: {
        1: "rootStep",
        2: "hiddenStep",
        3: "stepC",
      },
    };

    const seeded = [
      {
        stepId: 1,
        prodUid: "rootA",
        value: "Door",
        step: { id: 1, uid: "rootStep", title: "Item Type" },
      },
    ];
    const routed = applyRouteRecursion({
      routeData: hiddenRouteData,
      line: { meta: {} },
      steps: seeded,
      startIndex: 0,
      selectedComponent: { uid: "rootA", title: "Door" },
    });

    const stepUids = routed.steps.map((step: any) => step?.step?.uid);
    expect(stepUids).toContain("hiddenStep");
    expect(stepUids).toContain("stepC");
  });
});
