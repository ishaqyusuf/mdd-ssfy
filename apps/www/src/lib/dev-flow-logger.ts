"use client";

type FlowMeta = {
    feature: string;
    threadContext: string;
    tags?: string[];
    inputs?: Record<string, unknown>;
};

type FlowHandle = {
    flowId: string;
    feature: string;
    threadContext: string;
    tags: string[];
    startedAt: string;
};

type FlowEvent = {
    stage: string;
    eventType: string;
    inputs?: Record<string, unknown>;
    derived?: Record<string, unknown>;
    outputs?: Record<string, unknown>;
    error?: unknown;
};

const DEV_ENABLED = process.env.NODE_ENV === "development";

function safeSerialize(value: unknown) {
    try {
        return JSON.parse(JSON.stringify(value));
    } catch {
        return value;
    }
}

function writeLog(flow: FlowHandle, event: FlowEvent) {
    if (!DEV_ENABLED) return;
    try {
        console.log(
            JSON.stringify({
                logId: `${flow.feature}-${event.eventType}`,
                timestamp: new Date().toISOString(),
                threadContext: flow.threadContext,
                feature: flow.feature,
                correlationId: flow.flowId,
                eventType: event.eventType,
                stage: event.stage,
                inputs: safeSerialize(event.inputs || {}),
                derived: safeSerialize(event.derived || {}),
                outputs: safeSerialize(event.outputs || {}),
                error: event.error
                    ? safeSerialize({
                          message:
                              event.error instanceof Error
                                  ? event.error.message
                                  : String(event.error),
                          stack:
                              event.error instanceof Error
                                  ? event.error.stack
                                  : undefined,
                      })
                    : undefined,
                tags: flow.tags,
            }),
        );
    } catch {}
}

export function startFlow(meta: FlowMeta): FlowHandle {
    const flow: FlowHandle = {
        flowId: `flow_${Math.random().toString(36).slice(2, 10)}`,
        feature: meta.feature,
        threadContext: meta.threadContext,
        tags: meta.tags || ["debug", "dev-only"],
        startedAt: new Date().toISOString(),
    };
    writeLog(flow, {
        stage: "ui",
        eventType: "flow.start",
        inputs: meta.inputs,
    });
    return flow;
}

export function logStage(flow: FlowHandle, event: FlowEvent) {
    writeLog(flow, event);
}

export function logError(flow: FlowHandle, eventType: string, error: unknown) {
    writeLog(flow, {
        stage: "error",
        eventType,
        error,
    });
}

export function endFlow(flow: FlowHandle, outputs?: Record<string, unknown>) {
    writeLog(flow, {
        stage: "ui",
        eventType: "flow.end",
        outputs,
    });
}
