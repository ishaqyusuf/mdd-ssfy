import { describe, it } from "bun:test";
import assert from "node:assert/strict";

import { formatBusinessDate } from "./format-business-date";

describe("formatBusinessDate", () => {
	it("keeps a date-only inbound ETA stable in the business timezone", () => {
		assert.equal(
			formatBusinessDate("2026-07-29T04:00:00.000Z"),
			"Jul 29, 2026",
		);
	});
});
