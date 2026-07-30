import { describe, expect, it } from "bun:test";

import {
	parseSalesFormPreferenceCookie,
	serializeSalesFormPreferenceCookie,
} from "./sales-form-preference";

describe("sales form preference cookie", () => {
	it("round trips a versioned preference for the authenticated user", () => {
		const value = serializeSalesFormPreferenceCookie({
			userId: 14,
			mode: "legacy",
		});

		expect(parseSalesFormPreferenceCookie(value, 14)).toMatchObject({
			version: 1,
			userId: 14,
			mode: "legacy",
		});
	});

	it("rejects another user's, malformed, and unsupported cookies", () => {
		const value = serializeSalesFormPreferenceCookie({
			userId: 14,
			mode: "new",
		});

		expect(parseSalesFormPreferenceCookie(value, 15)).toBeNull();
		expect(parseSalesFormPreferenceCookie("not-json", 14)).toBeNull();
		expect(
			parseSalesFormPreferenceCookie(
				JSON.stringify({ version: 2, userId: 14, mode: "new" }),
				14,
			),
		).toBeNull();
	});
});
