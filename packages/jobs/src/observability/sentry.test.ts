import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
	getSentrySourceMapUploadConfig,
	getSentryTaskFailureContext,
	isSentryEnabled,
	shouldCaptureSentryTaskFailure,
} from "./sentry";

const jobsRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

describe("job Sentry capture policy", () => {
	it("only enables capture in production with a DSN", () => {
		expect(isSentryEnabled({ nodeEnv: "production", dsn: "https://dsn" })).toBe(
			true,
		);
		expect(
			isSentryEnabled({ nodeEnv: "development", dsn: "https://dsn" }),
		).toBe(false);
		expect(isSentryEnabled({ nodeEnv: "production" })).toBe(false);
		expect(
			isSentryEnabled({
				environment: "preview",
				nodeEnv: "production",
				dsn: "https://dsn",
			}),
		).toBe(false);
	});

	it("enables source-map upload only with explicit complete credentials", () => {
		expect(
			getSentrySourceMapUploadConfig({
				authToken: "token",
				environment: "production",
				org: "gnd-52",
			}),
		).toBeNull();
		expect(
			getSentrySourceMapUploadConfig({
				authToken: "token",
				environment: "production",
				org: "gnd-52",
				project: "gnd-prodesk-backend",
				release: "release-id",
			}),
		).toEqual({
			authToken: "token",
			org: "gnd-52",
			project: "gnd-prodesk-backend",
			release: "release-id",
		});
		expect(
			getSentrySourceMapUploadConfig({
				authToken: "token",
				environment: "preview",
				org: "gnd-52",
				project: "gnd-prodesk-backend",
			}),
		).toBeNull();
	});

	it("captures failures only from Trigger's production environment", () => {
		expect(
			shouldCaptureSentryTaskFailure({
				enabled: true,
				environmentType: "PRODUCTION",
			}),
		).toBe(true);
		expect(
			shouldCaptureSentryTaskFailure({
				enabled: true,
				environmentType: "PREVIEW",
			}),
		).toBe(false);
	});

	it("autoloads the global failure hook from the configured trigger directory", () => {
		const config = readFileSync(resolve(jobsRoot, "trigger.config.ts"), "utf8");
		const initPath = resolve(jobsRoot, "src/tasks/init.ts");
		const init = readFileSync(initPath, "utf8");

		expect(config).toContain('dirs: ["./src/tasks"]');
		expect(existsSync(initPath)).toBe(true);
		expect(existsSync(resolve(jobsRoot, "trigger/init.ts"))).toBe(false);
		expect(init).toContain("tasks.onFailure");
		expect(init).not.toContain("payload");
	});

	it("includes operational identifiers without task payload data", () => {
		const context = getSentryTaskFailureContext(
			Object.assign(new Error("Transaction expired"), { code: "P2028" }),
			{
				attempt: {
					number: 2,
					startedAt: new Date("2026-07-28T00:00:00.000Z"),
				},
				deployment: {
					id: "deployment-id",
					version: "20260728.1",
					shortCode: "abc123",
					runtime: "node",
					runtimeVersion: "22",
				},
				environment: {
					id: "environment-id",
					slug: "prod",
					type: "PRODUCTION",
				},
				run: {
					id: "run-id",
					tags: [],
					isTest: false,
					isReplay: false,
					createdAt: new Date("2026-07-28T00:00:00.000Z"),
					startedAt: new Date("2026-07-28T00:00:01.000Z"),
				},
			},
			"sales-report",
		);

		expect(context.tags).toMatchObject({
			error_code: "DATABASE_TRANSACTION_TIMEOUT",
			runtime: "jobs",
			source: "trigger-task",
			task: "sales-report",
			trigger_environment: "prod",
			trigger_environment_type: "PRODUCTION",
		});
		expect(context.extra).toEqual({
			attempt: 2,
			deploymentVersion: "20260728.1",
			runId: "run-id",
		});
		expect("payload" in context.extra).toBe(false);
	});
});
