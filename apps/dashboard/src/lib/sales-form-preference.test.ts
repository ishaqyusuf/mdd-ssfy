import { describe, expect, it } from "bun:test";

import {
	parseSalesFormPreferenceCookie,
	resolveCurrentSalesFormCookieMode,
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

	it("stops honoring a legacy cookie after an admin moves the user to new", () => {
		const legacyUpdatedAt = new Date("2026-08-04T10:00:00.000Z");
		const legacyCookie = parseSalesFormPreferenceCookie(
			serializeSalesFormPreferenceCookie({
				userId: 14,
				mode: "legacy",
				updatedAt: legacyUpdatedAt,
			}),
			14,
		);

		expect(
			resolveCurrentSalesFormCookieMode(legacyCookie, {
				mode: "LEGACY",
				updatedAt: legacyUpdatedAt,
			}),
		).toBe("legacy");
		expect(
			resolveCurrentSalesFormCookieMode(legacyCookie, {
				mode: "NEW",
				updatedAt: new Date("2026-08-04T11:00:00.000Z"),
			}),
		).toBeNull();
	});

	it("continues honoring a cached new preference without a database read", () => {
		const newCookie = parseSalesFormPreferenceCookie(
			serializeSalesFormPreferenceCookie({ userId: 14, mode: "new" }),
			14,
		);

		expect(resolveCurrentSalesFormCookieMode(newCookie, null)).toBe("new");
	});
});
