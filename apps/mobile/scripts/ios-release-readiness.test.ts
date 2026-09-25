import { describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { isHttpsEndpoint } from "../app.config";

import {
	evaluateIosPolicyApproval,
	hashIosPolicySources,
} from "./ios-policy-approval";
import {
	collectIosReleaseReadiness,
	hasDashboardApiAuthRouteContract,
	isCanonicalIosReleaseOrigin,
} from "./ios-release-readiness";

describe("iOS public App Store release readiness", () => {
	it("requires the non-redirecting canonical host for public iOS auth", () => {
		expect(isCanonicalIosReleaseOrigin("https://www.gndprodesk.com")).toBe(
			true,
		);
		expect(isCanonicalIosReleaseOrigin("https://www.gndprodesk.com/")).toBe(
			true,
		);
		expect(isCanonicalIosReleaseOrigin("https://gndprodesk.com")).toBe(false);
		expect(isCanonicalIosReleaseOrigin("https://www.gndprodesk.com/path")).toBe(
			false,
		);
		expect(isCanonicalIosReleaseOrigin("http://www.gndprodesk.com")).toBe(
			false,
		);
	});

	it("applies the canonical-origin gate only to the public iOS production check", async () => {
		const original = {
			APP_VARIANT: process.env.APP_VARIANT,
			GND_IOS_PUBLIC_RELEASE: process.env.GND_IOS_PUBLIC_RELEASE,
			EXPO_PUBLIC_BASE_URL: process.env.EXPO_PUBLIC_BASE_URL,
		};
		const originCheck = async () =>
			(await collectIosReleaseReadiness()).find(
				(item) => item.label === "Canonical public iOS API/auth origin",
			)?.ok;

		try {
			process.env.EXPO_PUBLIC_BASE_URL = "https://gndprodesk.com";
			process.env.APP_VARIANT = "production";
			process.env.GND_IOS_PUBLIC_RELEASE = "true";
			expect(await originCheck()).toBe(false);

			process.env.GND_IOS_PUBLIC_RELEASE = "false";
			expect(await originCheck()).toBe(true);

			process.env.APP_VARIANT = "preview";
			process.env.GND_IOS_PUBLIC_RELEASE = "true";
			expect(await originCheck()).toBe(true);
		} finally {
			for (const [key, value] of Object.entries(original)) {
				if (value === undefined) delete process.env[key];
				else process.env[key] = value;
			}
		}
	});
	it("requires both HTTP methods from the dashboard API and auth handlers", () => {
		const trpc =
			'export { GET, OPTIONS, PATCH, POST, PUT } from "@api/internal-api";';
		const auth =
			"export const { GET, POST, PATCH, PUT, DELETE } = toNextJsHandler(webAuth);";
		expect(hasDashboardApiAuthRouteContract(trpc, auth)).toBe(true);
		expect(
			hasDashboardApiAuthRouteContract(
				'export { GET, PATCH } from "@api/internal-api";',
				auth,
			),
		).toBe(false);
		expect(
			hasDashboardApiAuthRouteContract(
				trpc,
				"export const { GET, DELETE } = toNextJsHandler(webAuth);",
			),
		).toBe(false);
		expect(hasDashboardApiAuthRouteContract(`// ${trpc}`, auth)).toBe(false);
	});

	it("blocks optional telemetry for public iOS while leaving Android and preview unchanged", async () => {
		const original = {
			APP_VARIANT: process.env.APP_VARIANT,
			GND_IOS_PUBLIC_RELEASE: process.env.GND_IOS_PUBLIC_RELEASE,
			EXPO_PUBLIC_SENTRY_ENABLED: process.env.EXPO_PUBLIC_SENTRY_ENABLED,
			EXPO_PUBLIC_LOGLY_ENABLED: process.env.EXPO_PUBLIC_LOGLY_ENABLED,
		};
		const consentGate = async () =>
			(await collectIosReleaseReadiness()).find(
				(item) => item.label === "Public iOS optional telemetry consent gate",
			)?.ok;

		try {
			process.env.APP_VARIANT = "production";
			process.env.GND_IOS_PUBLIC_RELEASE = "true";
			process.env.EXPO_PUBLIC_LOGLY_ENABLED = "true";
			process.env.EXPO_PUBLIC_SENTRY_ENABLED = "false";
			expect(await consentGate()).toBe(false);

			process.env.EXPO_PUBLIC_LOGLY_ENABLED = "false";
			process.env.EXPO_PUBLIC_SENTRY_ENABLED = "true";
			expect(await consentGate()).toBe(false);

			process.env.EXPO_PUBLIC_SENTRY_ENABLED = "false";
			expect(await consentGate()).toBe(true);

			process.env.GND_IOS_PUBLIC_RELEASE = "false";
			process.env.EXPO_PUBLIC_LOGLY_ENABLED = "true";
			expect(await consentGate()).toBe(true);

			process.env.APP_VARIANT = "preview";
			process.env.GND_IOS_PUBLIC_RELEASE = "true";
			expect(await consentGate()).toBe(true);
		} finally {
			for (const [key, value] of Object.entries(original)) {
				if (value === undefined) delete process.env[key];
				else process.env[key] = value;
			}
		}
	});

	it("pins optional telemetry off in the iOS store profile without changing Android", async () => {
		const eas = await Bun.file(new URL("../eas.json", import.meta.url)).json();
		const iosEnv = eas.build.production.ios.env;
		const commonEnv = eas.build.production.env;
		const check = (await collectIosReleaseReadiness()).find(
			(item) =>
				item.label === "iOS-only optional telemetry disabled in build profile",
		);

		expect(check?.ok).toBe(true);
		expect(iosEnv.EXPO_PUBLIC_LOGLY_ENABLED).toBe("false");
		expect(iosEnv.EXPO_PUBLIC_SENTRY_ENABLED).toBe("false");
		expect(iosEnv.SENTRY_DISABLE_AUTO_UPLOAD).toBe("true");
		expect(commonEnv.EXPO_PUBLIC_LOGLY_ENABLED).toBeUndefined();
		expect(commonEnv.EXPO_PUBLIC_SENTRY_ENABLED).toBeUndefined();
		expect(commonEnv.SENTRY_DISABLE_AUTO_UPLOAD).toBeUndefined();
		expect(eas.build.production.android?.env).toBeUndefined();
	});

	it("keeps every local release invariant green", async () => {
		const checks = await collectIosReleaseReadiness();
		const policyGate = checks.find(
			(item) => item.label === "Approved public privacy-policy URL",
		);
		expect(policyGate).toBeDefined();
		expect(policyGate?.ok).toBe(false);
		expect(
			checks.find(
				(item) => item.label === "Dashboard API/auth route source contract",
			)?.ok,
		).toBe(true);
		expect(
			checks.filter((item) => !item.ok && item.label !== policyGate?.label),
		).toEqual([]);
		expect(checks.length).toBeGreaterThanOrEqual(15);
	});

	it("requires GND approval of the exact URL and unchanged, non-draft policy source", () => {
		const sources = {
			privacyPage: "Approved privacy notice",
			termsPage: "Approved terms",
			supportPage: "Approved support information",
			legalLayout: "Public legal layout",
		};
		const approval = {
			status: "approved" as const,
			approvedUrl: "https://www.gndprodesk.com/privacy-policy",
			approvedContentSha256: hashIosPolicySources(sources),
			approvedOn: "2026-09-24",
			approvedBy: "GND MILLWORK CORP",
		};
		expect(
			evaluateIosPolicyApproval(approval.approvedUrl, approval, sources).ok,
		).toBe(true);
		expect(
			evaluateIosPolicyApproval(
				"https://example.com/privacy",
				approval,
				sources,
			).ok,
		).toBe(false);
		expect(
			evaluateIosPolicyApproval(
				approval.approvedUrl,
				{ ...approval, status: "pending" },
				sources,
			).ok,
		).toBe(false);
		expect(
			evaluateIosPolicyApproval(approval.approvedUrl, approval, {
				...sources,
				privacyPage: "Changed privacy notice",
			}).ok,
		).toBe(false);
		expect(
			evaluateIosPolicyApproval(approval.approvedUrl, approval, {
				...sources,
				supportPage: "Changed support information",
			}).ok,
		).toBe(false);
		expect(
			evaluateIosPolicyApproval(approval.approvedUrl, approval, {
				...sources,
				supportPage: "Support review draft",
			}).ok,
		).toBe(false);
		expect(
			evaluateIosPolicyApproval(approval.approvedUrl, approval, {
				...sources,
				legalLayout: "AI-assisted draft",
			}).ok,
		).toBe(false);
		expect(
			evaluateIosPolicyApproval(approval.approvedUrl, approval, {
				...sources,
				legalLayout: "Review copy",
			}).ok,
		).toBe(false);
		expect(
			evaluateIosPolicyApproval(approval.approvedUrl, approval, {
				...sources,
				privacyPage: "robots: { index: false, follow: false }",
			}).ok,
		).toBe(false);
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

	it("isolates the production preflight from local dotenv credentials", () => {
		const result = Bun.spawnSync({
			cmd: ["node", "./scripts/run-ios-release-preflight.cjs"],
			cwd: path.join(import.meta.dir, ".."),
			env: {
				...process.env,
				APP_VARIANT: "production",
				GND_IOS_PUBLIC_RELEASE: "true",
				EXPO_PUBLIC_BASE_URL: "https://gndprodesk.com",
				EXPO_PUBLIC_PRIVACY_POLICY_URL: "https://example.com/privacy",
				EXPO_PUBLIC_EMAIL: "release-secret-sentinel-5927",
				EXPO_PUBLIC_TOK: "release-secret-sentinel-5927",
				EXPO_PUBLIC_SENTRY_ENABLED: "false",
				EXPO_PUBLIC_SENTRY_DEBUG: "false",
				EXPO_PUBLIC_SENTRY_SMOKE_TEST: "false",
				EXPO_PUBLIC_LOGLY_ENABLED: "false",
			},
		});
		expect(result.exitCode).toBe(1);
		expect(result.stdout.toString()).toContain(
			"FAIL  Approved public privacy-policy URL",
		);
		expect(result.stdout.toString()).toContain(
			"PASS  Canonical public iOS API/auth origin",
		);
		expect(result.stdout.toString()).toContain(
			"The configured privacy URL has no matching GND-approved policy record",
		);
		expect(result.stdout.toString()).not.toContain(
			"release-secret-sentinel-5927",
		);
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
			[
				{
					EXPO_PUBLIC_LOGLY_ENABLED: "true",
					EXPO_PUBLIC_LOGLY_ENDPOINT: "https://example.test/collector",
				},
				"Public iOS production builds must disable Logly and Sentry until consent, withdrawal, and provider safeguards are verified.",
			],
			[
				{
					EXPO_PUBLIC_SENTRY_ENABLED: "true",
					EXPO_PUBLIC_SENTRY_DSN: "https://example.test/123",
				},
				"Public iOS production builds must disable Logly and Sentry until consent, withdrawal, and provider safeguards are verified.",
			],
		] as const) {
			const result = Bun.spawnSync({
				cmd: [process.execPath, "-e", "import './app.config.ts'"],
				cwd: path.join(import.meta.dir, ".."),
				env: Object.assign(
					{},
					process.env,
					{
						APP_VARIANT: "production",
						GND_IOS_PUBLIC_RELEASE: "true",
						EXPO_PUBLIC_BASE_URL: "https://www.gndprodesk.com",
						EXPO_PUBLIC_EMAIL: "",
						EXPO_PUBLIC_TOK: "",
						EXPO_PUBLIC_PRIVACY_POLICY_URL: "",
						EXPO_PUBLIC_SENTRY_ENABLED: "false",
						EXPO_PUBLIC_SENTRY_DEBUG: "false",
						EXPO_PUBLIC_SENTRY_SMOKE_TEST: "false",
						EXPO_PUBLIC_SENTRY_DSN: "",
						EXPO_PUBLIC_LOGLY_ENABLED: "false",
						EXPO_PUBLIC_LOGLY_ENDPOINT: "",
					},
					overrides,
				),
			});
			expect(result.exitCode).not.toBe(0);
			expect(result.stderr.toString()).toContain(expectedError);
		}
		for (const [variant, publicIos] of [
			["production", "false"],
			["preview", "true"],
		] as const) {
			const result = Bun.spawnSync({
				cmd: [process.execPath, "-e", "import './app.config.ts'"],
				cwd: path.join(import.meta.dir, ".."),
				env: {
					...process.env,
					APP_VARIANT: variant,
					GND_IOS_PUBLIC_RELEASE: publicIos,
					EXPO_PUBLIC_BASE_URL: "https://www.gndprodesk.com",
					EXPO_PUBLIC_EMAIL: "",
					EXPO_PUBLIC_TOK: "",
					EXPO_PUBLIC_SENTRY_ENABLED: "true",
					EXPO_PUBLIC_SENTRY_DSN: "https://example.test/123",
					EXPO_PUBLIC_SENTRY_DEBUG: "false",
					EXPO_PUBLIC_SENTRY_SMOKE_TEST: "false",
					EXPO_PUBLIC_LOGLY_ENABLED: "true",
					EXPO_PUBLIC_LOGLY_ENDPOINT: "https://example.test/collector",
				},
			});
			expect(result.exitCode).toBe(0);
		}
		for (const baseUrl of [
			"",
			"http://api.example.com",
			"https://localhost:3010",
		]) {
			const result = Bun.spawnSync({
				cmd: [process.execPath, "-e", "import './app.config.ts'"],
				cwd: path.join(import.meta.dir, ".."),
				env: {
					...process.env,
					APP_VARIANT: "production",
					GND_IOS_PUBLIC_RELEASE: "true",
					EXPO_PUBLIC_BASE_URL: baseUrl,
					EXPO_PUBLIC_EMAIL: "",
					EXPO_PUBLIC_TOK: "",
					EXPO_PUBLIC_SENTRY_ENABLED: "false",
					EXPO_PUBLIC_LOGLY_ENABLED: "false",
				},
			});
			expect(result.exitCode).not.toBe(0);
			expect(result.stderr.toString()).toContain(
				"Public iOS production builds require a public HTTPS EXPO_PUBLIC_BASE_URL origin.",
			);
		}
		const redirectingApex = Bun.spawnSync({
			cmd: [process.execPath, "-e", "import './app.config.ts'"],
			cwd: path.join(import.meta.dir, ".."),
			env: {
				...process.env,
				APP_VARIANT: "production",
				GND_IOS_PUBLIC_RELEASE: "true",
				EXPO_PUBLIC_BASE_URL: "https://gndprodesk.com",
				EXPO_PUBLIC_EMAIL: "",
				EXPO_PUBLIC_TOK: "",
				EXPO_PUBLIC_SENTRY_ENABLED: "false",
				EXPO_PUBLIC_LOGLY_ENABLED: "false",
			},
		});
		expect(redirectingApex.exitCode).not.toBe(0);
		expect(redirectingApex.stderr.toString()).toContain(
			"Public iOS production builds require the canonical non-redirecting EXPO_PUBLIC_BASE_URL origin.",
		);
		expect(isHttpsEndpoint("https://example.test/collector")).toBe(true);
		expect(isHttpsEndpoint("http://example.test/collector")).toBe(false);
		expect(isHttpsEndpoint("not-a-url")).toBe(false);
		const android = Bun.spawnSync({
			cmd: [process.execPath, "-e", "import './app.config.ts'"],
			cwd: path.join(import.meta.dir, ".."),
			env: {
				...process.env,
				APP_VARIANT: "production",
				GND_IOS_PUBLIC_RELEASE: "false",
				EXPO_PUBLIC_BASE_URL: "",
				EXPO_PUBLIC_EMAIL: "",
				EXPO_PUBLIC_TOK: "",
				EXPO_PUBLIC_PRIVACY_POLICY_URL: "",
				EXPO_PUBLIC_SENTRY_SMOKE_TEST: "true",
			},
		});
		expect(android.exitCode).toBe(0);
		const androidApex = Bun.spawnSync({
			cmd: [process.execPath, "-e", "import './app.config.ts'"],
			cwd: path.join(import.meta.dir, ".."),
			env: {
				...process.env,
				APP_VARIANT: "production",
				GND_IOS_PUBLIC_RELEASE: "false",
				EXPO_PUBLIC_BASE_URL: "https://gndprodesk.com",
				EXPO_PUBLIC_EMAIL: "",
				EXPO_PUBLIC_TOK: "",
			},
		});
		expect(androidApex.exitCode).toBe(0);
	});
});
