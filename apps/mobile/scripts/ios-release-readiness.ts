import { readFile } from "node:fs/promises";
import path from "node:path";

import appConfig from "../app.config";

type Check = { label: string; ok: boolean; detail: string };

const APP_ROOT = path.join(import.meta.dir, "..");
const EXPECTED_PROJECT_ID = "8ea2eecb-4109-453c-827f-9b2de2e3a9aa";
const EXPECTED_TEAM_ID = "ZXC78SPCV4";
const EXPECTED_SDK_DEPENDENCIES = {
	"@react-native-community/netinfo": "11.4.1",
	expo: "~54.0.37",
	"expo-constants": "~18.0.14",
	"expo-file-system": "~19.0.24",
	"expo-updates": "~29.0.20",
	"react-mobile": "npm:react@19.1.0",
	"react-dom-mobile": "npm:react-dom@19.1.0",
} as const;

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
	const dependencies = pkg.dependencies as Record<string, string>;
	const dependencyVersionsMatch = Object.entries(
		EXPECTED_SDK_DEPENDENCIES,
	).every(([name, version]) => dependencies[name] === version);
	const validationExclusions = pkg.expo?.install?.exclude as
		| string[]
		| undefined;
	const projectId = appConfig.extra?.eas?.projectId;
	const infoPlist = appConfig.ios?.infoPlist as Record<string, unknown>;
	return [
		check(
			"Expo SDK 54 release dependencies",
			dependencyVersionsMatch,
			Object.entries(EXPECTED_SDK_DEPENDENCIES)
				.map(
					([name, version]) =>
						`${name}@${dependencies[name] ?? "missing"} (expected ${version})`,
				)
				.join(", "),
		),
		check(
			"Monorepo React validation exception",
			["react", "react-dom", "@types/react"].every((name) =>
				validationExclusions?.includes(name),
			),
			"Root overrides serve Next.js; Metro tests enforce the SDK 54 React 19.1 aliases",
		),
		check(
			"Native-module resolution alignment",
			appConfig.experiments?.autolinkingModuleResolution === true,
			String(appConfig.experiments?.autolinkingModuleResolution),
		),
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
