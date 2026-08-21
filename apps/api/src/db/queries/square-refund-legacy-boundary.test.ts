import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

describe("Square refund legacy boundary", () => {
	test("blocks Square refunds before the legacy transaction writes", () => {
		const source = readFileSync(
			new URL("./wallet.ts", import.meta.url),
			"utf8",
		);
		const guard = source.indexOf(
			"Square refunds must be created from Sales Overview",
		);
		const transaction = source.indexOf("db.$transaction");
		expect(guard).toBeGreaterThanOrEqual(0);
		expect(transaction).toBeGreaterThan(guard);
	});
});
