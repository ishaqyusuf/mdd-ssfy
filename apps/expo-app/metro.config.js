const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");
const { sep } = require("node:path");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);
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
  "react-native-safe-area-context",
  "react-native-css",
  "react-native-css-interop",
];

function normalizePath(filePath) {
  return filePath.split(sep).join("/");
}

function isNodeModulesOrigin(originModulePath) {
  if (!originModulePath) return false;

  return normalizePath(originModulePath).includes("/node_modules/");
}

function isReactNativeOrigin(originModulePath) {
  if (!originModulePath) return false;

  return normalizePath(originModulePath).includes("/node_modules/react-native/");
}

function getSingletonPackage(moduleName) {
  return singletonPackages.find(
    (packageName) =>
      moduleName === packageName || moduleName.startsWith(`${packageName}/`),
  );
}

function resolveAppSingleton(moduleName) {
  return require.resolve(moduleName, { paths: [__dirname] });
}

nativewindConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  const originModulePath = context.originModulePath;
  const singletonPackage = getSingletonPackage(moduleName);
  const shouldUseAppSingleton =
    singletonPackage && isNodeModulesOrigin(originModulePath);

  if (shouldUseAppSingleton) {
    return {
      type: "sourceFile",
      filePath: resolveAppSingleton(moduleName),
    };
  }

  if (isReactNativeOrigin(originModulePath)) {
    return context.resolveRequest(context, moduleName, platform);
  }

  return nativewindResolveRequest(context, moduleName, platform);
};

module.exports = nativewindConfig;
