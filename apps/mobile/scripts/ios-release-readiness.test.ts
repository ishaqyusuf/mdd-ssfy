import { describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import appConfig, { isHttpsEndpoint } from "../app.config";

import { collectIosReleaseReadiness } from "./ios-release-readiness";

describe("iOS public App Store release readiness", () => {
	it("keeps every local release invariant green", async () => {
		const checks = await collectIosReleaseReadiness();
		const policyGate = checks.find(
			(item) => item.label === "Configured public privacy-policy URL",
		);
		expect(policyGate).toBeDefined();
		expect(policyGate?.ok).toBe(Boolean(appConfig.extra?.privacyPolicyUrl));
		expect(
			checks.filter((item) => !item.ok && item.label !== policyGate?.label),
		).toEqual([]);
		expect(checks.length).toBeGreaterThanOrEqual(15);
	});

	it("puts an accessible privacy link on sign-in and signed-in Settings", async () => {
		const component = await readFile(
			path.join(import.meta.dir, "../src/components/privacy-policy-link.tsx"),
			"utf8",
		);
		expect(component).toContain('accessibilityRole="link"');
		expect(component).toContain('accessibilityLabel="Read privacy policy"');
		expect(component).toContain("min-h-11");
		expect(component).toContain("Linking.openURL(privacyPolicyUrl)");
		for (const template of ["login-template-0", "login-template-1"]) {
			const source = await readFile(
				path.join(import.meta.dir, `../src/components/${template}.tsx`),
				"utf8",
			);
			expect(source).toContain("<PrivacyPolicyLink");
		}
		const settings = await readFile(
			path.join(import.meta.dir, "../src/screens/screen-settings.tsx"),
			"utf8",
		);
		const productionFooter = settings.split("</Debug>")[1];
		expect(productionFooter).toContain("<PrivacyPolicyLink />");
		expect(productionFooter.indexOf("<PrivacyPolicyLink />")).toBeLessThan(
			productionFooter.indexOf("auth.onLogout()"),
		);
	});

	it("does not expose a placeholder public sign-up route", async () => {
		const authLayout = await readFile(
			path.join(import.meta.dir, "../src/app/(auth)/_layout.tsx"),
			"utf8",
		);
		expect(authLayout).not.toContain("name='sign-up'");
		for (const route of [
			"../src/app/(auth)/sign-up.tsx",
			"../src/driver-app/(auth)/sign-up.tsx",
		]) {
			expect(existsSync(path.join(import.meta.dir, route))).toBe(false);
		}
	});

	it("rejects unsafe telemetry settings in explicit production config", () => {
		for (const [overrides, expectedError] of [
			[
				{ EXPO_PUBLIC_SENTRY_SMOKE_TEST: "true" },
				"Production Expo builds must disable Sentry debug and smoke-test modes.",
			],
			[
				{ EXPO_PUBLIC_SENTRY_ENABLED: "true" },
				"Enabled production Sentry requires a configured HTTPS DSN.",
			],
			[
				{
					EXPO_PUBLIC_LOGLY_ENABLED: "true",
					EXPO_PUBLIC_LOGLY_ENDPOINT: "http://example.test/collector",
				},
				"Enabled production Logly requires a configured HTTPS endpoint.",
			],
		] as const) {
			const result = Bun.spawnSync({
				cmd: [process.execPath, "-e", "import './app.config.ts'"],
				cwd: path.join(import.meta.dir, ".."),
				env: {
					...process.env,
					APP_VARIANT: "production",
					EXPO_PUBLIC_EMAIL: "",
					EXPO_PUBLIC_TOK: "",
					EXPO_PUBLIC_PRIVACY_POLICY_URL: "",
					EXPO_PUBLIC_SENTRY_ENABLED: "false",
					EXPO_PUBLIC_SENTRY_DEBUG: "false",
					EXPO_PUBLIC_SENTRY_SMOKE_TEST: "false",
					EXPO_PUBLIC_SENTRY_DSN: "",
					EXPO_PUBLIC_LOGLY_ENABLED: "false",
					EXPO_PUBLIC_LOGLY_ENDPOINT: "",
					...overrides,
				},
			});
			expect(result.exitCode).not.toBe(0);
			expect(result.stderr.toString()).toContain(expectedError);
		}
		expect(isHttpsEndpoint("https://example.test/collector")).toBe(true);
		expect(isHttpsEndpoint("http://example.test/collector")).toBe(false);
		expect(isHttpsEndpoint("not-a-url")).toBe(false);
	});
});
