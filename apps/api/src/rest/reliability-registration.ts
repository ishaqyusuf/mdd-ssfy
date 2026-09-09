import type { SentryAlertRegistration } from "@gnd/observability/reliability";
import { z } from "zod";

const identifier = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,159}$/);
const registrations = z
	.array(
		z
			.object({
				id: z.string().regex(/^[a-z0-9-]{1,64}$/),
				installationId: identifier,
				account: identifier,
				projectId: identifier,
				operation: identifier,
				serviceId: identifier,
				owner: identifier,
				secretEnv: z.string().regex(/^RELIABILITY_SENTRY_SECRET_[A-Z0-9_]+$/),
			})
			.strict(),
	)
	.max(100);

/** Configuration contains secret variable names only; secret values remain separate. */
export function resolveSentryRegistration(
	id: string,
	env: Record<string, string | undefined>,
): SentryAlertRegistration | null {
	const config = env.RELIABILITY_SENTRY_REGISTRATIONS;
	if (!config) return null;
	const entries = registrations.parse(JSON.parse(config));
	if (new Set(entries.map((entry) => entry.id)).size !== entries.length)
		throw new Error("Duplicate reliability registration");
	const entry = entries.find((entry) => entry.id === id);
	if (!entry) return null;
	const clientSecret = env[entry.secretEnv];
	if (!clientSecret) throw new Error("Missing reliability signing secret");
	return {
		clientSecret,
		installationId: entry.installationId,
		account: entry.account,
		projectId: entry.projectId,
		operation: entry.operation,
		service: {
			id: entry.serviceId,
			owner: entry.owner,
			operations: [entry.operation],
			sources: [
				{
					provider: "sentry",
					account: entry.account,
					project: entry.projectId,
				},
			],
		},
	};
}
