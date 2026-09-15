import { describe, expect, it } from "bun:test";
import path from "node:path";

import { parseReviewedBuildId } from "./ios-submit-by-id";

const REVIEWED_ID = "11111111-2222-4333-8444-555555555555";

describe("public iOS upload build selector", () => {
	it("accepts exactly one reviewed build ID", () => {
		expect(parseReviewedBuildId(["--id", REVIEWED_ID])).toBe(REVIEWED_ID);
		expect(parseReviewedBuildId([`--id=${REVIEWED_ID}`])).toBe(REVIEWED_ID);
	});

	it("rejects selectors and flags that could change upload scope", () => {
		for (const args of [
			[],
			["--latest"],
			["--id"],
			["--id", "not-a-uuid"],
			["--id", REVIEWED_ID, "--latest"],
			["--id", REVIEWED_ID, "--platform", "android"],
			["--id", REVIEWED_ID, `--id=${REVIEWED_ID}`],
			["--id", "3f3a6acf-ac06-42b8-ab72-1837480f49cc"],
			["--id", "f3985128-844d-432c-bbc3-e0e4c93e37ac"],
		]) {
			expect(() => parseReviewedBuildId(args)).toThrow();
		}
	});

	it("fails a direct mobile-package call before any EAS interaction", () => {
		for (const args of [[], ["--latest"], ["--id", "not-a-uuid"]]) {
			const result = Bun.spawnSync({
				cmd: [process.execPath, "./scripts/ios-submit-by-id.ts", ...args],
				cwd: path.join(import.meta.dir, ".."),
				env: { ...process.env, EXPO_NO_DOTENV: "1" },
			});
			expect(result.exitCode).not.toBe(0);
			expect(result.stderr.toString()).toContain("Public iOS upload");
			expect(result.stdout.toString()).not.toContain("eas submit");
		}
	});

	it("blocks a valid reviewed ID without a per-invocation upload acknowledgment", () => {
		const result = Bun.spawnSync({
			cmd: [process.execPath, "./scripts/ios-submit-by-id.ts", "--id", REVIEWED_ID],
			cwd: path.join(import.meta.dir, ".."),
			env: {
				...process.env,
				EXPO_NO_DOTENV: "1",
				GND_IOS_UPLOAD_ACK: "",
			},
		});
		expect(result.exitCode).not.toBe(0);
		expect(result.stderr.toString()).toContain("GND_IOS_UPLOAD_ACK=1");
		expect(result.stdout.toString()).not.toContain("eas submit");
	});
});
