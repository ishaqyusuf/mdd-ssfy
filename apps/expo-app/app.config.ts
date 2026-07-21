import type { ExpoConfig } from "expo/config";

export const UPDATE_VERSION = "2026.07.15.04";
const DEFAULT_AUTO_UPDATE_FOREGROUND_COOLDOWN_MS = 5 * 60 * 1000;

const appVariant =
  process.env.APP_VARIANT ??
  process.env.EXPO_PUBLIC_APP_VARIANT ??
  (process.env.EAS_BUILD_PROFILE === "development" ? "development" : undefined);

const normalizedAppVariant = (appVariant ?? "production").toLowerCase();
const isDevelopmentBuild =
  normalizedAppVariant === "development" || normalizedAppVariant === "dev";

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
  name: variantConfig.name,
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
    "expo-router",
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
    typedRoutes: true,
    reactCompiler: true,
  },

  extra: {
    appVariant: normalizedAppVariant,
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
