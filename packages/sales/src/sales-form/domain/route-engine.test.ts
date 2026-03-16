import { describe, expect, it } from "bun:test";
import {
  applyRouteRecursion,
  buildConfiguredRouteSteps,
  mergeConfiguredSeriesWithExisting,
  rebuildStepsFromSelection,
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

  it("preserves configured step meta when seeding route steps", () => {
    const routeWithMeta = {
      ...routeData,
      stepsByUid: {
        ...routeData.stepsByUid,
        stepC: {
          ...routeData.stepsByUid.stepC,
          meta: {
            doorSizeVariation: [
              {
                rules: [],
                widthList: ["1-10"],
              },
            ],
          },
        },
      },
    };

    const steps = buildConfiguredRouteSteps(
      routeWithMeta,
      routeWithMeta.stepsByUid.rootStep,
      {
        uid: "rootA",
        id: 11,
        title: "Door",
      },
    );

    expect(steps[2]?.meta?.doorSizeVariation).toEqual([
      {
        rules: [],
        widthList: ["1-10"],
      },
    ]);
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

  it("disables skipped downstream steps when a redirect changes the route", () => {
    const redirectRouteData = {
      composedRouter: {
        rootA: {
          route: {
            rootStep: "stepB",
            stepB: "stepC",
            stepC: "stepD",
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
          title: "Casing Y/N",
          components: [
            { uid: "yes-casing", id: 21, title: "Yes Casing" },
            { uid: "no-casing", id: 22, title: "No Casing", redirectUid: "stepD" },
          ],
        },
        stepC: {
          id: 3,
          uid: "stepC",
          title: "Casing",
          components: [{ uid: "casing-a", id: 31, title: "Colonial" }],
        },
        stepD: {
          id: 4,
          uid: "stepD",
          title: "House Package Tool",
          components: [{ uid: "hpt", id: 41, title: "HPT" }],
        },
      },
      stepsById: {
        1: "rootStep",
        2: "stepB",
        3: "stepC",
        4: "stepD",
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
        prodUid: "yes-casing",
        value: "Yes Casing",
        step: { id: 2, uid: "stepB", title: "Casing Y/N" },
      },
      {
        stepId: 3,
        prodUid: "casing-a",
        value: "Colonial",
        meta: { preserved: true },
        step: { id: 3, uid: "stepC", title: "Casing" },
      },
      {
        stepId: 4,
        prodUid: "hpt",
        value: "HPT",
        step: { id: 4, uid: "stepD", title: "House Package Tool" },
      },
    ];

    const rebuilt = rebuildStepsFromSelection({
      routeData: redirectRouteData,
      line: { meta: {} },
      steps,
      startIndex: 1,
      selectedComponent: {
        uid: "no-casing",
        title: "No Casing",
        redirectUid: "stepD",
      },
    });

    expect(rebuilt.steps.map((step: any) => step.step.uid)).toEqual([
      "rootStep",
      "stepB",
      "stepC",
      "stepD",
    ]);
    expect(rebuilt.steps[2]?.meta?.redirectDisabled).toBe(true);
    expect(rebuilt.steps[2]?.meta?.redirectTargetUid).toBe("stepD");
    expect(rebuilt.activeIndex).toBe(3);
  });

  it("restores skipped steps when redirecting component changes back", () => {
    const redirectRouteData = {
      composedRouter: {
        rootA: {
          routeSequence: [{ uid: "stepB" }, { uid: "stepC" }, { uid: "stepD" }],
          route: {
            rootStep: "stepB",
            stepB: "stepC",
            stepC: "stepD",
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
          title: "Casing Y/N",
          components: [
            { uid: "yes-casing", id: 21, title: "Yes Casing" },
            { uid: "no-casing", id: 22, title: "No Casing", redirectUid: "stepD" },
          ],
        },
        stepC: {
          id: 3,
          uid: "stepC",
          title: "Casing",
          components: [{ uid: "casing-a", id: 31, title: "Colonial" }],
        },
        stepD: {
          id: 4,
          uid: "stepD",
          title: "House Package Tool",
          components: [{ uid: "hpt", id: 41, title: "HPT" }],
        },
      },
      stepsById: {
        1: "rootStep",
        2: "stepB",
        3: "stepC",
        4: "stepD",
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
        prodUid: "no-casing",
        value: "No Casing",
        step: { id: 2, uid: "stepB", title: "Casing Y/N" },
      },
      {
        stepId: 3,
        prodUid: "casing-a",
        value: "Colonial",
        meta: { restored: true },
        step: { id: 3, uid: "stepC", title: "Casing" },
      },
      {
        stepId: 4,
        prodUid: "hpt",
        value: "HPT",
        step: { id: 4, uid: "stepD", title: "House Package Tool" },
      },
    ];

    const rebuilt = rebuildStepsFromSelection({
      routeData: redirectRouteData,
      line: { meta: {} },
      steps,
      startIndex: 1,
      selectedComponent: {
        uid: "yes-casing",
        title: "Yes Casing",
      },
    });

    expect(rebuilt.steps.map((step: any) => step.step.uid)).toEqual([
      "rootStep",
      "stepB",
      "stepC",
      "stepD",
    ]);
    expect(rebuilt.steps[2]?.meta?.restored).toBe(true);
    expect(rebuilt.steps[2]?.meta?.redirectDisabled).toBe(false);
    expect(rebuilt.steps[2]?.meta?.redirectTargetUid).toBe(null);
  });
});
