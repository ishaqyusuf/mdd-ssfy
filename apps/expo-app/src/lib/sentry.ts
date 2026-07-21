import * as Sentry from "@sentry/react-native";
import * as Updates from "expo-updates";

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
const enabled = process.env.EXPO_PUBLIC_SENTRY_ENABLED === "true";
const debug = process.env.EXPO_PUBLIC_SENTRY_DEBUG === "true";
const environment =
  process.env.EXPO_PUBLIC_APP_VARIANT ??
  process.env.NODE_ENV ??
  "development";

let hasInitializedSentry = false;

export function initSentry() {
  if (hasInitializedSentry || !enabled || !dsn) {
    return;
  }

  Sentry.init({
    dsn,
    enabled,
    debug,
    environment,
    tracesSampleRate: 0.1,
  });

  const scope = Sentry.getGlobalScope();
  scope.setTag("expo-update-id", Updates.updateId ?? "embedded");
  scope.setTag("expo-is-embedded-update", String(Updates.isEmbeddedLaunch));
  scope.setTag("expo-runtime-version", Updates.runtimeVersion ?? "unknown");

  hasInitializedSentry = true;
}

export { Sentry };
