import "server-only";

import { HydrationBoundary } from "@tanstack/react-query";
import { dehydrate } from "@tanstack/react-query";
import { createTRPCClient, loggerLink } from "@trpc/client";
import { httpBatchLink } from "@trpc/client/links/httpBatchLink";
import {
    type TRPCQueryOptions,
    createTRPCOptionsProxy,
} from "@trpc/tanstack-react-query";
import { cache } from "react";
import superjson from "superjson";
import { headers } from "next/headers";
import { makeQueryClient } from "./query-client";
import type { AppRouter } from "@gnd/api/trpc/routers/_app";
// import { AppRouter } from "./routers/_app";

// IMPORTANT: Create a stable getter for the query client that
//            will return the same client during the same request.
export const getQueryClient = cache(makeQueryClient);

export const trpc = createTRPCOptionsProxy<AppRouter>({
    queryClient: getQueryClient,
    client: createTRPCClient({
        links: [
            httpBatchLink({
                // url: `${process.env.NEXT_PUBLIC_API_URL}/api/trpc`,
                url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3018"}/api/storefront/trpc`,
                transformer: superjson as any,
                fetch(url, options) {
                    return fetch(url, { ...options, credentials: "include" });
                },
                async headers() {
                    const requestHeaders = await headers();
                    return {
                        cookie: requestHeaders.get("cookie") || "",
                        "x-request-id": requestHeaders.get("x-request-id") || "",
                    };
                },
            }),
            loggerLink({
                enabled: (opts) =>
                    process.env.NODE_ENV === "development" ||
                    (opts.direction === "down" && opts.result instanceof Error),
            }),
        ],
    }),
});

export function HydrateClient(props: { children: React.ReactNode }) {
    const queryClient = getQueryClient();

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            {props.children as any}
        </HydrationBoundary>
    );
}

export function prefetch<T extends ReturnType<TRPCQueryOptions<any>>>(
    queryOptions: T,
) {
    const queryClient = getQueryClient();

    if (queryOptions.queryKey[1]?.type === "infinite") {
        void queryClient.prefetchInfiniteQuery(queryOptions as any);
    } else {
        void queryClient.prefetchQuery(queryOptions);
    }
}

export function batchPrefetch<T extends ReturnType<TRPCQueryOptions<any>>>(
    queryOptionsArray: T[],
) {
    const queryClient = getQueryClient();

    for (const queryOptions of queryOptionsArray) {
        if (queryOptions.queryKey[1]?.type === "infinite") {
            void queryClient.prefetchInfiniteQuery(queryOptions as any);
        } else {
            void queryClient.prefetchQuery(queryOptions);
        }
    }
}
