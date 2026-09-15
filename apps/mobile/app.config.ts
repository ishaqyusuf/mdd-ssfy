import type { ExpoConfig } from "expo/config";
import { isPublicHttpsOrigin } from "./src/lib/release-base-url";

export const UPDATE_VERSION = "2026.08.17";
const DEFAULT_AUTO_UPDATE_FOREGROUND_COOLDOWN_MS = 5 * 60 * 1000;

const appVariant =
  process.env.APP_VARIANT ??
  process.env.EXPO_PUBLIC_APP_VARIANT ??
  (process.env.EAS_BUILD_PROFILE === "development" ? "development" : undefined);

const normalizedAppVariant = (appVariant ?? "production").toLowerCase();
const normalizedEasBuildProfile =
  process.env.EAS_BUILD_PROFILE?.toLowerCase() ?? "";
const isDevelopmentBuild =
  normalizedAppVariant === "development" || normalizedAppVariant === "dev";
const isDriverPlatformMode =
  isDevelopmentBuild && process.env.EXPO_PUBLIC_DRIVER_PLATFORM_MODE === "true";
const isExplicitReleaseBuild =
  (["preview", "production"].includes(normalizedAppVariant) &&
    appVariant !== undefined) ||
  ["preview", "production"].includes(normalizedEasBuildProfile);
const isExplicitProductionBuild =
  (appVariant !== undefined && normalizedAppVariant === "production") ||
  normalizedEasBuildProfile === "production";
const isExplicitProductionIosBuild =
  isExplicitProductionBuild && process.env.GND_IOS_PUBLIC_RELEASE === "true";
const exposedDevCredentialKeys = [
  "EXPO_PUBLIC_EMAIL",
  "EXPO_PUBLIC_TOK",
].filter((key) => process.env[key]);
const privacyPolicyUrl =
  process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL?.trim() ?? "";

if (privacyPolicyUrl) {
  const parsedPrivacyPolicyUrl = new URL(privacyPolicyUrl);
  if (
    parsedPrivacyPolicyUrl.protocol !== "https:" ||
    !parsedPrivacyPolicyUrl.hostname ||
    parsedPrivacyPolicyUrl.username ||
    parsedPrivacyPolicyUrl.password
  ) {
    throw new Error("EXPO_PUBLIC_PRIVACY_POLICY_URL must be an HTTPS URL.");
  }
}

if (isExplicitReleaseBuild && exposedDevCredentialKeys.length > 0) {
  throw new Error(
    `${exposedDevCredentialKeys.join(", ")} must not be set for preview or production Expo builds.`,
  );
}

export function isHttpsEndpoint(value: string | undefined): boolean {
  if (!value) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

if (isExplicitProductionIosBuild) {
  if (!isPublicHttpsOrigin(process.env.EXPO_PUBLIC_BASE_URL)) {
    throw new Error("Public iOS production builds require a public HTTPS EXPO_PUBLIC_BASE_URL origin.");
  }
  if (
    process.env.EXPO_PUBLIC_SENTRY_DEBUG === "true" ||
    process.env.EXPO_PUBLIC_SENTRY_SMOKE_TEST === "true"
  ) {
    throw new Error("Production Expo builds must disable Sentry debug and smoke-test modes.");
  }
  if (
    process.env.EXPO_PUBLIC_SENTRY_ENABLED === "true" &&
    !isHttpsEndpoint(process.env.EXPO_PUBLIC_SENTRY_DSN)
  ) {
    throw new Error("Enabled production Sentry requires a configured HTTPS DSN.");
  }
  if (
    process.env.EXPO_PUBLIC_LOGLY_ENABLED === "true" &&
    !isHttpsEndpoint(process.env.EXPO_PUBLIC_LOGLY_ENDPOINT)
  ) {
    throw new Error("Enabled production Logly requires a configured HTTPS endpoint.");
  }
}

const variantConfig = isDevelopmentBuild
  ? {
      name: "GND Dev",
      scheme: "gndprodesk-dev",
      iosBundleIdentifier: "com.gnd.prodesk.dev",
      androidPackage: "com.gnd.prodesk.dev",
      iconBackgroundColor: "#DFF7EC",
      splashBackgroundColor: "#F4FFF8",
      splashDarkBackgroundColor: "#042116",
      icons: {
        app: "./assets/icons/dev-loading-icon.png",
        adaptive: "./assets/icons/dev-adaptive-icon.png",
        iosDark: "./assets/icons/dev-ios-dark.png",
        iosLight: "./assets/icons/dev-ios-light.png",
        splashLight: "./assets/icons/dev-splash-logo.png",
        splashDark: "./assets/icons/dev-splash-logo.png",
      },
    }
  : {
      name: "GND Millwork",
      scheme: "gndprodesk",
      iosBundleIdentifier: "com.gnd.prodesk",
      androidPackage: "com.gnd.prodesk",
      iconBackgroundColor: "#E6F4FE",
      splashBackgroundColor: "#ffffff",
      splashDarkBackgroundColor: "#000000",
      icons: {
        app: "./assets/icons/loading-icon.png",
        adaptive: "./assets/icons/adaptive-icon.png",
        iosDark: "./assets/icons/ios-dark.png",
        iosLight: "./assets/icons/ios-light.png",
        splashLight: "./assets/icons/splash-logo.png",
        splashDark: "./assets/icons/splash-logo.png",
      },
    };

const config: ExpoConfig = {
  name: isDriverPlatformMode ? "GND Driver Dev" : variantConfig.name,
  slug: "gnd-prodesk",
  // slug: "prodesk",
  version: "1.0.305",
  orientation: "portrait",
  // icon: "./assets/icons/adaptive-icon.png",
  icon: variantConfig.icons.app,
  // icon: "./assets/images/icon.png",
  scheme: variantConfig.scheme,
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: variantConfig.iosBundleIdentifier,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSPhotoLibraryUsageDescription:
        "GND uses selected photos as employee documents and delivery proof.",
    },
    icon: {
      dark: variantConfig.icons.iosDark,
      light: variantConfig.icons.iosLight,
    },
  },

  android: {
    // buildType: "apk",
    // gradleCommand: ":app:assembleRelease",
    adaptiveIcon: {
      backgroundColor: variantConfig.iconBackgroundColor,
      foregroundImage: variantConfig.icons.adaptive,
    },
    // edgeToEdgeEnabled: false,
    predictiveBackGestureEnabled: false,
    package: variantConfig.androidPackage,
  },

  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },

  plugins: [
    isDriverPlatformMode
      ? ["expo-router", { root: "src/driver-app" }]
      : "expo-router",
    [
      "@sentry/react-native/expo",
      {
        url: "https://sentry.io/",
        organization: process.env.SENTRY_ORG,
        project:
          process.env.SENTRY_PROJECT_MOBILE ?? process.env.SENTRY_PROJECT,
      },
    ],
    "expo-font",
    "expo-web-browser",
    [
      "expo-navigation-bar",
      {
        enforceContrast: false,
      },
    ],
    [
      "expo-splash-screen",
      {
        image: variantConfig.icons.splashLight,
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: variantConfig.splashBackgroundColor,
        dark: {
          backgroundColor: variantConfig.splashDarkBackgroundColor,
          image: variantConfig.icons.splashDark,
        },
      },
    ],
  ],

  experiments: {
    autolinkingModuleResolution: true,
    typedRoutes: true,
    reactCompiler: true,
  },

  extra: {
    appVariant: normalizedAppVariant,
    privacyPolicyUrl,
    devQuickLoginPassword: isExplicitReleaseBuild
      ? ""
      : process.env.EXPO_PUBLIC_TOK ?? "",
    driverPlatformMode: isDriverPlatformMode,
    autoUpdateForegroundCooldownMs:
      process.env.EXPO_PUBLIC_AUTO_UPDATE_FOREGROUND_COOLDOWN_MS ??
      DEFAULT_AUTO_UPDATE_FOREGROUND_COOLDOWN_MS,
    autoUpdateOnForeground:
      process.env.EXPO_PUBLIC_AUTO_UPDATE_ON_FOREGROUND ?? true,
    updateVersion: UPDATE_VERSION,
    router: {},
    eas: {
      projectId: "8ea2eecb-4109-453c-827f-9b2de2e3a9aa", //pcruz321
      // projectId: "1914ffbf-8d95-482a-af7e-e4e30a6206eb", //ishaqyusuf2
      // projectId: "41f31ec0-9c44-4b41-af01-9a23d1b39d83", //ishaqyusuf
    },
  },
  owner: "pcruz321",
  // owner: "ishaqyusuf2",
  updates: {
    url: "https://u.expo.dev/8ea2eecb-4109-453c-827f-9b2de2e3a9aa", //pcruz321
    // url: "https://u.expo.dev/41f31ec0-9c44-4b41-af01-9a23d1b39d83", //ishaqyusuf
    // url: "https://u.expo.dev/1914ffbf-8d95-482a-af7e-e4e30a6206eb", //ishaqyusuf2
    checkAutomatically: "NEVER",
  },
  runtimeVersion: {
    policy: "appVersion",
  },
};

export default config;
