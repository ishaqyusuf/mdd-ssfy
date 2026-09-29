import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import path from "node:path";

import { collectAndroidPlayReadiness } from "./android-play-readiness";

const appRoot = path.join(import.meta.dir, "..");

describe("Android Play release preparation", () => {
  it("keeps Play isolated from existing Android production and preview", async () => {
    const eas = await Bun.file(path.join(appRoot, "eas.json")).json();
    expect(eas.build.play.extends).toBe("production");
    expect(eas.build.play.android.buildType).toBe("app-bundle");
    expect(eas.build.play.android.env.GND_ANDROID_PUBLIC_RELEASE).toBe("true");
    expect(eas.build.production.android?.env).toBeUndefined();
    expect(eas.build.preview.distribution).toBe("internal");
  });

  it("passes local config checks", async () => {
    expect((await collectAndroidPlayReadiness()).filter((item) => !item.ok)).toEqual([]);
  });

  it("blocks unused sensitive permissions only in the Play build", () => {
    const runConfig = (publicPlay: boolean) => {
      const result = spawnSync(
        process.execPath,
        ["-e", 'import config from "./app.config.ts"; console.log(JSON.stringify(config.android?.blockedPermissions ?? []));'],
        {
          cwd: appRoot,
          env: {
            ...process.env,
            APP_VARIANT: "production",
            GND_ANDROID_PUBLIC_RELEASE: String(publicPlay),
            EXPO_PUBLIC_BASE_URL: "https://www.gndprodesk.com",
            EXPO_PUBLIC_PRIVACY_POLICY_URL: "https://www.gndprodesk.com/privacy-policy",
            EXPO_PUBLIC_LOGLY_ENABLED: "false",
            EXPO_PUBLIC_SENTRY_ENABLED: "false",
            EXPO_PUBLIC_EMAIL: undefined,
            EXPO_PUBLIC_TOK: undefined,
            EXPO_NO_DOTENV: "1",
          },
          encoding: "utf8",
        },
      );
      expect(result.status).toBe(0);
      return JSON.parse(result.stdout.trim()) as string[];
    };

    expect(runConfig(true)).toEqual([
      "android.permission.CAMERA",
      "android.permission.RECORD_AUDIO",
      "android.permission.SYSTEM_ALERT_WINDOW",
    ]);
    expect(runConfig(false)).toEqual([]);
  });

  it("rejects a Play build without an invocation-specific acknowledgement", () => {
    const result = spawnSync(process.execPath, ["./scripts/android-play-build-gate.ts"], {
      cwd: appRoot,
      env: { ...process.env, GND_ANDROID_PLAY_BUILD_ACK: undefined },
      encoding: "utf8",
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("GND_ANDROID_PLAY_BUILD_ACK=1");
  });
});
