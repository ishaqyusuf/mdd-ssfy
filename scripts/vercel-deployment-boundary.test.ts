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
	it("declares root reconciliation tools' workspace imports for clean installs", () => {
		const rootPackage = JSON.parse(
			readFileSync(resolve(root, "package.json"), "utf8"),
		) as { devDependencies: Record<string, string> };

		for (const dependency of ["@gnd/auth", "@gnd/db", "@gnd/sales"]) {
			expect(rootPackage.devDependencies[dependency]).toBe("workspace:*");
		}
	});

	it("declares the Calendar hydration test's tRPC dependencies in Dashboard", () => {
		const dashboardPackage = JSON.parse(
			readFileSync(resolve(root, "apps/dashboard/package.json"), "utf8"),
		) as { devDependencies: Record<string, string> };

		expect(dashboardPackage.devDependencies["@trpc/server"]).toBe("^11.6.0");
		expect(dashboardPackage.devDependencies["@trpc/tanstack-react-query"]).toBe(
			"^11.6.0",
		);
	});

	it("installs the error contract owned by Sales lifecycle commands", () => {
		const salesPackage = JSON.parse(
			readFileSync(resolve(root, "packages/sales/package.json"), "utf8"),
		) as { dependencies: Record<string, string> };

		expect(salesPackage.dependencies["@gnd/errors"]).toBe("workspace:*");
	});

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
