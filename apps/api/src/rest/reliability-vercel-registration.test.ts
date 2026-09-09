import { expect, it } from "bun:test";
import { resolveVercelDrainRegistration } from "./reliability-vercel-registration";
const entry = {
	id: "web",
	account: "team",
	project: "project",
	operation: "runtime.error",
	serviceId: "web",
	owner: "platform",
	format: "json",
	secretEnv: "RELIABILITY_VERCEL_SECRET_WEB",
};
const env = {
	RELIABILITY_VERCEL_DRAINS: JSON.stringify([entry]),
	RELIABILITY_VERCEL_SECRET_WEB: "fixture-secret",
};
it("resolves exact registrations and separate secrets", () => {
	expect(resolveVercelDrainRegistration("missing", env)).toBeNull();
	expect(resolveVercelDrainRegistration("web", {})).toBeNull();
	const registration = resolveVercelDrainRegistration("web", env);
	expect(registration?.secret).toBe("fixture-secret");
	expect(registration?.service.sources).toEqual([
		{ provider: "vercel", account: "team", project: "project" },
	]);
});
it("rejects duplicate registrations, arbitrary secret names, and missing secrets", () => {
	for (const config of [
		{ ...env, RELIABILITY_VERCEL_DRAINS: JSON.stringify([entry, entry]) },
		{
			...env,
			RELIABILITY_VERCEL_DRAINS: JSON.stringify([
				{ ...entry, secretEnv: "DATABASE_URL" },
			]),
		},
		{ ...env, RELIABILITY_VERCEL_SECRET_WEB: undefined },
	]) {
		expect(() => resolveVercelDrainRegistration("web", config)).toThrow();
	}
});
