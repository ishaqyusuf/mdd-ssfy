import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const deployableApps = [
	"apps/api",
	"apps/dashboard",
	"apps/dealership",
	"apps/storefront",
] as const;

const ignoredPaths = readFileSync(resolve(root, ".vercelignore"), "utf8")
	.split(/\r?\n/)
	.map((line) => line.trim().replace(/\/$/, ""))
	.filter((line) => line && !line.startsWith("#") && !line.startsWith("!"));

describe("Vercel deployment source boundaries", () => {
	it.each(deployableApps)("%s remains in the shared Vercel upload", (app) => {
		expect(ignoredPaths).not.toContain(app);
	});

	it("generates Prisma Client after the dashboard's filtered install", () => {
		const dashboardConfig = JSON.parse(
			readFileSync(resolve(root, "apps/dashboard/vercel.json"), "utf8"),
		) as { fluid?: boolean; installCommand?: string };

		expect(dashboardConfig.installCommand).toBe(
			"bun install --filter @gnd/dashboard --frozen-lockfile && bun run --filter @gnd/db prisma:generate:ci",
		);
	});

	it("enables Fluid Compute through deployment-owned configuration", () => {
		const dashboardConfig = JSON.parse(
			readFileSync(resolve(root, "apps/dashboard/vercel.json"), "utf8"),
		) as { fluid?: boolean };

		expect(dashboardConfig.fluid).toBe(true);
	});
});
