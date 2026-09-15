import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	IOS_BACKEND_DEPLOYMENT_TARGET,
	readProjectLink,
	runDeploymentTargetCheck,
	validateDashboardProjectLink,
} from "./ios-backend-deployment-target";

describe("iOS backend deployment target guard", () => {
	test("accepts only the known dashboard production project", () => {
		expect(
			validateDashboardProjectLink({
				projectId: IOS_BACKEND_DEPLOYMENT_TARGET.projectId,
				projectName: IOS_BACKEND_DEPLOYMENT_TARGET.projectName,
			}),
		).toEqual([
			{
				ok: true,
				message: `Project ID matches ${IOS_BACKEND_DEPLOYMENT_TARGET.projectId}`,
			},
			{
				ok: true,
				message: `Project name matches ${IOS_BACKEND_DEPLOYMENT_TARGET.projectName}`,
			},
		]);
	});

	test("rejects the repository-root storefront project", () => {
		const checks = validateDashboardProjectLink({
			projectId: "prj_HztAbqjAI9tBzSg4rIXqLyinczDj",
			projectName: "gnd-storefront",
		});

		expect(checks.every((check) => !check.ok)).toBe(true);
		expect(checks.map((check) => check.message).join("\n")).toContain(
			"gnd-storefront",
		);
	});

	test("reads and validates an explicit project link", () => {
		const directory = mkdtempSync(join(tmpdir(), "gnd-ios-vercel-target-"));
		const projectFile = join(directory, "project.json");
		writeFileSync(
			projectFile,
			JSON.stringify({
				projectId: IOS_BACKEND_DEPLOYMENT_TARGET.projectId,
				projectName: IOS_BACKEND_DEPLOYMENT_TARGET.projectName,
			}),
		);

		expect(
			runDeploymentTargetCheck(projectFile).every((check) => check.ok),
		).toBe(true);
	});

	test("fails closed for a missing or malformed project link", () => {
		const directory = mkdtempSync(join(tmpdir(), "gnd-ios-vercel-target-"));
		const missingFile = join(directory, "missing.json");
		const malformedFile = join(directory, "malformed.json");
		writeFileSync(malformedFile, "not-json");

		expect(() => readProjectLink(missingFile)).toThrow("Missing");
		expect(() => readProjectLink(malformedFile)).toThrow("Unable to parse");
	});
});
