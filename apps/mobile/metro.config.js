const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const { withNativewind } = require("nativewind/metro");
const { dirname, join, sep } = require("node:path");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getSentryExpoConfig(__dirname);
// config.resolver.unstable_enablePackageExports = true;

const nativewindConfig = withNativewind(config);
const nativewindResolveRequest = nativewindConfig.resolver.resolveRequest;
const singletonPackages = [
  "@expo/vector-icons",
  "expo",
  "expo-constants",
  "expo-font",
  "expo-linking",
  "react",
  "react-dom",
  "react-native",
  "react-native-gesture-handler",
  "react-native-keyboard-controller",
  "react-native-reanimated",
  "react-native-safe-area-context",
  "react-native-screens",
  "react-native-svg",
  "react-native-worklets",
  "react-native-css",
  "react-native-css-interop",
];
const singletonAliases = new Map([
  ["react", "react-mobile"],
  ["react-dom", "react-dom-mobile"],
]);
const isDriverPlatformMode =
  process.env.EXPO_PUBLIC_DRIVER_PLATFORM_MODE === "true";
const expoGoKeyboardControllerShim = join(
  __dirname,
  "src/shims/react-native-keyboard-controller.tsx",
);

function normalizePath(filePath) {
  return filePath.split(sep).join("/");
}

function isReactNativeCssOrigin(originModulePath) {
  if (!originModulePath) return false;

  const normalized = normalizePath(originModulePath);
  return (
    normalized.includes("/node_modules/react-native-css/") ||
    normalized.includes("/node_modules/.bun/react-native-css@")
  );
}

function getSingletonPackage(moduleName) {
  return singletonPackages.find(
    (packageName) =>
      moduleName === packageName || moduleName.startsWith(`${packageName}/`),
  );
}

function resolveAppSingleton(context, moduleName, platform) {
  const packageName = getSingletonPackage(moduleName);
  const alias = packageName ? singletonAliases.get(packageName) : null;
  const resolvedPackageName = alias ?? packageName;
  const packageSubpath = moduleName.slice(packageName.length);
  const resolvedModuleName = `${resolvedPackageName}${packageSubpath}`;

  try {
    return {
      type: "sourceFile",
      filePath: require.resolve(resolvedModuleName, { paths: [__dirname] }),
    };
  } catch (error) {
    if (!packageSubpath || error?.code !== "MODULE_NOT_FOUND") {
      throw error;
    }
  }

  const packageRoot = dirname(
    require.resolve(`${resolvedPackageName}/package.json`, {
      paths: [__dirname],
    }),
  );

  return context.resolveRequest(
    {
      ...context,
      originModulePath: join(packageRoot, "package.json"),
    },
    `.${packageSubpath}`,
    platform,
  );
}

nativewindConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  const originModulePath = context.originModulePath;

  if (
    isDriverPlatformMode &&
    moduleName === "react-native-keyboard-controller"
  ) {
    return {
      type: "sourceFile",
      filePath: expoGoKeyboardControllerShim,
    };
  }

  if (
    moduleName === "react-native" ||
    moduleName === "react-native-safe-area-context"
  ) {
    const styledModuleName =
      moduleName === "react-native"
        ? "react-native-css/components"
        : "react-native-css/components/react-native-safe-area-context";

    return isReactNativeCssOrigin(originModulePath)
      ? resolveAppSingleton(context, moduleName, platform)
      : resolveAppSingleton(context, styledModuleName, platform);
  }

  const singletonPackage = getSingletonPackage(moduleName);
  const shouldUseAppSingleton = Boolean(singletonPackage);

  if (shouldUseAppSingleton) {
    return resolveAppSingleton(context, moduleName, platform);
  }

  return nativewindResolveRequest(context, moduleName, platform);
};

module.exports = nativewindConfig;
