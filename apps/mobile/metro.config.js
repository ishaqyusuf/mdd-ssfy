const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const { withNativewind } = require("nativewind/metro");
const { join, sep } = require("node:path");

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

function resolveAppSingleton(moduleName) {
  const packageName = getSingletonPackage(moduleName);
  const alias = packageName ? singletonAliases.get(packageName) : null;
  const resolvedModuleName = alias
    ? `${alias}${moduleName.slice(packageName.length)}`
    : moduleName;
  return require.resolve(resolvedModuleName, { paths: [__dirname] });
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

    return {
      type: "sourceFile",
      filePath: isReactNativeCssOrigin(originModulePath)
        ? resolveAppSingleton(moduleName)
        : resolveAppSingleton(styledModuleName),
    };
  }

  const singletonPackage = getSingletonPackage(moduleName);
  const shouldUseAppSingleton = Boolean(singletonPackage);

  if (shouldUseAppSingleton) {
    return {
      type: "sourceFile",
      filePath: resolveAppSingleton(moduleName),
    };
  }

  return nativewindResolveRequest(context, moduleName, platform);
};

module.exports = nativewindConfig;
