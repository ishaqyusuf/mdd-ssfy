import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

describe("new sales form local recovery alert", () => {
	it("keeps local recovery available while hiding its alert", () => {
		const source = readFileSync(
			new URL("./new-sales-form.tsx", import.meta.url),
			"utf8",
		);

		expect(source).toContain("const SHOW_LOCAL_RECOVERY_ALERT = false;");
		expect(
			(source.match(/SHOW_LOCAL_RECOVERY_ALERT && recoverySnapshot/g) || [])
				.length,
		).toBe(2);
		expect(source).toContain("applyRecoverySnapshot");
	});
});
