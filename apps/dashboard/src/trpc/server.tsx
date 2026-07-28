import "server-only";

import {
	HydrationBoundary,
	dehydrate,
	type TRPCQueryOptions,
	createTRPCOptionsProxy,
} from "@gnd/ui/tanstack";

import { cache } from "react";
import { makeQueryClient } from "./query-client";
import { appRouter, db, type AppRouter } from "@gnd/api/trpc/routers/_app";
import { getServerAuthSession } from "@/lib/auth/session";

// IMPORTANT: Create a stable getter for the query client that
//            will return the same client during the same request.
export const getQueryClient = cache(makeQueryClient);

export const trpc = createTRPCOptionsProxy<AppRouter>({
	queryClient: getQueryClient,
	router: appRouter,
	ctx: createServerTRPCContext,
});

export function HydrateClient(props: { children: React.ReactNode }) {
	const queryClient = getQueryClient();

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			{props.children as any}
		</HydrationBoundary>
	);
}

export async function batchPrefetch<
	T extends ReturnType<TRPCQueryOptions<any>>,
>(queryOptionsArray: T[]) {
	const queryClient = getQueryClient();

	await Promise.all(
		queryOptionsArray.map((queryOptions) => {
			if (queryOptions.queryKey[1]?.type === "infinite") {
				return queryClient.prefetchInfiniteQuery(queryOptions as any);
			}
			return queryClient.prefetchQuery(queryOptions);
		}),
	);
}

async function createServerTRPCContext() {
	const session = await getServerAuthSession();

	return {
		db,
		userId: parseUserId(session?.user?.id),
	};
}

function parseUserId(userId: unknown) {
	if (typeof userId === "number") {
		return Number.isFinite(userId) ? userId : undefined;
	}

	if (typeof userId === "string") {
		const parsed = Number(userId);

		return Number.isFinite(parsed) ? parsed : undefined;
	}

	return undefined;
}
