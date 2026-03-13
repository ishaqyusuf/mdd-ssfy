export type DevLogEventType =
  | "flow.start"
  | "validation.pre"
  | "payload.transformed"
  | "request.sent"
  | "response.received"
  | "error.caught"
  | "flow.end";

export type DevLogStageEvent = {
  eventType: DevLogEventType;
  stage: string;
  inputs?: Record<string, unknown>;
  derived?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  error?: { message?: string; stack?: string };
};

export type DevFlowMeta = {
  threadContext: string;
  feature: string;
  tags?: string[];
  inputs?: Record<string, unknown>;
};

export type DevFlowContext = {
  flowId: string;
  startedAt: string;
  threadContext: string;
  feature: string;
  tags: string[];
};

export type DevLogEntry = {
  logId: string;
  timestamp: string;
  threadContext: string;
  feature: string;
  correlationId: string;
  eventType: DevLogEventType;
  stage: string;
  inputs?: Record<string, unknown>;
  derived?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  error?: { message?: string; stack?: string };
  tags: string[];
};

export type DevLogEmitter = (entry: DevLogEntry) => void | Promise<void>;

const SENSITIVE_KEYS = [
  "password",
  "secret",
  "token",
  "authorization",
  "cookie",
  "apikey",
  "api_key",
  "access_token",
  "refresh_token",
];

function nowIso() {
  return new Date().toISOString();
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

function safeJson(value: unknown) {
  try {
    return JSON.parse(JSON.stringify(value)) as unknown;
  } catch {
    return { unstringifiable: true };
  }
}

function redact(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(redact);
  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const lower = key.toLowerCase();
    if (SENSITIVE_KEYS.some((s) => lower.includes(s))) {
      out[key] = "[REDACTED]";
      continue;
    }
    out[key] = redact(raw);
  }
  return out;
}

export function isDevLoggingEnabled(opts?: {
  runtimeDev?: boolean;
  flag?: string | boolean | null | undefined;
}) {
  const runtimeDev = opts?.runtimeDev ?? false;
  const rawFlag = opts?.flag;
  if (rawFlag === false) return false;
  if (typeof rawFlag === "string") {
    const normalized = rawFlag.trim().toLowerCase();
    if (normalized === "0" || normalized === "false" || normalized === "off") {
      return false;
    }
  }
  return runtimeDev;
}

export function createDevFlowLogger(config: {
  isEnabled: () => boolean;
  emit: DevLogEmitter;
}) {
  const emitSafe = (entry: DevLogEntry) => {
    if (!config.isEnabled()) return;
    try {
      const maybe = config.emit(entry);
      if (maybe && typeof (maybe as Promise<void>).catch === "function") {
        (maybe as Promise<void>).catch(() => undefined);
      }
    } catch {
      // Never allow logging failures to break app flow.
    }
  };

  const emitEvent = (flow: DevFlowContext, event: DevLogStageEvent) => {
    const entry: DevLogEntry = {
      logId: `${flow.flowId}:${event.eventType}:${event.stage}:${randomSuffix()}`,
      timestamp: nowIso(),
      threadContext: flow.threadContext,
      feature: flow.feature,
      correlationId: flow.flowId,
      eventType: event.eventType,
      stage: event.stage,
      inputs: redact(safeJson(event.inputs || {})) as Record<string, unknown>,
      derived: redact(safeJson(event.derived || {})) as Record<string, unknown>,
      outputs: redact(safeJson(event.outputs || {})) as Record<string, unknown>,
      error: event.error
        ? (redact(
            safeJson({
              message: event.error.message || "",
              stack: event.error.stack || "",
            }),
          ) as { message?: string; stack?: string })
        : undefined,
      tags: ["debug", "dev-only", ...(flow.tags || [])],
    };
    emitSafe(entry);
  };

  const startFlow = (meta: DevFlowMeta): DevFlowContext | null => {
    if (!config.isEnabled()) return null;
    const flow: DevFlowContext = {
      flowId: `${meta.feature.replace(/\W+/g, "-")}-${Date.now()}-${randomSuffix()}`,
      startedAt: nowIso(),
      threadContext: meta.threadContext,
      feature: meta.feature,
      tags: meta.tags || [],
    };
    emitEvent(flow, {
      eventType: "flow.start",
      stage: "entry",
      inputs: meta.inputs,
    });
    return flow;
  };

  const logStage = (flow: DevFlowContext | null, event: DevLogStageEvent) => {
    if (!flow) return;
    emitEvent(flow, event);
  };

  const logError = (
    flow: DevFlowContext | null,
    stage: string,
    error: unknown,
    inputs?: Record<string, unknown>,
  ) => {
    if (!flow) return;
    const e = error as Error;
    emitEvent(flow, {
      eventType: "error.caught",
      stage,
      inputs,
      error: {
        message: e?.message || String(error || "Unknown error"),
        stack: e?.stack,
      },
    });
  };

  const endFlow = (
    flow: DevFlowContext | null,
    outputs?: Record<string, unknown>,
  ) => {
    if (!flow) return;
    emitEvent(flow, {
      eventType: "flow.end",
      stage: "exit",
      outputs: {
        ...outputs,
        durationMs: Date.now() - new Date(flow.startedAt).getTime(),
      },
    });
  };

  return {
    startFlow,
    logStage,
    logError,
    endFlow,
  };
}
