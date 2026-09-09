import type { Database } from "../index";
import type { ReliabilityPrincipal } from "./reliability-actions";

/** Stable identity pagination; summaries omit provider payloads and analysis JSON. */
export async function listReliabilityIncidents(
	db: Database,
	input: { serviceId: string; cursor?: string },
	principal: ReliabilityPrincipal,
) {
	if (!principal.actorId || !principal.serviceIds.includes(input.serviceId)) {
		return { status: "forbidden" as const };
	}
	const rows = await db.reliabilityIncident.findMany({
		where: {
			serviceId: input.serviceId,
			...(input.cursor ? { id: { lt: input.cursor } } : {}),
		},
		orderBy: { id: "desc" },
		take: 51,
		select: {
			id: true,
			serviceId: true,
			owner: true,
			severity: true,
			status: true,
			revision: true,
			occurrenceCount: true,
			firstSeenAt: true,
			lastSeenAt: true,
		},
	});
	const items = rows.slice(0, 50);
	return {
		status: "ok" as const,
		items,
		nextCursor: rows.length > 50 ? (items.at(-1)?.id ?? null) : null,
	};
}
