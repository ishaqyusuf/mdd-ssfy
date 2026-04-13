import type { Db } from "@gnd/db";

type ScopeReason =
  | "root-step"
  | "route-sequence"
  | "redirect"
  | "variation-step"
  | "price-step"
  | "dependency-step"
  | "width-height-support";

type StepRecord = Awaited<
  ReturnType<typeof loadStepsForImportScope>
>[number];

function safeRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function addReason(
  reasonsByStepUid: Record<string, ScopeReason[]>,
  stepUid: string | null | undefined,
  reason: ScopeReason,
) {
  if (!stepUid) return;
  reasonsByStepUid[stepUid] ||= [];
  if (!reasonsByStepUid[stepUid].includes(reason)) {
    reasonsByStepUid[stepUid].push(reason);
  }
}

function parseRouteMeta(settingMeta?: unknown) {
  const settingsMeta = safeRecord(settingMeta);
  const nestedRouteData = safeRecord(settingsMeta.data);
  const rawRoute = safeRecord(
    Object.keys(safeRecord(settingsMeta.route)).length
      ? settingsMeta.route
      : nestedRouteData.route,
  );

  const composedRouter: Record<
    string,
    {
      routeSequence: Array<{ uid: string }>;
      externalRouteSequence: Array<{ uid: string }>;
      route: Record<string, string>;
    }
  > = {};

  for (const [rootUid, routeDef] of Object.entries(rawRoute)) {
    const routeObj = safeRecord(routeDef);
    const routeSequence = Array.isArray(routeObj.routeSequence)
      ? routeObj.routeSequence
          .map((entry) => safeRecord(entry))
          .map((entry) => ({ uid: String(entry.uid || "") }))
          .filter((entry) => !!entry.uid)
      : [];
    const externalRouteSequence = Array.isArray(routeObj.externalRouteSequence)
      ? routeObj.externalRouteSequence
          .map((entry) => safeRecord(entry))
          .map((entry) => ({ uid: String(entry.uid || "") }))
          .filter((entry) => !!entry.uid)
      : [];
    const route: Record<string, string> = {};
    let current = rootUid;
    for (const next of routeSequence) {
      route[current] = next.uid;
      current = next.uid;
    }
    composedRouter[rootUid] = {
      routeSequence,
      externalRouteSequence,
      route,
    };
  }

  return {
    settingsMeta,
    composedRouter,
    configuredRootComponentUids: Object.keys(composedRouter),
  };
}

async function loadStepsForImportScope(db: Db) {
  return db.dykeSteps.findMany({
    where: {
      deletedAt: null,
    },
    select: {
      id: true,
      uid: true,
      title: true,
      stepProducts: {
        where: {
          deletedAt: null,
          uid: { not: null },
        },
        select: {
          uid: true,
          redirectUid: true,
          meta: true,
        },
      },
      priceSystem: {
        where: { deletedAt: null },
        select: {
          stepProductUid: true,
          dependenciesUid: true,
          step: { select: { uid: true } },
        },
      },
    },
    orderBy: {
      id: "asc",
    },
  });
}

export type ActiveInventoryImportScope = {
  rootComponentUids: string[];
  rootStepUid: string | null;
  activeStepUids: string[];
  activeStepIds: number[];
  dependencyStepUids: string[];
  excludedStepUids: string[];
  staleImportedCategoryUids: string[];
  reasonsByStepUid: Record<string, ScopeReason[]>;
};

export async function resolveActiveInventoryImportScope(
  db: Db,
): Promise<ActiveInventoryImportScope> {
  const [setting, steps, importedCategories] = await Promise.all([
    db.settings.findFirst({
      where: {
        type: "sales-settings",
      },
      select: {
        meta: true,
      },
    }),
    loadStepsForImportScope(db),
    db.inventoryCategory.findMany({
      select: {
        uid: true,
      },
    }),
  ]);

  const { composedRouter, configuredRootComponentUids } = parseRouteMeta(
    setting?.meta,
  );

  const stepsByUid = Object.fromEntries(
    steps.filter((step) => !!step.uid).map((step) => [step.uid!, step]),
  ) as Record<string, StepRecord>;

  const productOwnerByUid: Record<string, string> = {};
  for (const step of steps) {
    const stepUid = step.uid || null;
    if (!stepUid) continue;
    for (const product of step.stepProducts) {
      if (!product.uid || productOwnerByUid[product.uid]) continue;
      productOwnerByUid[product.uid] = stepUid;
    }
  }

  const rootStepFromRoute =
    steps
      .filter((step) => !!step.uid)
      .map((step) => ({
        step,
        score: step.stepProducts.filter((product) =>
          configuredRootComponentUids.includes(product.uid || ""),
        ).length,
      }))
      .sort((a, b) => b.score - a.score)[0] || null;

  const rootStep =
    (rootStepFromRoute && rootStepFromRoute.score > 0
      ? rootStepFromRoute.step
      : null) ||
    steps.find((step) => step.id === 1) ||
    null;

  const reasonsByStepUid: Record<string, ScopeReason[]> = {};
  const baseStepUids = new Set<string>();

  if (rootStep?.uid) {
    baseStepUids.add(rootStep.uid);
    addReason(reasonsByStepUid, rootStep.uid, "root-step");
  }

  for (const routeDef of Object.values(composedRouter)) {
    for (const step of routeDef.routeSequence) {
      if (!step.uid) continue;
      baseStepUids.add(step.uid);
      addReason(reasonsByStepUid, step.uid, "route-sequence");
    }
    for (const step of routeDef.externalRouteSequence) {
      if (!step.uid) continue;
      baseStepUids.add(step.uid);
      addReason(reasonsByStepUid, step.uid, "route-sequence");
    }
  }

  const visited = new Set<string>();
  const queue = Array.from(baseStepUids);

  while (queue.length) {
    const stepUid = queue.shift()!;
    if (visited.has(stepUid)) continue;
    visited.add(stepUid);

    const step = stepsByUid[stepUid];
    if (!step) continue;

    for (const product of step.stepProducts || []) {
      if (product.redirectUid && !visited.has(product.redirectUid)) {
        queue.push(product.redirectUid);
        addReason(reasonsByStepUid, product.redirectUid, "redirect");
      }

      const meta = safeRecord(product.meta);
      const variations = Array.isArray(meta.variations) ? meta.variations : [];
      for (const variation of variations) {
        const rules = Array.isArray(safeRecord(variation).rules)
          ? (safeRecord(variation).rules as unknown[])
          : [];
        for (const rule of rules) {
          const stepRef = String(safeRecord(rule).stepUid || "");
          if (stepRef && !visited.has(stepRef)) {
            queue.push(stepRef);
            addReason(reasonsByStepUid, stepRef, "variation-step");
          }
        }
      }
    }

    for (const pricing of step.priceSystem || []) {
      const priceStepUid = pricing.step?.uid || null;
      if (priceStepUid && !visited.has(priceStepUid)) {
        queue.push(priceStepUid);
        addReason(reasonsByStepUid, priceStepUid, "price-step");
      }

      const rawDep = pricing.dependenciesUid || pricing.stepProductUid || "";
      for (const token of rawDep.split("-").filter(Boolean)) {
        const ownerStepUid = productOwnerByUid[token];
        if (ownerStepUid && !visited.has(ownerStepUid)) {
          queue.push(ownerStepUid);
          addReason(reasonsByStepUid, ownerStepUid, "dependency-step");
        }
        if (token.startsWith("w")) {
          const widthStep = steps.find((candidate) => candidate.title === "Width");
          if (widthStep?.uid && !visited.has(widthStep.uid)) {
            queue.push(widthStep.uid);
            addReason(reasonsByStepUid, widthStep.uid, "width-height-support");
          }
        }
        if (token.startsWith("h")) {
          const heightStep = steps.find(
            (candidate) => candidate.title === "Height",
          );
          if (heightStep?.uid && !visited.has(heightStep.uid)) {
            queue.push(heightStep.uid);
            addReason(reasonsByStepUid, heightStep.uid, "width-height-support");
          }
        }
      }
    }
  }

  const activeStepUids = Array.from(visited);
  const activeStepIdSet = new Set(
    activeStepUids
      .map((uid) => stepsByUid[uid]?.id)
      .filter((id): id is number => typeof id === "number"),
  );
  const allStepUids = steps
    .map((step) => step.uid)
    .filter((uid): uid is string => !!uid);
  const excludedStepUids = allStepUids.filter((uid) => !visited.has(uid));
  const dependencyStepUids = activeStepUids.filter((uid) => !baseStepUids.has(uid));
  const importedCategoryUidSet = new Set(
    importedCategories.map((category) => category.uid).filter(Boolean),
  );
  const staleImportedCategoryUids = excludedStepUids.filter((uid) =>
    importedCategoryUidSet.has(uid),
  );

  return {
    rootComponentUids: configuredRootComponentUids,
    rootStepUid: rootStep?.uid || null,
    activeStepUids,
    activeStepIds: Array.from(activeStepIdSet),
    dependencyStepUids,
    excludedStepUids,
    staleImportedCategoryUids,
    reasonsByStepUid,
  };
}
