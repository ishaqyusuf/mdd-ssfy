import { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "GND Millwork",
  // slug: "gnd-prodesk",
  slug: "prodesk",
  version: "1.0.108",
  orientation: "portrait",
  icon: "./assets/icons/adaptive-icon.png",
  scheme: "gndprodesk",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.gnd.prodesk",
    icon: {
      dark: "./assets/icons/ios-dark.png",
      light: "./assets/icons/ios-light.png",
    },
  },

  android: {
    // buildType: "apk",
    // gradleCommand: ":app:assembleRelease",
    adaptiveIcon: {
      // backgroundColor: "#ffffff",
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/icons/adaptive-icon.png",
      backgroundImage: "./assets/icons/adaptive-icon.png",
      monochromeImage: "./assets/icons/adaptive-icon.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: "com.gnd.prodesk",
  },

  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },

  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/icons/splash-icon-dark.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
          image: "./assets/icons/splash-icon-light.png",
        },
      },
    ],
  ],

  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },

  extra: {
    router: {},
    eas: {
      // projectId: "8ea2eecb-4109-453c-827f-9b2de2e3a9aa", //pcruz321
      projectId: "1914ffbf-8d95-482a-af7e-e4e30a6206eb", //ishaqyusuf2
      // projectId: "41f31ec0-9c44-4b41-af01-9a23d1b39d83", //ishaqyusuf
    },
  },
  // owner: "pcruz321",
  owner: "ishaqyusuf2",
  updates: {
    // url: "https://u.expo.dev/8ea2eecb-4109-453c-827f-9b2de2e3a9aa", //pcruz321
    // url: "https://u.expo.dev/41f31ec0-9c44-4b41-af01-9a23d1b39d83", //ishaqyusuf
    url: "https://u.expo.dev/1914ffbf-8d95-482a-af7e-e4e30a6206eb", //ishaqyusuf2
  },
  runtimeVersion: {
    policy: "appVersion",
  },
};

export default config;
