import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

const repositoryRoot = path.join(import.meta.dir, "..");

describe("EAS account runner release routing", () => {
	it("supports identity switching without starting a release action", async () => {
		const source = await readFile(
			path.join(repositoryRoot, "scripts/eas-account-runner.ts"),
			"utf8",
		);
		const rootPackage = JSON.parse(
			await readFile(path.join(repositoryRoot, "package.json"), "utf8"),
		) as { scripts: Record<string, string> };

		expect(rootPackage.scripts["eas:auth"]).toBe(
			"bun ./scripts/eas-account-runner.ts auth",
		);
		expect(source).toContain('operation === "auth"');
		expect(source).toContain('return ["eas", "whoami"]');
	});

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
			"submit --prod --platform ios --require-id",
		);
		expect(rootPackage.scripts["eas:build-submit:ios"]).toContain(
			"build-submit --prod --platform ios",
		);
		expect(rootPackage.scripts["eas:appstore:build:ios"]).toBe(
			rootPackage.scripts["eas:build:ios"],
		);
		expect(rootPackage.scripts["eas:appstore:upload:ios"]).toBe(
			rootPackage.scripts["eas:submit:ios"],
		);
		expect(rootPackage.scripts["eas:appstore:build-upload:ios"]).toBe(
			rootPackage.scripts["eas:build-submit:ios"],
		);
		expect(source).toContain("iOS App Store builds require --prod.");
		expect(source).toContain('return ["bun", "run", "eas-submit:ios:by-id", ...forwardedArguments]');
		expect(source).toContain("Public App Store upload requires --id <reviewed-EAS-build-id>.");
	});

	it("rejects an unreviewed iOS build before account authentication", () => {
		for (const args of [
			[],
			["--id", "not-a-build-id"],
			["--id", "f3985128-844d-432c-bbc3-e0e4c93e37ac", "--latest"],
			["--id", "f3985128-844d-432c-bbc3-e0e4c93e37ac", "--latest=true"],
			[
				"--id",
				"f3985128-844d-432c-bbc3-e0e4c93e37ac",
				"--id",
				"3f3a6acf-ac06-42b8-ab72-1837480f49cc",
			],
		]) {
			const result = spawnSync(
				process.execPath,
				[
					"./scripts/eas-account-runner.ts",
					"submit",
					"--prod",
					"--platform",
					"ios",
					...args,
				],
				{ cwd: repositoryRoot, encoding: "utf8" },
			);
			expect(result.status).not.toBe(0);
			expect(result.stderr).toContain(
				"Public App Store upload requires --id <reviewed-EAS-build-id>.",
			);
			expect(result.stdout).not.toContain("Authenticated EAS session");
		}
	});

	it("gates combined iOS build and automatic upload before account authentication", () => {
		for (const args of [
			[],
			["--acknowledge-build"],
			["--acknowledge-auto-upload"],
		]) {
			const result = spawnSync(
				process.execPath,
				[
					"./scripts/eas-account-runner.ts",
					"build-submit",
					"--prod",
					"--platform",
					"ios",
					...args,
				],
				{ cwd: repositoryRoot, encoding: "utf8" },
			);
			expect(result.status).not.toBe(0);
			expect(result.stderr).toContain(
				"Combined iOS build/upload requires --acknowledge-build and --acknowledge-auto-upload before EAS authentication.",
			);
			expect(result.stdout).not.toContain("Authenticated EAS session");
		}
	});

	it("gates direct mobile-package auto-submit without either acknowledgment", () => {
		for (const [buildAck, uploadAck, allowed] of [
			["", "", false],
			["1", "", false],
			["", "1", false],
			["1", "1", true],
		] as const) {
			const result = spawnSync(
				process.execPath,
				["./apps/mobile/scripts/ios-auto-submit-gate.ts"],
				{
					cwd: repositoryRoot,
					encoding: "utf8",
					env: {
						...process.env,
						GND_IOS_BUILD_ACK: buildAck,
						GND_IOS_AUTO_UPLOAD_ACK: uploadAck,
					},
				},
			);
			expect(result.status === 0).toBe(allowed);
		}
	});

	it("rejects Android platform on iOS-only submit routes before EAS authentication", () => {
		for (const operation of ["submit", "build-submit"]) {
			const result = spawnSync(
				process.execPath,
				[
					"./scripts/eas-account-runner.ts",
					operation,
					"--prod",
					"--platform",
					"android",
				],
				{ cwd: repositoryRoot, encoding: "utf8" },
			);
			expect(result.status).not.toBe(0);
			expect(result.stderr).toContain(
				"EAS submit and combined build/upload routes support only --platform ios.",
			);
			expect(result.stdout).not.toContain("Authenticated EAS session");
		}
	});
});
