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
});
