import type { QueryClient } from "@gnd/ui/tanstack";
import { hashKey } from "@tanstack/react-query";
import { type QueryEvent, resolveQueryEventTargets } from "./registry";
import type { QueryTarget, TypedQueryInvalidation } from "./types";

type TRPCProcedureLike = {
	infiniteQueryKey(input?: unknown): readonly unknown[];
	pathKey(): readonly unknown[];
	queryKey(input?: unknown): readonly unknown[];
};

function getProcedure(trpc: object, route: string): TRPCProcedureLike {
	let current: unknown = trpc;
	for (const segment of route.split(".")) {
		if (
			typeof current !== "object" ||
			current === null ||
			!(segment in current)
		) {
			throw new Error(`Unknown tRPC query route: ${route}`);
		}

		current = (current as Record<string, unknown>)[segment];
	}

	return current as TRPCProcedureLike;
}

export function getTargetQueryKey(
	trpc: object,
	target: QueryTarget,
): readonly unknown[] {
	const procedure = getProcedure(trpc, target.route);

	switch (target.mode) {
		case "infinite":
			return procedure.infiniteQueryKey(target.input);
		case "query":
			return procedure.queryKey(target.input);
		default:
			return procedure.pathKey();
	}
}

export async function invalidateQueryTargets({
	queryClient,
	targets,
	trpc,
}: {
	queryClient: QueryClient;
	targets: readonly QueryTarget[];
	trpc: object;
}) {
	const keys = new Map<string, readonly unknown[]>();
	for (const target of targets) {
		const queryKey = getTargetQueryKey(trpc, target);
		keys.set(hashKey(queryKey), queryKey);
	}

	return Promise.allSettled(
		Array.from(keys.values(), (queryKey) =>
			queryClient.invalidateQueries({
				queryKey,
				refetchType: "active",
			}),
		),
	);
}

export function executeQueryEvent({
	event,
	queryClient,
	trpc,
}: {
	event: QueryEvent;
	queryClient: QueryClient;
	trpc: object;
}) {
	return invalidateQueryTargets({
		queryClient,
		targets: resolveQueryEventTargets(event),
		trpc,
	});
}

export function createTypedQueryInvalidation({
	queryClient,
	trpc,
}: {
	queryClient: QueryClient;
	trpc: object;
}): TypedQueryInvalidation {
	const invalidate = (target: QueryTarget) =>
		invalidateQueryTargets({
			queryClient,
			targets: [target],
			trpc,
		});

	return {
		infinite: (route, input) =>
			invalidate({
				input,
				mode: "infinite",
				route,
			} as QueryTarget),
		path: (route) =>
			invalidate({
				mode: "path",
				route,
			}),
		query: (route, input) =>
			invalidate({
				input,
				mode: "query",
				route,
			} as QueryTarget),
	} as TypedQueryInvalidation;
}
