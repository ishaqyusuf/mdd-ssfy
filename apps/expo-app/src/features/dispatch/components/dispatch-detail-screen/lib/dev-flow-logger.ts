import { getBaseUrl } from "@/lib/base-url";
import { getSessionProfile, getToken } from "@/lib/session-store";
import {
  createDevFlowLogger,
  isDevLoggingEnabled,
  type DevFlowContext,
  type DevFlowMeta,
  type DevLogEntry,
  type DevLogStageEvent,
} from "@gnd/dev-logger";

async function sendToApi(entry: DevLogEntry) {
  try {
    const token = getToken();
    const profile = getSessionProfile();
    const authValue = token
      ? `Bearer ${token}|${profile?.user?.id || ""}`
      : undefined;
    await fetch(`${getBaseUrl()}/api/dev-logger`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authValue ? { "x-app-authorization": authValue } : {}),
      },
      body: JSON.stringify({ entry }),
    });
  } catch {
    // Never allow logger transport errors to affect app behavior.
  }
}

const logger = createDevFlowLogger({
  isEnabled: () =>
    isDevLoggingEnabled({
      runtimeDev: !!__DEV__ || process.env.NODE_ENV === "development",
      flag: process.env.EXPO_PUBLIC_DEBUG_LOGGER,
    }),
  emit: (entry) => {
    try {
      console.log("[dispatch-debug]", JSON.stringify(entry));
    } catch {
      // Ignore console serialization failure.
    }
    void sendToApi(entry);
  },
});

export function startFlow(meta: DevFlowMeta): DevFlowContext | null {
  return logger.startFlow(meta);
}

export function logStage(flow: DevFlowContext | null, event: DevLogStageEvent) {
  logger.logStage(flow, event);
}

export function logError(
  flow: DevFlowContext | null,
  stage: string,
  error: unknown,
  inputs?: Record<string, unknown>,
) {
  logger.logError(flow, stage, error, inputs);
}

export function endFlow(
  flow: DevFlowContext | null,
  outputs?: Record<string, unknown>,
) {
  logger.endFlow(flow, outputs);
}
