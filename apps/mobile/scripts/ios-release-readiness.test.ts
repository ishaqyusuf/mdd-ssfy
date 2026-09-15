import { describe, expect, it } from "bun:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

import appConfig from "../app.config";

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
});
