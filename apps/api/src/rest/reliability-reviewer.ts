import type { ReliabilityPrincipal } from "@gnd/db/queries";
import { z } from "zod";

const memberships = z
	.array(
		z
			.object({
				userId: z.number().int().positive().safe(),
				serviceIds: z
					.array(z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,159}$/))
					.min(1)
					.max(20),
			})
			.strict(),
	)
	.max(100);

/** userId comes only from verified API session context. */
export function resolveReliabilityReviewer(
	userId: number | undefined,
	env: Record<string, string | undefined>,
): ReliabilityPrincipal | null {
	if (!userId || !Number.isSafeInteger(userId) || userId < 1) return null;
	const raw = env.RELIABILITY_REVIEWER_MEMBERSHIPS;
	if (!raw) return null;
	try {
		if (raw.length > 100_000) throw new Error();
		const entries = memberships.parse(JSON.parse(raw));
		if (
			new Set(entries.map((entry) => entry.userId)).size !== entries.length ||
			entries.some(
				(entry) => new Set(entry.serviceIds).size !== entry.serviceIds.length,
			)
		)
			throw new Error();
		const member = entries.find((entry) => entry.userId === userId);
		return member
			? { actorId: `user:${userId}`, serviceIds: member.serviceIds }
			: null;
	} catch {
		throw new Error("Invalid reliability reviewer configuration");
	}
}
