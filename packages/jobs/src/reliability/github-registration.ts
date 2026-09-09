import { z } from "zod";

const identifier = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,159}$/);
const registrations = z
	.array(
		z
			.object({
				serviceId: identifier,
				repository: z
					.string()
					.max(200)
					.regex(/^[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+$/)
					.refine((value) => ![".", ".."].includes(value.split("/")[1] ?? "")),
				repositoryId: z.number().int().positive().safe(),
				installationId: z.number().int().positive().safe(),
				actorId: z.number().int().positive().safe(),
				clientId: z.string().regex(/^[A-Za-z0-9_.-]{1,160}$/),
				privateKeyEnv: z
					.string()
					.regex(/^RELIABILITY_GITHUB_APP_KEY_[A-Z0-9_]+$/),
			})
			.strict(),
	)
	.min(1)
	.max(20);

export function listGithubReliabilityServices(
	env: Record<string, string | undefined>,
) {
	if (!env.RELIABILITY_GITHUB_REGISTRATIONS) return [];
	try {
		const entries = registrations.parse(
			JSON.parse(env.RELIABILITY_GITHUB_REGISTRATIONS),
		);
		const ids = entries.map((entry) => entry.serviceId);
		if (new Set(ids).size !== ids.length) throw new Error("Duplicate service");
		return ids;
	} catch {
		throw new Error("Invalid GitHub reliability registration");
	}
}

export function resolveGithubReliabilityRegistration(
	serviceId: string,
	env: Record<string, string | undefined>,
) {
	if (!env.RELIABILITY_GITHUB_REGISTRATIONS) return null;
	try {
		const entries = registrations.parse(
			JSON.parse(env.RELIABILITY_GITHUB_REGISTRATIONS),
		);
		if (
			new Set(entries.map((entry) => entry.serviceId)).size !== entries.length
		)
			throw new Error("Duplicate service");
		const entry = entries.find((value) => value.serviceId === serviceId);
		if (!entry) return null;
		const privateKey = env[entry.privateKeyEnv];
		if (!privateKey || privateKey.length > 32_768)
			throw new Error("Missing private key");
		return { ...entry, privateKey };
	} catch {
		throw new Error("Invalid GitHub reliability registration");
	}
}
