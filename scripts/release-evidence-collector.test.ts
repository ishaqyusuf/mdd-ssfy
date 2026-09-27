import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { providerIso } from "../.release/gnd-evidence-collector";

const root = resolve(import.meta.dir, "..");

describe("GND release evidence normalization", () => {
	test("accepts provider timestamps in seconds or milliseconds only", () => {
		expect(providerIso(1_700_000_000)).toBe("2023-11-14T22:13:20.000Z");
		expect(providerIso(1_700_000_000_000)).toBe("2023-11-14T22:13:20.000Z");
		expect(providerIso("invalid")).toBeNull();
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
	});
});
