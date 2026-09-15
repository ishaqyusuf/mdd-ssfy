import { readFile } from "node:fs/promises";
import path from "node:path";

import appConfig, { isHttpsEndpoint } from "../app.config";

type Check = { label: string; ok: boolean; detail: string };

const APP_ROOT = path.join(import.meta.dir, "..");
const REPOSITORY_ROOT = path.join(APP_ROOT, "..", "..");
const EXPECTED_PROJECT_ID = "8ea2eecb-4109-453c-827f-9b2de2e3a9aa";
const EXPECTED_TEAM_ID = "ZXC78SPCV4";
const EXPECTED_ASC_APP_ID = "6811442922";
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
	const rootPkg = JSON.parse(
		await readFile(path.join(REPOSITORY_ROOT, "package.json"), "utf8"),
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
	const rootScripts = rootPkg.scripts as Record<string, string>;
	const dependencies = pkg.dependencies as Record<string, string>;
	const dependencyVersionsMatch = Object.entries(
		EXPECTED_SDK_DEPENDENCIES,
	).every(([name, version]) => dependencies[name] === version);
	const validationExclusions = pkg.expo?.install?.exclude as
		| string[]
		| undefined;
	const projectId = appConfig.extra?.eas?.projectId;
	const infoPlist = appConfig.ios?.infoPlist as Record<string, unknown>;
	const sentryEnabled = process.env.EXPO_PUBLIC_SENTRY_ENABLED === "true";
	const loglyEnabled = process.env.EXPO_PUBLIC_LOGLY_ENABLED === "true";
	const sentryDsnIsHttps = isHttpsEndpoint(process.env.EXPO_PUBLIC_SENTRY_DSN);
	const loglyEndpointIsHttps = isHttpsEndpoint(
		process.env.EXPO_PUBLIC_LOGLY_ENDPOINT,
	);
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
			"Public App Store store distribution",
			eas.build?.production?.distribution === "store",
			String(eas.build?.production?.distribution),
		),
		check(
			"iOS-only production privacy guard",
			eas.build?.production?.ios?.env?.GND_IOS_PUBLIC_RELEASE === "true",
			"The iOS production profile enables the guard without changing Android production routing",
		),
		check(
			"Preview remains development-only internal distribution",
			eas.build?.preview?.distribution === "internal",
			String(eas.build?.preview?.distribution),
		),
		check(
			"Apple team",
			eas.submit?.production?.ios?.appleTeamId === EXPECTED_TEAM_ID,
			String(eas.submit?.production?.ios?.appleTeamId),
		),
		check(
			"App Store Connect app",
			eas.submit?.production?.ios?.ascAppId === EXPECTED_ASC_APP_ID,
			String(eas.submit?.production?.ios?.ascAppId),
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
			"Configured public privacy-policy URL",
			typeof appConfig.extra?.privacyPolicyUrl === "string" &&
				appConfig.extra.privacyPolicyUrl.startsWith("https://"),
			appConfig.extra?.privacyPolicyUrl
				? String(appConfig.extra.privacyPolicyUrl)
				: "Missing EXPO_PUBLIC_PRIVACY_POLICY_URL; owner/legal approval required before a public build",
		),
		check(
			"Production telemetry inventory (non-secret local snapshot)",
			true,
			`Sentry enabled=${sentryEnabled}; Logly enabled=${loglyEnabled}; compare with the final EAS artifact/environment before App Privacy answers`,
		),
		check(
			"Production Sentry diagnostic modes disabled",
			process.env.EXPO_PUBLIC_SENTRY_DEBUG !== "true" &&
				process.env.EXPO_PUBLIC_SENTRY_SMOKE_TEST !== "true",
			`debug=${process.env.EXPO_PUBLIC_SENTRY_DEBUG === "true"}; smokeTest=${process.env.EXPO_PUBLIC_SENTRY_SMOKE_TEST === "true"}`,
		),
		check(
			"Enabled production Sentry uses an HTTPS DSN",
			!sentryEnabled || sentryDsnIsHttps,
			`enabled=${sentryEnabled}; configuredHttps=${sentryDsnIsHttps}`,
		),
		check(
			"Enabled production Logly uses an HTTPS endpoint",
			!loglyEnabled || loglyEndpointIsHttps,
			`enabled=${loglyEnabled}; configuredHttps=${loglyEndpointIsHttps}`,
		),
		check(
			"iOS build command",
			scripts["eas-build:ios:prod"]?.startsWith(
				"bun run ios:release:preflight &&",
			) && scripts["eas-build:ios:prod"]?.includes(
				"eas build -p ios --profile production",
			),
			scripts["eas-build:ios:prod"] ?? "missing",
		),
		check(
			"iOS submit command",
			scripts["eas-submit:ios:prod"] ===
				scripts["eas-submit:ios:by-id"] &&
				!scripts["eas-submit:ios:prod"]?.includes("--latest"),
			scripts["eas-submit:ios:prod"] ?? "missing",
		),
		check(
			"iOS combined command",
			scripts["eas-build-submit:ios:prod"]?.startsWith(
				"bun run ios:release:preflight &&",
			) && scripts["eas-build-submit:ios:prod"]?.includes(
				"--auto-submit-with-profile production",
			),
			scripts["eas-build-submit:ios:prod"] ?? "missing",
		),
		check(
			"Explicit public App Store commands",
			rootScripts["eas:appstore:build:ios"] ===
				rootScripts["eas:build:ios"] &&
				rootScripts["eas:appstore:upload:ios"] ===
					rootScripts["eas:submit:ios"] &&
				rootScripts["eas:submit:ios"]?.endsWith("--require-id") &&
				rootScripts["eas:appstore:build-upload:ios"] ===
					rootScripts["eas:build-submit:ios"],
			"Public aliases must use the verified production iOS store profile and upload by build ID",
		),
		check(
			"Build-ID upload command",
			scripts["eas-submit:ios:by-id"]?.includes(
				"eas submit -p ios --profile production",
			) && !scripts["eas-submit:ios:by-id"]?.includes("--latest"),
			scripts["eas-submit:ios:by-id"] ?? "missing",
		),
		check(
			"Release scripts strip dev credentials",
			[
				"eas-build:ios:prod",
				"eas-submit:ios:prod",
				"eas-submit:ios:by-id",
				"eas-build-submit:ios:prod",
			].every(
				(name) =>
					scripts[name]?.includes(
						"env -u EXPO_PUBLIC_EMAIL -u EXPO_PUBLIC_TOK",
					) && scripts[name]?.includes("EXPO_NO_DOTENV=1"),
			),
			"All iOS release operations must strip development login values",
		),
		check(
			"iOS store preflight loads production configuration",
			scripts["ios:release:preflight"]?.includes("with-env:prod") &&
				scripts["ios:release:preflight"]?.includes("APP_VARIANT=production") &&
				scripts["ios:release:preflight"]?.includes("GND_IOS_PUBLIC_RELEASE=true") &&
				scripts["ios:release:preflight"]?.includes("EXPO_NO_DOTENV=1") &&
				scripts["ios:release:preflight"]?.includes(
					"bun ./scripts/ios-release-readiness.ts",
				),
			scripts["ios:release:preflight"] ?? "missing",
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
