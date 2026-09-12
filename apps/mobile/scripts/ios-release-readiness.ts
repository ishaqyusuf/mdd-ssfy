import { readFile } from "node:fs/promises";
import path from "node:path";

import appConfig from "../app.config";

type Check = { label: string; ok: boolean; detail: string };

const APP_ROOT = path.join(import.meta.dir, "..");
const EXPECTED_PROJECT_ID = "8ea2eecb-4109-453c-827f-9b2de2e3a9aa";
const EXPECTED_TEAM_ID = "ZXC78SPCV4";

export async function collectIosReleaseReadiness(): Promise<Check[]> {
	const eas = JSON.parse(
		await readFile(path.join(APP_ROOT, "eas.json"), "utf8"),
	);
	const pkg = JSON.parse(
		await readFile(path.join(APP_ROOT, "package.json"), "utf8"),
	);
	const sourceFiles = new Bun.Glob("src/**/*.{ts,tsx,js,jsx,mjs,cjs}");
	let customCryptoImport = false;
	for await (const relativePath of sourceFiles.scan({ cwd: APP_ROOT })) {
		const source = await readFile(path.join(APP_ROOT, relativePath), "utf8");
		if (/from\s+["']aes-js["']|require\(["']aes-js["']\)/.test(source)) {
			customCryptoImport = true;
			break;
		}
	}

	const scripts = pkg.scripts as Record<string, string>;
	const projectId = appConfig.extra?.eas?.projectId;
	const infoPlist = appConfig.ios?.infoPlist as Record<string, unknown>;
	return [
		check(
			"Production bundle identifier",
			appConfig.ios?.bundleIdentifier === "com.gnd.prodesk",
			String(appConfig.ios?.bundleIdentifier),
		),
		check("EAS owner", appConfig.owner === "pcruz321", String(appConfig.owner)),
		check(
			"EAS project linkage",
			projectId === EXPECTED_PROJECT_ID,
			String(projectId),
		),
		check(
			"EAS Updates linkage",
			appConfig.updates?.url === `https://u.expo.dev/${EXPECTED_PROJECT_ID}`,
			String(appConfig.updates?.url),
		),
		check(
			"Production update channel",
			eas.build?.production?.channel === "production",
			String(eas.build?.production?.channel),
		),
		check(
			"TestFlight store distribution",
			eas.build?.production?.distribution === "store",
			String(eas.build?.production?.distribution),
		),
		check(
			"Preview remains internal",
			eas.build?.preview?.distribution === "internal",
			String(eas.build?.preview?.distribution),
		),
		check(
			"Apple team",
			eas.submit?.production?.ios?.appleTeamId === EXPECTED_TEAM_ID,
			String(eas.submit?.production?.ios?.appleTeamId),
		),
		check(
			"Export compliance declaration",
			infoPlist?.ITSAppUsesNonExemptEncryption === false,
			String(infoPlist?.ITSAppUsesNonExemptEncryption),
		),
		check(
			"No app-owned custom crypto imports",
			!customCryptoImport,
			customCryptoImport
				? "aes-js is imported by app source"
				: "HTTPS, OS Keychain/SecureStore, and platform cryptography only",
		),
		check(
			"Photo-library purpose string",
			typeof infoPlist?.NSPhotoLibraryUsageDescription === "string" &&
				infoPlist.NSPhotoLibraryUsageDescription.length > 0,
			String(infoPlist?.NSPhotoLibraryUsageDescription),
		),
		check(
			"iOS build command",
			scripts["eas-build:ios:prod"]?.includes(
				"eas build -p ios --profile production",
			),
			scripts["eas-build:ios:prod"] ?? "missing",
		),
		check(
			"iOS submit command",
			scripts["eas-submit:ios:prod"]?.includes(
				"eas submit -p ios --profile production --latest",
			),
			scripts["eas-submit:ios:prod"] ?? "missing",
		),
		check(
			"iOS combined command",
			scripts["eas-build-submit:ios:prod"]?.includes(
				"--auto-submit-with-profile production",
			),
			scripts["eas-build-submit:ios:prod"] ?? "missing",
		),
		check(
			"Release scripts strip dev credentials",
			[
				"eas-build:ios:prod",
				"eas-submit:ios:prod",
				"eas-build-submit:ios:prod",
			].every(
				(name) =>
					scripts[name]?.includes(
						"env -u EXPO_PUBLIC_EMAIL -u EXPO_PUBLIC_TOK",
					) && scripts[name]?.includes("EXPO_NO_DOTENV=1"),
			),
			"All iOS release operations must strip development login values",
		),
	];
}

function check(label: string, ok: boolean, detail: string): Check {
	return { label, ok, detail };
}

if (import.meta.main) {
	const checks = await collectIosReleaseReadiness();
	for (const item of checks) {
		console.log(`${item.ok ? "PASS" : "FAIL"}  ${item.label}: ${item.detail}`);
	}
	const failed = checks.filter((item) => !item.ok);
	if (failed.length > 0) process.exit(1);
	console.log(
		`\n${checks.length}/${checks.length} iOS release-readiness checks passed.`,
	);
}
