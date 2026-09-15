import { describe, expect, it } from "bun:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { isPublicHttpsOrigin, resolveConfiguredReleaseBaseUrl } from "./release-base-url";

const PUBLIC_ORIGIN = "https://api.example.com/";

describe("mobile release API and authentication origin", () => {
	it("routes both tRPC and mobile authentication through the same installed-release origin", async () => {
		const source = await readFile(path.join(import.meta.dir, "base-url.ts"), "utf8");
		expect(source).toContain("appVariant: Constants.expoConfig?.extra?.appVariant");
		expect(source.match(/const releaseBaseUrl = getReleaseBaseUrl\(\);/g)?.length).toBe(2);
		expect(source.match(/if \(releaseBaseUrl\) return releaseBaseUrl;/g)?.length).toBe(2);
	});

	it("uses the embedded installed-build variant rather than an absent or stale public env variant", () => {
		expect(resolveConfiguredReleaseBaseUrl({
			appVariant: "production",
			envVariant: "development",
			baseUrl: PUBLIC_ORIGIN,
		})).toBe("https://api.example.com");
		expect(resolveConfiguredReleaseBaseUrl({
			appVariant: "preview",
			envVariant: "production",
			baseUrl: "http://preview.example.com/",
		})).toBe("http://preview.example.com");
		expect(resolveConfiguredReleaseBaseUrl({
			envVariant: "production",
			baseUrl: PUBLIC_ORIGIN,
		})).toBe("https://api.example.com");
	});

	it("preserves debugger-host routing for development and Expo dev sessions", () => {
		expect(resolveConfiguredReleaseBaseUrl({
			appVariant: "development",
			baseUrl: PUBLIC_ORIGIN,
		})).toBe(null);
		expect(resolveConfiguredReleaseBaseUrl({
			appVariant: "production",
			baseUrl: PUBLIC_ORIGIN,
			isDev: true,
		})).toBe(null);
	});

	it("fails closed when a production endpoint is missing, non-public, or not an origin", () => {
		for (const baseUrl of [
			undefined,
			"http://api.example.com",
			"https://localhost:3010",
			"https://api.example.test",
			"https://intranet",
			"https://api.company.internal",
			"https://100.64.1.2",
			"https://192.168.1.2",
			"https://user:password@api.example.com",
			"https://api.example.com/path",
			"https://api.example.com/?token=abc",
		]) {
			expect(isPublicHttpsOrigin(baseUrl)).toBe(false);
			expect(() => resolveConfiguredReleaseBaseUrl({
				appVariant: "production",
				baseUrl,
			})).toThrow();
		}
		expect(isPublicHttpsOrigin(PUBLIC_ORIGIN)).toBe(true);
	});
});
