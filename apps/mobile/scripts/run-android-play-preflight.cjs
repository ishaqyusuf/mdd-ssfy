const { spawnSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");

const eas = JSON.parse(readFileSync(path.join(__dirname, "..", "eas.json"), "utf8"));
const profileEnv = eas.build?.play?.android?.env;
if (!profileEnv || profileEnv.GND_ANDROID_PUBLIC_RELEASE !== "true") {
  process.stderr.write("Missing public Android Play profile environment.\n");
  process.exit(1);
}
const env = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key]) => key !== "EXPO_PUBLIC_EMAIL" && key !== "EXPO_PUBLIC_TOK",
  ),
);
Object.assign(env, eas.build.production.env, profileEnv, {
  EXPO_NO_DOTENV: "1",
  BUN_AUTO_INSTALL: "0",
});
const result = spawnSync("bun", [path.join(__dirname, "android-play-readiness.ts")], {
  cwd: tmpdir(),
  env,
  stdio: "inherit",
});
if (result.error) process.stderr.write(`${result.error.message}\n`);
process.exit(result.status ?? 1);
