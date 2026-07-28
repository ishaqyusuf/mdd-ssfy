import { consoleLog } from "@gnd/utils";
import { type QueryEventName, resolveMutationQueryEvents } from "./registry";
import { publishQueryEvents } from "./transport";
import type { QueryEventScope } from "./types";

export async function triggerMutationQueryEvents({
	data,
	metaEvents,
	metaScope,
	mutationKey,
	variables,
}: {
	data?: unknown;
	metaEvents?: readonly QueryEventName[] | false;
	metaScope?: QueryEventScope;
	mutationKey?: readonly unknown[];
	variables?: unknown;
}) {
	const queryEvents = resolveMutationQueryEvents({
		data,
		metaEvents,
		metaScope,
		mutationKey,
		variables,
	});
	if (!queryEvents.length) return queryEvents;

	try {
		await publishQueryEvents(queryEvents);
	} catch (error) {
		consoleLog("Mutation query events failed", {
			error,
			queryEvents,
		});
	}

	return queryEvents;
}
