import { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "gndprodesk",
  slug: "gnd-prodesk",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/adaptive-icon.png",
  scheme: "gndprodesk",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.gnd.prodesk",
    icon: {
      dark: "./assets/images/adaptive-icon.png",
      light: "./assets/images/adaptive-icon.png",
      tinted: "./assets/images/adaptive-icon.png",
    },
  },
  // build: {
  //   preview: {
  //     android: {
  //       buildType: "apk",
  //     },
  //   },
  //   preview2: {
  //     android: {
  //       gradleCommand: ":app:assembleRelease",
  //     },
  //   },
  //   preview3: {
  //     developmentClient: true,
  //   },
  //   preview4: {
  //     distribution: "internal",
  //   },
  //   production: {},
  // },

  android: {
    // buildType: "apk",
    // gradleCommand: ":app:assembleRelease",
    adaptiveIcon: {
      backgroundColor: "#ffffff",
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundImage: "./assets/images/adaptive-icon.png",
      monochromeImage: "./assets/images/adaptive-icon.png",
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
        image: "./assets/images/splash-icon-light.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          image: "./assets/images/splash-icon-light.png",
          backgroundColor: "#000000",
        },
      },
    ],
    [
      "expo-secure-store",
      {
        configureAndroidBackup: true,
        faceIDPermission:
          "Allow $(PRODUCT_NAME) to access your Face ID biometric data.",
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
      projectId: "41f31ec0-9c44-4b41-af01-9a23d1b39d83",
    },
  },
  updates: {
    url: "https://u.expo.dev/41f31ec0-9c44-4b41-af01-9a23d1b39d83",
  },
  runtimeVersion: {
    policy: "appVersion",
  },
  owner: "ishaqyusuf",
};

export default config;
