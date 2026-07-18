import { describe, expect, test } from "bun:test";
import { getRequestCountryCode } from "./request-country";

function headers(values: Record<string, string>) {
	const normalized = new Map(
		Object.entries(values).map(([key, value]) => [key.toLowerCase(), value]),
	);

	return {
		get(name: string) {
			return normalized.get(name.toLowerCase()) ?? null;
		},
	};
}

describe("getRequestCountryCode", () => {
	test("reads and normalizes the Vercel country header", () => {
		expect(
			getRequestCountryCode(headers({ "x-vercel-ip-country": " us " })),
		).toBe("US");
	});

	test("falls back to the Cloudflare country header", () => {
		expect(getRequestCountryCode(headers({ "cf-ipcountry": "ng" }))).toBe("NG");
	});

	test("prefers Vercel when both edge headers are present", () => {
		expect(
			getRequestCountryCode(
				headers({
					"x-vercel-ip-country": "CA",
					"cf-ipcountry": "US",
				}),
			),
		).toBe("CA");
	});

	test("rejects unknown and malformed country values", () => {
		expect(getRequestCountryCode(headers({ "cf-ipcountry": "XX" }))).toBe(null);
		expect(getRequestCountryCode(headers({ "cf-ipcountry": "Nigeria" }))).toBe(
			null,
		);
		expect(getRequestCountryCode(null)).toBe(null);
	});
});
