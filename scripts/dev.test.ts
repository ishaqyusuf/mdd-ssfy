// @ts-expect-error Bun test types are not included by the root TypeScript config.
import { describe, expect, test } from "bun:test";
import { commandForProfile, parseArgs } from "./dev";

describe("dev script profile router", () => {
	test("defaults to local", () => {
		expect(parseArgs([])).toEqual({ profile: "local" });
	});

	test("supports remote-dev", () => {
		expect(parseArgs(["--remote-dev"])).toEqual({ profile: "remote-dev" });
		expect(commandForProfile("remote-dev")).toEqual([
			"bun",
			"scripts/with-dev-infra.ts",
			"--db",
			"remote-dev",
			"--redis",
			"remote-dev",
			"--",
			"bun",
			"scripts/dev-run.ts",
		]);
	});

	test("supports prod", () => {
		expect(parseArgs(["--prod"])).toEqual({ profile: "prod" });
		expect(commandForProfile("prod")).toEqual([
			"turbo",
			"dev:prod",
			"--parallel",
			"--filter",
			"@gnd/www",
			"--filter",
			"@gnd/api",
		]);
	});

	test("rejects conflicting profile flags", () => {
		expect(() => parseArgs(["--local", "--remote-dev"])).toThrow(
			"Conflicting dev flags",
		);
	});

	test("passes exact monorepo package filters through", () => {
		const options = parseArgs(["--filter", "@gnd/site", "@gnd/www", "@gnd/jobs"]);

		expect(options).toEqual({
			profile: "local",
			filters: {
				targets: ["@gnd/site", "@gnd/www", "@gnd/jobs"],
			},
		});
		expect(commandForProfile(options.profile, options.filters)).toEqual([
			"bun",
			"scripts/with-dev-infra.ts",
			"--db",
			"local",
			"--redis",
			"local",
			"--",
			"bun",
			"scripts/dev-run.ts",
			"--filter",
			"@gnd/site",
			"--filter",
			"@gnd/www",
			"--filter",
			"@gnd/jobs",
		]);
	});

	test("supports suffix exclusion syntax for monorepo filters", () => {
		const options = parseArgs([
			"--remote-dev",
			"--filter",
			"@gnd/api!",
			"@gnd/site!",
		]);

		expect(options).toEqual({
			profile: "remote-dev",
			filters: {
				targets: ["!@gnd/api", "!@gnd/site"],
			},
		});
		expect(commandForProfile(options.profile, options.filters)).toContain(
			"!@gnd/api",
		);
		expect(commandForProfile(options.profile, options.filters)).toContain(
			"!@gnd/site",
		);
	});

	test("supports bare package-name shorthand for exact workspace packages", () => {
		const options = parseArgs(["--filter", "api", "site!", "@gnd/jobs"]);

		expect(options).toEqual({
			profile: "local",
			filters: {
				targets: ["@gnd/api", "!@gnd/site", "@gnd/jobs"],
			},
		});
		expect(commandForProfile(options.profile, options.filters)).toEqual([
			"bun",
			"scripts/with-dev-infra.ts",
			"--db",
			"local",
			"--redis",
			"local",
			"--",
			"bun",
			"scripts/dev-run.ts",
			"--filter",
			"@gnd/api",
			"--filter",
			"!@gnd/site",
			"--filter",
			"@gnd/jobs",
		]);
	});

	test("supports filter flag aliases", () => {
		const expectedTargets = ["@gnd/api", "!@gnd/site"];

		for (const filterFlag of ["--filter", "--f", "-f", "-filter"]) {
			expect(parseArgs([filterFlag, "api", "site!"])).toEqual({
				profile: "local",
				filters: {
					targets: expectedTargets,
				},
			});
		}

		expect(parseArgs(["--filter", "api", "-f", "jobs", "--f", "site!"])).toEqual(
			{
				profile: "local",
				filters: {
					targets: ["@gnd/api", "@gnd/jobs", "!@gnd/site"],
				},
			},
		);
	});

	test("passes complex turbo selectors through without package validation", () => {
		expect(
			parseArgs([
				"--filter",
				"@gnd/marketing...",
				"...@gnd/dashboard",
				"@gnd/*",
				"{apps/*}",
				"[main]",
			]),
		).toEqual({
			profile: "local",
			filters: {
				targets: [
					"@gnd/marketing...",
					"...@gnd/dashboard",
					"@gnd/*",
					"{apps/*}",
					"[main]",
				],
			},
		});
	});

	test("lists valid packages when a filter target is missing", () => {
		expect(() => parseArgs(["--filter", "marketing", "@gnd/dashboard"])).toThrow(
			/Unknown dev filter packages: marketing, @gnd\/dashboard\nAvailable packages:\napps\/:\n  @gnd\/api[\s\S]*  @gnd\/www\npackages\/:\n  @gnd\/app-store[\s\S]*  @gnd\/utils/,
		);
	});
});
