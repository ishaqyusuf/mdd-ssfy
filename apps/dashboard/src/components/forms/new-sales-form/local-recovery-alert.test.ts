import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

describe("new sales form local recovery alert", () => {
	it("keeps local recovery available while hiding recovery and leave alerts", () => {
		const source = readFileSync(
			new URL("./new-sales-form.tsx", import.meta.url),
			"utf8",
		);

		assert.ok(source.includes("const SHOW_LOCAL_RECOVERY_ALERT = false;"));
		assert.equal(
			(source.match(/SHOW_LOCAL_RECOVERY_ALERT && recoverySnapshot/g) || [])
				.length,
			2,
		);
		assert.ok(source.includes("applyRecoverySnapshot"));
		assert.ok(
			source.includes('window.addEventListener("pagehide", persistSnapshot)'),
		);
		assert.ok(
			source.includes(
				'window.addEventListener("beforeunload", persistSnapshot)',
			),
		);
		assert.ok(!source.includes("shouldPromptOnLeave"));
		assert.ok(!source.includes("leaveWarningBypassedRef"));
		assert.ok(
			!source.includes(
				"You have unsaved changes that may not be safely persisted yet.",
			),
		);
	});
});
