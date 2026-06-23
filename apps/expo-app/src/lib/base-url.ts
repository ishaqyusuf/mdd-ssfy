import Constants from "expo-constants";

const DEFAULT_WEB_APP_PORT = "3000";

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

/**
 * Extend this function when going to production by
 * setting the baseUrl to your production API URL.
 */
export const getBaseUrl = () => {
  /**
   * Gets the IP address of your host-machine. If it cannot automatically find it,
   * you'll have to manually set it. NOTE: The default web app port is driven by
   * PORTLESS_APP_PORT / EXPO_PUBLIC_PORTLESS_APP_PORT and falls back to 3000.
   *
   * **NOTE**: This is only for development. In production, you'll want to set the
   * baseUrl to your production API URL.
   */
  // return process.env.EXPO_PUBLIC_BASE_URL;
  if (process.env.EXPO_PUBLIC_APP_VARIANT === "preview")
    return process.env.EXPO_PUBLIC_BASE_URL;

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
  if (process.env.EXPO_PUBLIC_WEB_URL) {
    return resolveReachableLocalUrl(process.env.EXPO_PUBLIC_WEB_URL);
  }

  if (
    process.env.EXPO_PUBLIC_APP_VARIANT === "preview" &&
    process.env.EXPO_PUBLIC_BASE_URL
  ) {
    return process.env.EXPO_PUBLIC_BASE_URL.replace(/\/$/, "");
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
