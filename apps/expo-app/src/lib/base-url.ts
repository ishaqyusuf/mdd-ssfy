import Constants from "expo-constants";

const DEFAULT_PORTLESS_APP_PORT = "4000";

const getPortlessAppPort = () =>
  process.env.EXPO_PUBLIC_PORTLESS_APP_PORT ??
  process.env.PORTLESS_APP_PORT ??
  DEFAULT_PORTLESS_APP_PORT;

/**
 * Extend this function when going to production by
 * setting the baseUrl to your production API URL.
 */
export const getBaseUrl = () => {
  /**
   * Gets the IP address of your host-machine. If it cannot automatically find it,
   * you'll have to manually set it. NOTE: The default web app port is driven by
   * PORTLESS_APP_PORT / EXPO_PUBLIC_PORTLESS_APP_PORT and falls back to 4000.
   *
   * **NOTE**: This is only for development. In production, you'll want to set the
   * baseUrl to your production API URL.
   */
  // return process.env.EXPO_PUBLIC_BASE_URL;
  if (process.env.EXPO_PUBLIC_APP_VARIANT === "preview")
    return process.env.EXPO_PUBLIC_BASE_URL;

  const debuggerHost = Constants.expoConfig?.hostUri;
  const localhost = debuggerHost?.split(":")[0];

  if (!localhost) {
    // return "https://turbo.t3.gg";
    throw new Error(
      "Failed to get localhost. Please point to your production server.",
    );
  }

  return `http://${localhost}:${getPortlessAppPort()}`;
};
export const getWebUrl = () => {
  const debuggerHost = Constants.expoConfig?.hostUri;
  const localhost = debuggerHost?.split(":")[0];

  if (!localhost) {
    // return "https://turbo.t3.gg";
    throw new Error(
      "Failed to get localhost. Please point to your production server.",
    );
  }

  return `http://${localhost}:${getPortlessAppPort()}`;
};
