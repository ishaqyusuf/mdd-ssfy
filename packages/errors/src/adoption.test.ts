import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = resolve(
	dirname(fileURLToPath(import.meta.url)),
	"../../..",
);

function read(relativePath: string) {
	return readFileSync(resolve(workspaceRoot, relativePath), "utf8");
}

function sourceFiles(relativeDirectory: string): string[] {
	const directory = resolve(workspaceRoot, relativeDirectory);
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const relativePath = `${relativeDirectory}/${entry.name}`;
		return entry.isDirectory() ? sourceFiles(relativePath) : [relativePath];
	});
}

describe("error-system adoption policy", () => {
	it("keeps source-exported packages resolvable by Turbopack", () => {
		const sourcePaths = [
			...sourceFiles("packages/errors/src"),
			...sourceFiles("packages/observability/src"),
			"packages/db/src/transactions.ts",
		];

		for (const sourcePath of sourcePaths) {
			const hasEmittedJavaScriptImport =
				/(?:from\s+|export\s+.*from\s+)["']\.\.?\/[^"']+\.js["']/.test(
					read(sourcePath),
				);
			expect(hasEmittedJavaScriptImport).toBe(false);
		}
	});

	it("normalizes every API procedure and REST fallback", () => {
		const trpc = read("apps/api/src/trpc/init.ts");
		const api = read("apps/api/src/index.ts");

		expect(trpc).toContain("withErrorContractMiddleware");
		expect(trpc).toContain("errorFormatter");
		expect(trpc).toContain("appError");
		expect(api).toContain("getRestErrorResponse");
		expect(api).not.toContain('{ error: "Internal Server Error" }');
	});

	it("keeps shared error handling installed in every user-facing app", () => {
		for (const app of ["dashboard", "dealership", "storefront", "mobile"]) {
			const manifest = JSON.parse(read(`apps/${app}/package.json`)) as {
				dependencies?: Record<string, string>;
			};
			expect(manifest.dependencies?.["@gnd/errors"]).toBe("workspace:*");
		}

		expect(
			existsSync(resolve(workspaceRoot, "apps/dashboard/src/app/error.tsx")),
		).toBe(true);
		expect(
			existsSync(resolve(workspaceRoot, "apps/dealership/src/app/error.tsx")),
		).toBe(true);
		expect(
			existsSync(resolve(workspaceRoot, "apps/storefront/src/app/error.tsx")),
		).toBe(true);
	});

	it("does not serialize raw server-action errors", () => {
		for (const action of [
			"apps/dashboard/src/actions/safe-action.ts",
			"apps/storefront/src/actions/safe-action.ts",
		]) {
			const source = read(action);
			expect(source).toContain("getErrorPresentation");
			expect(source).toContain("buildErrorReport");
			expect(source).toContain("Sentry.captureException");
			expect(source).not.toContain("error.message");
		}
	});

	it("governs database transactions project-wide", () => {
		const source = read("packages/sales/src/sales-control/tasks.ts");
		const database = read("packages/db/src/index.ts");
		const checkout = read(
			"apps/dashboard/src/actions/create-sales-payment-checkout.ts",
		);

		expect(database).toContain(
			"transactionOptions: DEFAULT_DB_TRANSACTION_OPTIONS",
		);
		expect(source).toContain("runDbTransaction");
		expect(source).not.toContain("maxWait: 30 * 1000");
		expect(checkout).toContain("runDbTransaction");
		expect(
			checkout.indexOf("squareClient.checkout.paymentLinks.create"),
		).toBeGreaterThan(checkout.indexOf("const redirectUrl"));
	});
});
