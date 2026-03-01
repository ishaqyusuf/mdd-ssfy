import Constants from "expo-constants";

/**
 * Extend this function when going to production by
 * setting the baseUrl to your production API URL.
 */
export const getBaseUrl = () => {
  /**
   * Gets the IP address of your host-machine. If it cannot automatically find it,
   * you'll have to manually set it. NOTE: Port 3000 should work for most but confirm
   * you don't have anything else running on it, or you'd have to change it.
   *
   * **NOTE**: This is only for development. In production, you'll want to set the
   * baseUrl to your production API URL.
   */
  const envBaseUrl = process.env.EXPO_PUBLIC_BASE_URL;
  const useEnvBaseUrl =
    process.env.EXPO_PUBLIC_APP_VARIANT === "preview" ||
    process.env.EXPO_PUBLIC_FORCE_BASE_URL === "true";
  if (useEnvBaseUrl && envBaseUrl) {
    return envBaseUrl;
  }

  const debuggerHost = Constants.expoConfig?.hostUri;
  const localhost = debuggerHost?.split(":")[0];

  if (!localhost) {
    // return "https://turbo.t3.gg";
    throw new Error(
      "Failed to get localhost. Please point to your production server.",
    );
  }

  const apiPort = process.env.EXPO_PUBLIC_API_PORT ?? "3000";
  return `http://${localhost}:${apiPort}`;
};
export const getWebUrl = () => {
  const envBaseUrl = process.env.EXPO_PUBLIC_BASE_URL;
  const useEnvBaseUrl =
    process.env.EXPO_PUBLIC_APP_VARIANT === "preview" ||
    process.env.EXPO_PUBLIC_FORCE_BASE_URL === "true";
  if (useEnvBaseUrl && envBaseUrl) {
    return envBaseUrl;
  }

  const debuggerHost = Constants.expoConfig?.hostUri;
  const localhost = debuggerHost?.split(":")[0];

  if (!localhost) {
    // return "https://turbo.t3.gg";
    throw new Error(
      "Failed to get localhost. Please point to your production server.",
    );
  }

  const apiPort = process.env.EXPO_PUBLIC_API_PORT ?? "3006";
  return `http://${localhost}:${apiPort}`;
};
