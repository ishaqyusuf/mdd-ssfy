import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import {
	assertSalesRequestEvaluationRuntimeLock,
	buildSalesRequestEvaluationRuntimeLock,
} from "./runtime-lock";

const repositoryRoot = resolve(import.meta.dir, "../../../../../..");

describe("sales request evaluation runtime lock", () => {
	test("deterministically includes the complete first-party evaluation boundary", async () => {
		const first = await buildSalesRequestEvaluationRuntimeLock(repositoryRoot);
		const second = await buildSalesRequestEvaluationRuntimeLock(repositoryRoot);
		const lock = JSON.parse(first) as {
			files: Array<{ path: string; sha256: string }>;
		};
		const paths = lock.files.map(({ path }) => path);

		expect(second).toBe(first);
		expect(paths).toContain("packages/sales/src/sales-form-core.ts");
		expect(paths).toContain(
			"packages/sales/src/sales-form/domain/step-engine.ts",
		);
		expect(paths).toContain(
			"packages/settings/src/sales-request-ai-catalog.ts",
		);
		expect(paths).toContain("apps/api/src/services/sales-request-images.ts");
		expect(paths).toContain(
			"packages/inventory/src/application/suppliers/suppliers.ts",
		);
		expect(paths).toContain("packages/cache/src/redis-client.ts");
		expect(paths).toContain("packages/logger/src/index.ts");
		expect(paths).toContain("packages/utils/src/sales.ts");
		expect(paths).toContain(
			"apps/api/src/services/request-generation/evaluation/runtime-lock.ts",
		);
		expect(paths.some((path) => path.endsWith(".test.ts"))).toBe(false);
		expect(
			lock.files.every(({ sha256 }) => /^[a-f0-9]{64}$/.test(sha256)),
		).toBe(true);
	});

	test("rejects an archived lock that differs from current sources", async () => {
		await expect(
			assertSalesRequestEvaluationRuntimeLock({
				repositoryRoot,
				archived: '{"schemaVersion":1,"files":[]}\n',
			}),
		).rejects.toThrow("runtime changed");
	});
});
