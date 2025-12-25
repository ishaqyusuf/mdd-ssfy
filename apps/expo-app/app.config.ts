import { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "gndprodesk",
  slug: "prodesk",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "gndprodesk",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.gnd.prodesk",
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
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
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
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
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
      projectId: "1914ffbf-8d95-482a-af7e-e4e30a6206eb",
      // projectId: "41f31ec0-9c44-4b41-af01-9a23d1b39d83",
    },
  },
  updates: {
    url: "https://u.expo.dev/1914ffbf-8d95-482a-af7e-e4e30a6206eb",
    // url: "https://u.expo.dev/41f31ec0-9c44-4b41-af01-9a23d1b39d83",
  },
  runtimeVersion: {
    policy: "appVersion",
  },
  owner: "ishaqyusuf2",
};

export default config;
