import Constants from "expo-constants";

import { resolveConfiguredReleaseBaseUrl } from "./release-base-url";

const DEFAULT_WEB_APP_PORT = "3010";

const getPortlessAppPort = () =>
  process.env.EXPO_PUBLIC_PORTLESS_APP_PORT ??
  process.env.PORTLESS_APP_PORT ??
  DEFAULT_WEB_APP_PORT;

const getDebuggerHostname = () => {
  const debuggerHost = Constants.expoConfig?.hostUri;
  return debuggerHost?.split(":")[0] ?? null;
};

const localHostnames = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

const resolveReachableLocalUrl = (value: string) => {
  const trimmed = value.replace(/\/$/, "");
  const debuggerHostname = getDebuggerHostname();
  if (!debuggerHostname) return trimmed;

  try {
    const url = new URL(trimmed);
    if (!localHostnames.has(url.hostname)) return trimmed;

    url.hostname = debuggerHostname;
    return url.toString().replace(/\/$/, "");
  } catch {
    return trimmed;
  }
};

const getReleaseBaseUrl = () =>
  resolveConfiguredReleaseBaseUrl({
    appVariant: Constants.expoConfig?.extra?.appVariant,
    envVariant: process.env.EXPO_PUBLIC_APP_VARIANT,
    baseUrl: process.env.EXPO_PUBLIC_BASE_URL,
    isDev: __DEV__,
  });

export const getBaseUrl = () => {
  const releaseBaseUrl = getReleaseBaseUrl();
  if (releaseBaseUrl) return releaseBaseUrl;

  const localhost = getDebuggerHostname();

  if (!localhost) {
    // return "https://turbo.t3.gg";
    throw new Error(
      "Failed to get localhost. Please point to your production server.",
    );
  }

  return `http://${localhost}:${getPortlessAppPort()}`;
};
export const getWebUrl = () => {
  const releaseBaseUrl = getReleaseBaseUrl();
  if (releaseBaseUrl) return releaseBaseUrl;

  if (process.env.EXPO_PUBLIC_WEB_URL) {
    return resolveReachableLocalUrl(process.env.EXPO_PUBLIC_WEB_URL);
  }

  const localhost = getDebuggerHostname();

  if (!localhost) {
    // return "https://turbo.t3.gg";
    throw new Error(
      "Failed to get localhost. Please point to your production server.",
    );
  }

  return `http://${localhost}:${getPortlessAppPort()}`;
};
