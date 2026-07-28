import { describe, expect, it } from "bun:test";
import {
	resolveSentryEnvironment,
	shouldEnableSentry,
} from "./sentry-environment";

describe("web Sentry environment policy", () => {
	it("uses the deployment environment ahead of NODE_ENV", () => {
		expect(
			resolveSentryEnvironment({
				deploymentEnvironment: "preview",
				nodeEnvironment: "production",
			}),
		).toBe("preview");
	});

	it("enables capture only for production deployments with a DSN", () => {
		expect(
			shouldEnableSentry({
				deploymentEnvironment: "production",
				dsn: "https://dsn",
				nodeEnvironment: "production",
			}),
		).toBe(true);
		expect(
			shouldEnableSentry({
				deploymentEnvironment: "preview",
				dsn: "https://dsn",
				nodeEnvironment: "production",
			}),
		).toBe(false);
		expect(
			shouldEnableSentry({
				deploymentEnvironment: "production",
				nodeEnvironment: "production",
			}),
		).toBe(false);
	});
});
