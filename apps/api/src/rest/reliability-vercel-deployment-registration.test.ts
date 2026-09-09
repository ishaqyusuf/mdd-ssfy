import { expect, it } from "bun:test";
import { resolveVercelDeploymentRegistration } from "./reliability-vercel-deployment-registration";
const entry = {
	id: "web",
	account: "team",
	project: "project",
	operation: "deployment.error",
	serviceId: "web",
	owner: "platform",
	secretEnv: "RELIABILITY_VERCEL_WEBHOOK_SECRET_WEB",
};
const env = {
	RELIABILITY_VERCEL_DEPLOYMENTS: JSON.stringify([entry]),
	RELIABILITY_VERCEL_WEBHOOK_SECRET_WEB: "webhook-fixture",
};
it("binds deployment sources to a separate webhook secret", () => {
	expect(resolveVercelDeploymentRegistration("web", env)?.secret).toBe(
		"webhook-fixture",
	);
	expect(resolveVercelDeploymentRegistration("other", env)).toBeNull();
	expect(resolveVercelDeploymentRegistration("web", {})).toBeNull();
});
it("rejects duplicate registrations, drain-secret references, and missing webhook secrets", () => {
	for (const config of [
		{ ...env, RELIABILITY_VERCEL_DEPLOYMENTS: JSON.stringify([entry, entry]) },
		{
			...env,
			RELIABILITY_VERCEL_DEPLOYMENTS: JSON.stringify([
				{ ...entry, secretEnv: "RELIABILITY_VERCEL_SECRET_WEB" },
			]),
		},
		{ ...env, RELIABILITY_VERCEL_WEBHOOK_SECRET_WEB: undefined },
	]) {
		expect(() => resolveVercelDeploymentRegistration("web", config)).toThrow();
	}
});
