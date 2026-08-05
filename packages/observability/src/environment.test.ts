import { describe, expect, it } from "bun:test";
import {
	isObservabilityEnabled,
	resolveObservabilityEnvironment,
} from "./environment";

describe("observability environment policy", () => {
	it("enables reporting only for an explicit production deployment with a DSN", () => {
		expect(
			isObservabilityEnabled({
				deploymentEnvironment: "production",
				dsn: "https://dsn",
				nodeEnvironment: "production",
			}),
		).toBe(true);
		expect(
			isObservabilityEnabled({
				deploymentEnvironment: "preview",
				dsn: "https://dsn",
				nodeEnvironment: "production",
			}),
		).toBe(false);
		expect(
			resolveObservabilityEnvironment({ nodeEnvironment: "development" }),
		).toBe("development");
	});
});
