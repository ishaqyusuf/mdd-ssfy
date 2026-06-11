import { RedisCache } from "./redis-client";

type StepComponentsCacheInput = {
  stepTitle?: string | null;
  title?: string | null;
  stepId?: number | null;
  id?: number | null;
  ids?: number[] | null;
  isCustom?: boolean | null;
};

type StepComponentCacheRow = {
  id?: number | null;
  uid?: string | null;
  stepId?: number | null;
  stepUid?: string | null;
};

const STEP_COMPONENTS_TTL = 24 * 60 * 60;
const STEP_ROUTING_TTL = 6 * 60 * 60;
const INDEX_TTL = 48 * 60 * 60;

const cache = new RedisCache("sales-workflow", STEP_COMPONENTS_TTL);

function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function normalizeStepComponentsInput(input: StepComponentsCacheInput = {}) {
  return {
    id: input.id || null,
    ids: Array.isArray(input.ids)
      ? [...new Set(input.ids.map(Number).filter(Number.isFinite))].sort(
          (a, b) => a - b,
        )
      : null,
    isCustom: input.isCustom === true ? true : null,
    stepId: input.stepId || null,
    stepTitle: input.stepTitle?.trim() || null,
    title: input.title?.trim() || null,
  };
}

function hasCacheableStepComponentsInput(
  input: ReturnType<typeof normalizeStepComponentsInput>,
) {
  return Boolean(
    input.id ||
      input.ids?.length ||
      input.isCustom ||
      input.stepId ||
      input.stepTitle ||
      input.title,
  );
}

function stepComponentsKey(input: StepComponentsCacheInput) {
  return `step-components:${hash(
    JSON.stringify(normalizeStepComponentsInput(input)),
  )}`;
}

const stepRoutingKey = "step-routing:v1";

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

async function addKeyToIndex(indexKey: string, key: string) {
  const keys = (await cache.get<string[]>(indexKey)) || [];
  if (keys.includes(key)) return;
  await cache.set(indexKey, [...keys, key], INDEX_TTL);
}

async function invalidateIndex(indexKey: string) {
  const keys = (await cache.get<string[]>(indexKey)) || [];
  await Promise.all(unique(keys).map((key) => cache.delete(key)));
  await cache.delete(indexKey);
}

async function trackStepComponentKey(
  key: string,
  input: ReturnType<typeof normalizeStepComponentsInput>,
  rows: StepComponentCacheRow[],
) {
  const indexKeys = new Set<string>(["index:step-components:all"]);

  if (input.stepId) indexKeys.add(`index:step-components:step:${input.stepId}`);
  if (input.stepTitle) {
    indexKeys.add(`index:step-components:family:${input.stepTitle}`);
  }
  if (input.id) indexKeys.add(`index:step-components:component-id:${input.id}`);
  for (const id of input.ids || []) {
    indexKeys.add(`index:step-components:component-id:${id}`);
  }

  for (const row of rows) {
    if (row.stepId) {
      indexKeys.add(`index:step-components:step:${row.stepId}`);
    }
    if (row.id) {
      indexKeys.add(`index:step-components:component-id:${row.id}`);
    }
    if (row.uid) {
      indexKeys.add(`index:step-components:component-uid:${row.uid}`);
    }
  }

  await Promise.all([...indexKeys].map((indexKey) => addKeyToIndex(indexKey, key)));
}

export const salesWorkflowCache = {
  getStepComponents: async <T>(
    input: StepComponentsCacheInput,
  ): Promise<T | undefined> => {
    const normalized = normalizeStepComponentsInput(input);
    if (!hasCacheableStepComponentsInput(normalized)) return undefined;
    return cache.get<T>(stepComponentsKey(normalized));
  },

  setStepComponents: async (
    input: StepComponentsCacheInput,
    rows: StepComponentCacheRow[],
    ttl = STEP_COMPONENTS_TTL,
  ): Promise<void> => {
    const normalized = normalizeStepComponentsInput(input);
    if (!hasCacheableStepComponentsInput(normalized)) return;
    const key = stepComponentsKey(normalized);
    await cache.set(key, rows, ttl);
    await trackStepComponentKey(key, normalized, rows);
  },

  getOrSetStepRouting: async <T>(fn: () => Promise<T>): Promise<T> => {
    const cached = await cache.get<T>(stepRoutingKey);
    if (cached !== undefined) return cached;
    const result = await fn();
    await cache.set(stepRoutingKey, result, STEP_ROUTING_TTL);
    return result;
  },

  invalidateStepRouting: async (): Promise<void> => {
    await cache.delete(stepRoutingKey);
  },

  invalidateStepComponentsForStep: async (
    stepId?: number | null,
  ): Promise<void> => {
    if (!stepId) return;
    await invalidateIndex(`index:step-components:step:${stepId}`);
  },

  invalidateStepComponentsForFamily: async (
    stepTitle?: string | null,
  ): Promise<void> => {
    const normalized = stepTitle?.trim();
    if (!normalized) return;
    await invalidateIndex(`index:step-components:family:${normalized}`);
  },

  invalidateStepComponentsForComponentId: async (
    componentId?: number | null,
  ): Promise<void> => {
    if (!componentId) return;
    await invalidateIndex(`index:step-components:component-id:${componentId}`);
  },

  invalidateStepComponentsForComponentUid: async (
    componentUid?: string | null,
  ): Promise<void> => {
    const normalized = componentUid?.trim();
    if (!normalized) return;
    await invalidateIndex(`index:step-components:component-uid:${normalized}`);
  },

  invalidateAllStepComponents: async (): Promise<void> => {
    await invalidateIndex("index:step-components:all");
  },
};
