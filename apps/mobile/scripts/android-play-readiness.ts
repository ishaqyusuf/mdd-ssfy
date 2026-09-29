import { readFile } from "node:fs/promises";
import path from "node:path";

import appConfig from "../app.config";

const appRoot = path.join(import.meta.dir, "..");
const projectId = "8ea2eecb-4109-453c-827f-9b2de2e3a9aa";
type Check = { label: string; ok: boolean; detail: string };

export async function collectAndroidPlayReadiness(): Promise<Check[]> {
  const eas = JSON.parse(await readFile(path.join(appRoot, "eas.json"), "utf8"));
  const mobile = JSON.parse(await readFile(path.join(appRoot, "package.json"), "utf8"));
  const play = eas.build?.play;
  const env = play?.android?.env;
  const policyUrl = "https://www.gndprodesk.com/privacy-policy";
  const check = (label: string, ok: boolean, detail: string): Check => ({
    label,
    ok,
    detail,
  });

  return [
    check("Expo SDK 54", mobile.dependencies?.expo === "~54.0.37", String(mobile.dependencies?.expo)),
    check("Android package", appConfig.android?.package === "com.gnd.prodesk", String(appConfig.android?.package)),
    check("EAS owner and project", appConfig.owner === "pcruz321" && appConfig.extra?.eas?.projectId === projectId, `${appConfig.owner}/${appConfig.extra?.eas?.projectId}`),
    check("Production Updates linkage", appConfig.updates?.url === `https://u.expo.dev/${projectId}` && eas.build?.production?.channel === "production", `${appConfig.updates?.url} / ${eas.build?.production?.channel}`),
    check("Play profile is a store AAB", play?.extends === "production" && eas.build?.production?.distribution === "store" && play?.android?.buildType === "app-bundle", `${play?.extends} / ${eas.build?.production?.distribution} / ${play?.android?.buildType}`),
    check("Play-only public guard", env?.GND_ANDROID_PUBLIC_RELEASE === "true" && eas.build?.production?.android?.env === undefined, String(env?.GND_ANDROID_PUBLIC_RELEASE)),
    check("Canonical API/auth origin", env?.EXPO_PUBLIC_BASE_URL === "https://www.gndprodesk.com", String(env?.EXPO_PUBLIC_BASE_URL)),
    check("Existing public Privacy Policy URL", env?.EXPO_PUBLIC_PRIVACY_POLICY_URL === policyUrl, String(env?.EXPO_PUBLIC_PRIVACY_POLICY_URL)),
    check("Optional telemetry disabled for Play", env?.EXPO_PUBLIC_LOGLY_ENABLED === "false" && env?.EXPO_PUBLIC_SENTRY_ENABLED === "false" && env?.SENTRY_DISABLE_AUTO_UPLOAD === "true", "Play profile only; existing Android production remains unchanged"),
    check("Development credentials excluded from release command", mobile.scripts?.["eas-build:android:play"]?.includes("env -u EXPO_PUBLIC_EMAIL -u EXPO_PUBLIC_TOK") && mobile.scripts?.["eas-build:android:play"]?.includes("EXPO_NO_DOTENV=1"), String(mobile.scripts?.["eas-build:android:play"] ?? "missing")),
  ];
}

if (import.meta.main) {
  const checks = await collectAndroidPlayReadiness();
  for (const item of checks) {
    console.log(`${item.ok ? "PASS" : "FAIL"} ${item.label}: ${item.detail}`);
  }
  console.log(`${checks.filter((item) => item.ok).length}/${checks.length} local Play configuration checks passed.`);
  console.log("A passing local check does not verify the signed AAB, Play Console declarations, or installed app.");
  if (checks.some((item) => !item.ok)) process.exitCode = 1;
}
