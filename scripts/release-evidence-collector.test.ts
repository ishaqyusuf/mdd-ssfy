import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
	providerErrorDetails,
	providerIso,
	repositoryHasCommit,
	selectSuccessfulGithubDeploymentStatus,
} from "../.release/gnd-evidence-collector";

const root = resolve(import.meta.dir, "..");

describe("GND release evidence normalization", () => {
	test("accepts provider timestamps in seconds or milliseconds only", () => {
		expect(providerIso(1_700_000_000)).toBe("2023-11-14T22:13:20.000Z");
		expect(providerIso(1_700_000_000_000)).toBe("2023-11-14T22:13:20.000Z");
		expect(providerIso("invalid")).toBeNull();
	});

	test("reports only sanitized provider status and error code", async () => {
		const response = new Response(
			JSON.stringify({
				error: {
					code: "forbidden",
					message: "sensitive provider detail",
				},
			}),
			{ status: 403 },
		);
		expect(await providerErrorDetails(response)).toBe("HTTP 403 (forbidden)");
		expect(await response.text()).toContain("sensitive provider detail");
	});

	test("drops unsafe provider error codes", async () => {
		const response = new Response(
			JSON.stringify({ error: { code: "token=should-not-print" } }),
			{ status: 401 },
		);
		expect(await providerErrorDetails(response)).toBe("HTTP 401");
	});

	test("accepts only successful HTTPS Vercel deployment statuses", () => {
		expect(
			selectSuccessfulGithubDeploymentStatus([
				{
					state: "failure",
					creator: { login: "vercel[bot]" },
					environment_url: "https://failed.vercel.app",
					updated_at: "2026-09-27T20:00:00Z",
				},
				{
					state: "success",
					creator: { login: "attacker" },
					environment_url: "https://user:secret@example.com",
					updated_at: "2026-09-27T20:01:00Z",
				},
				{
					state: "success",
					creator: { login: "vercel[bot]" },
					environment_url: "https://gnd-preview.vercel.app",
					updated_at: "2026-09-27T20:02:00Z",
				},
			]),
		).toEqual({
			hostname: "gnd-preview.vercel.app",
			completedAt: "2026-09-27T20:02:00.000Z",
		});
	});

	test("treats unreachable historical revisions as unavailable", () => {
		expect(repositoryHasCommit(root, "HEAD")).toBe(true);
		expect(
			repositoryHasCommit(root, "0000000000000000000000000000000000000000"),
		).toBe(false);
	});
});

describe("GND release workflow trust boundary", () => {
	test("executes only trusted tooling in the credentialed job", () => {
		const workflow = readFileSync(
			resolve(root, ".github/workflows/release-assurance.yml"),
			"utf8",
		);
		expect(workflow).toContain("pull_request_target:");
		expect(workflow).not.toContain("working-directory: candidate");
		expect(workflow).not.toContain("candidate/node_modules");
		expect(workflow).toContain("persist-credentials: false");
		expect(workflow).toContain("--ignore-scripts");
		expect(workflow).toContain("--trusted-repo");
		expect(workflow).toContain("deployments: read");
		expect(workflow).toContain("GND_RELEASE_GITHUB_TOKEN: ${{ github.token }}");
		expect(workflow).not.toContain("GND_RELEASE_VERCEL_");
	});
});
