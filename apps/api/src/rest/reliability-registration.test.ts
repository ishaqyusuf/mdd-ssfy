import { expect, it } from "bun:test";
import { resolveSentryRegistration } from "./reliability-registration";

it("requires an explicit registration and separate signing secret", () => {
	expect(resolveSentryRegistration("web", {})).toBeNull();
	const entry = {
		id: "web",
		installationId: "installation",
		account: "org",
		projectId: "123",
		operation: "runtime.error",
		serviceId: "web",
		owner: "platform",
		secretEnv: "RELIABILITY_SENTRY_SECRET_WEB",
	};
	const env = {
		RELIABILITY_SENTRY_REGISTRATIONS: JSON.stringify([entry]),
		RELIABILITY_SENTRY_SECRET_WEB: "test-only",
	};
	expect(resolveSentryRegistration("web", env)?.service.owner).toBe("platform");
	expect(() =>
		resolveSentryRegistration("web", {
			...env,
			RELIABILITY_SENTRY_SECRET_WEB: undefined,
		}),
	).toThrow("Missing reliability signing secret");
	expect(() =>
		resolveSentryRegistration("web", {
			...env,
			RELIABILITY_SENTRY_REGISTRATIONS: JSON.stringify([entry, entry]),
		}),
	).toThrow("Duplicate reliability registration");
});
