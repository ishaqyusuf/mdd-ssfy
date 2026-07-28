import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Sentry runtime wiring", () => {
	it("loads web capture through every Next.js runtime entrypoint", () => {
		const client = read("apps/dashboard/src/instrumentation-client.ts");
		const instrumentation = read("apps/dashboard/src/instrumentation.ts");
		const nextConfig = read("apps/dashboard/next.config.mjs");
		const server = read("apps/dashboard/sentry.server.config.ts");
		const edge = read("apps/dashboard/sentry.edge.config.ts");

		for (const source of [client, server, edge]) {
			expect(source).toContain("shouldEnableSentry");
			expect(source).toContain("sendDefaultPii: false");
		}

		expect(instrumentation).toContain(
			"export const onRequestError = Sentry.captureRequestError",
		);
		expect(nextConfig).toContain("withSentryConfig");
		expect(nextConfig).toContain("deleteSourcemapsAfterUpload: true");
	});

	it("initializes API capture before constructing the Hono app", () => {
		const buildEntry = read("apps/api/src/bun.ts");
		const index = read("apps/api/src/index.ts");
		const instrument = read("apps/api/src/instrument.ts");

		expect(index.trimStart().startsWith('import "./instrument";')).toBe(true);
		expect(buildEntry).toContain('import { app } from "."');
		expect(index).toContain("captureTrpcError");
		expect(index).toContain("app.onError");
		expect(instrument).toContain("beforeSend(event)");
		expect(instrument).toContain("sanitizeApiSentryEvent(event)");
	});

	it("initializes mobile capture before Expo Router and keeps production explicit", () => {
		const eas = JSON.parse(read("apps/mobile/eas.json")) as {
			build: Record<string, { environment?: string }>;
		};
		const entry = read("apps/mobile/index.js");
		const packageJson = JSON.parse(read("apps/mobile/package.json")) as {
			main: string;
		};

		expect(packageJson.main).toBe("./index.js");
		expect(entry.indexOf("initSentry();")).toBeLessThan(
			entry.indexOf('require("expo-router/entry")'),
		);
		expect(eas.build.production.environment).toBe("production");
	});
});
