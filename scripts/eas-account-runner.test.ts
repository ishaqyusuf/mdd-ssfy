import { describe, expect, it } from "bun:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const repositoryRoot = path.join(import.meta.dir, "..");

describe("EAS account runner release routing", () => {
	it("preserves Android defaults and routes explicit iOS release commands", async () => {
		const source = await readFile(
			path.join(repositoryRoot, "scripts/eas-account-runner.ts"),
			"utf8",
		);
		const rootPackage = JSON.parse(
			await readFile(path.join(repositoryRoot, "package.json"), "utf8"),
		) as { scripts: Record<string, string> };

		expect(source).toContain(
			'["submit", "build-submit"].includes(operation) ? "ios" : "android"',
		);
		expect(source).toContain('return ["bun", "run", `eas-build:${target}`]');
		expect(source).toContain('return ["bun", "run", "eas-build:ios:prod"]');
		expect(source).toContain('return ["bun", "run", "eas-submit:ios:prod"]');
		expect(source).toContain(
			'return ["bun", "run", "eas-build-submit:ios:prod"]',
		);
		expect(rootPackage.scripts["eas:build"]).toBe(
			"bun ./scripts/eas-account-runner.ts build",
		);
		expect(rootPackage.scripts["eas:build:ios"]).toContain(
			"build --prod --platform ios",
		);
		expect(rootPackage.scripts["eas:submit:ios"]).toContain(
			"submit --prod --platform ios",
		);
		expect(rootPackage.scripts["eas:build-submit:ios"]).toContain(
			"build-submit --prod --platform ios",
		);
	});
});
