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

function writeLog(_flow: FlowHandle, _event: FlowEvent) {
    return;
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

export function endFlow(flow: FlowHandle, outputs?: Record<string, unknown>) {
    writeLog(flow, {
        stage: "ui",
        eventType: "flow.end",
        outputs,
    });
}
