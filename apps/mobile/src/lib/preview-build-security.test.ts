import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const appRoot = join(currentDir, "../..");

const readAppFile = (relativePath: string) =>
	readFileSync(join(appRoot, relativePath), "utf8");

describe("mobile preview build security", () => {
	it("keeps quick login and debug controls behind the Expo dev runtime", () => {
		const quickAccess = readAppFile("src/components/login-quick-access.tsx");
		const debug = readAppFile("src/components/debug.tsx");
		const loginTemplates = [
			readAppFile("src/components/login-template-0.tsx"),
			readAppFile("src/components/login-template-1.tsx"),
		];

		expect(quickAccess).toContain("if (!__DEV__) return null;");
		const quickAccessWrapper = quickAccess.slice(
			quickAccess.indexOf("export function LoginQuickAccess"),
			quickAccess.indexOf("function DevLoginQuickAccess"),
		);
		expect(quickAccessWrapper).not.toContain("useQuery(");
		expect(quickAccess).toContain(
			"_trpc.hrm.getQuickLoginEmployees.queryOptions()",
		);
		expect(quickAccess).not.toContain(
			"_trpc.hrm.getEmployees.queryOptions({ size: 999 })",
		);
		expect(debug).toContain("if (!__DEV__) return null;");

		for (const source of loginTemplates) {
			expect(source).toMatch(
				/email:\s*__DEV__\s*\?\s*process\.env\.EXPO_PUBLIC_EMAIL\?\.split\(","\)\?\.\[0\]\s*\?\?\s*""\s*:\s*""/,
			);
			expect(source).toMatch(
				/password:\s*__DEV__\s*\?\s*process\.env\.EXPO_PUBLIC_TOK\s*\?\?\s*""\s*:\s*""/,
			);
		}
	});

	it("removes dev credentials and disables Sentry before non-production builds and updates", () => {
		const packageJson = JSON.parse(readAppFile("package.json")) as {
			scripts: Record<string, string>;
		};
		const updateScript = readAppFile("scripts/update-preview.mjs");

		expect(packageJson.scripts["eas-build:dev"]).toContain(
			"EXPO_PUBLIC_SENTRY_ENABLED=false EXPO_PUBLIC_SENTRY_DEBUG=false EXPO_PUBLIC_SENTRY_SMOKE_TEST=false SENTRY_DISABLE_AUTO_UPLOAD=true eas build",
		);
		expect(packageJson.scripts["eas-build:preview"]).toContain(
			"with-env:prod env -u EXPO_PUBLIC_EMAIL -u EXPO_PUBLIC_TOK EXPO_PUBLIC_SENTRY_ENABLED=false EXPO_PUBLIC_SENTRY_DEBUG=false EXPO_PUBLIC_SENTRY_SMOKE_TEST=false SENTRY_DISABLE_AUTO_UPLOAD=true EXPO_NO_DOTENV=1 eas build",
		);
		expect(updateScript).toMatch(
			/"env",\s*"-u",\s*"EXPO_PUBLIC_EMAIL",\s*"-u",\s*"EXPO_PUBLIC_TOK",\s*"EXPO_PUBLIC_SENTRY_ENABLED=false",\s*"EXPO_PUBLIC_SENTRY_DEBUG=false",\s*"EXPO_PUBLIC_SENTRY_SMOKE_TEST=false",\s*"SENTRY_DISABLE_AUTO_UPLOAD=true",\s*"EXPO_NO_DOTENV=1",\s*"eas"/,
		);
	});
});
