import { afterEach, describe, expect, it } from "bun:test";
import { getAppUrl } from "./envs";

const original = {
	NODE_ENV: process.env.NODE_ENV,
	VERCEL_ENV: process.env.VERCEL_ENV,
	NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
};

afterEach(() => {
	for (const [key, value] of Object.entries(original)) {
		if (value === undefined) delete process.env[key];
		else process.env[key] = value;
	}
});

describe("getAppUrl", () => {
	it("uses the configured HTTPS dashboard origin for local checkout returns", () => {
		process.env.NODE_ENV = "development";
		delete process.env.VERCEL_ENV;
		process.env.NEXT_PUBLIC_APP_URL = "https://gndprodesk.localhost/";
		expect(getAppUrl()).toBe("https://gndprodesk.localhost");
	});

	it("keeps production and the local fallback unchanged", () => {
		process.env.NODE_ENV = "production";
		process.env.NEXT_PUBLIC_APP_URL = "https://gndprodesk.localhost";
		expect(getAppUrl()).toBe("https://gndprodesk.com");
		process.env.NODE_ENV = "development";
		delete process.env.NEXT_PUBLIC_APP_URL;
		expect(getAppUrl()).toBe("http://localhost:3010");
	});
});
