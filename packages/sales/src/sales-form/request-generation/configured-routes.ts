import { z } from "zod";

const requestRouteConfigurationSchema = z.object({
	noHandle: z.boolean().optional(),
	hasSwing: z.boolean().optional(),
});

export type ConfiguredRequestRoute = {
	itemTypeUid: string;
	stepUids: string[];
	config?: z.infer<typeof requestRouteConfigurationSchema>;
};

function record(value: unknown): Record<string, unknown> {
	if (typeof value === "string") {
		try {
			return record(JSON.parse(value));
		} catch {
			return {};
		}
	}
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

/** Match Dashboard routing precedence; do not import legacy route-map leftovers. */
export function getConfiguredRequestRoutes(
	meta: unknown,
): ConfiguredRequestRoute[] {
	const settings = record(meta);
	const direct = record(settings.route);
	const routes = Object.keys(direct).length
		? direct
		: record(record(settings.data).route);
	return Object.entries(routes)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([itemTypeUid, value]) => {
			const sequence = record(value).routeSequence;
			const stepUids = Array.isArray(sequence)
				? sequence.flatMap((entry) => {
						const uid = record(entry).uid;
						return typeof uid === "string" && uid.trim() ? [uid] : [];
					})
				: [];
			const config = requestRouteConfigurationSchema.parse(
				record(value).config ?? {},
			);
			return {
				itemTypeUid,
				stepUids: [...new Set(stepUids)],
				...(Object.keys(config).length ? { config } : {}),
			};
		});
}

export function getConfiguredRequestStepUids(
	routes: ConfiguredRequestRoute[],
): string[] {
	return [...new Set(routes.flatMap((route) => route.stepUids))].sort();
}

export function resolveConfiguredRequestSteps<
	T extends { id: number; uid: string | null },
>(requestedUids: string[], steps: T[]): T[] {
	return [...new Set(requestedUids)].map((uid) => {
		const candidates = steps.filter((step) => step.uid === uid);
		if (candidates.length === 0)
			throw new Error(`Missing configured step UID: ${uid}`);
		// The New Sales Form builds its UID lookup in ascending ID order, so the
		// newest active row is authoritative when legacy data contains duplicates.
		const candidate = candidates.sort((a, b) => b.id - a.id)[0];
		if (!candidate)
			throw new Error(`Missing configured step UID after validation: ${uid}`);
		return candidate;
	});
}
