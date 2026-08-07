const { spawnSync } = require("node:child_process");
const { resolve } = require("node:path");
const { describe, expect, test } = require("bun:test");

const CONFIG_PATH = resolve(__dirname, "metro.config.js");
const KEYBOARD_CONTROLLER_EVENT_HANDLER = resolve(
	__dirname,
	"../../node_modules/react-native-keyboard-controller/src/event-handler.js",
);
const NODE_RESOLUTION_PROBE = String.raw`
  const assert = require("node:assert/strict");
  const { existsSync, realpathSync } = require("node:fs");
  const { dirname, resolve } = require("node:path");

  const config = require(${JSON.stringify(CONFIG_PATH)});
  const keyboardControllerEventHandler = ${JSON.stringify(KEYBOARD_CONTROLLER_EVENT_HANDLER)};
  const reanimatedPackageRoot = dirname(require.resolve(
    "react-native-reanimated/package.json",
    { paths: [dirname(${JSON.stringify(CONFIG_PATH)})] },
  ));
  const expectedReanimatedCore = resolve(reanimatedPackageRoot, "src/core.ts");

  function resolveLikeMetro(context, moduleName, platform) {
    assert.ok(moduleName.startsWith("."), moduleName);

    const basePath = resolve(dirname(context.originModulePath), moduleName);
    const extensions = [
      "." + platform + ".tsx",
      ".native.tsx",
      ".tsx",
      "." + platform + ".ts",
      ".native.ts",
      ".ts",
      "." + platform + ".jsx",
      ".native.jsx",
      ".jsx",
      "." + platform + ".js",
      ".native.js",
      ".js",
    ];
    const filePath = extensions
      .map((extension) => basePath + extension)
      .find(existsSync);

    assert.ok(filePath, "Unable to resolve " + moduleName + " from " + basePath);
    return { type: "sourceFile", filePath };
  }

  const context = {
    originModulePath: keyboardControllerEventHandler,
    resolveRequest: resolveLikeMetro,
  };
  const deepResolution = config.resolver.resolveRequest(
    context,
    "react-native-reanimated/src/core",
    "android",
  );
  assert.equal(
    realpathSync(deepResolution.filePath),
    realpathSync(expectedReanimatedCore),
  );

  const bareResolution = config.resolver.resolveRequest(
    context,
    "react-native-reanimated",
    "android",
  );
  assert.equal(
    realpathSync(bareResolution.filePath),
    realpathSync(require.resolve("react-native-reanimated", {
      paths: [dirname(${JSON.stringify(CONFIG_PATH)})],
    })),
  );

  const styledReactNativeResolution = config.resolver.resolveRequest(
    context,
    "react-native",
    "android",
  );
  assert.equal(
    realpathSync(styledReactNativeResolution.filePath),
    realpathSync(require.resolve("react-native-css/components", {
      paths: [dirname(${JSON.stringify(CONFIG_PATH)})],
    })),
  );
`;

describe("mobile Metro singleton resolution", () => {
	test("resolves deep imports and styled React Native aliases under Node", () => {
		const result = spawnSync("node", ["-e", NODE_RESOLUTION_PROBE], {
			encoding: "utf8",
		});

		expect(result.stderr).toBe("");
		expect(result.status).toBe(0);
	});
});
